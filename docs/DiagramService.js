import { supabase } from './supabase.js';

export async function saveDiagram(diagramId, userId, xml, comment) {
  const { data: latest } = await supabase
    .from('diagram_versions')
    .select('version')
    .eq('diagram_id', diagramId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const nextVersion = (latest?.version || 0) + 1;

  await supabase.from('diagram_versions').insert({
    diagram_id: diagramId,
    version: nextVersion,
    bpmn_xml: xml,
    created_by: userId,
    comment
  });
}

export async function loadDiagram(diagramId, version) {
  const { data } = await supabase
    .from('diagram_versions')
    .select('bpmn_xml')
    .eq('diagram_id', diagramId)
    .eq('version', version)
    .single();
  return data.bpmn_xml;
}