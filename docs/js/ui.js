// ui.js

/* ===============================
      PAGE SHOW/HIDE
================================= */

export function showOverview() {
  document.getElementById('overviewPage').classList.remove('d-none');
  document.getElementById('editorPage').classList.add('d-none');
}

export function showEditor() {
  document.getElementById('overviewPage').classList.add('d-none');
  document.getElementById('editorPage').classList.remove('d-none');
}

/* ===============================
      DIAGRAM TABLE
================================= */

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
      <td class="d-flex gap-1">
        <button class="btn btn-sm btn-primary open-btn">Open</button>
        <button class="btn btn-sm btn-outline-secondary history-btn">History</button>
        <button class="btn btn-sm btn-danger delete-btn">Delete</button>
      </td>
    `;

    row.querySelector('.open-btn').onclick = () => onOpen(d.id);
    row.querySelector('.history-btn').onclick = () => onHistory(d.id);
    row.querySelector('.delete-btn').onclick = () => {
      if (confirm('Delete this diagram?')) onDelete(d.id);
    };

    tbody.appendChild(row);
  });
}

/* ===============================
      DIAGRAM DETAILS
================================= */

export function renderDiagramDetails(diagram) {
  document.getElementById('diagramName').textContent = diagram.name;

  const versions = diagram.diagram_versions || [];
  const latest = versions.length ? versions.reduce((a, b) => a.version > b.version ? a : b) : null;

  document.getElementById('diagramVersion').textContent = latest?.version || '-';
  document.getElementById('diagramComment').textContent = latest?.comment || '-';
  document.getElementById('diagramOwner').textContent = diagram.owner?.username || '-';
  document.getElementById('diagramDate').textContent = new Date(diagram.updated_at).toLocaleString();
}

export function resetDiagramDetails() {
  document.getElementById('diagramName').textContent = 'New Diagram';
  document.getElementById('diagramVersion').textContent = '-';
  document.getElementById('diagramComment').textContent = '-';
  document.getElementById('diagramOwner').textContent = '-';
  document.getElementById('diagramDate').textContent = '-';
}

/* ===============================
      VERSION HISTORY
================================= */

export function renderVersionHistory(versions, handlers) {
  const modalEl = document.getElementById('versionModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const container = document.getElementById('versionList');
  container.innerHTML = '';

  versions.forEach(v => {
    const card = document.createElement('div');
    card.className = 'card mb-2';

    card.innerHTML = `
      <div class="card-body">
        <h6 class="card-title mb-1">Version ${v.version}</h6>
        <h6 class="card-subtitle text-muted mb-2">${new Date(v.created_at).toLocaleString()}</h6>
        <p class="card-text mb-2">${v.comment || '-'}</p>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline-primary view-btn">View</button>
          <button class="btn btn-sm btn-success restore-btn">Restore as Latest</button>
        </div>
      </div>
    `;

    card.querySelector('.view-btn').onclick = () => handlers.onView(v.id);
    card.querySelector('.restore-btn').onclick = () => handlers.onRestore(v.id);

    container.appendChild(card);
  });

  modal.show();
}