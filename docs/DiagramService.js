import { supabase } from './supabase.js';

export async function saveDiagram(diagramId, userId, xml, comment) {
  if (!diagramId || !userId || !xml || !comment) {
    throw new Error('Missing required fields for saving the diagram.');
  }

  console.log('Saving diagram with ID:', diagramId); // Debugging log

  let nextVersion = 1; // Default to version 1 for new diagrams

  try {
    const { data: latest, error: fetchError } = await supabase
      .from('diagram_versions')
      .select('version', { head: true })
      .eq('diagram_id', diagramId)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // Ignore "No rows found" error
      console.error('Error fetching latest version:', fetchError);
      throw new Error('Failed to fetch the latest version of the diagram.');
    }

    if (latest) {
      nextVersion = latest.version + 1;
    }
  } catch (error) {
    console.warn('No existing versions found. Creating initial version.');
  }

  const { error: insertError } = await supabase.from('diagram_versions').insert({
    diagram_id: diagramId,
    version: nextVersion,
    bpmn_xml: xml,
    created_by: userId,
    comment
  });

  if (insertError) {
    console.error('Error saving diagram:', insertError);
    throw new Error('Failed to save the diagram.');
  }
}

export async function loadDiagram(diagramId, version) {
  if (!diagramId || !version) {
    throw new Error('Missing diagram ID or version for loading the diagram.');
  }

  const { data, error } = await supabase
    .from('diagram_versions')
    .select('bpmn_xml')
    .eq('diagram_id', diagramId)
    .eq('version', version)
    .single();

  if (error) {
    console.error('Error loading diagram:', error);
    throw new Error('Failed to load the diagram.');
  }

  return data.bpmn_xml;
}