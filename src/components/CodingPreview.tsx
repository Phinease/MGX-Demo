import { useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, FileCode, X, History } from 'lucide-react';
import { FilePreview } from '@/hooks/useCodingPreview';

interface CodingPreviewProps {
  preview: FilePreview | null;
  previewHistory: FilePreview[];
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
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when content updates
  useEffect(() => {
    if (contentRef.current && preview?.isStreaming) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [preview?.content, preview?.isStreaming]);

  if (!preview) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileCode className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Coding Preview</h2>
            </div>
            {previewHistory.length > 0 && (
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

  // Get file extension for syntax highlighting class
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

      {/* Content */}
      <ScrollArea className="flex-1">
        <div ref={contentRef} className="p-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="font-mono text-muted-foreground">
                  {preview.path.split('/').pop()}
                </span>
                <Badge variant="outline">{extension}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm overflow-x-auto">
                <code className={`language-${extension}`}>
                  {preview.content || '// Waiting for content...'}
                </code>
              </pre>
            </CardContent>
          </Card>

          {/* Content Stats */}
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>{preview.content.length} characters</span>
            <span>{preview.content.split('\n').length} lines</span>
          </div>
        </div>
      </ScrollArea>

      {/* History Section */}
      {previewHistory.length > 0 && (
        <div className="border-t p-4">
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

