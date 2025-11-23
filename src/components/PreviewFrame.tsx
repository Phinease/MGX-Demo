import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ExternalLink, Globe, Play } from 'lucide-react';
import { toast } from 'sonner';

interface PreviewFrameProps {
  url?: string;
  processId?: string;
  projectPath?: string;
  port?: number;
  isRunning?: boolean;
}

/**
 * Automatically detect current hostname and replace localhost
 * If accessing from cloud server, use cloud IP; otherwise use localhost
 */
const replaceLocalhost = (url: string): string => {
  // Get current hostname from browser
  const currentHostname = window.location.hostname;
  
  // If already accessing from a non-localhost address, replace localhost with it
  if (currentHostname !== 'localhost' && currentHostname !== '127.0.0.1') {
    return url
      .replace(/localhost/g, currentHostname)
      .replace(/127\.0\.0\.1/g, currentHostname);
  }
  
  // Otherwise, keep as is (local development)
  return url;
};

/**
 * Preview frame component to display running project in iframe
 * Shows a browser-like address bar and iframe preview
 * Automatically detects cloud environment and replaces localhost with current hostname
 */
export default function PreviewFrame({
  url,
  processId,
  projectPath,
  port,
  isRunning = false,
}: PreviewFrameProps) {
  const defaultUrl = replaceLocalhost('http://localhost:5173');
  const [currentUrl, setCurrentUrl] = useState(url ? replaceLocalhost(url) : defaultUrl);
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Update current URL when prop changes
  useEffect(() => {
    if (url) {
      const newUrl = replaceLocalhost(url);
      setCurrentUrl(newUrl);
      setInputUrl(newUrl);
    }
  }, [url]);

  const handleNavigate = () => {
    if (inputUrl.trim()) {
      setIsLoading(true);
      setCurrentUrl(inputUrl.trim());
      setIframeKey(prev => prev + 1);
      toast.success('Navigating to ' + inputUrl.trim());
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
    toast.info('Refreshing preview');
  };

  const handleOpenInBrowser = () => {
    window.open(currentUrl, '_blank');
    toast.success('Opened in new tab');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNavigate();
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    toast.error('Failed to load preview');
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Browser-like toolbar - always visible */}
      <div className="border-b p-3 space-y-2">
        {/* Status and info */}
        {(isRunning || port || processId) && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {isRunning && (
                <Badge variant="default" className="flex items-center space-x-1">
                  <Play className="h-3 w-3" />
                  <span>Running</span>
                </Badge>
              )}
              {port && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <Globe className="h-3 w-3" />
                  <span>Port {port}</span>
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {processId && (
                <span className="text-xs text-muted-foreground font-mono">
                  {processId}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Address bar - always visible */}
        <div className="flex items-center space-x-2">
          <div className="flex-1 flex items-center space-x-2">
            <Globe className="h-4 w-4 text-muted-foreground ml-2" />
            <Input
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter URL..."
              className="flex-1"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            title="Refresh"
            disabled={!isRunning && !url}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenInBrowser}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleNavigate}
            size="sm"
          >
            Go
          </Button>
        </div>

        {/* Project info */}
        {projectPath && (
          <div className="text-xs text-muted-foreground font-mono truncate">
            📁 {projectPath}
          </div>
        )}
      </div>

      {/* Preview iframe or placeholder */}
      {(!isRunning && !url) ? (
        <div className="flex-1 flex items-center justify-center bg-muted/20">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-6xl">🚀</div>
            <h2 className="text-2xl font-bold">No Project Running</h2>
            <p className="text-muted-foreground">
              Ask the agent to run a project with the <code className="px-2 py-1 bg-muted rounded">run_project</code> tool
            </p>
            <div className="pt-4 text-sm text-muted-foreground">
              <p>Example: "Run the project on port 5173"</p>
              <p className="mt-2">Or enter a URL above to preview any webpage</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 relative bg-white">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <iframe
            key={iframeKey}
            src={currentUrl}
            className="w-full h-full border-0"
            title="Project Preview"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </div>
      )}
    </div>
  );
}

