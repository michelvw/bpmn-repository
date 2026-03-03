export function showOverview() {
  overviewPage.style.display = 'block';
  editorPage.style.display = 'none';
}

export function showEditor() {
  overviewPage.style.display = 'none';
  editorPage.style.display = 'block';
}

export function renderTable(diagrams, onOpen, onDelete) {

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
      <td>
        <button class="open-btn">Open</button>
        <button class="delete-btn">Delete</button>
      </td>
    `;

    row.querySelector('.open-btn').onclick = () => onOpen(d.id);

    row.querySelector('.delete-btn').onclick = () => {
      if (confirm('Delete this diagram?')) {
        onDelete(d.id);
      }
    };

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

export function renderVersionHistory(versions, onRestore) {

  const container = document.getElementById('versionList');
  container.innerHTML = '';

  versions.forEach(v => {

    const div = document.createElement('div');
    div.style.marginBottom = '10px';

    div.innerHTML = `
      <strong>v${v.version}</strong>
      (${new Date(v.created_at).toLocaleString()})
      <br/>
      ${v.comment || '-'}
      <br/>
      <button data-id="${v.id}">Restore</button>
      <hr/>
    `;

    div.querySelector('button').onclick =
      () => onRestore(v.id);

    container.appendChild(div);
  });

  document.getElementById('versionModal').style.display = 'block';
}