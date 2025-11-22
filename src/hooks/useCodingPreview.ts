import { useState, useCallback } from 'react';

export interface FilePreview {
  path: string;
  content: string;
  isStreaming: boolean;
  timestamp: string;
}

/**
 * Hook to manage coding preview state
 * This hook manages the state for previewing files being written by the agent
 */
export function useCodingPreview() {
  const [currentPreview, setCurrentPreview] = useState<FilePreview | null>(null);
  const [previewHistory, setPreviewHistory] = useState<FilePreview[]>([]);

  /**
   * Start a new file preview
   */
  const startPreview = useCallback((path: string, initialContent: string = '') => {
    console.log('[useCodingPreview] Starting preview for:', path);
    const preview: FilePreview = {
      path,
      content: initialContent,
      isStreaming: true,
      timestamp: new Date().toISOString(),
    };
    setCurrentPreview(preview);
  }, []);

  /**
   * Append content to the current preview (for streaming)
   */
  const appendContent = useCallback((content: string) => {
    setCurrentPreview((prev) => {
      if (!prev) {
        console.warn('[useCodingPreview] Tried to append content but no preview is active');
        return null;
      }
      console.log('[useCodingPreview] Appending content:', content.substring(0, 50), '...');
      return {
        ...prev,
        content: prev.content + content,
      };
    });
  }, []);

  /**
   * Set the complete content (for non-streaming updates)
   */
  const setContent = useCallback((content: string) => {
    setCurrentPreview((prev) => {
      if (!prev) {
        console.warn('[useCodingPreview] Tried to set content but no preview is active');
        return null;
      }
      console.log('[useCodingPreview] Setting complete content, length:', content.length);
      return {
        ...prev,
        content,
      };
    });
  }, []);

  /**
   * Complete the current preview (stop streaming)
   */
  const completePreview = useCallback(() => {
    setCurrentPreview((prev) => {
      if (!prev) {
        return null;
      }
      console.log('[useCodingPreview] Completing preview for:', prev.path);
      const completedPreview = {
        ...prev,
        isStreaming: false,
      };
      
      // Add to history
      setPreviewHistory((history) => [...history, completedPreview]);
      
      return completedPreview;
    });
  }, []);

  /**
   * Clear the current preview
   */
  const clearPreview = useCallback(() => {
    console.log('[useCodingPreview] Clearing preview');
    setCurrentPreview(null);
  }, []);

  /**
   * Clear all preview history
   */
  const clearHistory = useCallback(() => {
    console.log('[useCodingPreview] Clearing history');
    setPreviewHistory([]);
  }, []);

  return {
    currentPreview,
    previewHistory,
    startPreview,
    appendContent,
    setContent,
    completePreview,
    clearPreview,
    clearHistory,
  };
}

