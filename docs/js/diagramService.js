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
      diagram_versions(version)
    `)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
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
      diagram_versions(version, comment)
    `)
    .eq('id', diagramId)
    .single();

  if (error) throw error;
  return data;
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
    .select('id, version, comment, created_at')
    .eq('diagram_id', diagramId)
    .order('version', { ascending: false });

  if (error) throw error;
  return data;
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