import { useState, useEffect, useCallback } from 'react';
import type { Message } from '@/types';
import {
  getConversations,
  createConversation as createConversationApi,
  deleteConversation as deleteConversationApi,
  updateConversation as updateConversationApi,
  getMessages,
  saveMessage,
  clearMessages as clearMessagesApi,
  type Conversation,
} from '@/lib/supabase';
import { toast } from 'sonner';

export interface UseConversationsReturn {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  error: Error | null;
  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<string | null>;
  deleteConversation: (conversationId: string) => Promise<void>;
  updateConversation: (conversationId: string, title: string) => Promise<void>;
  setCurrentConversation: (conversationId: string | null) => void;
  loadMessages: (conversationId: string) => Promise<Message[]>;
  saveConversationMessage: (conversationId: string, message: Message) => Promise<void>;
  clearConversationMessages: (conversationId: string) => Promise<void>;
}

export const useConversations = (userId: string | null): UseConversationsReturn => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load all conversations for the user
  const loadConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getConversations();
      
      if (fetchError) {
        throw fetchError;
      }

      setConversations(data || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load conversations');
      setError(error);
      toast.error('Failed to load conversations');
      console.error('Error loading conversations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Create a new conversation
  const createConversation = useCallback(async (title?: string): Promise<string | null> => {
    if (!userId) {
      toast.error('Please sign in to create conversations');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Pass title directly, createConversationApi will handle auto-numbering
      const { data, error: createError } = await createConversationApi(title);

      if (createError) {
        throw createError;
      }

      if (data) {
        setConversations(prev => [data, ...prev]);
        setCurrentConversationId(data.id);
        toast.success('Conversation created');
        return data.id;
      }

      return null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create conversation');
      setError(error);
      toast.error('Failed to create conversation');
      console.error('Error creating conversation:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await deleteConversationApi(conversationId);

      if (deleteError) {
        throw deleteError;
      }

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      // If deleting current conversation, clear the selection
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
      }

      toast.success('Conversation deleted');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete conversation');
      setError(error);
      toast.error('Failed to delete conversation');
      console.error('Error deleting conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentConversationId]);

  // Update conversation title
  const updateConversation = useCallback(async (conversationId: string, title: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: updateError } = await updateConversationApi(conversationId, title);

      if (updateError) {
        throw updateError;
      }

      if (data) {
        setConversations(prev =>
          prev.map(c => (c.id === conversationId ? data : c))
        );
        toast.success('Conversation updated');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update conversation');
      setError(error);
      toast.error('Failed to update conversation');
      console.error('Error updating conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set the current conversation
  const setCurrentConversation = useCallback((conversationId: string | null) => {
    setCurrentConversationId(conversationId);
  }, []);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string): Promise<Message[]> => {
    try {
      const { data, error: fetchError } = await getMessages(conversationId);

      if (fetchError) {
        throw fetchError;
      }

      // Convert database messages to app messages
      const messages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        role: msg.role,
        contents: msg.contents,
        timestamp: msg.timestamp,
      }));

      return messages;
    } catch (err) {
      console.error('Error loading messages:', err);
      toast.error('Failed to load messages');
      return [];
    }
  }, []);

  // Save a message to a conversation
  const saveConversationMessage = useCallback(async (conversationId: string, message: Message) => {
    try {
      const { error: saveError } = await saveMessage(conversationId, {
        role: message.role,
        contents: message.contents,
        timestamp: message.timestamp,
      });

      if (saveError) {
        throw saveError;
      }
    } catch (err) {
      console.error('Error saving message:', err);
      // Don't show toast for message save errors to avoid spam
    }
  }, []);

  // Clear all messages in a conversation
  const clearConversationMessages = useCallback(async (conversationId: string) => {
    try {
      const { error: clearError } = await clearMessagesApi(conversationId);

      if (clearError) {
        throw clearError;
      }

      toast.success('Messages cleared');
    } catch (err) {
      console.error('Error clearing messages:', err);
      toast.error('Failed to clear messages');
    }
  }, []);

  // Load conversations on mount and when user changes
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return {
    conversations,
    currentConversationId,
    isLoading,
    error,
    loadConversations,
    createConversation,
    deleteConversation,
    updateConversation,
    setCurrentConversation,
    loadMessages,
    saveConversationMessage,
    clearConversationMessages,
  };
};

