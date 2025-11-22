import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FilePreview } from '@/hooks/useCodingPreview';
import CodingPreview from './CodingPreview';
import agentSourceCode from '@/lib/agent.ts?raw';

/**
 * Test page for CodingPreview component
 * Shows mock data to test the component without running the agent
 */
export default function CodingPreviewTest() {
  // Mock preview data using agent.ts source code
  const [preview] = useState<FilePreview>({
    path: '/Users/shuangruichen/Code/MGX-Demo/src/lib/agent.ts',
    content: agentSourceCode,
    timestamp: new Date().toISOString(),
    isStreaming: false,
  });

  const [previewHistory] = useState<FilePreview[]>([
    {
      path: '/src/components/ChatPanel.tsx',
      content: '// ChatPanel content...',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      isStreaming: false,
    },
    {
      path: '/src/lib/tools.ts',
      content: '// Tools content...',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      isStreaming: false,
    },
  ]);

  const [showPreview, setShowPreview] = useState(true);

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b p-4">
        <h1 className="text-2xl font-bold">Coding Preview Test</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Testing CodingPreview component with agent.ts source code
        </p>
        <div className="mt-2">
          <Button
            onClick={() => setShowPreview(!showPreview)}
            variant="outline"
            size="sm"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>
      </div>
      <div className="flex-1">
        {showPreview && (
          <CodingPreview
            preview={preview}
            previewHistory={previewHistory}
            onClose={() => setShowPreview(false)}
            onClearHistory={() => console.log('Clear history')}
          />
        )}
      </div>
    </div>
  );
}

