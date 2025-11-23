import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileNode } from '@/types';
import { FilePreview } from '@/hooks/useCodingPreview';
import PreviewFrame from './PreviewFrame';
import CodingPreview from './CodingPreview';
import EditorPanel from './EditorPanel';

interface RunningProject {
  url: string;
  processId: string;
  projectPath: string;
  port: number;
  isRunning: boolean;
}

interface WorkspacePanelProps {
  /** File tree for the project */
  fileTree: FileNode[];
  /** Project path */
  projectPath: string;
  /** Whether file tree is loading */
  isLoading?: boolean;
  /** Callback to refresh file tree */
  onRefresh?: () => void;
  /** Current coding preview (agent writing code) */
  codingPreview?: FilePreview | null;
  /** Callback to clear coding preview */
  onClearPreview?: () => void;
  /** Running project information */
  runningProject?: RunningProject | null;
  /** Whether project is initialized */
  projectInitialized?: boolean;
}

/**
 * Main workspace panel component that manages tabs and content
 * Contains three tabs: Preview, Coding, and Editor
 */
export default function WorkspacePanel({ 
  fileTree, 
  projectPath, 
  isLoading, 
  onRefresh,
  codingPreview,
  onClearPreview,
  runningProject,
  projectInitialized = true,
}: WorkspacePanelProps) {
  const [activeTab, setActiveTab] = useState<string>('preview');

  // Auto-switch to coding tab when preview is active
  useEffect(() => {
    if (codingPreview) {
      setActiveTab('coding');
    }
  }, [codingPreview]);

  // Reset to preview tab when project path changes (switching conversations)
  useEffect(() => {
    setActiveTab('preview');
  }, [projectPath]);

  return (
    <div className="h-full bg-background">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        {/* Tab Header */}
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

        {/* Preview Tab - Running Project */}
        <TabsContent value="preview" className="flex-1 m-0">
          <PreviewFrame
            url={runningProject?.url}
            processId={runningProject?.processId}
            projectPath={runningProject?.projectPath}
            port={runningProject?.port}
            isRunning={runningProject?.isRunning}
          />
        </TabsContent>

        {/* Coding Tab - Agent Coding Preview */}
        <TabsContent value="coding" className="flex-1 m-0 h-full overflow-hidden">
          <CodingPreview
            preview={codingPreview}
            previewHistory={[]}
            onClose={onClearPreview}
          />
        </TabsContent>

        {/* Editor Tab - File Browser and Editor */}
        <TabsContent value="editor" className="flex-1 m-0">
          <EditorPanel
            fileTree={fileTree}
            projectPath={projectPath}
            onRefresh={onRefresh}
            projectInitialized={projectInitialized}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

