let modeler;
let readOnly = false;

export function initModeler() {
  modeler = new window.BpmnJS({ container: '#canvas' });
}

export async function loadXML(xml) {
  await modeler.importXML(xml);
}

export async function getXML() {
  return (await modeler.saveXML({ format: true })).xml;
}

export function setReadOnly(state) {
  readOnly = state;
  modeler.get('canvas').getContainer().style.pointerEvents = state ? 'none' : 'auto';
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

    <bpmn:process id="Process_1" isExecutable="false" />

    <bpmndi:BPMNDiagram id="BPMNDiagram_1">
      <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1" />
    </bpmndi:BPMNDiagram>

  </bpmn:definitions>`;

  await loadXML(empty);
}