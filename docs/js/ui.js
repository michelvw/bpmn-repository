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