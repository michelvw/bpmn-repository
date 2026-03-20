import { initModeler, newEmptyDiagram, loadXML, getXML, downloadBpmn, downloadSvg, downloadPng, generatePreview } from './modeler.js';
import * as service from './diagramService.js';
import * as userService from './userService.js';
import * as ui from './ui.js';
import { generateShareLink, getSharedDiagramId } from './share.js';
import { supabase } from './supabase.js';

let currentUser = null;
let currentDiagramId = null;
let cachedUsers = null;
let isAdmin = false;
let allDiagramsCache = null;

//manage unsaved changes
let isDirty = false;

function markDirty() { isDirty = true; }
function markClean() { isDirty = false; }

function confirmIfDirty(onConfirm) {
  if (!isDirty) { onConfirm(); return; }
  ui.showConfirmModal(
    'Unsaved Changes',
    'You have unsaved changes. Are you sure you want to leave?',
    onConfirm
  );
}

initModeler(markDirty);

function withErrorHandling(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      console.error(err);
      ui.showToast(err.message || 'Something went wrong', 'danger');
    }
  };
}

function patchProcessName(xml, name) {
  // Escape special characters in name for XML attribute
  const escaped = name
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Replace existing name attribute or add it if missing
  return xml
    .replace(/(<bpmn:process\b[^>]*)\sname="[^"]*"/, `$1 name="${escaped}"`)
    .replace(/(<bpmn:process\b)(?![^>]*\sname=")/, `$1 name="${escaped}"`);
}

/* ===============================
   OVERVIEW
================================= */
async function loadOverview() {
  const [data, tags] = await Promise.all([
    service.getDiagrams(),
    service.getTags()
  ]);

  allDiagramsCache = data;

  const renderBoth = (diagrams) => {
    ui.renderGrid(diagrams, currentUser.id,
      (id) => confirmIfDirty(withErrorHandling(() => openDiagram(id))),
      withErrorHandling(async (id) => { await service.deleteDiagram(id); await loadOverview(); }),
      withErrorHandling(async (id) => { await openHistoryModal(id); }),
      async (id) => {
        const versionData = await service.loadLatestVersion(id);
        return generatePreview(versionData.bpmn_xml);
      }
    );
    ui.renderTable(diagrams, currentUser.id,
      (id) => confirmIfDirty(withErrorHandling(() => openDiagram(id))),
      withErrorHandling(async (id) => { await service.deleteDiagram(id); await loadOverview(); }),
      withErrorHandling(async (id) => { await openHistoryModal(id); })
    );
  };

  ui.renderTagFilterBar(tags, (tagIds) => {
    const filtered = tagIds.size === 0
      ? allDiagramsCache
      : allDiagramsCache.filter(d =>
          (d.diagram_tags || []).some(t => tagIds.has(t.tag_id))
        );
    renderBoth(filtered);
  });

  renderBoth(data);

  ui.resetSaveButton(saveDiagram);
 
  const isAlreadyInOverview = !document.getElementById('overviewPage').classList.contains('d-none');
  if (isAlreadyInOverview) {
    history.replaceState({ view: 'overview' }, '', window.location.pathname);
  } else {
    history.pushState({ view: 'overview' }, '', window.location.pathname);
  }

  ui.showOverview();
}

/* ===============================
   OPEN DIAGRAM
================================= */
async function openDiagram(id) {
  if (!id) return;
  const versionData = await service.loadLatestVersion(id);
  const detailData = await service.getDiagramDetails(id);

  currentDiagramId = id;

  await loadXML(versionData.bpmn_xml, false);
  markClean();
  ui.renderDiagramDetails(detailData);
  ui.resetSaveButton(saveDiagram);

  const isAlreadyInEditor = !document.getElementById('editorPage').classList.contains('d-none');
  if (isAlreadyInEditor) {
    history.replaceState({ view: 'editor', diagramId: id }, '', `?diagram=${id}`);
  } else {
    history.pushState({ view: 'editor', diagramId: id }, '', `?diagram=${id}`);
  }

  ui.showEditor();
}

/* ===============================
   SAVE DIAGRAM
================================= */
async function saveDiagram() { 
  let xml = await getXML();
  const name = document.getElementById('diagramName').textContent.trim();
  xml = patchProcessName(xml, name);

  if (!currentDiagramId) {
    ui.showInputModal('Diagram Name', 'Enter a name...', async (name) => {      
      const data = await service.createDiagram(name);      
      currentDiagramId = data.id;      
      ui.showInputModal('Version Comment', 'Enter a comment...', async (comment) => {        
        const xml = await getXML();        
        await service.saveVersion(currentDiagramId, xml, comment);        
        const details = await service.getDiagramDetails(currentDiagramId);
        ui.renderDiagramDetails(details);
        ui.showToast('Diagram saved');
        markClean();
      });
    });
    return;
  }

  ui.showInputModal('Version Comment', 'Enter a comment...', async (comment) => {
    const xml = await getXML();
    await service.saveVersion(currentDiagramId, xml, comment);
    const details = await service.getDiagramDetails(currentDiagramId);
    ui.renderDiagramDetails(details);
    ui.showToast('Diagram saved');
    markClean();
  });
}

async function saveDiagramWithName(name) {
  let xml = await getXML();
  xml = patchProcessName(xml, name);
  const diagram = await service.createDiagram(name);
  currentDiagramId = diagram.id;
  await service.saveVersion(currentDiagramId, xml, 'Initial version');
  const details = await service.getDiagramDetails(currentDiagramId);
  ui.renderDiagramDetails(details);
  markClean();
  ui.showToast(`Diagram "${name}" saved.`, 'success');
}

/* ===============================
   HISTORY
================================= */
async function openHistoryModal(diagramId) {
  if (!diagramId) return ui.showToast('No diagram selected.', 'warning');

  currentDiagramId = diagramId;
  const history = await service.getVersionHistory(diagramId);

  ui.renderVersionHistory(history, {
    onEdit: async (version) => {
      const versionData = await service.getVersionById(version.id);
      ui.closeVersionModal();
      await loadXML(versionData.bpmn_xml, false);
      ui.resetSaveButton(saveDiagram);
      ui.showEditor();
    },
    
    onView: async (version) => {
      const versionData = await service.getVersionById(version.id);
      ui.closeVersionModal();
      ui.showEditor();
      await loadXML(versionData.bpmn_xml, true);

      const diagramDetails = await service.getDiagramDetails(currentDiagramId);
      const viewData = {
        ...diagramDetails,
        ...version
      };

      ui.showViewedVersion(viewData, async () => {
        await service.saveVersion(
          currentDiagramId,
          versionData.bpmn_xml,
          `Restored from v${version.version}`
        );
        const details = await service.getDiagramDetails(currentDiagramId);
        ui.renderDiagramDetails(details);
        ui.resetSaveButton(saveDiagram);
        markClean();
        ui.showToast(`Version ${version.version} restored as latest.`);
      });
    },

    onRestore: async (version) => {
      const versionData = await service.getVersionById(version.id);
      await service.saveVersion(currentDiagramId, versionData.bpmn_xml, `Restored from v${version.version}`);
      const details = await service.getDiagramDetails(currentDiagramId);
      ui.renderDiagramDetails(details);
      ui.closeVersionModal();
      ui.resetSaveButton(saveDiagram);
      markClean();
      await loadOverview();
    }
  });
}

/* ===============================
   NEW DIAGRAM
================================= */
async function createNewDiagram(showEditorPage = true) {
  currentDiagramId = null;
  await newEmptyDiagram();
  markClean();
  ui.resetDiagramDetails();
  ui.resetSaveButton(saveDiagram);
  if(showEditorPage) ui.showEditor();
}

/* ===============================
   AUTH
================================= */
async function handleLogin(email, password) {
  if (!email) return ui.showToast('Please enter your email address.', 'warning');
  if (!password) return ui.showToast('Please enter your password.', 'warning');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return ui.showToast(error.message, 'danger');

  currentUser = data.user;
  await loadOverview();
}

async function handleSignup(email, password, confirmPassword) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return ui.showToast('Please enter an email address.', 'warning');
  if (!emailRegex.test(email)) return ui.showToast('Please enter a valid email address.', 'warning');
  if (!password) return ui.showToast('Please enter a password.', 'warning');
  if (password.length < 6) return ui.showToast('Password must be at least 6 characters.', 'warning');
  if (password !== confirmPassword) return ui.showToast('Passwords do not match.', 'warning');

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + window.location.pathname
    }
  });

  if (error) return ui.showToast(error.message, 'danger');
  ui.showToast('Check your email to confirm your account.', 'info');

  // Hide confirm field again
  document.getElementById('confirmPasswordSignup').classList.add('d-none');
}

/* ===============================
   OPEN ADMIN PAGE
================================= */
async function openAdminPage() {
  const [users, tags] = await Promise.all([
    userService.getAllUsers(),
    service.getTagsAdmin()
  ]);

  ui.renderAdminUserTable(
    users,
    currentUser.id,
    withErrorHandling(async (userId) => {
      await userService.deleteUser(userId);
      ui.showToast('User deleted.', 'success');
      await openAdminPage();
    }),
    withErrorHandling(async (userId, newName) => {
      await userService.renameUser(userId, newName);
      ui.showToast('Username updated.', 'success');
      await openAdminPage();
    }),
    withErrorHandling(async (userId, isAdmin) => {
      await userService.setAdminRole(userId, isAdmin);
      ui.showToast(`User ${isAdmin ? 'promoted to admin' : 'demoted to user'}.`, 'success');
      await openAdminPage();
    }),
    withErrorHandling(async (userId, username) => {
      const user = users.find(u => u.id === userId);
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin + window.location.pathname
      });
      if (error) throw error;
      ui.showToast(`Password reset email sent to ${username}.`, 'success');
    }),
    withErrorHandling(async (userId, username) => {
      const diagrams = await service.getDiagramsByOwner(userId);
      ui.showUserDiagramsModal(username, diagrams);
    })
  );

  ui.renderAdminTagTable(
    tags,
    withErrorHandling(async (tagId, newName) => {
      await service.renameTag(tagId, newName);
      ui.showToast('Tag renamed.', 'success');
      await openAdminPage();
    }),
    withErrorHandling(async (tagId, color) => {
      await service.updateTagColor(tagId, color);
      ui.showToast('Colour updated.', 'success');
      await openAdminPage();
    }),
    withErrorHandling(async (tagId) => {
      await service.deleteTag(tagId);
      ui.showToast('Tag deleted.', 'success');
      await openAdminPage();
    })
  );

  ui.showAdmin();
}

// Section toggles
document.getElementById('adminUsersToggle').onclick = () => {
  const section = document.getElementById('adminUsersSection');
  const chevron = document.getElementById('adminUsersChevron');
  const isHidden = section.classList.toggle('d-none');
  chevron.className = `bi ${isHidden ? 'bi-chevron-right' : 'bi-chevron-down'}`;
};

document.getElementById('adminTagsToggle').onclick = () => {
  const section = document.getElementById('adminTagsSection');
  const chevron = document.getElementById('adminTagsChevron');
  const isHidden = section.classList.toggle('d-none');
  chevron.className = `bi ${isHidden ? 'bi-chevron-right' : 'bi-chevron-down'}`;
};

/* ===============================
   OPEN SHARE MODAL
================================= */
async function openShareModal() {
  if (!currentDiagramId) return ui.showToast('Save the diagram first before sharing.', 'warning');

  // Fetch users once per session
  if (!cachedUsers) {
    cachedUsers = await userService.getUsers();
  }

  const [isPublic, collaborators] = await Promise.all([
    service.getPublicAccess(currentDiagramId),
    service.getCollaborators(currentDiagramId)
  ]);

  const filteredUsers = cachedUsers.filter(u => u.id !== currentUser.id);

  ui.showShareModal(
    generateShareLink(currentDiagramId),
    isPublic,
    collaborators,
    filteredUsers,
    withErrorHandling(async (value) => {
      await service.setPublicAccess(currentDiagramId, value);
      ui.showToast(value ? 'Public sharing enabled' : 'Public sharing disabled', 'info');
    }),
    withErrorHandling(async (userId) => {
      await service.addCollaborator(currentDiagramId, userId);
      ui.showToast('Collaborator added', 'success');
      await openShareModal();
    }),
    withErrorHandling(async (id) => {
      await service.removeCollaborator(id);
      ui.showToast('Collaborator removed', 'success');
      await openShareModal();
    })
  );
}

/* ===============================
   OPEN TAGS DROPDOWN
================================= */
async function openTagsDropdown() {
  if (!currentDiagramId) return ui.showToast('Save the diagram first before adding tags.', 'warning');

  const refreshDropdown = async () => {
    const [updatedTags, updatedAllTags] = await Promise.all([
      service.getDiagramTags(currentDiagramId),
      service.getTags()
    ]);
    ui.renderTagsDropdown(
      updatedTags,
      updatedAllTags,
      withErrorHandling(async (tagName, color) => {
        await service.addTagToDiagram(currentDiagramId, tagName, color);
        ui.showToast('Tag added', 'success');
        await refreshDropdown();
      }),
      withErrorHandling(async (diagramTagId) => {
        await service.removeTagFromDiagram(diagramTagId);
        ui.showToast('Tag removed', 'success');
        await refreshDropdown();
      }),
      withErrorHandling(async (tagId, color) => {
        await service.updateTagColor(tagId, color);
        await refreshDropdown();
      })
    );
  };

  const [currentTags, allTags] = await Promise.all([
    service.getDiagramTags(currentDiagramId),
    service.getTags()
  ]);

  ui.renderTagsDropdown(
    currentTags,
    allTags,
    withErrorHandling(async (tagName, color) => {
      await service.addTagToDiagram(currentDiagramId, tagName, color);
      ui.showToast('Tag added', 'success');
      await refreshDropdown();
    }),
    withErrorHandling(async (diagramTagId) => {
      await service.removeTagFromDiagram(diagramTagId);
      ui.showToast('Tag removed', 'success');
      await refreshDropdown();
    }),
    withErrorHandling(async (tagId, color) => {
      await service.updateTagColor(tagId, color);
      await refreshDropdown();
    })
  );
}

document.getElementById('btnTagsDropdown').addEventListener('show.bs.dropdown', 
  withErrorHandling(openTagsDropdown));

/* ===============================
   EVENT BINDINGS
================================= */
document.getElementById('btnViewTiles').onclick = () => ui.setViewMode('tiles');
document.getElementById('btnViewTable').onclick = () => ui.setViewMode('table');

document.getElementById('btnSave').onclick = withErrorHandling(saveDiagram);
document.getElementById('btnBack').onclick = () => confirmIfDirty(withErrorHandling(loadOverview));
document.getElementById('btnShare').onclick = withErrorHandling(openShareModal);

document.getElementById('btnDelete').onclick = withErrorHandling(async () => {
  if (!currentDiagramId) return;
  ui.showConfirmModal(
    'Delete Diagram',
    'This will delete the diagram and all version history. Are you sure?',
    withErrorHandling(async () => {
      await service.deleteDiagram(currentDiagramId);
      currentDiagramId = null;
      await loadOverview();
    }),
    'Delete',
    'btn-danger'
  );
});

document.getElementById('passwordInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const confirmField = document.getElementById('confirmPasswordSignup');
    if (!confirmField.classList.contains('d-none')) {
      // Confirm field is visible — move focus to it instead
      confirmField.focus();
    } else {
      handleLogin(
        document.getElementById('emailInput').value,
        document.getElementById('passwordInput').value
      );
    }
  }
});

document.getElementById('confirmPasswordSignup').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    handleSignup(
      document.getElementById('emailInput').value,
      document.getElementById('passwordInput').value,
      document.getElementById('confirmPasswordSignup').value
    );
  }
});

// Helper to get current diagram name for the filename
function getDiagramName() {
  return document.getElementById('diagramName').textContent.replace(' (read-only)', '').trim() || 'diagram';
}

document.getElementById('btnDownloadBpmn').onclick = withErrorHandling(() => downloadBpmn(getDiagramName()));
document.getElementById('btnDownloadSvg').onclick = withErrorHandling(() => downloadSvg(getDiagramName()));
document.getElementById('btnDownloadPng').onclick = withErrorHandling(() => downloadPng(getDiagramName()));

const triggerImport = () => document.getElementById('importFileInput').click();

document.getElementById('btnImportInside').onclick = () => confirmIfDirty(triggerImport);
document.getElementById('btnImportOverview').onclick = triggerImport; // overview has no editor ope

document.getElementById('importFileInput').onchange = withErrorHandling(async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const xml = await file.text();
  currentDiagramId = null;
  await loadXML(xml);
  ui.resetDiagramDetails();
  ui.showEditor();
  ui.showToast('Diagram imported — save to store it', 'info');

  e.target.value = '';
});

document.getElementById('btnHistory').onclick = withErrorHandling(() => openHistoryModal(currentDiagramId));
document.getElementById('btnNewOverview').onclick = () => confirmIfDirty(withErrorHandling(() => createNewDiagram(true)));
document.getElementById('btnNewInside').onclick = () => confirmIfDirty(withErrorHandling(() => createNewDiagram(false)));

// Show confirm password field when Sign Up is clicked
document.getElementById('btnSignup').onclick = withErrorHandling(() => {
  const confirmField = document.getElementById('confirmPasswordSignup');
  if (confirmField.classList.contains('d-none')) {
    // First click — show the confirm field
    confirmField.classList.remove('d-none');
    confirmField.focus();
    return;
  }
  // Second click — proceed with signup
  handleSignup(
    document.getElementById('emailInput').value,
    document.getElementById('passwordInput').value,
    document.getElementById('confirmPasswordSignup').value
  );
});

document.getElementById('btnLogin').onclick = withErrorHandling(() =>
  handleLogin(document.getElementById('emailInput').value, document.getElementById('passwordInput').value));

document.getElementById('btnLogout').onclick = () => confirmIfDirty(withErrorHandling(async () => {
  await supabase.auth.signOut();
  currentUser = null;
  isAdmin = false;
  document.getElementById('btnAdmin').classList.add('d-none');
  ui.showAuth();
}));

document.getElementById('btnRename').onclick = () => {
  const currentName = document.getElementById('diagramName').textContent.trim();
  ui.enableRename(
    currentName,
    withErrorHandling(async (newName) => {
      if (!currentDiagramId) {
        await saveDiagramWithName(newName);
      } else {
        await service.renameDiagram(currentDiagramId, newName);
        // Patch and save a new version with the updated process name
        let xml = await getXML();
        xml = patchProcessName(xml, newName);
        await service.saveVersion(currentDiagramId, xml, `Renamed to "${newName}"`);
        markDirty(); // XML changed so mark dirty, then clean after save
        markClean();
        ui.showToast('Diagram renamed', 'success');
      }
    })
  );
};

document.getElementById('btnLoginAnonymous').onclick = () => {
  // Clear the shared diagram from URL so after login they go to overview
  window.history.replaceState({}, '', window.location.pathname);
  ui.showAuth();
};

// Forgot password link
document.getElementById('btnForgotPassword').onclick = withErrorHandling(async (e) => {
  e.preventDefault();
  const email = document.getElementById('emailInput').value.trim();
  if (!email) return ui.showToast('Enter your email address first.', 'warning');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });

  if (error) return ui.showToast(error.message, 'danger');
  ui.showToast('Password reset email sent — check your inbox.', 'info');
});

// Handle password reset redirect on page load
document.getElementById('btnConfirmResetPassword').onclick = withErrorHandling(async () => {
  const newPassword = document.getElementById('newPasswordInput').value;
  const confirmPassword = document.getElementById('confirmPasswordInput').value;

  if (!newPassword) return ui.showToast('Please enter a new password.', 'warning');
  if (newPassword !== confirmPassword) return ui.showToast('Passwords do not match.', 'warning');
  if (newPassword.length < 6) return ui.showToast('Password must be at least 6 characters.', 'warning');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return ui.showToast(error.message, 'danger');

  ui.showToast('Password updated successfully.', 'success');
  const modal = bootstrap.Modal.getInstance(document.getElementById('resetPasswordModal'));
  if (modal) modal.hide();

  // Clear the hash from the URL
  window.history.replaceState({}, '', window.location.pathname);
});

document.getElementById('btnAdmin').onclick = withErrorHandling(openAdminPage);
document.getElementById('btnAdminBack').onclick = withErrorHandling(loadOverview);

/* ===============================
   PROFILE MODAL
================================= */
document.getElementById('btnProfile').onclick = async () => {
  const { data } = await userService.getProfile();
  document.getElementById('profileUsername').value = data.username || '';
  const profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
  profileModal.show();
};

document.getElementById('btnSaveProfile').onclick = async () => {
  const username = document.getElementById('profileUsername').value.trim();
  if(!username) return ui.showToast('Username required', 'warning');
  await userService.updateProfile(username);
  ui.showToast('Profile updated');
  const profileModalEl = document.getElementById('profileModal');
  const bsModal = bootstrap.Modal.getInstance(profileModalEl);
  if(bsModal) bsModal.hide();
};

/* ===============================
   STARTUP
================================= */
window.addEventListener('DOMContentLoaded', withErrorHandling(async () => {
  const hash = new URLSearchParams(window.location.hash.replace('#', '?'));

  document.getElementById('btnTagsDropdown').closest('.btn-group').addEventListener('hide.bs.dropdown', (e) => {
    if (e.clickEvent?.target?.closest('.color-option')) {
      e.preventDefault();
    }
  });
  
  if (hash.get('type') === 'recovery') {
    ui.showAuth();
    const resetModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));
    resetModal.show();
    return;
  }

  if (hash.get('type') === 'signup') {
    window.history.replaceState({}, '', window.location.pathname);
    ui.showAuth();
    ui.showToast('Email confirmed! You can now log in.', 'success');
    return;
  }

  const sharedId = getSharedDiagramId();
  const { data: sessionData } = await supabase.auth.getSession();

  if (sharedId && !sessionData.session) {
    const [versionData, detailData] = await Promise.all([
      service.loadLatestVersion(sharedId),
      service.getDiagramDetails(sharedId)
    ]);
    await loadXML(versionData.bpmn_xml, true);
    ui.renderDiagramDetails(detailData);
    ui.showAnonymousEditor();
    return;
  }

  if (sessionData.session) {
    currentUser = sessionData.session.user;
    isAdmin = await userService.getIsAdmin();
    if (isAdmin) document.getElementById('btnAdmin').classList.remove('d-none');

    if (sharedId) {
      const [versionData, detailData] = await Promise.all([
        service.loadLatestVersion(sharedId),
        service.getDiagramDetails(sharedId)
      ]);
      currentDiagramId = sharedId;
      await loadXML(versionData.bpmn_xml, true);
      ui.renderDiagramDetails(detailData);
      ui.showEditor();
    } else {
      await loadOverview(); // ← this was missing
    }
  } else {
    ui.showAuth();
  }
}));

window.addEventListener('popstate', withErrorHandling(async (event) => {
  const state = event.state;

  if (!state || state.view === 'overview') {
    confirmIfDirty(withErrorHandling(async () => {
      currentDiagramId = null;
      await loadOverview();
    }));
  } else if (state.view === 'editor' && state.diagramId) {
    await openDiagram(state.diagramId);
  }
}));