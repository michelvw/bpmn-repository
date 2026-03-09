/* ===============================
   UI MODULE
================================= */

/* ===============================
   PAGE SHOW/HIDE
================================= */
export function showAuth() {
  document.getElementById('authPage').classList.remove('d-none');
  document.getElementById('overviewPage').classList.add('d-none');
  document.getElementById('editorPage').classList.add('d-none');
}

export function showOverview() {
  document.getElementById('authPage').classList.add('d-none');
  document.getElementById('editorPage').classList.add('d-none');
  document.getElementById('overviewPage').classList.remove('d-none');
}

export function showEditor() {
  document.getElementById('authPage').classList.add('d-none');
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
    const latestVersion = versions.length ? Math.max(...versions.map(v => v.version)) : '-';
    const dateStr = d.updated_at ? new Date(d.updated_at).toLocaleString() : '-';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${d.name}</td>
      <td>${dateStr}</td>
      <td>${latestVersion}</td>
      <td class="d-flex gap-1">
        <button class="btn btn-sm btn-primary open-btn">Open</button>
        <button class="btn btn-sm btn-outline-secondary history-btn">History</button>
        <button class="btn btn-sm btn-danger delete-btn">Delete</button>
      </td>
    `;

    row.querySelector('.open-btn').onclick = () => onOpen(d.id);
    row.querySelector('.history-btn').onclick = () => onHistory(d.id);
    row.querySelector('.delete-btn').onclick = () => { if(confirm('Delete this diagram?')) onDelete(d.id); };

    tbody.appendChild(row);
  });
}

/* ===============================
   DIAGRAM DETAILS
================================= */
export function renderDiagramDetails(diagram) {
  const nameEl = document.getElementById('diagramName');
  nameEl.textContent = diagram.name || 'New Diagram';

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

  // Show details collapse
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
   VERSION HISTORY MODAL
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

    card.querySelector('.view-btn').onclick = () => {
      if(document.activeElement) document.activeElement.blur();
      handlers.onView(v);
    };
    card.querySelector('.restore-btn').onclick = () => handlers.onRestore(v);

    container.appendChild(card);
  });

  modal.show();
}

export function closeVersionModal() {
  const modalEl = document.getElementById('versionModal');
  const bsModal = bootstrap.Modal.getInstance(modalEl);
  if(bsModal) {
    if(document.activeElement && modalEl.contains(document.activeElement)) document.activeElement.blur();
    bsModal.hide();
  }
}

/* ===============================
   VIEWED VERSION (READ-ONLY)
================================= */
let _restoreCallback = null;

export function showViewedVersion(details, onRestore) {
  const nameEl = document.getElementById('diagramName');
  nameEl.textContent = `${details.name || 'Unnamed diagram'} (read-only)`;

  document.getElementById('diagramVersion').textContent = details.version || '-';
  document.getElementById('diagramComment').textContent = details.comment || '-';
  document.getElementById('diagramOwner').textContent = details.owner?.username || '-';

  const dateEl = document.getElementById('diagramDate');
  const d = details.updated_at ? new Date(details.updated_at) : (details.created_at ? new Date(details.created_at) : null);
  dateEl.textContent = d && !isNaN(d) ? d.toLocaleString() : '-';

  const detailsEl = document.getElementById('diagramDetails');
  bootstrap.Collapse.getOrCreateInstance(detailsEl).show();

  const btnSave = document.getElementById('btnSave');
  btnSave.textContent = 'Restore as Latest';
  btnSave.classList.replace('btn-primary', 'btn-success');
  btnSave.onclick = onRestore ?? null;
}

export function resetSaveButton(onSave) {
  const btnSave = document.getElementById('btnSave');
  btnSave.textContent = 'Save';
  btnSave.classList.replace('btn-success', 'btn-primary');
  btnSave.onclick = onSave;
}

/* ===============================
   RENAME
================================= */
export function enableRename(currentName, onSave) {
  const nameEl = document.getElementById('diagramName');
  const btn = document.getElementById('btnRename');

  // Replace name with input
  nameEl.innerHTML = `<input type="text" class="form-control form-control-sm" id="diagramRenameInput" value="${currentName}">`;

  const input = document.getElementById('diagramRenameInput');
  input.focus();
  input.select();

  // Change button to "Save"
  btn.textContent = 'Save';
  btn.classList.replace('btn-secondary', 'btn-success');

  const saveHandler = async () => {
    const newName = input.value.trim();
    if (!newName) return alert('Name cannot be empty');

    await onSave(newName);

    nameEl.textContent = newName;
    btn.textContent = 'Rename';
    btn.classList.replace('btn-success', 'btn-secondary');

    // Rebind original handler
    btn.onclick = () => enableRename(newName, onSave);
  };

  btn.onclick = saveHandler;
}