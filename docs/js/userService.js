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