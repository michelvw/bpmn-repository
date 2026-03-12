/* ===============================
   UI MODULE
================================= */
// Globally fix aria-hidden focus issue for all modals
document.addEventListener('hide.bs.modal', () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}, true);

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
        <button class="btn btn-sm btn-primary open-btn">
          <i class="bi bi-folder2-open me-1"></i>Open
        </button>
        <button class="btn btn-sm btn-outline-secondary history-btn">
          <i class="bi bi-clock-history me-1"></i>History
        </button>
        <button class="btn btn-sm btn-outline-danger delete-btn">
          <i class="bi bi-trash me-1"></i>Delete
        </button>
      </td>
    `;

    row.querySelector('.open-btn').onclick = () => onOpen(d.id);
    row.querySelector('.history-btn').onclick = () => onHistory(d.id);
    row.querySelector('.delete-btn').onclick = () => {
      showConfirmModal(
        'Delete Diagram',
        'This will delete the diagram and all version history. Are you sure?',
        () => onDelete(d.id),
        'Delete',
        'btn-danger'
      );
    };

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
          <button class="btn btn-sm btn-outline-primary view-btn">
            <i class="bi bi-eye me-1"></i>View
          </button>
          <button class="btn btn-sm btn-outline-success restore-btn">
            <i class="bi bi-arrow-counterclockwise me-1"></i>Restore as Latest
          </button>
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

export function showViewedVersion(details, onRestore) {
  const nameEl = document.getElementById('diagramName');
  nameEl.textContent = `${details.name || 'Unnamed diagram'} (read-only)`;

  document.getElementById('diagramVersion').textContent = details.version || '-';
  document.getElementById('diagramComment').textContent = details.comment || '-';
  document.getElementById('diagramOwner').textContent = details.owner?.username || '-';

  const dateEl = document.getElementById('diagramDate');
  const d = details.updated_at ? new Date(details.updated_at) : (details.created_at ? new Date(details.created_at) : null);
  dateEl.textContent = d && !isNaN(d) ? d.toLocaleString() : '-';

  const btnSave = document.getElementById('btnSave');
  btnSave.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i> Restore as Latest';
  btnSave.classList.replace('btn-primary', 'btn-success');
  btnSave.onclick = onRestore ?? null;
}

export function resetSaveButton(onSave) {
  const btnSave = document.getElementById('btnSave');
  btnSave.innerHTML = '<i class="bi bi-floppy"></i> Save';
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
    if (!newName) { showToast('Name cannot be empty', 'warning'); return; }

    await onSave(newName);

    nameEl.textContent = newName;
    btn.textContent = 'Rename';
    btn.classList.replace('btn-success', 'btn-secondary');

    // Rebind original handler
    btn.onclick = () => enableRename(newName, onSave);
  };

  btn.onclick = saveHandler;
}

export function showToast(message, type = 'success') {
  const toastEl = document.getElementById('appToast');
  const toastMsg = document.getElementById('toastMessage');

  // Reset classes and apply the right background
  toastEl.className = `toast align-items-center border-0 text-bg-${type}`;
  toastMsg.textContent = message;

  bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3000 }).show();
}

export function showInputModal(title, placeholder, onConfirm) {
  const modalEl = document.getElementById('inputModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  const field = document.getElementById('inputModalField');
  const confirmBtn = document.getElementById('inputModalConfirm');

  document.getElementById('inputModalTitle').textContent = title;
  field.placeholder = placeholder;
  field.value = '';

  // Clone confirm button to remove previous listeners
  const newConfirm = confirmBtn.cloneNode(true);
  confirmBtn.replaceWith(newConfirm);

 const handleConfirm = () => {
    const value = field.value.trim();
    if (!value) return;
    document.activeElement?.blur();
    modal.hide();
    modalEl.addEventListener('hidden.bs.modal', () => {
      onConfirm(value).catch(err => {
        console.error(err);
        showToast(err.message || 'Something went wrong', 'danger');
      });
    }, { once: true });
  };

  newConfirm.addEventListener('click', handleConfirm);

  // Also allow Enter key to confirm
  field.onkeydown = (e) => { if (e.key === 'Enter') handleConfirm(); };

  modal.show();
  modalEl.addEventListener('shown.bs.modal', () => field.focus(), { once: true });
}

export function showShareModal(link) {
  const modalEl = document.getElementById('shareModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  document.getElementById('shareLink').value = link;

  const copyBtn = document.getElementById('btnCopyLink');
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(link);
    copyBtn.textContent = 'Copied!';
    setTimeout(() => copyBtn.textContent = 'Copy', 2000);
  };

  modal.show();
}

export function showConfirmModal(title, message, onConfirm, confirmLabel = 'Confirm', confirmClass = 'btn-danger') {
  const modalEl = document.getElementById('confirmModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalBody').textContent = message;

  const confirmBtn = document.getElementById('confirmModalConfirm');
  confirmBtn.textContent = confirmLabel;
  confirmBtn.className = `btn ${confirmClass}`;

  const newConfirm = confirmBtn.cloneNode(true);
  confirmBtn.replaceWith(newConfirm);

  newConfirm.addEventListener('click', () => {
    modal.hide();
    onConfirm();
  });

  modal.show();
}