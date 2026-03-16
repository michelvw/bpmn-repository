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

export async function getIsAdmin() {
  const id = await getCurrentUserId();
  const { data, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data.is_admin;
}

export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, is_admin')
    .order('username', { ascending: true });

  if (error) throw error;
  return data;
}

export async function deleteUser(userId) {
  const { error } = await supabase.rpc('delete_user', { p_user_id: userId });
  if (error) throw error;
}

export async function renameUser(userId, username) {
  const { error } = await supabase.rpc('rename_user', {
    p_user_id: userId,
    p_username: username
  });
  if (error) throw error;
}

export async function setAdminRole(userId, isAdmin) {
  const { error } = await supabase.rpc('set_admin_role', {
    p_user_id: userId,
    p_is_admin: isAdmin
  });
  if (error) throw error;
}

export async function getUserEmail(userId) {
  const { data, error } = await supabase.rpc('get_user_email', {
    p_user_id: userId
  });
  if (error) throw error;
  return data;
}