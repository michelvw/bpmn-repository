import { initModeler, newEmptyDiagram, loadXML, getXML, setReadOnly } from './modeler.js';
import * as service from './diagramService.js';
import * as ui from './ui.js';
import { generateShareLink, getSharedDiagramId } from './share.js';

const USER_ID = '78448143-9372-4636-9e2c-32e165b615d6';
let currentDiagramId = null;

initModeler();

async function loadOverview() {

  const { data } = await service.getDiagrams(USER_ID);

  ui.renderTable(
    data,
    openDiagram,
    async (id) => {
      await service.deleteDiagram(id);
      await loadOverview();
    },
    async (id) => {
      openHistoryModal(id);
    }
  );
}

async function openDiagram(id) {

  const { data: versionData } = await service.loadLatestVersion(id);
  const { data: detailData } = await service.getDiagramDetails(id);

  currentDiagramId = id;

  await loadXML(versionData.bpmn_xml);

  ui.renderDiagramDetails(detailData);
  ui.showEditor();
}

async function saveDiagram() {

  if (!currentDiagramId) {
    const name = prompt('Diagram name:');
    if (!name) return;

    const { data } = await service.createDiagram(name, USER_ID);
    currentDiagramId = data.id;
  }

  const xml = await getXML();
  const comment = prompt('Version comment:');
  if (!comment) return;

  await service.saveVersion(currentDiagramId, USER_ID, xml, comment);

  // 🔥 Immediately refresh details
  const { data: details } = await service.getDiagramDetails(currentDiagramId);
  ui.renderDiagramDetails(details);

  await loadOverview();

  alert('Saved');
}

function shareDiagram() {
  alert(generateShareLink(currentDiagramId));
}

async function deleteCurrent() {
  if (!confirm('Delete diagram?')) return;
  await service.deleteDiagram(currentDiagramId);
  currentDiagramId = null;
  ui.showOverview();
  loadOverview();
}

function enableInlineRename() {

  const nameSpan = document.getElementById('diagramName');
  const renameBtn = document.getElementById('btnRename');

  renameBtn.onclick = () => {

    if (!currentDiagramId) {
      alert('Save diagram first.');
      return;
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.value = nameSpan.textContent;

    nameSpan.replaceWith(input);
    input.focus();

    const save = async () => {

      const newName = input.value.trim();

      if (!newName) {
        input.replaceWith(nameSpan);
        return;
      }

      await service.renameDiagram(currentDiagramId, newName);

      nameSpan.textContent = newName;
      input.replaceWith(nameSpan);

      await loadOverview();
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') input.replaceWith(nameSpan);
    });
  };
}

async function openHistoryModal(diagramId) {

  if (!diagramId) {
    alert('No diagram selected.');
    return;
  }

  currentDiagramId = diagramId; // 🔥 always lock state

  const { data } = await service.getVersionHistory(diagramId);

  ui.renderVersionHistory(data, {

    onView: async (versionId) => {

      const { data: version } =
        await service.getVersionById(versionId);

      document.getElementById('versionModal')
        .classList.add('hidden');

      ui.showEditor(); // ensure editor visible
      await new Promise(r => setTimeout(r, 50)); // allow DOM render

      await loadXML(version.bpmn_xml);

      setReadOnly(true);
    },

    onRestore: async (versionId) => {

      const { data: version } =
        await service.getVersionById(versionId);

      setReadOnly(false);

      await service.saveVersion(
        currentDiagramId,
        USER_ID,
        version.bpmn_xml,
        `Restored from v${version.version}`
      );

      const { data: details } =
        await service.getDiagramDetails(currentDiagramId);

      ui.renderDiagramDetails(details);

      document.getElementById('versionModal').classList.add('hidden');
    }
  });
}

document.getElementById('btnNewOverview').onclick = async () => {
  currentDiagramId = null;
  await newEmptyDiagram();
  setReadOnly(false);
  ui.resetDiagramDetails();
  ui.showEditor();
};

document.getElementById('btnNewInside').onclick = async () => {
  currentDiagramId = null;
  await newEmptyDiagram();
  setReadOnly(false);
  ui.resetDiagramDetails();
};

document.getElementById('btnRename').onclick = async () => {
  if (!currentDiagramId) {
    alert('Save the diagram first.');
    return;
  }

  const currentName =
    document.getElementById('diagramName').textContent;

  const newName = prompt('New name:', currentName);

  if (!newName || newName === currentName) return;

  await service.renameDiagram(currentDiagramId, newName);

  document.getElementById('diagramName').textContent = newName;

  loadOverview(); // refresh table
};

document.getElementById('btnSave').onclick = saveDiagram;
document.getElementById('btnBack').onclick = () => { ui.showOverview(); loadOverview(); };
document.getElementById('btnShare').onclick = shareDiagram;
document.getElementById('btnDelete').onclick = deleteCurrent;
document.getElementById('btnHistory').onclick = async () => {
  openHistoryModal(currentDiagramId);
};

document.getElementById('closeVersionModal').onclick = () => {
  document.getElementById('versionModal')
    .classList.add('hidden');
};

// Handle share link auto-load
const sharedId = getSharedDiagramId();
if (sharedId) {
  openDiagram(sharedId);
  setReadOnly(true);
} else {
  loadOverview();
}

enableInlineRename();