import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, File, Folder, RefreshCw, AlertCircle, Save, X, Edit, FileCode } from 'lucide-react';
import { FileNode } from '@/types';
import Editor from '@monaco-editor/react';
import { getFileContent, saveFileContent } from '@/lib/fileSystemApi';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FilePreview } from '@/hooks/useCodingPreview';

interface CodePanelProps {
  fileTree: FileNode[];
  projectPath: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  // Coding preview props
  codingPreview?: FilePreview | null;
  onClearPreview?: () => void;
}

export default function CodePanel({ 
  fileTree, 
  projectPath, 
  isLoading: isLoadingTree, 
  onRefresh,
  codingPreview,
  onClearPreview,
}: CodePanelProps) {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('preview');

  // Get language identifier for Monaco Editor
  const getMonacoLanguage = (fileLanguage?: string, fileName?: string): string => {
    if (fileLanguage) return fileLanguage;
    
    // Detect language from file extension
    if (!fileName) return 'plaintext';
    
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'go': 'go',
      'rs': 'rust',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'cpp',
      'sh': 'shell',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sql': 'sql',
    };
    
    return languageMap[ext || ''] || 'plaintext';
  };

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

  // Auto-switch to coding tab when preview is active
  useEffect(() => {
    if (codingPreview) {
      setActiveTab('coding');
    }
  }, [codingPreview]);

  // Get file extension for syntax highlighting
  const getFileExtension = (path: string) => {
    const parts = path.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  };

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

  return (
    <div className="h-full bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="flex justify-center border-b py-2">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="coding" className="relative">
              Coding
              {codingPreview && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {codingPreview.isStreaming ? '●' : '✓'}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="editor">Editor</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="preview" className="flex-1 m-0">
          <div className="h-full flex items-center justify-center bg-muted/20">
            <div className="text-center space-y-4">
              <div className="text-6xl">🚀</div>
              <h2 className="text-2xl font-bold">Frontend Preview</h2>
              <p className="text-muted-foreground">Your application preview will appear here</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="coding" className="flex-1 m-0">
          {codingPreview ? (
            <div className="h-full flex flex-col">
              {/* Coding Preview Header */}
              <div className="border-b p-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <FileCode className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold truncate">{codingPreview.path}</h2>
                      <p className="text-xs text-muted-foreground">
                        {new Date(codingPreview.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {codingPreview.isStreaming && (
                      <Badge variant="secondary" className="animate-pulse">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Writing...
                      </Badge>
                    )}
                    {!codingPreview.isStreaming && (
                      <Badge variant="default">Completed</Badge>
                    )}
                    {onClearPreview && (
                      <Button variant="ghost" size="icon" onClick={onClearPreview}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Coding Preview Content */}
              <ScrollArea className="flex-1">
                <div className="p-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="font-mono text-muted-foreground">
                          {codingPreview.path.split('/').pop()}
                        </span>
                        <Badge variant="outline">
                          {getFileExtension(codingPreview.path)}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-sm overflow-x-auto">
                        <code className={`language-${getFileExtension(codingPreview.path)}`}>
                          {codingPreview.content || '// Waiting for content...'}
                        </code>
                      </pre>
                    </CardContent>
                  </Card>

                  {/* Content Stats */}
                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{codingPreview.content.length} characters</span>
                    <span>{codingPreview.content.split('\n').length} lines</span>
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <FileCode className="h-12 w-12 mx-auto opacity-50" />
                <p>No active file preview</p>
                <p className="text-sm">File previews will appear here when the agent writes code</p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="editor" className="flex-1 m-0">
          <div className="flex h-full overflow-hidden">
            <div className="w-64 border-r flex-shrink-0">
              <ScrollArea className="h-full">
                <div className="p-2">{renderFileTree(fileTree)}</div>
              </ScrollArea>
            </div>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {selectedFile ? (
                <>
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
                  
                  <div className="flex-1 flex flex-col min-h-0">
                    {isLoadingContent ? (
                      <div className="flex items-center justify-center p-8">
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <Editor
                        height="100%"
                        language={getMonacoLanguage(selectedFile.language, selectedFile.name)}
                        value={fileContent || '// No content available'}
                        onChange={(value) => isEditing && setFileContent(value || '')}
                        theme="vs-dark"
                        options={{
                          readOnly: !isEditing,
                          minimap: { enabled: true },
                          fontSize: 14,
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          wordWrap: 'on',
                          wrappingIndent: 'indent',
                          scrollbar: {
                            vertical: 'visible',
                            horizontal: 'visible',
                            verticalScrollbarSize: 10,
                            horizontalScrollbarSize: 10,
                          },
                        }}
                        loading={
                          <div className="flex items-center justify-center p-8">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        }
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
        </TabsContent>
      </Tabs>
    </div>
  );
}