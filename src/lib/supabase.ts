import { createClient } from '@supabase/supabase-js';
import type { Message } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ilbbmkfcpdxfblpmkdod.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJta2ZjcGR4ZmJscG1rZG9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3MDQ4MzEsImV4cCI6MjA3OTI4MDgzMX0.B6MbkHndhEhcW400mNDwkxoIK1Cw-aAq7-zQw2LUjTM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// ============================================
// Auth Functions
// ============================================

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

// ============================================
// Conversation Types
// ============================================

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'agent';
  contents: Message['contents'];
  timestamp: string;
  created_at?: string;
}

export interface ConversationState {
  id: string;
  conversation_id: string;
  // Project state
  project_initialized: boolean;
  project_path: string | null;
  project_name: string | null;
  // Preview state
  preview_url: string | null;
  preview_process_id: string | null;
  preview_port: number | null;
  preview_is_running: boolean;
  // Editor state
  editor_folder_path: string | null;
  editor_selected_file: string | null;
  // Coding preview state
  coding_file_path: string | null;
  coding_file_content: string | null;
  coding_is_active: boolean;
  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================
// Conversation Functions
// ============================================

/**
 * Create a new conversation with auto-increment naming
 */
export const createConversation = async (title?: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  // If no title provided, generate one with sequence number
  let conversationTitle = title;
  if (!conversationTitle) {
    // Get count of existing conversations for this user
    const { count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    const nextNumber = (count || 0) + 1;
    conversationTitle = `Conversation ${nextNumber}`;
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      title: conversationTitle,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  // Create initial state for the conversation
  if (data && !error) {
    await createConversationState(data.id);
  }

  return { data, error };
};

/**
 * Get all conversations for the current user
 */
export const getConversations = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  return { data, error };
};

/**
 * Get a single conversation by ID
 */
export const getConversation = async (conversationId: string) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  return { data, error };
};

/**
 * Update conversation title
 */
export const updateConversation = async (conversationId: string, title: string) => {
  const { data, error } = await supabase
    .from('conversations')
    .update({
      title,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .select()
    .single();

  return { data, error };
};

/**
 * Update conversation's updated_at timestamp
 */
export const touchConversation = async (conversationId: string) => {
  const { data, error } = await supabase
    .from('conversations')
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .select()
    .single();

  return { data, error };
};

/**
 * Delete a conversation and its messages
 */
export const deleteConversation = async (conversationId: string) => {
  // First delete all messages in the conversation
  await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId);

  // Then delete the conversation
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);

  return { error };
};

// ============================================
// Message Functions
// ============================================

/**
 * Save a message to a conversation
 */
export const saveMessage = async (
  conversationId: string,
  message: Omit<ConversationMessage, 'id' | 'conversation_id' | 'created_at'>
) => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      role: message.role,
      contents: message.contents,
      timestamp: message.timestamp,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  // Update conversation's updated_at timestamp
  if (!error) {
    await touchConversation(conversationId);
  }

  return { data, error };
};

/**
 * Get all messages for a conversation
 */
export const getMessages = async (conversationId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true });

  return { data, error };
};

/**
 * Delete a message
 */
export const deleteMessage = async (messageId: string) => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);

  return { error };
};

/**
 * Clear all messages in a conversation
 */
export const clearMessages = async (conversationId: string) => {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId);

  return { error };
};

// ============================================
// Conversation State Functions
// ============================================

/**
 * Create initial state for a conversation
 */
export const createConversationState = async (conversationId: string) => {
  const { data, error } = await supabase
    .from('conversation_state')
    .insert({
      conversation_id: conversationId,
      project_initialized: false,
      preview_is_running: false,
      coding_is_active: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  return { data, error };
};

/**
 * Get conversation state
 */
export const getConversationState = async (conversationId: string) => {
  const { data, error } = await supabase
    .from('conversation_state')
    .select('*')
    .eq('conversation_id', conversationId)
    .single();

  return { data, error };
};

/**
 * Update conversation state
 */
export const updateConversationState = async (
  conversationId: string,
  updates: Partial<Omit<ConversationState, 'id' | 'conversation_id' | 'created_at' | 'updated_at'>>
) => {
  const { data, error } = await supabase
    .from('conversation_state')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('conversation_id', conversationId)
    .select()
    .single();

  return { data, error };
};

/**
 * Update project initialization state
 */
export const updateProjectState = async (
  conversationId: string,
  projectPath: string,
  projectName: string
) => {
  return updateConversationState(conversationId, {
    project_initialized: true,
    project_path: projectPath,
    project_name: projectName,
  });
};

/**
 * Update preview state
 */
export const updatePreviewState = async (
  conversationId: string,
  previewInfo: {
    url: string;
    processId: string;
    port: number;
    isRunning: boolean;
  }
) => {
  return updateConversationState(conversationId, {
    preview_url: previewInfo.url,
    preview_process_id: previewInfo.processId,
    preview_port: previewInfo.port,
    preview_is_running: previewInfo.isRunning,
  });
};

/**
 * Stop preview (update state)
 */
export const stopPreviewState = async (conversationId: string) => {
  return updateConversationState(conversationId, {
    preview_is_running: false,
  });
};

/**
 * Update editor state
 */
export const updateEditorState = async (
  conversationId: string,
  folderPath: string | null,
  selectedFile?: string | null
) => {
  const updates: any = {
    editor_folder_path: folderPath,
  };
  
  if (selectedFile !== undefined) {
    updates.editor_selected_file = selectedFile;
  }
  
  return updateConversationState(conversationId, updates);
};

/**
 * Update coding preview state
 */
export const updateCodingState = async (
  conversationId: string,
  filePath: string | null,
  fileContent: string | null,
  isActive: boolean
) => {
  return updateConversationState(conversationId, {
    coding_file_path: filePath,
    coding_file_content: fileContent,
    coding_is_active: isActive,
  });
};