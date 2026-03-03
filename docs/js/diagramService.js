import { supabase } from './supabase.js';

export async function getDiagrams(userId) {
  return await supabase
    .from('diagrams')
    .select(`
      id,
      name,
      updated_at,
      diagram_versions(version)
    `)
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });
}

export async function createDiagram(name, userId) {
  return await supabase
    .from('diagrams')
    .insert({ name, owner_id: userId })
    .select('id')
    .single();
}

export async function saveVersion(diagramId, userId, xml, comment) {

  const { data: latest } = await supabase
    .from('diagram_versions')
    .select('version')
    .eq('diagram_id', diagramId)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = latest?.length ? latest[0].version + 1 : 1;

  return await supabase
    .from('diagram_versions')
    .insert({
      diagram_id: diagramId,
      created_by: userId,
      version: nextVersion,
      comment,
      bpmn_xml: xml
    });
}

export async function loadLatestVersion(diagramId) {
  return await supabase
    .from('diagram_versions')
    .select('bpmn_xml')
    .eq('diagram_id', diagramId)
    .order('version', { ascending: false })
    .limit(1)
    .single();
}

export async function deleteDiagram(diagramId) {
  return await supabase.from('diagrams').delete().eq('id', diagramId);
}

export async function getDiagramDetails(diagramId) {
  return await supabase
    .from('diagrams')
    .select(`
      name,
      updated_at,
      owner:owner_id(username),
      diagram_versions(version, comment)
    `)
    .eq('id', diagramId)
    .single();
}

export async function renameDiagram(id, newName) {
  return await supabase
    .from('diagrams')
    .update({ name: newName })
    .eq('id', id);
}