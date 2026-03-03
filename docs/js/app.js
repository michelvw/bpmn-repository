import { initModeler, newEmptyDiagram, loadXML, getXML, setReadOnly } from './modeler.js';
import * as service from './diagramService.js';
import * as ui from './ui.js';
import { generateShareLink, getSharedDiagramId } from './share.js';

const USER_ID = '78448143-9372-4636-9e2c-32e165b615d6';
let currentDiagramId = null;

initModeler();

async function loadOverview() {
  const { data } = await service.getDiagrams(USER_ID);
  ui.renderTable(data, openDiagram);
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
    const { data } = await service.createDiagram(name, USER_ID);
    currentDiagramId = data.id;
  }

  const xml = await getXML();
  const comment = prompt('Version comment:');
  await service.saveVersion(currentDiagramId, USER_ID, xml, comment);

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

document.getElementById('btnNewOverview').onclick = async () => {
  currentDiagramId = null;
  await newEmptyDiagram();
  ui.showEditor();
};

document.getElementById('btnNewInside').onclick = async () => {
  currentDiagramId = null;
  await newEmptyDiagram();
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

// Handle share link auto-load
const sharedId = getSharedDiagramId();
if (sharedId) {
  openDiagram(sharedId);
  setReadOnly(true);
} else {
  loadOverview();
}