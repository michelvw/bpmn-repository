import {
  initModeler,
  newEmptyDiagram,
  loadXML,
  getXML,
  setReadOnly
} from './modeler.js';

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
    async (id) => {
      await service.deleteDiagram(id);
      await loadOverview();
    },
    async (id) => {
      await openHistoryModal(id);
    }
  );
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
   SAVE
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

  // Refresh details immediately
  const details = await service.getDiagramDetails(currentDiagramId);
  ui.renderDiagramDetails(details);

  await loadOverview();

  alert('Saved');
}

/* ===============================
   DELETE
================================= */

async function deleteCurrent() {
  if (!currentDiagramId) return;
  if (!confirm('Delete diagram?')) return;

  await service.deleteDiagram(currentDiagramId);

  currentDiagramId = null;

  ui.showOverview();
  await loadOverview();
}

/* ===============================
   HISTORY
================================= */

async function openHistoryModal(diagramId) {
  if (!diagramId) {
    alert('No diagram selected.');
    return;
  }

  currentDiagramId = diagramId;

  const history = await service.getVersionHistory(diagramId);

  ui.renderVersionHistory(history, {

    onView: async (versionId) => {
      const version = await service.getVersionById(versionId);

      document
        .getElementById('versionModal')
        .classList.add('hidden');

      ui.showEditor();

      await new Promise(r => setTimeout(r, 50));

      await loadXML(version.bpmn_xml);
      setReadOnly(true);
    },

    onRestore: async (versionId) => {
      const version = await service.getVersionById(versionId);

      setReadOnly(false);

      await service.saveVersion(
        currentDiagramId,
        version.bpmn_xml,
        `Restored from v${version.version}`
      );

      const details =
        await service.getDiagramDetails(currentDiagramId);

      ui.renderDiagramDetails(details);

      document
        .getElementById('versionModal')
        .classList.add('hidden');

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

async function createNewDiagram(showEditor = true) {
  currentDiagramId = null;
  await newEmptyDiagram();
  setReadOnly(false);
  ui.resetDiagramDetails();

  if (showEditor) ui.showEditor();
}

/* ===============================
   AUTH
================================= */

async function handleLogin(email, password) {
  const { data, error } =
    await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert(error.message);
    return;
  }

  currentUser = data.user;

  document.getElementById('authPage').style.display = 'none';
  ui.showOverview();

  await loadOverview();
}

async function handleSignup(email, password) {
  const { error } =
    await supabase.auth.signUp({ email, password });

  if (error) return alert(error.message);

  alert('User created. You can log in.');
}

/* ===============================
   BUTTON BINDINGS
================================= */

document.getElementById('btnSave').onclick = saveDiagram;
document.getElementById('btnBack').onclick = async () => {
  ui.showOverview();
  await loadOverview();
};

document.getElementById('btnShare').onclick = shareDiagram;
document.getElementById('btnDelete').onclick = deleteCurrent;
document.getElementById('btnHistory').onclick =
  () => openHistoryModal(currentDiagramId);

document.getElementById('btnNewOverview').onclick =
  () => createNewDiagram(true);

document.getElementById('btnNewInside').onclick =
  () => createNewDiagram(false);

document.getElementById('closeVersionModal').onclick =
  () => document
    .getElementById('versionModal')
    .classList.add('hidden');

document.getElementById('btnSignup').onclick = () =>
  handleSignup(emailInput.value, passwordInput.value);

document.getElementById('btnLogin').onclick = () =>
  handleLogin(emailInput.value, passwordInput.value);

document.getElementById('btnLogout').onclick = async () => {

  const { error } = await supabase.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  currentUser = null;

  document.getElementById('authPage').style.display = 'block';
  document.getElementById('overviewPage').style.display = 'none';
  document.getElementById('editorPage').style.display = 'none';
};

document.getElementById('btnProfile').onclick = async () => {

  const { data } = await userService.getProfile();

  document.getElementById('profileUsername').value = data.username || '';

  document
    .getElementById('profileModal')
    .classList.remove('hidden');
};

document.getElementById('closeProfileModal').onclick = () => {

  document
    .getElementById('profileModal')
    .classList.add('hidden');
};

document.getElementById('btnSaveProfile').onclick = async () => {

  const username =
    document.getElementById('profileUsername').value.trim();

  if (!username) {
    alert('Username required');
    return;
  }

  await userService.updateProfile(username);

  alert('Profile updated');

  document
    .getElementById('profileModal')
    .classList.add('hidden');
};

/* ===============================
   STARTUP
================================= */

const sharedId = getSharedDiagramId();

const { data: sessionData } =
  await supabase.auth.getSession();

if (sessionData.session) {
  currentUser = sessionData.session.user;
  document.getElementById('authPage').style.display = 'none';

  if (sharedId) {
    await openDiagram(sharedId);
    setReadOnly(true);
  } else {
    await loadOverview();
  }
}