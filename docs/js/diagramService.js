import { supabase } from './supabase.js';

/**
 * Centralized helper to get authenticated user
 */
async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error('Not authenticated');

  return user;
}

/**
 * Get all diagrams for current user
 * RLS should already restrict results to owner
 */
export async function getDiagrams() {
  const { data, error } = await supabase
    .from('diagrams')
    .select(`
      id,
      name,
      updated_at,
      diagram_versions(version, created_by)
    `)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  // Look up usernames for latest version creators
  const allUserIds = [...new Set(
    data.flatMap(d => d.diagram_versions.map(v => v.created_by)).filter(Boolean)
  )];

  if (allUserIds.length === 0) return data;

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username')
    .in('id', allUserIds);

  if (usersError) throw usersError;

  return data.map(d => ({
    ...d,
    diagram_versions: d.diagram_versions.map(v => ({
      ...v,
      created_by_user: users.find(u => u.id === v.created_by) || null
    }))
  }));
}

/**
 * Create new diagram
 * owner_id is assumed to default to auth.uid() in DB
 */
export async function createDiagram(name) {
  const { data, error } = await supabase
    .from('diagrams')
    .insert({ name })
    .select('id')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Save new version
 */
export async function saveVersion(diagramId, xml, comment) {
  const user = await getCurrentUser();

  const { error } = await supabase.rpc('save_diagram_version', {
    p_diagram_id: diagramId,
    p_created_by: user.id,
    p_comment: comment,
    p_bpmn_xml: xml
  });

  if (error) throw error;
}

/**
 * Load latest version XML
 */
export async function loadLatestVersion(diagramId) {
  const { data, error } = await supabase
    .from('diagram_versions')
    .select('bpmn_xml')
    .eq('diagram_id', diagramId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete diagram (RLS handles ownership)
 */
export async function deleteDiagram(diagramId) {
  const { error } = await supabase
    .from('diagrams')
    .delete()
    .eq('id', diagramId);

  if (error) throw error;
}

/**
 * Get diagram details
 */
export async function getDiagramDetails(diagramId) {
  const { data, error } = await supabase
    .from('diagrams')
    .select(`
      name,
      updated_at,
      owner:owner_id(username),
      diagram_versions(version, comment, created_by)
    `)
    .eq('id', diagramId)
    .single();

  if (error) throw error;

  // Look up usernames for version creators
  const versions = data.diagram_versions || [];
  const userIds = [...new Set(versions.map(v => v.created_by).filter(Boolean))];

  if (userIds.length === 0) return data;

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username')
    .in('id', userIds);

  if (usersError) throw usersError;

  return {
    ...data,
    diagram_versions: versions.map(v => ({
      ...v,
      created_by_user: users.find(u => u.id === v.created_by) || null
    }))
  };
}

/**
 * Rename diagram
 */
export async function renameDiagram(id, newName) {
  const { error } = await supabase
    .from('diagrams')
    .update({ name: newName })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Get version history
 */
export async function getVersionHistory(diagramId) {
  const { data, error } = await supabase
    .from('diagram_versions')
    .select('id, version, comment, created_at, created_by')
    .eq('diagram_id', diagramId)
    .order('version', { ascending: false });

  if (error) throw error;

  // Look up usernames
  const userIds = [...new Set(data.map(v => v.created_by).filter(Boolean))];
  if (userIds.length === 0) return data;

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username')
    .in('id', userIds);

  if (usersError) throw usersError;

  return data.map(v => ({
    ...v,
    created_by_user: users.find(u => u.id === v.created_by) || null
  }));
}

/**
 * Get specific version content
 */
export async function getVersionById(versionId) {
  const { data, error } = await supabase
    .from('diagram_versions')
    .select('bpmn_xml, version')
    .eq('id', versionId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Toggle public sharing
 */
export async function setPublicAccess(diagramId, isPublic) {
  const { error } = await supabase
    .from('diagrams')
    .update({ is_public: isPublic })
    .eq('id', diagramId);

  if (error) throw error;
}

/**
 * Get public access status
 */
export async function getPublicAccess(diagramId) {
  const { data, error } = await supabase
    .from('diagrams')
    .select('is_public')
    .eq('id', diagramId)
    .single();

  if (error) throw error;
  return data.is_public;
}

/**
 * Get collaborators for a diagram
 */
export async function getCollaborators(diagramId) {
  const { data, error } = await supabase
    .from('diagram_collaborators')
    .select('id, user_id')
    .eq('diagram_id', diagramId);

  if (error) throw error;

  // Look up usernames separately
  const userIds = data.map(c => c.user_id);
  if (userIds.length === 0) return [];

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, username')
    .in('id', userIds);

  if (usersError) throw usersError;

  // Merge username into collaborator records
  return data.map(c => ({
    ...c,
    user: users.find(u => u.id === c.user_id) || null
  }));
}

/**
 * Add collaborator by username
 */
export async function addCollaborator(diagramId, userId) {
  const currentUser = await getCurrentUser();

  const { error } = await supabase
    .from('diagram_collaborators')
    .insert({
      diagram_id: diagramId,
      user_id: userId,
      granted_by: currentUser.id
    });

  if (error) {
    if (error.code === '23505') throw new Error('User is already a collaborator');
    throw error;
  }
}

/**
 * Remove collaborator
 */
export async function removeCollaborator(collaboratorId) {
  const { error } = await supabase
    .from('diagram_collaborators')
    .delete()
    .eq('id', collaboratorId);

  if (error) throw error;
}