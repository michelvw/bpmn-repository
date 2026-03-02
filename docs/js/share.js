export function generateShareLink(diagramId) {
  return `${window.location.origin}${window.location.pathname}?diagram=${diagramId}`;
}

export function getSharedDiagramId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('diagram');
}