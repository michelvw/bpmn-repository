/* ===============================
   UI MODULE
================================= */

/* ===============================
   PAGE SHOW/HIDE
================================= */
export function showOverview() {
  document.getElementById('authPage').classList.add('d-none');
  document.getElementById('editorPage').classList.add('d-none');
  document.getElementById('overviewPage').classList.remove('d-none');
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
    const versions = d.diagram_versions || [];
    const latestVersion = versions.length ? Math.max(...versions.map(v => v.version)) : 0;

    const row = document.createElement('tr');

    const dateStr = d.updated_at ? new Date(d.updated_at).toLocaleString() : '-';

    row.innerHTML = `
      <td>${d.name}</td>
      <td>${dateStr}</td>
      <td>${latestVersion || '-'}</td>
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
  document.getElementById('diagramName').textContent = diagram.name || 'New Diagram';

  const versions = diagram.diagram_versions || [];
  const latest = versions.length
    ? versions.reduce((a, b) => (a.version > b.version ? a : b))
    : null;

  document.getElementById('diagramVersion').textContent = latest?.version || '-';
  document.getElementById('diagramComment').textContent = latest?.comment || '-';
  document.getElementById('diagramOwner').textContent = diagram.owner?.username || '-';

  const dateEl = document.getElementById('diagramDate');
  if (diagram.updated_at) {
    const d = new Date(diagram.updated_at);
    dateEl.textContent = isNaN(d) ? '-' : d.toLocaleString();
  } else {
    dateEl.textContent = '-';
  }

  // show collapse
  const detailsEl = document.getElementById('diagramDetails');
  const bsCollapse = new bootstrap.Collapse(detailsEl, { toggle: false });
  bsCollapse.show();
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

    const createdAt = v.created_at ? new Date(v.created_at) : null;
    const dateStr = createdAt && !isNaN(createdAt) ? createdAt.toLocaleString() : '-';

    card.innerHTML = `
      <div class="card-body">
        <h6 class="card-title mb-1">Version ${v.version}</h6>
        <h6 class="card-subtitle text-muted mb-2">${dateStr}</h6>
        <p class="card-text mb-2">${v.comment || '-'}</p>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline-primary view-btn">View</button>
          <button class="btn btn-sm btn-success restore-btn">Restore as Latest</button>
        </div>
      </div>
    `;

    card.querySelector('.view-btn').onclick = () => handlers.onView(v);
    card.querySelector('.restore-btn').onclick = () => handlers.onRestore(v);

    container.appendChild(card);
  });

  modal.show();
}

export function closeVersionModal() {
  const modalEl = document.getElementById('versionModal');
  const bsModal = bootstrap.Modal.getInstance(modalEl);
  if (bsModal) bsModal.hide();
}

/* ===============================
   VIEWED VERSION
================================= */
export function showViewedVersion(details) {
  renderDiagramDetails(details);
}