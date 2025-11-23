import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, ExternalLink, Globe, Play, Square, Settings } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface PreviewFrameProps {
  url?: string;
  processId?: string;
  projectPath?: string;
  port?: number;
  isRunning?: boolean;
}

// Storage key for cloud IP setting
const CLOUD_IP_STORAGE_KEY = 'mgx-demo-cloud-ip';

/**
 * Get cloud IP from localStorage
 */
const getCloudIP = (): string => {
  return localStorage.getItem(CLOUD_IP_STORAGE_KEY) || '';
};

/**
 * Set cloud IP to localStorage
 */
const setCloudIP = (ip: string) => {
  if (ip) {
    localStorage.setItem(CLOUD_IP_STORAGE_KEY, ip);
  } else {
    localStorage.removeItem(CLOUD_IP_STORAGE_KEY);
  }
};

/**
 * Replace localhost with cloud IP if configured
 */
const replaceLocalhost = (url: string, cloudIP: string): string => {
  if (!cloudIP) return url;
  return url.replace(/localhost/g, cloudIP).replace(/127\.0\.0\.1/g, cloudIP);
};

/**
 * Preview frame component to display running project in iframe
 * Shows a browser-like address bar and iframe preview
 */
export default function PreviewFrame({
  url,
  processId,
  projectPath,
  port,
  isRunning = false,
}: PreviewFrameProps) {
  const [cloudIP, setCloudIPState] = useState(getCloudIP());
  const [tempCloudIP, setTempCloudIP] = useState(cloudIP);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const defaultUrl = replaceLocalhost('http://localhost:5173', cloudIP);
  const [currentUrl, setCurrentUrl] = useState(url ? replaceLocalhost(url, cloudIP) : defaultUrl);
  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Update current URL when prop changes
  useEffect(() => {
    if (url) {
      const newUrl = replaceLocalhost(url, cloudIP);
      setCurrentUrl(newUrl);
      setInputUrl(newUrl);
    }
  }, [url, cloudIP]);

  // Update URLs when cloud IP changes
  useEffect(() => {
    setCurrentUrl(prev => replaceLocalhost(prev, cloudIP));
    setInputUrl(prev => replaceLocalhost(prev, cloudIP));
  }, [cloudIP]);

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

  const handleSaveCloudIP = () => {
    setCloudIP(tempCloudIP);
    setCloudIPState(tempCloudIP);
    setIsSettingsOpen(false);
    toast.success(tempCloudIP ? 'Cloud IP saved: ' + tempCloudIP : 'Cloud IP cleared');
  };

  const handleOpenSettings = () => {
    setTempCloudIP(cloudIP);
    setIsSettingsOpen(true);
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
          
          {/* Cloud IP Settings */}
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleOpenSettings}
                title="Cloud IP Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cloud IP Settings</DialogTitle>
                <DialogDescription>
                  Replace localhost with your cloud server IP address. This setting applies globally across the entire application.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="cloud-ip">Cloud Server IP or Domain</Label>
                  <Input
                    id="cloud-ip"
                    placeholder="e.g., 192.168.1.100 or example.com"
                    value={tempCloudIP}
                    onChange={(e) => setTempCloudIP(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use localhost. All localhost URLs will be replaced with this IP/domain.
                  </p>
                </div>
                {cloudIP && (
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Current Setting:</p>
                    <code className="px-2 py-1 bg-muted rounded text-xs">
                      localhost → {cloudIP}
                    </code>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCloudIP}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
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

