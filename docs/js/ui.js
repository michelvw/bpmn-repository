export function showOverview() {
  overviewPage.style.display = 'block';
  editorPage.style.display = 'none';
}

export function showEditor() {
  overviewPage.style.display = 'none';
  editorPage.style.display = 'block';
}

export function renderTable(diagrams, onOpen) {
  const tbody = document.querySelector('#diagramTable tbody');
  tbody.innerHTML = '';

  diagrams.forEach(d => {
    const version = d.diagram_versions?.length
      ? Math.max(...d.diagram_versions.map(v => v.version))
      : 0;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${d.name}</td>
      <td>${new Date(d.updated_at).toLocaleString()}</td>
      <td>${version}</td>
      <td><button data-id="${d.id}">Open</button></td>
    `;
    row.querySelector('button').onclick = () => onOpen(d.id);
    tbody.appendChild(row);
  });
}

export function renderDiagramDetails(diagram) {

  document.getElementById('diagramName').textContent = diagram.name;

  const versions = diagram.diagram_versions || [];

  if (versions.length) {
    const latest = versions.reduce((a, b) => a.version > b.version ? a : b);

    document.getElementById('diagramVersion').textContent = latest.version;
    document.getElementById('diagramComment').textContent = latest.comment || '-';
  } else {
    document.getElementById('diagramVersion').textContent = '-';
    document.getElementById('diagramComment').textContent = '-';
  }

  document.getElementById('diagramOwner').textContent =
    diagram.owner?.username || '-';

  document.getElementById('diagramDate').textContent =
    new Date(diagram.updated_at).toLocaleString();
}