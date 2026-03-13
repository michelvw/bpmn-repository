let currentView = 'tiles'; // 'tiles' or 'table'
let activeTagFilter = null;

const TAG_COLORS = [
  { name: 'Blue',   value: '#0d6efd' },
  { name: 'Purple', value: '#6f42c1' },
  { name: 'Pink',   value: '#d63384' },
  { name: 'Red',    value: '#dc3545' },
  { name: 'Orange', value: '#fd7e14' },
  { name: 'Yellow', value: '#ffc107' },
  { name: 'Green',  value: '#198754' },
  { name: 'Teal',   value: '#20c997' },
  { name: 'Cyan',   value: '#0dcaf0' },
  { name: 'Gray',   value: '#6c757d' },
];

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

export function showAdmin() {
  document.getElementById('authPage').classList.add('d-none');
  document.getElementById('overviewPage').classList.add('d-none');
  document.getElementById('editorPage').classList.add('d-none');
  document.getElementById('adminPage').classList.remove('d-none');
}

export function showOverview() {
  document.getElementById('authPage').classList.add('d-none');
  document.getElementById('editorPage').classList.add('d-none');
  document.getElementById('adminPage').classList.add('d-none');
  document.getElementById('overviewPage').classList.remove('d-none');
}

export function renderAdminUserTable(users, currentUserId, onDelete) {
  const tbody = document.getElementById('adminUserTable');
  tbody.innerHTML = '';

  users.forEach(u => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${u.username || '-'}</td>
      <td>${u.is_admin ? '<span class="badge bg-danger">Admin</span>' : '<span class="badge bg-secondary">User</span>'}</td>
      <td>
        ${u.id !== currentUserId && !u.is_admin ? `
          <button class="btn btn-sm btn-outline-danger delete-user-btn">
            <i class="bi bi-trash me-1"></i>Delete
          </button>
        ` : '-'}
      </td>
    `;

    if (u.id !== currentUserId && !u.is_admin) {
      row.querySelector('.delete-user-btn').onclick = () => {
        showConfirmModal(
          'Delete User',
          `This will permanently delete "${u.username}" and all their diagrams. Are you sure?`,
          () => onDelete(u.id),
          'Delete',
          'btn-danger'
        );
      };
    }

    tbody.appendChild(row);
  });
}

export function showAnonymousEditor() {
  document.getElementById('authPage').classList.add('d-none');
  document.getElementById('overviewPage').classList.add('d-none');
  document.getElementById('editorPage').classList.remove('d-none');

  // Hide authenticated toolbar elements
  document.getElementById('btnSave').classList.add('d-none');
  document.getElementById('btnBack').classList.add('d-none');
  document.getElementById('btnShare').classList.add('d-none');
  document.getElementById('btnNewInside').closest('.btn-group').classList.add('d-none');
  document.getElementById('btnDelete').classList.add('d-none');
  document.getElementById('btnHistory').classList.add('d-none');
  document.getElementById('btnRename').classList.add('d-none');

  // Show login button and keep details visible
  document.getElementById('btnLoginAnonymous').classList.remove('d-none');
  document.getElementById('btnToggleDetails').classList.remove('d-none');
}

export function showEditor() {
  document.getElementById('authPage').classList.add('d-none');
  document.getElementById('overviewPage').classList.add('d-none');
  document.getElementById('editorPage').classList.remove('d-none');

  // Restore all toolbar elements
  document.getElementById('btnSave').classList.remove('d-none');
  document.getElementById('btnBack').classList.remove('d-none');
  document.getElementById('btnShare').classList.remove('d-none');
  document.getElementById('btnNewInside').closest('.btn-group').classList.remove('d-none');
  document.getElementById('btnDelete').classList.remove('d-none');
  document.getElementById('btnHistory').classList.remove('d-none');
  document.getElementById('btnRename').classList.remove('d-none');

  // Hide login button
  document.getElementById('btnLoginAnonymous').classList.add('d-none');
}

/* ===============================
   DIAGRAM TABLE
================================= */
export function renderGrid(diagrams, currentUserId, onOpen, onDelete, onHistory, onPreview) {
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

  // Split into owned and collaborated
  const owned = diagrams.filter(d => d.owner_id === currentUserId);
  const collaborated = diagrams.filter(d => d.owner_id !== currentUserId);

  const renderTiles = (list, isCollaborated, container) => {
    list.forEach(d => {
      const versions = d.diagram_versions || [];
      const latestVersionObj = versions.length
        ? versions.reduce((a, b) => (a.version > b.version ? a : b))
        : null;
      const latestVersion = latestVersionObj ? latestVersionObj.version : '-';
      const latestCreatedBy = latestVersionObj?.created_by_user?.username || '-';
      const dateStr = d.updated_at ? new Date(d.updated_at).toLocaleString() : '-';
     
      const tags = d.diagram_tags || [];
      const tagsHtml = tags.length
        ? tags.map(t => `<span class="badge me-1" style="background-color: ${t.tags.color}">${t.tags.name}</span>`).join('')
        : '';

      const col = document.createElement('div');
      col.className = 'col';
      col.innerHTML = `
        <div class="card diagram-tile h-100" data-id="${d.id}">
          <div class="tile-preview">
            <div class="preview-placeholder"><i class="bi bi-diagram-3"></i></div>
          </div>
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-1">
              <h6 class="card-title mb-0 text-truncate me-2">${d.name}</h6>
              ${isCollaborated ? '<span class="badge bg-secondary text-nowrap"><i class="bi bi-people me-1"></i>Shared with me</span>' : ''}
            </div>
            <small class="text-muted d-block">
              <i class="bi bi-clock me-1"></i>${dateStr}
            </small>
            <small class="text-muted d-block">
              <i class="bi bi-layers me-1"></i>Version ${latestVersion} by ${latestCreatedBy}
            </small>
            <div class="mt-1">${tagsHtml}</div>
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
      container.appendChild(col);
    });
  };

  // Render owned diagrams
  if (owned.length > 0) {
    const ownedRow = document.createElement('div');
    ownedRow.className = 'row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3';
    grid.appendChild(ownedRow);
    renderTiles(owned, false, ownedRow);
  }

  // Divider + collaborated section
  if (collaborated.length > 0) {
    if (owned.length > 0) {
      grid.insertAdjacentHTML('beforeend', `
        <h6 class="text-muted mt-4"><i class="bi bi-people me-2"></i>Shared with me</h6>
        <hr class="mt-1 mb-3">
      `);
    }
    const collaboratedRow = document.createElement('div');
    collaboratedRow.className = 'row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3';
    grid.appendChild(collaboratedRow);
    renderTiles(collaborated, true, collaboratedRow);
  }

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

  const newSearch = searchInput.cloneNode(true);
  searchInput.replaceWith(newSearch);

  newSearch.addEventListener('input', () => {
    const query = newSearch.value.toLowerCase().trim();
    let visibleCount = 0;

    document.querySelectorAll('#diagramGrid .col').forEach(col => {
      const name = col.querySelector('.card-title')?.textContent.toLowerCase();
      if (!name) return; // skip divider cols
      const visible = name.includes(query);
      col.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    // Show/hide no results message
    let noResults = document.getElementById('noSearchResults');
    if (visibleCount === 0) {
      if (!noResults) {
        const msg = document.createElement('div');
        msg.id = 'noSearchResults';
        msg.className = 'col-12 text-center text-muted py-4';
        msg.innerHTML = `<i class="bi bi-search" style="font-size: 2rem;"></i><p class="mt-2">No diagrams match your search.</p>`;
        document.getElementById('diagramGrid').appendChild(msg);
      }
    } else {
      noResults?.remove();
    }
  });
}

export function renderTagFilterBar(tags, onFilter) {
  const bar = document.getElementById('tagFilterBar');
  // Keep the label, remove old tag buttons
  bar.innerHTML = '<small class="text-muted me-1"><i class="bi bi-tag me-1"></i>Filter:</small>';

  if (tags.length === 0) {
    bar.innerHTML += '<small class="text-muted">No tags yet.</small>';
    return;
  }

  // All button
  const allBtn = document.createElement('button');
  allBtn.className = `btn btn-sm ${activeTagFilter === null ? 'btn-secondary' : 'btn-outline-secondary'}`;
  allBtn.textContent = 'All';
  allBtn.onclick = () => { activeTagFilter = null; onFilter(null); renderTagFilterBar(tags, onFilter); };
  bar.appendChild(allBtn);

  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm';
    btn.style.backgroundColor = activeTagFilter === tag.id ? tag.color : 'transparent';
    btn.style.color = activeTagFilter === tag.id ? '#fff' : tag.color;
    btn.style.borderColor = tag.color;
    btn.style.border = `1px solid ${tag.color}`;
    btn.textContent = tag.name;
    btn.onclick = () => {
      activeTagFilter = activeTagFilter === tag.id ? null : tag.id;
      onFilter(activeTagFilter);
      renderTagFilterBar(tags, onFilter);
    };
    bar.appendChild(btn);
  });
}

export function renderTagsDropdown(currentTags, allTags, onAdd, onRemove, onColorChange) {
  const currentTagsEl = document.getElementById('currentTags');
  const suggestionsEl = document.getElementById('tagSuggestions');
  const tagInput = document.getElementById('tagInput');

  // Selected colour state
  let selectedColor = TAG_COLORS[0].value;

  // Render current tags as removable badges with colour change option
  currentTagsEl.innerHTML = '';
  if (currentTags.length === 0) {
    currentTagsEl.innerHTML = '<small class="text-muted d-block mb-1">No tags yet.</small>';
  } else {
    currentTags.forEach(t => {
      const wrapper = document.createElement('div');
      wrapper.className = 'd-flex align-items-center gap-1 mb-1';
      wrapper.innerHTML = `
        <span class="badge d-flex align-items-center gap-1" style="background-color: ${t.color}">
          ${t.name}
          <i class="bi bi-x remove-tag" style="cursor:pointer"></i>
        </span>
        <div class="d-flex gap-1 flex-wrap" style="max-width: 160px;">
          ${TAG_COLORS.map(c => `
            <div class="color-swatch ${c.value === t.color ? 'border border-dark' : ''}" 
                 data-color="${c.value}"
                 data-tag-id="${t.tagId}"
                 title="${c.name}"
                 style="width:16px; height:16px; border-radius:50%; background:${c.value}; cursor:pointer; border: 2px solid ${c.value === t.color ? '#000' : 'transparent'}">
            </div>
          `).join('')}
        </div>
      `;

      wrapper.querySelector('.remove-tag').onclick = () => onRemove(t.id);
      wrapper.querySelectorAll('.color-swatch').forEach(swatch => {
        swatch.onclick = () => onColorChange(swatch.dataset.tagId, swatch.dataset.color);
      });

      currentTagsEl.appendChild(wrapper);
    });
  }

  // Colour picker for new tags
  const colorPickerHtml = `
    <div class="d-flex gap-1 flex-wrap mb-1" id="newTagColorPicker">
      ${TAG_COLORS.map(c => `
        <div class="color-swatch-new ${c.value === selectedColor ? 'selected' : ''}"
             data-color="${c.value}"
             title="${c.name}"
             style="width:16px; height:16px; border-radius:50%; background:${c.value}; cursor:pointer; border: 2px solid ${c.value === selectedColor ? '#000' : 'transparent'}">
        </div>
      `).join('')}
    </div>
  `;

  // Render suggestions
  const currentTagIds = currentTags.map(t => t.tagId);
  const suggestions = allTags.filter(t => !currentTagIds.includes(t.id));
  suggestionsEl.innerHTML = colorPickerHtml;

  if (suggestions.length > 0) {
    const suggestionsWrapper = document.createElement('div');
    suggestionsWrapper.className = 'd-flex flex-wrap gap-1 mb-1';
    suggestions.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm';
      btn.style.backgroundColor = t.color;
      btn.style.color = '#fff';
      btn.style.border = 'none';
      btn.textContent = t.name;
      btn.onclick = () => onAdd(t.name, t.color);
      suggestionsWrapper.appendChild(btn);
    });
    suggestionsEl.appendChild(suggestionsWrapper);
  }

  // Wire up colour picker for new tags
  suggestionsEl.querySelectorAll('.color-swatch-new').forEach(swatch => {
    swatch.onclick = () => {
      selectedColor = swatch.dataset.color;
      suggestionsEl.querySelectorAll('.color-swatch-new').forEach(s => {
        s.style.border = `2px solid ${s.dataset.color === selectedColor ? '#000' : 'transparent'}`;
      });
    };
  });

  // Wire up add button
  const addBtn = document.getElementById('btnAddTag');
  const newAddBtn = addBtn.cloneNode(true);
  addBtn.replaceWith(newAddBtn);

  const handleAdd = () => {
    const value = tagInput.value.trim();
    if (!value) return;
    onAdd(value, selectedColor);
    tagInput.value = '';
  };

  newAddBtn.addEventListener('click', handleAdd);
  tagInput.onkeydown = (e) => { if (e.key === 'Enter') handleAdd(); };
}

export function setViewMode(mode) {
  currentView = mode;
  const grid = document.getElementById('diagramGrid');
  const table = document.getElementById('diagramTable');
  const btnTiles = document.getElementById('btnViewTiles');
  const btnTable = document.getElementById('btnViewTable');

  if (mode === 'tiles') {
    grid.classList.remove('d-none');
    table.classList.add('d-none');
    btnTiles.classList.add('active');
    btnTable.classList.remove('active');
  } else {
    grid.classList.add('d-none');
    table.classList.remove('d-none');
    btnTiles.classList.remove('active');
    btnTable.classList.add('active');
  }
}

export function renderTable(diagrams, currentUserId, onOpen, onDelete, onHistory) {
  const tbody = document.querySelector('#diagramTable tbody');
  tbody.innerHTML = '';

  const owned = diagrams.filter(d => d.owner_id === currentUserId);
  const collaborated = diagrams.filter(d => d.owner_id !== currentUserId);

  const renderRows = (list, isCollaborated) => {
    list.forEach(d => {
      const versions = d.diagram_versions || [];
      const latestVersion = versions.length ? Math.max(...versions.map(v => v.version)) : '-';
      const dateStr = d.updated_at ? new Date(d.updated_at).toLocaleString() : '-';
      const tags = d.diagram_tags || [];

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          ${d.name}
          ${isCollaborated ? '<span class="badge bg-secondary ms-1"><i class="bi bi-people"></i> Shared</span>' : ''}
        </td>
        <td>${tags.map(t => `<span class="badge me-1" style="background-color: ${t.tags.color}">${t.tags.name}</span>`).join('') || '-'}</td>
        <td>${dateStr}</td>
        <td>${latestVersion}</td>
        <td class="d-flex gap-1">
          <button class="btn btn-sm btn-outline-secondary open-btn">
            <i class="bi bi-folder2-open me-1"></i>Open
          </button>
          <button class="btn btn-sm btn-outline-secondary history-btn">
            <i class="bi bi-clock-history"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger delete-btn">
            <i class="bi bi-trash"></i>
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
  };

  renderRows(owned, false);

  if (collaborated.length > 0) {
    if (owned.length > 0) {
      const divider = document.createElement('tr');
      divider.innerHTML = `<td colspan="5" class="text-muted pt-3"><h6><i class="bi bi-people me-2"></i>Shared with me</h6></td>`;
      tbody.appendChild(divider);
    }
    renderRows(collaborated, true);
  }
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

  const maxVersion = versions.length ? Math.max(...versions.map(v => v.version)) : null;

  versions.forEach(v => {
    const card = document.createElement('div');
    card.className = 'card mb-2';

    const createdAt = v.created_at ? new Date(v.created_at) : null;
    const dateStr = createdAt && !isNaN(createdAt) ? createdAt.toLocaleString() : '-';
    const isLatest = v.version === maxVersion;

    card.innerHTML = `
      <div class="card-body">
        <h6 class="card-title mb-1">
          Version ${v.version}
          ${isLatest ? '<span class="badge bg-primary ms-2">Latest</span>' : ''}
        </h6>
        <h6 class="card-subtitle text-muted mb-2">${dateStr}</h6>
        <p class="card-text mb-1">${v.comment || '-'}</p>
        <p class="card-text mb-2">
          <small class="text-muted">
            <i class="bi bi-person me-1"></i>${v.created_by_user?.username || '-'}
          </small>
        </p>
        <div class="d-flex gap-1">
          ${isLatest ? `
            <button class="btn btn-sm btn-primary edit-btn">
              <i class="bi bi-pencil me-1"></i>Edit
            </button>
          ` : `
            <button class="btn btn-sm btn-outline-primary view-btn">
              <i class="bi bi-eye me-1"></i>View
            </button>
            <button class="btn btn-sm btn-outline-success restore-btn">
              <i class="bi bi-arrow-counterclockwise me-1"></i>Restore as Latest
            </button>            
          `}
        </div>
      </div>
    `;

    if (isLatest) {
      card.querySelector('.edit-btn').onclick = () => handlers.onEdit(v);
    } else {
      card.querySelector('.view-btn').onclick = () => {
        if (document.activeElement) document.activeElement.blur();
        handlers.onView(v);
      };
      card.querySelector('.restore-btn').onclick = () => handlers.onRestore(v);
    }

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