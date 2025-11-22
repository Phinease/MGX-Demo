import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react';
import { FileNode } from '@/types';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodePanelProps {
  fileTree: FileNode[];
}

export default function CodePanel({ fileTree }: CodePanelProps) {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
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
            onClick={() => setSelectedFile(node)}
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
      <Tabs defaultValue="preview" className="h-full flex flex-col">
        <div className="flex justify-center border-b py-2">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
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

        <TabsContent value="editor" className="flex-1 m-0">
          <div className="flex h-full">
            <div className="w-64 border-r">
              <ScrollArea className="h-full">
                <div className="p-2">{renderFileTree(fileTree)}</div>
              </ScrollArea>
            </div>

            <div className="flex-1">
              {selectedFile ? (
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <div className="mb-2 text-sm font-semibold text-muted-foreground">{selectedFile.path}</div>
                    <SyntaxHighlighter
                      language={selectedFile.language || 'typescript'}
                      style={vscDarkPlus}
                      customStyle={{
                        margin: 0,
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                      }}
                    >
                      {selectedFile.content || ''}
                    </SyntaxHighlighter>
                  </div>
                </ScrollArea>
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