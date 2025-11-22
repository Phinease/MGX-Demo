import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileCode, X, History } from 'lucide-react';
import { FilePreview } from '@/hooks/useCodingPreview';
import { Card } from '@/components/ui/card';
import CodeEditor from './CodeEditor';

interface CodingPreviewProps {
  preview: FilePreview | null;
  previewHistory?: FilePreview[];
  onClose?: () => void;
  onClearHistory?: () => void;
}

/**
 * Component to display file content preview during agent coding
 * Shows streaming file content as the agent writes code
 */
export default function CodingPreview({
  preview,
  previewHistory,
  onClose,
  onClearHistory,
}: CodingPreviewProps) {
  if (!preview) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileCode className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Coding Preview</h2>
            </div>
            {previewHistory && previewHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearHistory}
              >
                <History className="h-4 w-4 mr-2" />
                Clear History ({previewHistory.length})
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center space-y-2">
            <FileCode className="h-12 w-12 mx-auto opacity-50" />
            <p>No active file preview</p>
            <p className="text-sm">File previews will appear here when the agent writes code</p>
          </div>
        </div>
      </div>
    );
  }

  const getFileExtension = (path: string) => {
    const parts = path.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  };

  const extension = getFileExtension(preview.path);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <FileCode className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">{preview.path}</h2>
              <p className="text-xs text-muted-foreground">
                {new Date(preview.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {preview.isStreaming && (
              <Badge variant="secondary" className="animate-pulse">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Writing...
              </Badge>
            )}
            {!preview.isStreaming && (
              <Badge variant="default">
                Completed
              </Badge>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content - Code Editor */}
      <div className="flex-1 flex flex-col min-h-0 max-h-[600px] border-b">
        <div className="h-[500px]">
          <CodeEditor
            content={preview.content || '// Waiting for content...'}
            fileName={preview.path}
            readOnly={true}
            showMinimap={true}
            fontSize={13}
            options={{
              renderLineHighlight: 'none',
              contextmenu: false,
              folding: true,
              renderWhitespace: 'selection',
              scrollbar: {
                vertical: 'auto',
                horizontal: 'auto',
                verticalScrollbarSize: 12,
                horizontalScrollbarSize: 12,
              },
            }}
          />
        </div>
        
        {/* Content Stats */}
        <div className="px-4 py-2 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground border-t">
          <div className="flex items-center space-x-4">
            <span className="font-mono">{extension.toUpperCase()}</span>
            <span>{preview.content.split('\n').length} lines</span>
            <span>{preview.content.length} characters</span>
          </div>
          <span className="font-mono text-muted-foreground/70">
            {preview.path.split('/').pop()}
          </span>
        </div>
      </div>

      {/* History Section */}
      {previewHistory && previewHistory.length > 0 && (
        <div className="border-t p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center">
              <History className="h-4 w-4 mr-2" />
              Recent Files ({previewHistory.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearHistory}
            >
              Clear
            </Button>
          </div>
          <ScrollArea className="h-24">
            <div className="space-y-2">
              {previewHistory.slice(-5).reverse().map((item, index) => (
                <Card key={index} className="p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono truncate flex-1">
                      {item.path.split('/').pop()}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

