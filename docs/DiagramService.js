import { supabase } from './supabase.js';

export async function saveDiagram(diagramId, userId, xml, comment) {
  if (!diagramId || !userId || !xml || !comment) {
    throw new Error('Missing required fields for saving the diagram.');
  }

  console.log('Saving diagram with ID:', diagramId); // Debugging log

  let nextVersion = 1; // Default to version 1 for new diagrams

  try {
    console.log('Fetching latest version for diagram_id:', diagramId);
    const { data: latestVersions, error: fetchError } = await supabase
      .from('diagram_versions')
      .select('version')
      .eq('diagram_id', diagramId)
      .order('version', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error during version fetch:', fetchError);
      throw new Error('Failed to fetch the latest version of the diagram.');
    }

    if (latestVersions && latestVersions.length > 0) {
      nextVersion = latestVersions[0].version + 1;
      console.log('Latest version found:', latestVersions[0].version, 'Next version will be:', nextVersion); // Debugging log
    } else {
      console.warn('No existing versions found. Creating initial version.');
    }
  } catch (error) {
    console.warn('No existing versions found. Creating initial version.');
    console.log( 'Version will be:', nextVersion); // Debugging log
  }

  try {
    console.log('Inserting diagram version:', {
      diagram_id: diagramId,
      version: nextVersion,
      bpmn_xml: xml,
      created_by: userId,
      comment
    });
    const { error: insertError } = await supabase.from('diagram_versions').insert({
      diagram_id: diagramId,
      version: nextVersion,
      bpmn_xml: xml,
      created_by: userId,
      comment
    });

    if (insertError) {
      if (insertError.code === '23505') { // Duplicate key error code for PostgreSQL
        console.error('Duplicate key error:', insertError);
        throw new Error('A version with this ID already exists. Please try again.');
      }
      console.error('Error saving diagram:', insertError);
      throw new Error('Failed to save the diagram.');
    }
  } catch (error) {
    console.error('Error during save operation:', error);
    throw error;
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

export async function changeDiagramName(diagramId, newName) {
  try {
    const { error } = await supabase
      .from('diagrams')
      .update({ name: newName })
      .eq('id', diagramId);

    if (error) {
      throw error;
    }

    console.log(`Diagram name updated to: ${newName}`);
    return true;
  } catch (err) {
    console.error('Error updating diagram name:', err);
    return false;
  }
}