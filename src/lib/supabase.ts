import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ilbbmkfcpdxfblpmkdod.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJta2ZjcGR4ZmJscG1rZG9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDQ4MzEsImV4cCI6MjA3OTI4MDgzMX0.B6MbkHndhEhcW400mNDwkxoIK1Cw-aAq7-zQw2LUjTM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const signUp = async (email: string, password: string, nickname: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nickname,
      },
    },
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};