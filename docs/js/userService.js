import { supabase } from './supabase.js';

async function getCurrentUserId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export async function getProfile() {
  const id = await getCurrentUserId();
  return await supabase
    .from('users')
    .select('username')
    .eq('id', id)
    .single();
}

export async function updateProfile(username) {
  const id = await getCurrentUserId();
  return await supabase
    .from('users')
    .update({ username })
    .eq('id', id);
}

export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username')
    .order('username', { ascending: true });

  if (error) throw error;
  return data;
}