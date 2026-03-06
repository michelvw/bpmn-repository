/* ===============================
   UI MODULE
================================= */

export function showOverview() {
  document.getElementById('authPage').style.display = 'none';
  document.getElementById('editorPage').style.display = 'none';
  document.getElementById('overviewPage').style.display = 'block';
}

export function showEditor() {
  document.getElementById('authPage').style.display = 'none';
  document.getElementById('overviewPage').style.display = 'none';
  document.getElementById('editorPage').style.display = 'flex';
}

/* ===============================
   DIAGRAM TABLE
================================= */

export function renderTable(data, onOpen, onDelete, onHistory) {
  const tbody = document.querySelector('#diagramTable tbody');
  tbody.innerHTML = '';

  data.forEach(item => {
    const tr = document.createElement('tr');

    // Name
    const tdName = document.createElement('td');
    tdName.textContent = item.name;
    tdName.style.cursor = 'pointer';
    tdName.onclick = () => onOpen(item.id);
    tr.appendChild(tdName);

    // Last Modified
    const tdDate = document.createElement('td');
    tdDate.textContent = new Date(item.lastModified).toLocaleString();
    tr.appendChild(tdDate);

    // Version
    const tdVersion = document.createElement('td');
    tdVersion.textContent = item.version || '-';
    tr.appendChild(tdVersion);

    // Actions
    const tdAction = document.createElement('td');
    tdAction.className = 'd-flex gap-2';

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn btn-sm btn-danger';
    btnDelete.textContent = 'Delete';
    btnDelete.onclick = () => onDelete(item.id);
    tdAction.appendChild(btnDelete);

    const btnHistory = document.createElement('button');
    btnHistory.className = 'btn btn-sm btn-warning';
    btnHistory.textContent = 'History';
    btnHistory.onclick = () => onHistory(item.id);
    tdAction.appendChild(btnHistory);

    tr.appendChild(tdAction);

    tbody.appendChild(tr);
  });
}

/* ===============================
   DIAGRAM DETAILS
================================= */

export function renderDiagramDetails(details) {
  document.getElementById('diagramVersion').textContent = details.version || '-';
  document.getElementById('diagramComment').textContent = details.comment || '-';
  document.getElementById('diagramOwner').textContent = details.owner || '-';
  document.getElementById('diagramDate').textContent = details.lastModified || '-';

  // Show collapse using Bootstrap
  const detailsEl = document.getElementById('diagramDetails');
  const bsCollapse = new bootstrap.Collapse(detailsEl, { toggle: false });
  bsCollapse.show();
}

export function resetDiagramDetails() {
  document.getElementById('diagramVersion').textContent = '-';
  document.getElementById('diagramComment').textContent = '-';
  document.getElementById('diagramOwner').textContent = '-';
  document.getElementById('diagramDate').textContent = '-';
}

/* ===============================
   VERSION HISTORY
================================= */

export function renderVersionHistory(history, { onView, onRestore }) {
  const versionList = document.getElementById('versionList');
  versionList.innerHTML = '';

  history.forEach(version => {
    const card = document.createElement('div');
    card.className = 'card mb-2';

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body d-flex justify-content-between align-items-center';

    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = `
      <strong>v${version.version}</strong> - ${new Date(version.createdAt).toLocaleString()}
    `;

    const btnDiv = document.createElement('div');
    btnDiv.className = 'd-flex gap-2';

    const btnView = document.createElement('button');
    btnView.className = 'btn btn-sm btn-primary';
    btnView.textContent = 'View';
    btnView.onclick = () => onView(version);

    const btnRestore = document.createElement('button');
    btnRestore.className = 'btn btn-sm btn-success';
    btnRestore.textContent = 'Restore';
    btnRestore.onclick = () => onRestore(version);

    btnDiv.appendChild(btnView);
    btnDiv.appendChild(btnRestore);

    cardBody.appendChild(infoDiv);
    cardBody.appendChild(btnDiv);

    card.appendChild(cardBody);
    versionList.appendChild(card);
  });

  // Show modal using Bootstrap
  const modalEl = document.getElementById('versionModal');
  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
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