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
export function renderGrid(diagrams, onOpen, onDelete, onHistory, onPreview) {
  const grid = document.getElementById('diagramGrid');
  grid.innerHTML = '';

  if (diagrams.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center text-muted py-5">
        <i class="bi bi-diagram-3" style="font-size: 3rem;"></i>
        <p class="mt-3">No diagrams yet. Create your first one!</p>
      </div>`;
    return;
  }

  diagrams.forEach(d => {
    const versions = d.diagram_versions || [];
    const latestVersionObj = versions.length
      ? versions.reduce((a, b) => (a.version > b.version ? a : b))
      : null;
    const latestVersion = latestVersionObj ? latestVersionObj.version : '-';
    const latestCreatedBy = latestVersionObj?.created_by_user?.username || '-';
    const dateStr = d.updated_at ? new Date(d.updated_at).toLocaleString() : '-';

    const col = document.createElement('div');
    col.className = 'col';
    col.innerHTML = `
      <div class="card diagram-tile h-100" data-id="${d.id}">
        <div class="tile-preview">
          <div class="preview-placeholder"><i class="bi bi-diagram-3"></i></div>
        </div>
        <div class="card-body">
          <h6 class="card-title mb-1 text-truncate">${d.name}</h6>
          <small class="text-muted d-block">
            <i class="bi bi-clock me-1"></i>${dateStr}
          </small>
          <small class="text-muted d-block">
            <i class="bi bi-layers me-1"></i>Version ${latestVersion} by ${latestCreatedBy}
          </small>
        </div>
        <div class="card-footer bg-white border-top-0 d-flex gap-1 pt-0">
          <button class="btn btn-sm btn-outline-secondary open-btn flex-grow-1">
            <i class="bi bi-folder2-open me-1"></i>Open
          </button>
          <button class="btn btn-sm btn-outline-secondary history-btn">
            <i class="bi bi-clock-history"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger delete-btn">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;

    col.querySelector('.open-btn').onclick = (e) => { e.stopPropagation(); onOpen(d.id); };
    col.querySelector('.history-btn').onclick = (e) => { e.stopPropagation(); onHistory(d.id); };
    col.querySelector('.delete-btn').onclick = (e) => {
      e.stopPropagation();
      showConfirmModal(
        'Delete Diagram',
        'This will delete the diagram and all version history. Are you sure?',
        () => onDelete(d.id),
        'Delete',
        'btn-danger'
      );
    };

    col.querySelector('.diagram-tile').onclick = () => onOpen(d.id);
    grid.appendChild(col);
  });

  setupLazyPreviews(onPreview);
  setupSearch();
}

function setupLazyPreviews(onPreview) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const tile = entry.target;
        const id = tile.dataset.id;
        const previewEl = tile.querySelector('.tile-preview');

        // Only load if still showing placeholder
        if (!previewEl.querySelector('.preview-placeholder')) return;

        previewEl.innerHTML = '<span class="preview-loading">Loading preview...</span>';
        observer.unobserve(tile);

        onPreview(id).then(svg => {
          if (svg) {
            previewEl.innerHTML = '';
            const img = document.createElement('img');
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
            img.style.cssText = 'max-width:100%; max-height:160px; object-fit:contain;';
            previewEl.appendChild(img);
          } else {
            previewEl.innerHTML = '<div class="preview-placeholder"><i class="bi bi-diagram-3"></i></div>';
          }
        }).catch(() => {
          previewEl.innerHTML = '<div class="preview-placeholder"><i class="bi bi-diagram-3"></i></div>';
        });
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.diagram-tile').forEach(tile => observer.observe(tile));
}

function setupSearch() {
  const searchInput = document.getElementById('diagramSearch');
  if (!searchInput) return;

  // Remove previous listener by replacing element
  const newSearch = searchInput.cloneNode(true);
  searchInput.replaceWith(newSearch);

  newSearch.addEventListener('input', () => {
    const query = newSearch.value.toLowerCase().trim();
    document.querySelectorAll('#diagramGrid .col').forEach(col => {
      const name = col.querySelector('.card-title').textContent.toLowerCase();
      col.style.display = name.includes(query) ? '' : 'none';
    });
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
  document.getElementById('diagramCreatedBy').textContent = latest?.created_by_user?.username || '-';

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
  document.getElementById('diagramCreatedBy').textContent = '-';
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
        <p class="card-text mb-1">${v.comment || '-'}</p>
        <p class="card-text mb-2">
          <small class="text-muted">
            <i class="bi bi-person me-1"></i>${v.created_by_user?.username || '-'}
          </small>
        </p>
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

export function showShareModal(link, isPublic, collaborators, users, onTogglePublic, onAddCollaborator, onRemoveCollaborator) {
  const modalEl = document.getElementById('shareModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);

  // Public toggle
  const toggle = document.getElementById('togglePublic');
  const linkSection = document.getElementById('publicLinkSection');
  const shareLinkInput = document.getElementById('shareLink');

  toggle.checked = isPublic;
  linkSection.classList.toggle('d-none', !isPublic);
  shareLinkInput.value = link;

  const newToggle = toggle.cloneNode(true);
  toggle.replaceWith(newToggle);
  newToggle.addEventListener('change', async () => {
    await onTogglePublic(newToggle.checked);
    linkSection.classList.toggle('d-none', !newToggle.checked);
  });

  // Copy button
  const copyBtn = document.getElementById('btnCopyLink');
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(link);
    copyBtn.innerHTML = '<i class="bi bi-clipboard-check"></i> Copied!';
    setTimeout(() => copyBtn.innerHTML = '<i class="bi bi-clipboard"></i> Copy', 2000);
  };

  // Populate user select — exclude already added collaborators
  const select = document.getElementById('collaboratorSelect');
  const collaboratorUserIds = collaborators.map(c => c.user_id);
  select.innerHTML = '<option value="">Select a user...</option>';
  users
    .filter(u => !collaboratorUserIds.includes(u.id))
    .forEach(u => {
      const option = document.createElement('option');
      option.value = u.id;
      option.textContent = u.username;
      select.appendChild(option);
    });

  // Render collaborator list
  renderCollaboratorList(collaborators, onRemoveCollaborator);

  // Add collaborator button
  const addBtn = document.getElementById('btnAddCollaborator');
  const newAddBtn = addBtn.cloneNode(true);
  addBtn.replaceWith(newAddBtn);

  newAddBtn.addEventListener('click', async () => {
    const userId = select.value;
    if (!userId) return ui.showToast('Please select a user', 'warning');
    await onAddCollaborator(userId);
  });

  modal.show();
}

function renderCollaboratorList(collaborators, onRemove) {
  const list = document.getElementById('collaboratorList');
  list.innerHTML = '';

  if (collaborators.length === 0) {
    list.innerHTML = '<li class="list-group-item text-muted small">No collaborators yet.</li>';
    return;
  }

  collaborators.forEach(c => {
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center px-0';
    li.innerHTML = `
      <span><i class="bi bi-person me-2"></i>${c.user?.username || 'Unknown'}</span>
      <button class="btn btn-sm btn-outline-danger remove-btn">
        <i class="bi bi-person-dash"></i>
      </button>
    `;
    li.querySelector('.remove-btn').onclick = () => onRemove(c.id);
    list.appendChild(li);
  });
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