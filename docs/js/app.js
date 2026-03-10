import { initModeler, newEmptyDiagram, loadXML, getXML, setReadOnly, downloadBpmn, downloadSvg, downloadPng } from './modeler.js';
import * as service from './diagramService.js';
import * as userService from './userService.js';
import * as ui from './ui.js';
import { generateShareLink, getSharedDiagramId } from './share.js';
import { supabase } from './supabase.js';

let currentUser = null;
let currentDiagramId = null;

initModeler();

function withErrorHandling(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      console.error(err);
      ui.showToast(err.message || 'Something went wrong', 'danger');
    }
  };
}

/* ===============================
   OVERVIEW
================================= */
async function loadOverview() {
  const data = await service.getDiagrams();
  ui.renderTable(
    data,
    withErrorHandling(openDiagram),
    withErrorHandling(async (id) => { await service.deleteDiagram(id); await loadOverview(); }),
    withErrorHandling(async (id) => { await openHistoryModal(id); })
  );
  ui.resetSaveButton(saveDiagram);
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
  ui.resetSaveButton(saveDiagram);
  ui.showEditor();
}

/* ===============================
   SAVE DIAGRAM
================================= */
async function saveDiagram() {  
  if (!currentDiagramId) {
    ui.showInputModal('Diagram Name', 'Enter a name...', async (name) => {      
      const data = await service.createDiagram(name);      
      currentDiagramId = data.id;      
      ui.showInputModal('Version Comment', 'Enter a comment...', async (comment) => {        
        const xml = await getXML();        
        await service.saveVersion(currentDiagramId, xml, comment);        
        const details = await service.getDiagramDetails(currentDiagramId);
        ui.renderDiagramDetails(details);
        ui.showToast('Diagram saved');
      });
    });
    return;
  }

  ui.showInputModal('Version Comment', 'Enter a comment...', async (comment) => {
    const xml = await getXML();
    await service.saveVersion(currentDiagramId, xml, comment);
    const details = await service.getDiagramDetails(currentDiagramId);
    ui.renderDiagramDetails(details);
    ui.showToast('Diagram saved');
  });
}

/* ===============================
   HISTORY
================================= */
async function openHistoryModal(diagramId) {
  if (!diagramId) return ui.showToast('No diagram selected.', 'warning');

  currentDiagramId = diagramId;
  const history = await service.getVersionHistory(diagramId);

  ui.renderVersionHistory(history, {
    onView: async (version) => {
      const versionData = await service.getVersionById(version.id);
      ui.closeVersionModal();
      ui.showEditor();
      await loadXML(versionData.bpmn_xml);
      setReadOnly(true);

      const diagramDetails = await service.getDiagramDetails(currentDiagramId);
      const viewData = {
        ...diagramDetails,
        ...version
      };

      ui.showViewedVersion(viewData, async () => {
        setReadOnly(false);
        await service.saveVersion(
          currentDiagramId,
          versionData.bpmn_xml,
          `Restored from v${version.version}`
        );
        const details = await service.getDiagramDetails(currentDiagramId);
        ui.renderDiagramDetails(details);
        ui.resetSaveButton(saveDiagram);
        ui.showToast(`Version ${version.version} restored as latest.`);
      });
    },

    onRestore: async (version) => {
      const versionData = await service.getVersionById(version.id);
      setReadOnly(false);
      await service.saveVersion(currentDiagramId, versionData.bpmn_xml, `Restored from v${version.version}`);
      const details = await service.getDiagramDetails(currentDiagramId);
      ui.renderDiagramDetails(details);
      ui.closeVersionModal();
      ui.resetSaveButton(saveDiagram);
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
  if (error) return ui.showToast(error.message, 'danger');

  currentUser = data.user;
  await loadOverview();
}

async function handleSignup(email, password) {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return ui.showToast(error.message, 'danger');
  ui.showToast('Check your email to confirm your account.', 'info');
}

/* ===============================
   EVENT BINDINGS
================================= */
document.getElementById('btnSave').onclick = withErrorHandling(saveDiagram);
document.getElementById('btnBack').onclick = withErrorHandling(loadOverview);
document.getElementById('btnShare').onclick = () => {
  if (currentDiagramId) ui.showShareModal(generateShareLink(currentDiagramId));
};

document.getElementById('btnDelete').onclick = withErrorHandling(async () => {
  if (!currentDiagramId) return;
  ui.showConfirmModal(
    'Delete Diagram',
    'This will delete the diagram and all version history. Are you sure?',
    withErrorHandling(async () => {
      await service.deleteDiagram(currentDiagramId);
      currentDiagramId = null;
      await loadOverview();
    })
  );
});

// Helper to get current diagram name for the filename
function getDiagramName() {
  return document.getElementById('diagramName').textContent.replace(' (read-only)', '').trim() || 'diagram';
}

document.getElementById('btnDownloadBpmn').onclick = withErrorHandling(() => downloadBpmn(getDiagramName()));
document.getElementById('btnDownloadSvg').onclick = withErrorHandling(() => downloadSvg(getDiagramName()));
document.getElementById('btnDownloadPng').onclick = withErrorHandling(() => downloadPng(getDiagramName()));

document.getElementById('btnImport').onclick = () => {
  document.getElementById('importFileInput').click();
};

document.getElementById('importFileInput').onchange = withErrorHandling(async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const xml = await file.text();
  await loadXML(xml);
  currentDiagramId = null;
  ui.resetDiagramDetails();
  ui.showEditor();
  ui.showToast('Diagram imported — save to store it', 'info');

  // Reset file input so the same file can be re-imported if needed
  e.target.value = '';
});

document.getElementById('btnHistory').onclick = withErrorHandling(() => openHistoryModal(currentDiagramId));
document.getElementById('btnNewOverview').onclick = withErrorHandling(() => createNewDiagram(true));
document.getElementById('btnNewInside').onclick = withErrorHandling(() => createNewDiagram(false));

document.getElementById('btnSignup').onclick = withErrorHandling(() =>
  handleSignup(document.getElementById('emailInput').value, document.getElementById('passwordInput').value));

document.getElementById('btnLogin').onclick = withErrorHandling(() =>
  handleLogin(document.getElementById('emailInput').value, document.getElementById('passwordInput').value));

document.getElementById('btnLogout').onclick = withErrorHandling(async () => {
  const { error } = await supabase.auth.signOut();
  if (error) return ui.showToast(error.message, 'danger');
  currentUser = null;
  ui.showAuth();
});

document.getElementById('btnRename').onclick = withErrorHandling(() => {
  const nameEl = document.getElementById('diagramName');
  const currentName = nameEl.textContent;

  ui.enableRename(currentName, async (newName) => {
    if(!currentDiagramId) return ui.showToast('No diagram selected.', 'warning');
    await service.renameDiagram(currentDiagramId, newName);
  });
});

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
  if(!username) return ui.showToast('Username required', 'warning');
  await userService.updateProfile(username);
  ui.showToast('Profile updated');
  const profileModalEl = document.getElementById('profileModal');
  const bsModal = bootstrap.Modal.getInstance(profileModalEl);
  if(bsModal) bsModal.hide();
};

/* ===============================
   STARTUP
================================= */
window.addEventListener('DOMContentLoaded', withErrorHandling(async () => {
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
}));