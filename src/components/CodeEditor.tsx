import Editor from '@monaco-editor/react';
import { RefreshCw } from 'lucide-react';

interface CodeEditorProps {
  /** File content to display */
  content: string;
  /** Programming language for syntax highlighting */
  language?: string;
  /** File name (used to auto-detect language if language is not provided) */
  fileName?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Callback when content changes */
  onChange?: (value: string) => void;
  /** Editor height (default: 100%) */
  height?: string | number;
  /** Show minimap (default: true) */
  showMinimap?: boolean;
  /** Font size (default: 14) */
  fontSize?: number;
  /** Custom Monaco editor options */
  options?: any;
}

/**
 * Shared code editor component using Monaco Editor
 * Used by both EditorPanel and CodingPreview
 */
export default function CodeEditor({
  content,
  language,
  fileName,
  readOnly = false,
  onChange,
  height = '100%',
  showMinimap = true,
  fontSize = 14,
  options = {},
}: CodeEditorProps) {
  // Get language identifier for Monaco Editor
  const getMonacoLanguage = (lang?: string, name?: string): string => {
    if (lang) return lang;
    
    // Detect language from file extension
    if (!name) return 'plaintext';
    
    const ext = name.split('.').pop()?.toLowerCase();
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

  const editorLanguage = getMonacoLanguage(language, fileName);

  const defaultOptions = {
    readOnly,
    minimap: { enabled: showMinimap },
    fontSize,
    lineNumbers: 'on' as const,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on' as const,
    wrappingIndent: 'indent' as const,
    scrollbar: {
      vertical: 'visible' as const,
      horizontal: 'visible' as const,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  return (
    <Editor
      height={height}
      language={editorLanguage}
      value={content}
      onChange={(value) => onChange?.(value || '')}
      theme="vs-dark"
      options={mergedOptions}
      loading={
        <div className="flex items-center justify-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    />
  );
}

