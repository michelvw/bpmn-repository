let bpmnInstance;
let mode = 'edit'; // edit | view

function destroyInstance() {
  if (bpmnInstance) {
    bpmnInstance.destroy();
    bpmnInstance = null;
  }
}

export function initModeler() {
  enableEditing();
}

export function enableEditing() {

  destroyInstance();

  bpmnInstance = new window.BpmnJS({
    container: '#canvas'
  });

  mode = 'edit';

  document.getElementById('readOnlyBanner').style.display = 'none';
}

export function enableViewing() {

  destroyInstance();

  bpmnInstance = new window.BpmnNavigatedViewer({
    container: '#canvas'
  });

  mode = 'view';

  document.getElementById('readOnlyBanner').style.display = 'block';
}

export async function loadXML(xml) {
  await bpmnInstance.importXML(xml);
}

export async function getXML() {

  if (mode !== 'edit') {
    throw new Error('Cannot save while in read-only mode');
  }

  return (await bpmnInstance.saveXML({ format: true })).xml;
}

export async function newEmptyDiagram() {

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