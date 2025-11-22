import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, File, Folder, RefreshCw, AlertCircle, Save, X, Edit } from 'lucide-react';
import { FileNode } from '@/types';
import { getFileContent, saveFileContent } from '@/lib/fileSystemApi';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import CodeEditor from './CodeEditor';

interface EditorPanelProps {
  fileTree: FileNode[];
  projectPath: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  projectInitialized?: boolean;
}

/**
 * Editor panel with file tree and code editor
 * Allows browsing and editing project files
 */
export default function EditorPanel({ 
  fileTree, 
  projectPath, 
  isLoading: isLoadingTree, 
  onRefresh,
  projectInitialized = true,
}: EditorPanelProps) {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  // Load file content from backend
  const loadFileContent = async (file: FileNode, forceReload = false) => {
    setError(null);
    setIsEditing(false);

    // If file already has content and not force reload, use cached version
    if (file.content && !forceReload) {
      setFileContent(file.content);
      setOriginalContent(file.content);
      return;
    }

    // Load real file content from backend using absolute path
    setIsLoadingContent(true);
    try {
      const data = await getFileContent(file.path);
      setFileContent(data.content);
      setOriginalContent(data.content);
      
      // Update file node with loaded content
      file.content = data.content;
      file.language = data.language;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load file content';
      setError(errorMessage);
      setFileContent('');
      setOriginalContent('');
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Save file content
  const handleSave = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    setError(null);
    try {
      await saveFileContent(selectedFile.path, fileContent);
      
      // Update cached content
      selectedFile.content = fileContent;
      setOriginalContent(fileContent);
      setIsEditing(false);
      
      toast.success('File saved successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save file';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original content and exit edit mode
  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      setFileContent(originalContent);
      toast.info('Changes discarded');
    }
    setIsEditing(false);
  };

  // Handle refresh - reload file tree and current file
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
    if (selectedFile) {
      loadFileContent(selectedFile, true);
    }
  };

  // Load content when a file is selected
  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    } else {
      setFileContent('');
      setOriginalContent('');
      setIsEditing(false);
    }
  }, [selectedFile]);

  const handleFileClick = (file: FileNode) => {
    setSelectedFile(file);
  };

  const hasUnsavedChanges = fileContent !== originalContent;

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path} style={{ paddingLeft: `${level * 16}px` }}>
        {node.type === 'folder' ? (
          <>
            <div
              className="flex items-center space-x-2 py-1 px-2 hover:bg-muted cursor-pointer rounded"
              onClick={() => toggleFolder(node.path)}
            >
              {expandedFolders.has(node.path) ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Folder className="h-4 w-4 text-blue-500" />
              <span className="text-sm">{node.name}</span>
            </div>
            {expandedFolders.has(node.path) && node.children && renderFileTree(node.children, level + 1)}
          </>
        ) : (
          <div
            className={`flex items-center space-x-2 py-1 px-2 hover:bg-muted cursor-pointer rounded ${
              selectedFile?.path === node.path ? 'bg-muted' : ''
            }`}
            onClick={() => handleFileClick(node)}
          >
            <File className="h-4 w-4 text-gray-500 ml-6" />
            <span className="text-sm">{node.name}</span>
          </div>
        )}
      </div>
    ));
  };

  // Show not initialized message
  if (!projectInitialized) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/20">
        <div className="text-center space-y-4 p-8 max-w-md">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">Project Not Initialized</h3>
          <p className="text-sm text-muted-foreground">
            This conversation doesn't have a project yet. Ask the AI to initialize a project to get started with code editing.
          </p>
          <div className="pt-4 text-xs text-muted-foreground space-y-1">
            <p>💡 Try saying:</p>
            <p className="font-mono bg-muted px-3 py-2 rounded">
              "Initialize a new project for me"
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* File Tree */}
      <div className="w-64 border-r flex-shrink-0">
        <ScrollArea className="h-full">
          <div className="p-2">{renderFileTree(fileTree)}</div>
        </ScrollArea>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedFile ? (
          <>
            {/* Toolbar */}
            <div className="p-4 border-b flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-muted-foreground truncate flex-1 min-w-0">
                  {selectedFile.path}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                        disabled={isLoadingContent}
                        title="Edit file"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isLoadingContent}
                        title="Refresh"
                      >
                        <RefreshCw className={`h-4 w-4 ${isLoadingContent ? 'animate-spin' : ''}`} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving || !hasUnsavedChanges}
                        title="Save changes"
                      >
                        <Save className={`h-4 w-4 ${isSaving ? 'animate-pulse' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        title="Cancel editing"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {hasUnsavedChanges && (
                <div className="mt-2 text-xs text-orange-500">
                  * Unsaved changes
                </div>
              )}
              
              {error && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
            
            {/* Code Editor */}
            <div className="flex-1 flex flex-col min-h-0">
              {isLoadingContent ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <CodeEditor
                  content={fileContent || '// No content available'}
                  language={selectedFile.language}
                  fileName={selectedFile.name}
                  readOnly={!isEditing}
                  onChange={setFileContent}
                />
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>Select a file to view its content</p>
          </div>
        )}
      </div>
    </div>
  );
}

