let modeler;

/* ===============================
   INITIALIZE MODELER
================================= */

export function initModeler() {

  modeler = new BpmnJS({
    container: '#canvas'
  });

}


/* ===============================
   LOAD BPMN XML
================================= */

export async function loadXML(xml) {
  await modeler.importXML(xml);

  const canvas = modeler.get("canvas");
  const elementRegistry = modeler.get("elementRegistry");

  setTimeout(() => {
    const elements = elementRegistry.getAll();

    // Only zoom if diagram has more than the root element
    if (elements.length > 1) {
      canvas.zoom("fit-viewport");
    }   
  }, 0);
}


/* ===============================
   GET XML FROM MODEL
================================= */

export async function getXML() {

  const { xml } =
    await modeler.saveXML({ format: true });

  return xml;
}


/* ===============================
   NEW EMPTY DIAGRAM
================================= */

export async function newEmptyDiagram() {

  const emptyDiagram = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
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

  await loadXML(emptyDiagram);
}


/* ===============================
   READ ONLY MODE
================================= */

export function setReadOnly(readOnly) {

  const palette =
    document.querySelector('.djs-palette');

  const contextPad =
    document.querySelector('.djs-context-pad');

  const directEditing =
    modeler.get('directEditing');

  if (readOnly) {

    if (palette)
      palette.style.display = 'none';

    if (contextPad)
      contextPad.style.display = 'none';

    directEditing.cancel();

  } else {

    if (palette)
      palette.style.display = 'block';

    if (contextPad)
      contextPad.style.display = 'block';
  }
}