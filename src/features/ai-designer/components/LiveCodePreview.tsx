/**
 * LiveCodePreview Component
 * 
 * Renders generated HTML in a sandboxed iframe with click-to-edit support.
 * Features responsive mode switching, hover highlights, and smooth transitions.
 */

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Monitor, Tablet, Smartphone, Loader2, RefreshCw, AlertCircle, Maximize2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/utils/utils';
import type { ViewMode, ElementContext } from '../types';

// ============================================================================
// View Mode Dimensions
// ============================================================================

const VIEW_MODE_CONFIG: Record<ViewMode, { width: string; label: string; icon: typeof Monitor }> = {
  desktop: { width: '100%', label: 'Desktop', icon: Monitor },
  tablet: { width: '768px', label: 'Tablet', icon: Tablet },
  mobile: { width: '375px', label: 'Mobile', icon: Smartphone },
};

// ============================================================================
// CSS for Click-to-Edit Overlay
// ============================================================================

const INJECT_STYLES = `
  * {
    cursor: pointer !important;
  }
  *:hover {
    outline: 2px solid rgba(59, 130, 246, 0.5) !important;
    outline-offset: 2px;
  }
  *:active, *.selected {
    outline: 2px solid rgba(59, 130, 246, 1) !important;
    outline-offset: 2px;
    background-color: rgba(59, 130, 246, 0.05) !important;
  }
`;

// ============================================================================
// Component Props
// ============================================================================

interface LiveCodePreviewProps {
  html: string;
  viewMode: ViewMode;
  isLoading: boolean;
  error: string | null;
  onElementClick?: (element: ElementContext) => void;
  onViewModeChange: (mode: ViewMode) => void;
  className?: string;
}

export interface LiveCodePreviewRef {
  refresh: () => void;
  scrollToElement: (selector: string) => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a CSS selector for an element
 */
function generateSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${element.id}`;
  }

  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current.tagName !== 'HTML') {
    let selector = current.tagName.toLowerCase();
    
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => c && !c.startsWith('_'));
      if (classes.length > 0) {
        selector += '.' + classes.slice(0, 2).join('.');
      }
    }

    const siblings = current.parentElement?.children;
    if (siblings && siblings.length > 1) {
      const index = Array.from(siblings).indexOf(current);
      selector += `:nth-child(${index + 1})`;
    }

    path.unshift(selector);
    current = current.parentElement;

    // Limit depth
    if (path.length >= 4) break;
  }

  return path.join(' > ');
}

/**
 * Extract element context for click-to-edit
 */
function getElementContext(element: HTMLElement): ElementContext {
  return {
    selector: generateSelector(element),
    tagName: element.tagName,
    textContent: element.textContent?.substring(0, 100) || '',
    className: element.className || '',
    id: element.id || undefined,
    parentContext: element.parentElement?.tagName.toLowerCase(),
  };
}

// ============================================================================
// Main Component
// ============================================================================

export const LiveCodePreview = forwardRef<LiveCodePreviewRef, LiveCodePreviewProps>(({
  html,
  viewMode,
  isLoading,
  error,
  onElementClick,
  onViewModeChange,
  className,
}, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [iframeError, setIframeError] = useState<string | null>(null);
  const previousHtmlRef = useRef<string>('');

  // ============================================================================
  // Exposed Methods
  // ============================================================================

  useImperativeHandle(ref, () => ({
    refresh: () => {
      if (iframeRef.current) {
        renderToIframe(html);
      }
    },
    scrollToElement: (selector: string) => {
      try {
        const doc = iframeRef.current?.contentDocument;
        const element = doc?.querySelector(selector);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (e) {
        console.warn('Failed to scroll to element:', e);
      }
    },
  }), [html]);

  // ============================================================================
  // Render HTML to Iframe
  // ============================================================================

  const renderToIframe = useCallback((htmlContent: string) => {
    if (!iframeRef.current) return;

    try {
      const doc = iframeRef.current.contentDocument;
      if (!doc) {
        setIframeError('Unable to access iframe document');
        return;
      }

      // Write the HTML content
      doc.open();
      doc.write(htmlContent);
      doc.close();

      // Inject click-to-edit styles and handlers
      if (onElementClick) {
        // Add styles
        const styleEl = doc.createElement('style');
        styleEl.textContent = INJECT_STYLES;
        doc.head.appendChild(styleEl);

        // Add click handler
        doc.body.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const target = e.target as HTMLElement;
          if (target && target.tagName !== 'HTML' && target.tagName !== 'BODY') {
            const context = getElementContext(target);
            onElementClick(context);
          }
        });

        // Prevent default link behavior
        doc.querySelectorAll('a').forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
          });
        });

        // Prevent form submissions
        doc.querySelectorAll('form').forEach(form => {
          form.addEventListener('submit', (e) => {
            e.preventDefault();
          });
        });
      }

      setIframeError(null);
    } catch (err: any) {
      console.error('Failed to render iframe:', err);
      setIframeError(err.message || 'Failed to render preview');
    }
  }, [onElementClick]);

  // ============================================================================
  // Update Iframe on HTML Change
  // ============================================================================

  useEffect(() => {
    if (!html || html === previousHtmlRef.current) return;

    // Smooth transition effect
    setIsTransitioning(true);
    
    const timer = setTimeout(() => {
      renderToIframe(html);
      previousHtmlRef.current = html;
      setIsTransitioning(false);
    }, 150);

    return () => clearTimeout(timer);
  }, [html, renderToIframe]);

  // ============================================================================
  // View Mode Buttons
  // ============================================================================

  const ViewModeButtons = () => (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      {(Object.keys(VIEW_MODE_CONFIG) as ViewMode[]).map((mode) => {
        const { icon: Icon, label } = VIEW_MODE_CONFIG[mode];
        return (
          <Button
            key={mode}
            variant={viewMode === mode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange(mode)}
            className="h-7 px-2"
            title={label}
          >
            <Icon className="h-4 w-4" />
          </Button>
        );
      })}
    </div>
  );

  // ============================================================================
  // Render
  // ============================================================================

  const displayError = error || iframeError;
  const { width } = VIEW_MODE_CONFIG[viewMode];

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Preview Header */}
      <div className="flex-shrink-0 h-12 px-4 flex items-center justify-between border-b bg-card">
        <ViewModeButtons />
        
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating...</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => renderToIframe(html)}
            disabled={!html}
            title="Refresh preview"
            className="h-7 w-7"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto bg-muted/30 p-4">
        <div 
          className="mx-auto h-full transition-all duration-300"
          style={{ 
            maxWidth: width,
            width: width === '100%' ? '100%' : width,
          }}
        >
          {!html ? (
            // Empty state
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-card">
              <Monitor className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Preview Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Describe your landing page in the chat panel or select a template to get started.
              </p>
            </div>
          ) : displayError ? (
            // Error state
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-destructive/30 rounded-lg bg-destructive/5">
              <AlertCircle className="h-16 w-16 text-destructive mb-4" />
              <h3 className="text-lg font-medium mb-2">Preview Error</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                {displayError}
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => renderToIframe(html)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : (
            // Iframe preview
            <div 
              className={cn(
                'h-full bg-white rounded-lg shadow-xl overflow-hidden transition-opacity duration-300',
                isTransitioning || isLoading ? 'opacity-50' : 'opacity-100'
              )}
            >
              <iframe
                ref={iframeRef}
                title="Landing Page Preview"
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          )}
        </div>
      </div>

      {/* Click-to-edit hint */}
      {html && onElementClick && !isLoading && (
        <div className="flex-shrink-0 px-4 py-2 text-center text-xs text-muted-foreground border-t bg-card">
          Click any element in the preview to edit it
        </div>
      )}
    </div>
  );
});

LiveCodePreview.displayName = 'LiveCodePreview';
