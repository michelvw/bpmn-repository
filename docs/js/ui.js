let currentView = 'tiles'; // 'tiles' or 'table'
let activeTagFilter = new Set();

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

let sortColumn = 'updated_at';
let sortDirection = 'desc';

let ownedCollapsed = false;
let sharedCollapsed = false;


/* ===============================
  FUNCTION TO CONVERT DATES TO RELATIVE TIME
================================= */
function relativeTime(dateStr) {
  if (!dateStr) return '-';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  return new Date(dateStr).toLocaleDateString();
}

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

  // Ensure view mode is consistent
  const grid = document.getElementById('diagramGrid');
  const table = document.getElementById('diagramTableView');
  const btnTiles = document.getElementById('btnViewTiles');
  const btnTable = document.getElementById('btnViewTable');

  if (currentView === 'table') {
    grid.classList.add('d-none');
    table.classList.remove('d-none');
    btnTiles.classList.remove('active');
    btnTable.classList.add('active');
  } else {
    grid.classList.remove('d-none');
    table.classList.add('d-none');
    btnTiles.classList.add('active');
    btnTable.classList.remove('active');
  }
}
export function renderAdminUserTable(users, currentUserId, onDelete, onRename, onToggleAdmin, onResetPassword, onViewDiagrams) {
  const tbody = document.getElementById('adminUserTable');
  tbody.innerHTML = '';

  users.forEach(u => {
    const isSelf = u.id === currentUserId;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-3 py-2 fw-medium">${u.username || '-'}</td>
      <td class="px-3 py-2 small text-muted">${u.email || '-'}</td>
      <td class="px-3 py-2">
        ${u.is_admin
          ? '<span class="badge bg-danger">Admin</span>'
          : '<span class="badge bg-secondary">User</span>'}
      </td>
      <td class="px-3 py-2 small text-muted text-nowrap">
        ${u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : 'Never'}
      </td>
      <td class="px-3 py-2 small text-muted text-nowrap">
        ${u.created_at ? new Date(u.created_at).toLocaleString() : '-'}
      </td>
      <td class="px-3 py-2 text-end text-nowrap">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary rename-btn" title="Rename">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-secondary diagrams-btn" title="View Diagrams">
            <i class="bi bi-diagram-3"></i>
          </button>
          <button class="btn btn-outline-secondary reset-btn" title="Send Password Reset">
            <i class="bi bi-key"></i>
          </button>
          ${!isSelf ? `
            <button class="btn btn-outline-${u.is_admin ? 'warning' : 'success'} toggle-admin-btn"
                    title="${u.is_admin ? 'Demote to User' : 'Promote to Admin'}">
              <i class="bi bi-${u.is_admin ? 'arrow-down-circle' : 'arrow-up-circle'}"></i>
            </button>
            <button class="btn btn-outline-danger delete-btn" title="Delete">
              <i class="bi bi-trash"></i>
            </button>
          ` : ''}
        </div>
      </td>
    `;

    row.querySelector('.rename-btn').onclick = () => {
      showInputModal('Rename User', 'Enter new username', async (newName) => {
        await onRename(u.id, newName);
      });
    };

    row.querySelector('.diagrams-btn').onclick = () => onViewDiagrams(u.id, u.username);
    row.querySelector('.reset-btn').onclick = () => onResetPassword(u.id, u.username);

    if (!isSelf) {
      row.querySelector('.toggle-admin-btn').onclick = () => {
        showConfirmModal(
          u.is_admin ? 'Demote to User' : 'Promote to Admin',
          `${u.is_admin ? 'Remove admin rights from' : 'Grant admin rights to'} "${u.username}"?`,
          () => onToggleAdmin(u.id, !u.is_admin),
          'Confirm',
          u.is_admin ? 'btn-warning' : 'btn-success'
        );
      };

      row.querySelector('.delete-btn').onclick = () => {
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

export function showUserDiagramsModal(username, diagrams) {
  document.getElementById('userDiagramsUsername').textContent = username;

  const tbody = document.getElementById('userDiagramsList');
  const empty = document.getElementById('userDiagramsEmpty');
  tbody.innerHTML = '';

  if (diagrams.length === 0) {
    empty.classList.remove('d-none');
  } else {
    empty.classList.add('d-none');
    diagrams.forEach(d => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="px-3 fw-medium">${d.name}</td>
        <td class="px-3 small text-muted">${d.updatedAt ? new Date(d.updatedAt).toLocaleString() : '-'}</td>
        <td class="px-3 small text-muted text-center">${d.latestVersion}</td>
      `;
      tbody.appendChild(row);
    });
  }

  bootstrap.Modal.getOrCreateInstance(document.getElementById('userDiagramsModal')).show();
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

  if (owned.length > 0) {
    const ownedHeader = document.createElement('div');
    ownedHeader.className = 'd-flex justify-content-between align-items-center mt-2 mb-3';
    ownedHeader.style.cursor = 'pointer';
    ownedHeader.id = 'ownedSectionHeader';
    ownedHeader.innerHTML = `
      <h6 class="text-muted mb-0"><i class="bi bi-person me-2"></i>My Diagrams
        <span class="badge bg-secondary ms-2">${owned.length}</span>
      </h6>
      <i class="bi ${ownedCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'} text-muted"></i>
    `;
    grid.appendChild(ownedHeader);

    const ownedRow = document.createElement('div');
    ownedRow.id = 'ownedTilesSection';
    ownedRow.className = `row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3 ${ownedCollapsed ? 'd-none' : ''}`;
    grid.appendChild(ownedRow);
    renderTiles(owned, false, ownedRow);

    ownedHeader.onclick = () => {
      ownedCollapsed = !ownedCollapsed;
      ownedRow.classList.toggle('d-none', ownedCollapsed);
      ownedHeader.querySelector('i.bi-chevron-down, i.bi-chevron-right').className =
        `bi ${ownedCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'} text-muted`;
      syncTableCollapse();
    };
  }

  if (collaborated.length > 0) {
    const sharedHeader = document.createElement('div');
    sharedHeader.className = 'd-flex justify-content-between align-items-center mt-5 mb-3';
    sharedHeader.style.cursor = 'pointer';
    sharedHeader.id = 'sharedSectionHeader';
    sharedHeader.innerHTML = `
      <h6 class="text-muted mb-0"><i class="bi bi-people me-2"></i>Shared with me
        <span class="badge bg-secondary ms-2">${collaborated.length}</span>
      </h6>
      <i class="bi ${sharedCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'} text-muted"></i>
    `;
    grid.appendChild(sharedHeader);

    const collaboratedRow = document.createElement('div');
    collaboratedRow.id = 'sharedTilesSection';
    collaboratedRow.className = `row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3 ${sharedCollapsed ? 'd-none' : ''}`;
    grid.appendChild(collaboratedRow);
    renderTiles(collaborated, true, collaboratedRow);

    sharedHeader.onclick = () => {
      sharedCollapsed = !sharedCollapsed;
      collaboratedRow.classList.toggle('d-none', sharedCollapsed);
      sharedHeader.querySelector('i.bi-chevron-down, i.bi-chevron-right').className =
        `bi ${sharedCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'} text-muted`;
      syncTableCollapse();
    };
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
  bar.innerHTML = '<small class="text-muted me-1"><i class="bi bi-tag me-1"></i>Filter:</small>';

  if (tags.length === 0) {
    bar.innerHTML += '<small class="text-muted">No tags yet.</small>';
    return;
  }

  // All button
  const allBtn = document.createElement('button');
  allBtn.className = `btn btn-sm ${activeTagFilter.size === 0 ? 'btn-secondary' : 'btn-outline-secondary'}`;
  allBtn.textContent = 'All';
  allBtn.onclick = () => {
    activeTagFilter.clear();
    onFilter(activeTagFilter);
    renderTagFilterBar(tags, onFilter);
  };
  bar.appendChild(allBtn);

  tags.forEach(tag => {
    const isActive = activeTagFilter.has(tag.id);
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm';
    btn.style.backgroundColor = isActive ? tag.color : 'transparent';
    btn.style.color = isActive ? '#fff' : tag.color;
    btn.style.border = `1px solid ${tag.color}`;
    btn.textContent = tag.name;
    btn.onclick = () => {
      if (activeTagFilter.has(tag.id)) {
        activeTagFilter.delete(tag.id);
      } else {
        activeTagFilter.add(tag.id);
      }
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

  let selectedColor = TAG_COLORS[0].value;

  // Render current tags
  currentTagsEl.innerHTML = '';
  if (currentTags.length === 0) {
    currentTagsEl.innerHTML = '<small class="text-muted d-block mb-1">No tags yet.</small>';
  } else {
    currentTags.forEach(t => {
      const wrapper = document.createElement('div');
      wrapper.className = 'd-flex align-items-center justify-content-between mb-1 position-relative';

      const colorList = TAG_COLORS.map(c => `
        <div class="color-pick-option d-flex align-items-center gap-2 px-2 py-1" 
            data-color="${c.value}"
            data-tag-id="${t.tagId}"
            style="cursor:pointer; border-radius:4px;">
          <span style="width:14px; height:14px; border-radius:50%; background:${c.value}; 
                      display:inline-block; flex-shrink:0;
                      border: 2px solid ${c.value === t.color ? '#000' : 'transparent'}"></span>
          <span>${c.name}</span>
          ${c.value === t.color ? '<i class="bi bi-check ms-auto"></i>' : ''}
        </div>
      `).join('');

      wrapper.innerHTML = `
        <span class="badge color-badge-toggle" 
              style="background-color: ${t.color}; cursor:pointer">
          ${t.name} <i class="bi bi-chevron-down" style="font-size:0.65rem"></i>
        </span>
        <div class="color-pick-panel d-none bg-white border rounded shadow-sm py-1"
            style="position:absolute; left:0; top:100%; z-index:9999; min-width:130px;">
          <small class="text-muted px-2">Change colour</small>
          ${colorList}
        </div>
        <button class="btn btn-sm btn-link text-danger p-0 ms-2 remove-tag">
          <i class="bi bi-x-lg"></i>
        </button>
      `;

      // Toggle colour panel on badge click
      const badge = wrapper.querySelector('.color-badge-toggle');
      const panel = wrapper.querySelector('.color-pick-panel');
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('d-none');
      });

      // Colour pick
      wrapper.querySelectorAll('.color-pick-option').forEach(option => {
        option.addEventListener('mouseenter', () => option.style.backgroundColor = '#f0f0f0');
        option.addEventListener('mouseleave', () => option.style.backgroundColor = '');
        option.addEventListener('click', (e) => {
          e.stopPropagation();
          setTimeout(() => panel.classList.add('d-none'), 0);
          onColorChange(t.tagId, option.dataset.color);
        });
      });

      // Close panel when clicking elsewhere inside the parent dropdown
      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
          panel.classList.add('d-none');
        }
      }, { once: false });

      wrapper.querySelector('.remove-tag').onclick = () => onRemove(t.id);
      currentTagsEl.appendChild(wrapper);
    });
  }

  // Colour picker for new tags
  suggestionsEl.innerHTML = `
    <hr class="my-2">
    <div class="mb-3">
      <small class="text-muted d-block mb-2">Colour for new tag:</small>
      <div class="d-flex flex-wrap gap-1" id="newTagColorPicker">
        ${TAG_COLORS.map(c => `
          <div class="color-swatch-new"
               data-color="${c.value}"
               title="${c.name}"
               style="width:18px; height:18px; border-radius:50%; background:${c.value}; cursor:pointer; border: 2px solid ${c.value === selectedColor ? '#000' : 'transparent'}">
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Suggestions — existing tags not on this diagram
  const currentTagIds = currentTags.map(t => t.tagId);
  const suggestions = allTags.filter(t => !currentTagIds.includes(t.id));

  if (suggestions.length > 0) {
    const suggestionsWrapper = document.createElement('div');
    suggestionsWrapper.innerHTML = '<small class="text-muted d-block mb-1">Existing tags:</small>';
    const btnWrapper = document.createElement('div');
    btnWrapper.className = 'd-flex flex-wrap gap-1 mb-1';
    suggestions.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm';
      btn.style.cssText = `background-color: ${t.color}; color: #fff; border: none;`;
      btn.textContent = t.name;
      btn.onclick = () => onAdd(t.name, t.color);
      btnWrapper.appendChild(btn);
    });
    suggestionsWrapper.appendChild(btnWrapper);
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
  const table = document.getElementById('diagramTableView');
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
  const owned = diagrams.filter(d => d.owner_id === currentUserId);
  const collaborated = diagrams.filter(d => d.owner_id !== currentUserId);

  // Show/hide shared section
  const sharedSection = document.getElementById('sharedTableSection');
  sharedSection.classList.toggle('d-none', collaborated.length === 0);

  renderSingleTable(
    'myDiagramsTableHead',
    'myDiagramsTableBody',
    'myDiagramsEmpty',
    owned,
    false,
    onOpen, onDelete, onHistory
  );

  renderSingleTable(
    'sharedDiagramsTableHead',
    'sharedDiagramsTableBody',
    null,
    collaborated,
    true,
    onOpen, onDelete, onHistory
  );
  // Wire up collapsible headers
  const myHeader = document.getElementById('myTableHeader');
  const sharedHeader = document.getElementById('sharedTableHeader');

  if (myHeader) {
    myHeader.onclick = () => {
      ownedCollapsed = !ownedCollapsed;
      syncTableCollapse();
      // Sync tile view too
      const tilesSection = document.getElementById('ownedTilesSection');
      const tilesHeader = document.getElementById('ownedSectionHeader');
      if (tilesSection) tilesSection.classList.toggle('d-none', ownedCollapsed);
      if (tilesHeader) {
        tilesHeader.querySelector('i.bi-chevron-down, i.bi-chevron-right').className =
          `bi ${ownedCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'} text-muted`;
      }
    };
  }

  if (sharedHeader) {
    sharedHeader.onclick = () => {
      sharedCollapsed = !sharedCollapsed;
      syncTableCollapse();
      const tilesSection = document.getElementById('sharedTilesSection');
      const tilesHeader = document.getElementById('sharedSectionHeader');
      if (tilesSection) tilesSection.classList.toggle('d-none', sharedCollapsed);
      if (tilesHeader) {
        tilesHeader.querySelector('i.bi-chevron-down, i.bi-chevron-right').className =
          `bi ${sharedCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'} text-muted`;
      }
    };
  }
}

function renderSingleTable(headId, bodyId, emptyId, diagrams, isShared, onOpen, onDelete, onHistory) {
  const thead = document.getElementById(headId);
  const tbody = document.getElementById(bodyId);

  // Columns definition
  const columns = [
    { key: 'name',        label: 'Name',         sortable: true  },
    { key: 'tags',        label: 'Tags',          sortable: false },
    ...(isShared ? [{ key: 'owner', label: 'Owner', sortable: false }] : []),
    { key: 'updated_at',  label: 'Last Modified', sortable: true  },
    { key: 'created_at',  label: 'Created',       sortable: true  },
    { key: 'last_by',     label: 'Last Updated By', sortable: false },
    { key: 'version',     label: 'Version',       sortable: true  },
    { key: 'actions',     label: '',              sortable: false },
  ];

  // Render header
  thead.innerHTML = '';
  const tr = document.createElement('tr');
  tr.className = 'table-light border-bottom';

  columns.forEach(col => {
    const th = document.createElement('th');
    th.className = 'fw-semibold text-muted small px-3 py-2';
    th.style.whiteSpace = 'nowrap';

    if (col.sortable) {
      th.style.cursor = 'pointer';
      th.style.userSelect = 'none';
      const isActive = sortColumn === col.key;
      const icon = isActive
        ? (sortDirection === 'asc' ? 'bi-sort-up' : 'bi-sort-down')
        : 'bi-arrow-down-up';
      th.innerHTML = `${col.label} <i class="bi ${icon} ms-1 ${isActive ? 'text-primary' : 'text-muted opacity-50'}"></i>`;
      th.onclick = () => {
        if (sortColumn === col.key) {
          sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          sortColumn = col.key;
          sortDirection = 'asc';
        }
        renderSingleTable(headId, bodyId, emptyId, diagrams, isShared, onOpen, onDelete, onHistory);
      };
    } else {
      th.textContent = col.label;
    }

    tr.appendChild(th);
  });
  thead.appendChild(tr);

  // Sort diagrams
  const sorted = [...diagrams].sort((a, b) => {
    let valA, valB;
    switch (sortColumn) {
      case 'name':
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
        break;
      case 'updated_at':
        valA = new Date(a.updated_at || 0);
        valB = new Date(b.updated_at || 0);
        break;
      case 'created_at': {
        const versions = v => v.diagram_versions || [];
        valA = new Date(Math.min(...versions(a).map(v => new Date(v.created_at || 0))));
        valB = new Date(Math.min(...versions(b).map(v => new Date(v.created_at || 0))));
        break;
      }
      case 'version': {
        const maxV = d => Math.max(0, ...(d.diagram_versions || []).map(v => v.version));
        valA = maxV(a);
        valB = maxV(b);
        break;
      }
      default:
        return 0;
    }
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Show empty state
  if (emptyId) {
    document.getElementById(emptyId).classList.toggle('d-none', diagrams.length > 0);
  }

  // Render rows
  tbody.innerHTML = '';

  if (diagrams.length === 0) return;

  sorted.forEach((d, i) => {
    const versions = d.diagram_versions || [];
    const latestVersionObj = versions.length
      ? versions.reduce((a, b) => (a.version > b.version ? a : b))
      : null;
    const latestVersion = latestVersionObj?.version ?? '-';
    const lastUpdatedBy = latestVersionObj?.created_by_user?.username || '-';

    const firstVersionObj = versions.length
      ? versions.reduce((a, b) => (a.version < b.version ? a : b))
      : null;
    const createdAt = firstVersionObj?.created_at
      ? new Date(firstVersionObj.created_at).toLocaleString()
      : '-';

    const updatedAt = d.updated_at
      ? new Date(d.updated_at).toLocaleString()
      : '-';

    const tags = d.diagram_tags || [];
    const tagsHtml = tags.length
      ? tags.map(t => `<span class="badge rounded-pill me-1" style="background-color:${t.tags.color}; font-size:0.7rem">${t.tags.name}</span>`).join('')
      : '<span class="text-muted small">—</span>';

    const owner = d.owner?.username || '-';

    const row = document.createElement('tr');
    row.className = i % 2 === 0 ? '' : 'table-light';
    row.style.cursor = 'pointer';

    row.innerHTML = `
      <td class="px-3 py-2 fw-medium">${d.name}</td>
      <td class="px-3 py-2">${tagsHtml}</td>
      ${isShared ? `<td class="px-3 py-2 small text-muted">${owner}</td>` : ''}
      <td class="px-3 py-2 small text-muted text-nowrap">${updatedAt}</td>
      <td class="px-3 py-2 small text-muted text-nowrap">${createdAt}</td>
      <td class="px-3 py-2 small text-muted">${lastUpdatedBy}</td>
      <td class="px-3 py-2 small text-muted text-center">${latestVersion}</td>
      <td class="px-3 py-2 text-end text-nowrap">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary open-btn" title="Open">
            <i class="bi bi-folder2-open"></i>
          </button>
          <button class="btn btn-outline-secondary history-btn" title="Version History">
            <i class="bi bi-clock-history"></i>
          </button>
          <button class="btn btn-outline-danger delete-btn" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    `;

    row.querySelector('.open-btn').onclick = (e) => { e.stopPropagation(); onOpen(d.id); };
    row.querySelector('.history-btn').onclick = (e) => { e.stopPropagation(); onHistory(d.id); };
    row.querySelector('.delete-btn').onclick = (e) => {
      e.stopPropagation();
      showConfirmModal(
        'Delete Diagram',
        'This will delete the diagram and all version history. Are you sure?',
        () => onDelete(d.id),
        'Delete',
        'btn-danger'
      );
    };
    row.ondblclick = () => onOpen(d.id);

    tbody.appendChild(row);
  });
}

/* ===============================
   DIAGRAM DETAILS
================================= */
export function renderDiagramDetails(diagram) {
  const versions = diagram.diagram_versions || [];
  const latest = versions.length
    ? versions.reduce((a, b) => (a.version > b.version ? a : b))
    : null;

  document.getElementById('statusVersionValue').textContent =
    latest ? `v${latest.version}` : '-';

  document.getElementById('statusSavedValue').textContent =
    relativeTime(diagram.updated_at);

  document.getElementById('statusOwnerValue').textContent =
    diagram.owner?.username || '-';

  document.getElementById('statusLastEditValue').textContent =
    latest?.created_by_user?.username || '-';

  // Tags
  const tagsEl = document.getElementById('statusTags');
  const tags = diagram.diagram_tags || [];
  if (tags.length > 0) {
    tagsEl.innerHTML = tags.map(t =>
      `<span class="badge rounded-pill" style="background-color:${t.tags?.color || t.color}">${t.tags?.name || t.name}</span>`
    ).join('');
    tagsEl.previousElementSibling.classList.remove('d-none'); // show separator
  } else {
    tagsEl.innerHTML = '';
    tagsEl.previousElementSibling.classList.add('d-none'); // hide separator
  }
}

export function resetDiagramDetails() {
  document.getElementById('statusVersionValue').textContent = '-';
  document.getElementById('statusSavedValue').textContent = '-';
  document.getElementById('statusOwnerValue').textContent = '-';
  document.getElementById('statusLastEditValue').textContent = '-';
  document.getElementById('statusTags').innerHTML = '';
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
  document.getElementById('diagramName').textContent =
    `${details.name || 'Unnamed diagram'} (read-only)`;

  document.getElementById('statusVersionValue').textContent =
    details.version ? `v${details.version}` : '-';

  document.getElementById('statusSavedValue').textContent =
    relativeTime(details.updated_at || details.created_at);

  document.getElementById('statusOwnerValue').textContent =
    details.owner?.username || '-';

  document.getElementById('statusLastEditValue').textContent = '-';

  document.getElementById('statusTags').innerHTML = '';

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

  nameEl.innerHTML = `<input type="text" class="form-control form-control-sm" id="diagramRenameInput" value="${currentName}">`;

  const input = document.getElementById('diagramRenameInput');
  input.focus();
  input.select();

  btn.textContent = 'Save';
  btn.classList.replace('btn-outline-secondary', 'btn-success');

  const saveHandler = async () => {
    const newName = input.value.trim();
    if (!newName) { showToast('Name cannot be empty', 'warning'); return; }

    await onSave(newName);

    nameEl.textContent = newName;
    btn.textContent = 'Rename';
    btn.classList.replace('btn-success', 'btn-outline-secondary');
    btn.onclick = () => enableRename(newName, onSave);
  };

  btn.onclick = saveHandler;
  input.onkeydown = (e) => { if (e.key === 'Enter') saveHandler(); };
}

export function renderAdminTagTable(tags, onRename, onColorChange, onDelete) {
  const tbody = document.getElementById('adminTagTable');
  const empty = document.getElementById('adminTagsEmpty');
  tbody.innerHTML = '';

  if (tags.length === 0) {
    empty.classList.remove('d-none');
    return;
  }
  empty.classList.add('d-none');

  tags.forEach(tag => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-3 py-2 fw-medium">
        <span class="badge rounded-pill" style="background-color:${tag.color}">${tag.name}</span>
      </td>
      <td class="px-3 py-2">
        <div class="d-flex flex-wrap gap-1" id="adminColorPicker-${tag.id}">
          ${TAG_COLORS.map(c => `
            <div class="admin-color-swatch"
                data-tag-id="${tag.id}"
                data-color="${c.value}"
                title="${c.name}"
                style="width:18px; height:18px; border-radius:50%; background:${c.value}; cursor:pointer;
                        border: 2px solid ${c.value === tag.color ? '#000' : 'transparent'}">
            </div>
          `).join('')}
        </div>
      </td>
      <td class="px-3 py-2 small text-muted">${tag.createdBy}</td>
      <td class="px-3 py-2 small text-muted">${tag.usageCount} diagram${tag.usageCount !== 1 ? 's' : ''}</td>
      <td class="px-3 py-2 text-end text-nowrap">
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-secondary rename-tag-btn" title="Rename">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger delete-tag-btn" title="Delete">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    `;

    // Colour swatches
    row.querySelectorAll('.admin-color-swatch').forEach(swatch => {
      swatch.onclick = () => onColorChange(tag.id, swatch.dataset.color);
    });

    // Rename
    row.querySelector('.rename-tag-btn').onclick = () => {
      showInputModal(
        'Rename Tag',
        'Enter new tag name',
        async (newName) => {
          await onRename(tag.id, newName);
        }
      );
    };

    // Delete
    row.querySelector('.delete-tag-btn').onclick = () => {
      showConfirmModal(
        'Delete Tag',
        `Delete tag "${tag.name}"? It will be removed from all diagrams.`,
        () => onDelete(tag.id),
        'Delete',
        'btn-danger'
      );
    };

    tbody.appendChild(row);
  });
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

function syncTableCollapse() {
  const mySection = document.getElementById('myDiagramsTableSection');
  const sharedSection = document.getElementById('sharedDiagramsTableSection');

  if (mySection) {
    mySection.classList.toggle('d-none', ownedCollapsed);
    const chevron = document.getElementById('myTableChevron');
    if (chevron) chevron.className = `bi ${ownedCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'} text-muted`;
  }
  if (sharedSection) {
    sharedSection.classList.toggle('d-none', sharedCollapsed);
    const chevron = document.getElementById('sharedTableChevron');
    if (chevron) chevron.className = `bi ${sharedCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'} text-muted`;
  }
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