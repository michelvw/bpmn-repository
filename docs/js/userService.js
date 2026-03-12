import { supabase } from './supabase.js';

export async function getProfile() {

  return await supabase
    .from('users')
    .select('username')
    .eq('id', (await supabase.auth.getUser()).data.user.id)
    .single();
}

export async function updateProfile(username) {

  return await supabase
    .from('users')
    .update({ username })
    .eq('id', (await supabase.auth.getUser()).data.user.id);
}

export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username')
    .order('username', { ascending: true });

  if (error) throw error;
  return data;
}