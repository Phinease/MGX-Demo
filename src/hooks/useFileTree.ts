import { useState, useEffect } from 'react';
import { FileNode } from '@/types';
import { getFileTree, checkBackendConnection } from '@/lib/fileSystemApi';

export interface UseFileTreeOptions {
  projectPath?: string;
  maxDepth?: number;
  autoLoad?: boolean;
}

export interface UseFileTreeResult {
  fileTree: FileNode[];
  isLoading: boolean;
  error: string | null;
  isBackendConnected: boolean;
  loadFileTree: () => Promise<void>;
  checkConnection: () => Promise<void>;
}

/**
 * Hook for managing file tree data
 * 
 * @param options - Configuration options
 * @returns File tree state and actions
 */
export function useFileTree(options: UseFileTreeOptions = {}): UseFileTreeResult {
  const { projectPath, maxDepth = 5, autoLoad = false } = options;

  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);

  /**
   * Check backend connection
   */
  const checkConnection = async () => {
    const connected = await checkBackendConnection();
    setIsBackendConnected(connected);
    return connected;
  };

  /**
   * Load file tree from backend
   */
  const loadFileTree = async () => {
    if (!projectPath) {
      setError('No project path specified');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First check if backend is connected
      const connected = await checkConnection();
      if (!connected) {
        throw new Error('Backend server is not connected. Please start the backend server.');
      }

      const tree = await getFileTree(projectPath, maxDepth);
      setFileTree(tree);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load file tree';
      setError(errorMessage);
      setFileTree([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto load on mount if enabled
  useEffect(() => {
    if (autoLoad && projectPath) {
      loadFileTree();
    }
  }, [projectPath, maxDepth, autoLoad]);

  // Check connection on mount
  useEffect(() => {
    checkConnection();
  }, []);

  return {
    fileTree,
    isLoading,
    error,
    isBackendConnected,
    loadFileTree,
    checkConnection,
  };
}

