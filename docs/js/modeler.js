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

  // Delay until rendering finishes
  setTimeout(() => {
    const elements = elementRegistry.getAll();

    // Compute bounds of all shapes
    const bounds = elements
      .map(e => e.businessObject && e.width && e.height ? e : null)
      .filter(Boolean)
      .map(e => canvas.getBBox(e));

    // Only zoom if we have valid bounds
    if (bounds.length) {
      const finite = bounds.every(b => isFinite(b.x) && isFinite(b.y) && isFinite(b.width) && isFinite(b.height));
      if (finite) {
        canvas.zoom("fit-viewport");
      }
    }
  }, 100); // slightly larger timeout ensures rendering
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