import { initModeler, newEmptyDiagram, loadXML, getXML, setReadOnly } from './modeler.js';
import * as service from './diagramService.js';
import * as userService from './userService.js';
import * as ui from './ui.js';
import { generateShareLink, getSharedDiagramId } from './share.js';
import { supabase } from './supabase.js';

let currentUser = null;
let currentDiagramId = null;

initModeler();

/* ===============================
   OVERVIEW
================================= */
async function loadOverview() {
  const data = await service.getDiagrams();
  ui.renderTable(
    data,
    openDiagram,
    async (id) => { await service.deleteDiagram(id); await loadOverview(); },
    async (id) => { await openHistoryModal(id); }
  );
  ui.showOverview();
}

/* ===============================
   OPEN DIAGRAM
================================= */
async function openDiagram(id) {
  if (!id) return;
  const versionData = await service.loadLatestVersion(id);
  const detailData = await service.getDiagramDetails(id);

  currentDiagramId = id;

  await loadXML(versionData.bpmn_xml);
  ui.renderDiagramDetails(detailData);
  setReadOnly(false);
  ui.showEditor();
}

/* ===============================
   SAVE DIAGRAM
================================= */
async function saveDiagram() {
  if (!currentDiagramId) {
    const name = prompt('Diagram name:');
    if (!name) return;
    const data = await service.createDiagram(name);
    currentDiagramId = data.id;
  }

  const xml = await getXML();
  const comment = prompt('Version comment:');
  if (!comment) return;

  await service.saveVersion(currentDiagramId, xml, comment);
  const details = await service.getDiagramDetails(currentDiagramId);
  ui.renderDiagramDetails(details);

  alert('Diagram saved');
}

/* ===============================
   VIEW VERSION
================================= */
async function viewVersion(version) {
  const versionData = await service.getVersionById(version.id);

  await loadXML(versionData.bpmn_xml);
  setReadOnly(true);
  ui.showEditor();

  ui.showViewedVersion({
    ...versionData,
    name: versionData.diagram_name || versionData.name,
    owner: versionData.owner
  }, async () => {
    setReadOnly(false);
    await service.saveVersion(currentDiagramId, versionData.bpmn_xml, `Restored from v${version.version}`);
    const details = await service.getDiagramDetails(currentDiagramId);
    ui.renderDiagramDetails(details);
    alert('Version restored as latest');
    await loadOverview();
  });

  // Save button temporarily becomes Restore
  const saveBtn = document.getElementById('btnSave');
  const originalSave = saveBtn.onclick;
  saveBtn.textContent = 'Restore as Latest';
  saveBtn.classList.replace('btn-primary', 'btn-success');
  saveBtn.onclick = () => ui.restoreViewedVersion();

  document.getElementById('btnBack').onclick = () => {
    ui.showOverview();
    saveBtn.textContent = 'Save';
    saveBtn.classList.replace('btn-success', 'btn-primary');
    saveBtn.onclick = originalSave;
  };
}

/* ===============================
   HISTORY
================================= */
async function openHistoryModal(diagramId) {
  if (!diagramId) return alert('No diagram selected.');

  currentDiagramId = diagramId;
  const history = await service.getVersionHistory(diagramId);

  ui.renderVersionHistory(history, {
    onView: async (version) => {
      const versionData = await service.getVersionById(version.id);
      ui.closeVersionModal();
      ui.showEditor();
      await loadXML(versionData.bpmn_xml);
      setReadOnly(true);

      // Merge diagram-level info with the version being viewed
      const diagramDetails = await service.getDiagramDetails(currentDiagramId);
      const viewData = {
        ...diagramDetails,      // name, owner, updated_at
        ...version              // version number, comment, created_at
      };

      ui.showViewedVersion(viewData);
    },
    
    onRestore: async (version) => {
      const versionData = await service.getVersionById(version.id);
      setReadOnly(false);
      await service.saveVersion(currentDiagramId, versionData.bpmn_xml, `Restored from v${version.version}`);
      const details = await service.getDiagramDetails(currentDiagramId);
      ui.renderDiagramDetails(details);
      ui.closeVersionModal();
      await loadOverview();
    }
  });
}

/* ===============================
   NEW DIAGRAM
================================= */
async function createNewDiagram(showEditorPage = true) {
  currentDiagramId = null;
  await newEmptyDiagram();
  setReadOnly(false);
  ui.resetDiagramDetails();
  if(showEditorPage) ui.showEditor();
}

/* ===============================
   AUTH
================================= */
async function handleLogin(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if(error) return alert(error.message);

  currentUser = data.user;
  await loadOverview();
}

async function handleSignup(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  if(error) return alert(error.message);
  alert('User created. You can log in.');
}

/* ===============================
   EVENT BINDINGS
================================= */
document.getElementById('btnSave').onclick = saveDiagram;
document.getElementById('btnBack').onclick = loadOverview;
document.getElementById('btnShare').onclick = () => { if(currentDiagramId) alert(generateShareLink(currentDiagramId)); };
document.getElementById('btnDelete').onclick = async () => { if(currentDiagramId) await service.deleteDiagram(currentDiagramId); await loadOverview(); };
document.getElementById('btnHistory').onclick = () => openHistoryModal(currentDiagramId);
document.getElementById('btnNewOverview').onclick = () => createNewDiagram(true);
document.getElementById('btnNewInside').onclick = () => createNewDiagram(false);

document.getElementById('btnSignup').onclick = () =>
  handleSignup(document.getElementById('emailInput').value, document.getElementById('passwordInput').value);

document.getElementById('btnLogin').onclick = () =>
  handleLogin(document.getElementById('emailInput').value, document.getElementById('passwordInput').value);

document.getElementById('btnLogout').onclick = async () => {
  const { error } = await supabase.auth.signOut();
  if(error) return alert(error.message);
  currentUser = null;
  ui.showAuth();
};

document.getElementById('btnRename').onclick = () => {
  const nameEl = document.getElementById('diagramName');
  const currentName = nameEl.textContent;

  ui.enableRename(currentName, async (newName) => {
    if(!currentDiagramId) return alert('No diagram selected.');
    await service.renameDiagram(currentDiagramId, newName);
  });
};

/* ===============================
   PROFILE MODAL
================================= */
document.getElementById('btnProfile').onclick = async () => {
  const { data } = await userService.getProfile();
  document.getElementById('profileUsername').value = data.username || '';
  const profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
  profileModal.show();
};

document.getElementById('btnSaveProfile').onclick = async () => {
  const username = document.getElementById('profileUsername').value.trim();
  if(!username) return alert('Username required');
  await userService.updateProfile(username);
  alert('Profile updated');
  const profileModalEl = document.getElementById('profileModal');
  const bsModal = bootstrap.Modal.getInstance(profileModalEl);
  if(bsModal) bsModal.hide();
};

/* ===============================
   STARTUP
================================= */
window.addEventListener('DOMContentLoaded', async () => {
  const sharedId = getSharedDiagramId();
  const { data: sessionData } = await supabase.auth.getSession();

  if(sessionData.session) {
    currentUser = sessionData.session.user;
    if(sharedId) {
      await openDiagram(sharedId);
      setReadOnly(true);
    } else {
      await loadOverview();
    }
  } else {
    ui.showAuth();
  }
});