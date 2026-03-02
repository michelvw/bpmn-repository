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
  <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1"/>
  </bpmn:definitions>`;
  await loadXML(empty);
}