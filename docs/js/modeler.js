let modeler;
let readOnly = false;

/**
 * Initialize BPMN modeler
 */
export function initModeler() {
  modeler = new window.BpmnJS({ container: '#canvas' });
}

/**
 * Load XML into modeler
 */
export async function loadXML(xml) {
  await modeler.importXML(xml);
}

/**
 * Get current diagram XML
 */
export async function getXML() {
  return (await modeler.saveXML({ format: true })).xml;
}

/**
 * Set read-only mode
 */
export function setReadOnly(state) {
  readOnly = state;
  modeler.get('canvas').getContainer().style.pointerEvents = state ? 'none' : 'auto';
}

/**
 * Create new empty diagram
 */
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

//Download functions
export async function downloadBpmn(filename = 'diagram') {
  const xml = await getXML();
  const blob = new Blob([xml], { type: 'application/xml' });
  triggerDownload(blob, `${filename}.bpmn`);
}

export async function downloadSvg(filename = 'diagram') {
  const { svg } = await modeler.saveSVG();
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  triggerDownload(blob, `${filename}.svg`);
}

export async function downloadPng(filename = 'diagram') {
  const { svg } = await modeler.saveSVG();

  const img = new Image();
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob(blob => {
      triggerDownload(blob, `${filename}.png`);
    }, 'image/png');
  };

  img.src = url;
}

/// Helper to trigger file download
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/// Initialize modeler with change listener
export function initModeler(onChanged) {
  modeler = new window.BpmnJS({ container: '#canvas' });
  modeler.on('commandStack.changed', onChanged);
}