let bpmnInstance = null;
let currentMode = null; // "edit" | "view"

function destroyInstance() {
  if (bpmnInstance) {
    bpmnInstance.destroy();
    bpmnInstance = null;
  }
}

/* ===============================
   EDIT MODE
================================= */

export function enableModeling() {

  if (currentMode === "edit") return;

  destroyInstance();

  bpmnInstance = new window.BpmnJS({
    container: '#canvas'
  });

  currentMode = "edit";

  document.getElementById("modeBanner").style.display = "none";
}

/* ===============================
   VIEW MODE
================================= */

export function enableViewing() {

  if (currentMode === "view") return;

  destroyInstance();

  bpmnInstance = new window.BpmnNavigatedViewer({
    container: '#canvas'
  });

  currentMode = "view";

  document.getElementById("modeBanner").style.display = "block";
  document.getElementById("modeBanner").textContent = "Read-Only Mode (Viewing History)";
}

/* ===============================
   LOAD XML
================================= */

export async function loadXML(xml) {

  if (!bpmnInstance) enableModeling();

  await bpmnInstance.importXML(xml);

  const canvas = bpmnInstance.get('canvas');
  canvas.zoom('fit-viewport');
}

/* ===============================
   EXPORT XML
================================= */

export async function getXML() {

  if (currentMode !== "edit")
    throw new Error("Cannot export XML in view mode");

  const result = await bpmnInstance.saveXML({ format: true });

  return result.xml;
}

/* ===============================
   EMPTY DIAGRAM
================================= */

export async function newEmptyDiagram() {

  enableModeling();

  const empty = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
id="Definitions_1"
targetNamespace="http://bpmn.io/schema/bpmn">

<bpmn:process id="Process_1" isExecutable="false"/>

<bpmndi:BPMNDiagram id="BPMNDiagram_1">
<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1"/>
</bpmndi:BPMNDiagram>

</bpmn:definitions>`;

  await loadXML(empty);
}