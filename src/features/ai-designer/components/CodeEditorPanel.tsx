/**
 * CodeEditorPanel Component
 * 
 * Monaco-based code editor for viewing and editing generated HTML.
 * Hidden by default, accessible for advanced users.
 */

import { Suspense, lazy, useState, useCallback, useEffect, useRef } from 'react';
import {
  Code2,
  Copy,
  RotateCcw,
  Check,
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  FileCode,
  Loader2,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { cn } from '@/shared/utils/utils';

// Lazy load Monaco Editor for better initial load performance
const Editor = lazy(() => import('@monaco-editor/react'));

// ============================================================================
// Component Props
// ============================================================================

interface CodeEditorPanelProps {
  html: string;
  onHTMLChange: (html: string) => void;
  onRestoreAIVersion?: () => void;
  isModified?: boolean;
  className?: string;
}

// ============================================================================
// Loading Fallback
// ============================================================================

function EditorSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#1e1e1e]">
      <div className="flex flex-col items-center gap-2 text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-sm">Loading editor...</span>
      </div>
    </div>
  );
}

// ============================================================================
// HTML to JSX Converter (for React tab)
// ============================================================================

function htmlToJSX(html: string): string {
  let jsx = html;

  // Convert class to className
  jsx = jsx.replace(/\sclass=/g, ' className=');

  // Convert for to htmlFor
  jsx = jsx.replace(/\sfor=/g, ' htmlFor=');

  // Convert style strings to objects (basic conversion)
  jsx = jsx.replace(/style="([^"]*)"/g, (match, styleString) => {
    try {
      const styles = styleString
        .split(';')
        .filter((s: string) => s.trim())
        .map((s: string) => {
          const [prop, value] = s.split(':').map((p: string) => p.trim());
          if (!prop || !value) return null;
          const camelProp = prop.replace(/-([a-z])/g, (g: string) => g[1].toUpperCase());
          return `${camelProp}: '${value}'`;
        })
        .filter(Boolean)
        .join(', ');
      return `style={{${styles}}}`;
    } catch {
      return match;
    }
  });

  // Self-closing tags
  jsx = jsx.replace(/<(img|input|br|hr|meta|link)([^>]*[^/])>/gi, '<$1$2 />');

  return jsx;
}

// ============================================================================
// Main Component
// ============================================================================

export function CodeEditorPanel({
  html,
  onHTMLChange,
  onRestoreAIVersion,
  isModified = false,
  className,
}: CodeEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<'html' | 'react'>('html');
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localValue, setLocalValue] = useState(html);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Sync local value with prop
  useEffect(() => {
    setLocalValue(html);
  }, [html]);

  // Handle editor changes with debounce
  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value === undefined) return;
    setLocalValue(value);

    // Debounce updates to parent
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      onHTMLChange(value);
    }, 500);
  }, [onHTMLChange]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    const content = activeTab === 'html' ? localValue : htmlToJSX(localValue);
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [localValue, activeTab]);

  // Download file
  const handleDownload = useCallback(() => {
    const content = activeTab === 'html' ? localValue : htmlToJSX(localValue);
    const extension = activeTab === 'html' ? 'html' : 'tsx';
    const mimeType = activeTab === 'html' ? 'text/html' : 'text/typescript';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `landing-page.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }, [localValue, activeTab]);

  // Format code (basic prettify)
  const handleFormat = useCallback(() => {
    try {
      // Basic HTML formatting (in production, use prettier)
      let formatted = localValue;
      
      // Add newlines after closing tags
      formatted = formatted.replace(/>\s*</g, '>\n<');
      
      // Indent based on nesting level
      const lines = formatted.split('\n');
      let indent = 0;
      const indentStr = '  ';
      
      formatted = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return '';

        // Decrease indent for closing tags
        if (trimmed.startsWith('</') || trimmed.startsWith('/>')) {
          indent = Math.max(0, indent - 1);
        }

        const indented = indentStr.repeat(indent) + trimmed;

        // Increase indent for opening tags (not self-closing)
        if (trimmed.startsWith('<') && !trimmed.startsWith('</') && !trimmed.endsWith('/>') && !trimmed.includes('</')) {
          indent++;
        }

        return indented;
      }).join('\n');

      setLocalValue(formatted);
      onHTMLChange(formatted);
    } catch (e) {
      console.warn('Format failed:', e);
    }
  }, [localValue, onHTMLChange]);

  // Get content for display
  const displayContent = activeTab === 'html' ? localValue : htmlToJSX(localValue);
  const language = activeTab === 'html' ? 'html' : 'typescript';

  return (
    <div className={cn(
      'flex flex-col h-full bg-card',
      isFullscreen && 'fixed inset-0 z-50',
      className
    )}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4" />
          <span className="font-medium text-sm">Code</span>
          {isModified && (
            <Badge variant="outline" className="text-[10px] px-1">
              Modified
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy code</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleDownload}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download file</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleFormat}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Format code</TooltipContent>
            </Tooltip>

            {onRestoreAIVersion && isModified && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onRestoreAIVersion}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Restore AI version</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'html' | 'react')} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b px-2 h-9">
          <TabsTrigger value="html" className="text-xs h-7">
            <FileCode className="h-3 w-3 mr-1" />
            HTML
          </TabsTrigger>
          <TabsTrigger value="react" className="text-xs h-7">
            <Code2 className="h-3 w-3 mr-1" />
            React (JSX)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="html" className="flex-1 m-0">
          <Suspense fallback={<EditorSkeleton />}>
            <Editor
              height="100%"
              language="html"
              theme="vs-dark"
              value={localValue}
              onChange={handleEditorChange}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: 'on',
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                folding: true,
                formatOnPaste: true,
              }}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="react" className="flex-1 m-0">
          <Suspense fallback={<EditorSkeleton />}>
            <Editor
              height="100%"
              language="typescript"
              theme="vs-dark"
              value={htmlToJSX(localValue)}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: 'on',
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                folding: true,
                readOnly: true, // React view is read-only
              }}
            />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Footer hint */}
      <div className="flex-shrink-0 px-3 py-1.5 text-[10px] text-muted-foreground border-t bg-muted/30">
        {activeTab === 'html' 
          ? 'Edit HTML directly. Changes sync to preview after 500ms.' 
          : 'React view is read-only. Edit in HTML tab.'}
      </div>
    </div>
  );
}
