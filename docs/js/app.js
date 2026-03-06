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
   PAGE SHOW/HIDE
================================= */
function showAuth() {
  document.getElementById('authPage').style.display = 'block';
  document.getElementById('overviewPage').style.display = 'none';
  document.getElementById('editorPage').style.display = 'none';
}

function showOverview() { ui.showOverview(); }
function showEditor() { ui.showEditor(); }

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
  showOverview();
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
  showEditor();
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

  alert('Diagram saved'); // stays on editor
}

/* ===============================
   DELETE
================================= */
async function deleteCurrent() {
  if (!currentDiagramId) return;
  if (!confirm('Delete diagram?')) return;

  await service.deleteDiagram(currentDiagramId);
  currentDiagramId = null;
  await loadOverview();
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
      showEditor();
      await loadXML(versionData.bpmn_xml);
      setReadOnly(true);
      ui.showViewedVersion({ ...version, ...versionData });
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
   SHARE
================================= */
function shareDiagram() {
  if (!currentDiagramId) return;
  alert(generateShareLink(currentDiagramId));
}

/* ===============================
   NEW DIAGRAM
================================= */
async function createNewDiagram(showEditorPage = true) {
  currentDiagramId = null;
  await newEmptyDiagram();
  setReadOnly(false);
  ui.resetDiagramDetails();
  if (showEditorPage) showEditor();
}

/* ===============================
   RENAME
================================= */
document.getElementById('btnRename').onclick = () => {
  const nameEl = document.getElementById('diagramName');
  const currentName = nameEl.textContent;

  nameEl.innerHTML = `<input type="text" class="form-control form-control-sm" id="diagramRenameInput" value="${currentName}">`;

  const input = document.getElementById('diagramRenameInput');
  input.focus();
  input.select();

  const btn = document.getElementById('btnRename');
  btn.textContent = 'Save';
  btn.classList.replace('btn-secondary','btn-success');

  btn.onclick = async () => {
    const newName = input.value.trim();
    if(!newName) return alert('Name cannot be empty');

    await service.renameDiagram(currentDiagramId, newName);
    nameEl.textContent = newName;

    btn.textContent = 'Rename';
    btn.classList.replace('btn-success','btn-secondary');

    // Rebind original handler
    btn.onclick = document.getElementById('btnRename').onclick;
  };
};

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
document.getElementById('btnShare').onclick = shareDiagram;
document.getElementById('btnDelete').onclick = deleteCurrent;
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
  showAuth();
};

// Profile modal
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
    showAuth();
  }
});