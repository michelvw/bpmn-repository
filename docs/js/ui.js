export function showOverview() {
  overviewPage.style.display = 'block';
  editorPage.style.display = 'none';
}

export function showEditor() {
  overviewPage.style.display = 'none';
  editorPage.style.display = 'block';
}

export function renderTable(diagrams, onOpen, onDelete, onHistory) {

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
        <button class="history-btn">History</button>
        <button class="delete-btn">Delete</button>
      </td>
    `;

    row.querySelector('.open-btn').onclick = () => onOpen(d.id);

    row.querySelector('.history-btn').onclick =
  () => onHistory(d.id);

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

export function renderVersionHistory(versions, handlers) {

  const container = document.getElementById('versionList');
  container.innerHTML = '';

  versions.forEach(v => {

    const card = document.createElement('div');
    card.className = 'version-card';

    card.innerHTML = `
      <strong>Version ${v.version}</strong><br>
      <small>${new Date(v.created_at).toLocaleString()}</small>
      <p>${v.comment || '-'}</p>
      <button class="view-btn">View</button>
      <button class="restore-btn">Restore as Latest</button>
    `;

    card.querySelector('.view-btn').onclick =
      () => handlers.onView(v.id);

    card.querySelector('.restore-btn').onclick =
      () => handlers.onRestore(v.id);

    container.appendChild(card);
  });

  document.getElementById('versionModal').classList.remove('hidden');
}