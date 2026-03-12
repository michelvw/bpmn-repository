let modeler = null;
let _onChanged = null;

function createModeler(readOnly) {
  if (modeler) {
    modeler.destroy();
    modeler = null;
  }

  if (readOnly) {
    modeler = new window.BpmnViewer({ container: '#canvas' });
  } else {
    modeler = new window.BpmnModeler({ container: '#canvas' });
    modeler.on('commandStack.changed', _onChanged);
  }
}

export function initModeler(onChanged) {
  _onChanged = onChanged;
  createModeler(false);
}

export async function loadXML(xml, readOnly = false) {
  const needsSwap = (readOnly && !(modeler instanceof window.BpmnViewer)) ||
                    (!readOnly && !(modeler instanceof window.BpmnModeler));
  if (needsSwap) createModeler(readOnly);
  await modeler.importXML(xml);
}

export function setReadOnly(state) {
  // No-op — kept for backwards compatibility
}

export async function getXML() {
  return (await modeler.saveXML({ format: true })).xml;
}

export async function newEmptyDiagram() {
  createModeler(false);
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
  await modeler.importXML(empty);
}

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
    canvas.toBlob(blob => triggerDownload(blob, `${filename}.png`), 'image/png');
  };
  img.src = url;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}