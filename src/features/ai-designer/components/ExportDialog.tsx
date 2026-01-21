/**
 * ExportDialog Component
 * 
 * Dialog for exporting landing pages as React components or static HTML.
 * Leverages existing exporter utilities.
 */

import { useState, useCallback } from 'react';
import {
  Download,
  FileCode,
  Globe,
  Package,
  Loader2,
  CheckCircle,
  Info,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Switch } from '@/shared/components/ui/switch';
import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/components/ui/tabs';
import {
  Alert,
  AlertDescription,
} from '@/shared/components/ui/alert';
import { cn } from '@/shared/utils/cn';

// ============================================================================
// Component Props
// ============================================================================

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  onExportReact: (componentName: string, options?: { typescript?: boolean }) => Promise<void>;
  onExportStatic: (filename: string, options?: { minify?: boolean }) => Promise<void>;
  isExporting?: boolean;
}

// ============================================================================
// Export Option Card
// ============================================================================

interface ExportOptionProps {
  icon: typeof FileCode;
  title: string;
  description: string;
  badge?: string;
  selected?: boolean;
  onClick: () => void;
}

function ExportOption({
  icon: Icon,
  title,
  description,
  badge,
  selected,
  onClick,
}: ExportOptionProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-lg border text-left transition-all',
        'hover:border-primary hover:bg-primary/5',
        selected && 'border-primary bg-primary/5 ring-1 ring-primary'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{title}</h4>
            {badge && (
              <Badge variant="secondary" className="text-[10px]">
                {badge}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {description}
          </p>
        </div>
        {selected && (
          <CheckCircle className="h-5 w-5 text-primary" />
        )}
      </div>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ExportDialog({
  open,
  onClose,
  onExportReact,
  onExportStatic,
  isExporting,
}: ExportDialogProps) {
  const [exportType, setExportType] = useState<'react' | 'static'>('static');
  const [componentName, setComponentName] = useState('LandingPage');
  const [filename, setFilename] = useState('landing-page');
  const [useTypeScript, setUseTypeScript] = useState(true);
  const [minify, setMinify] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleExport = useCallback(async () => {
    if (exportType === 'react') {
      await onExportReact(componentName, { typescript: useTypeScript });
    } else {
      await onExportStatic(filename, { minify });
    }
    onClose();
  }, [exportType, componentName, filename, useTypeScript, minify, onExportReact, onExportStatic, onClose]);

  const handleCopyCommand = useCallback(async () => {
    const command = exportType === 'react' 
      ? `cd ${componentName.toLowerCase()} && npm install && npm run dev`
      : 'npx serve .';
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [exportType, componentName]);

  // Validate component name (PascalCase, no spaces)
  const isValidComponentName = /^[A-Z][a-zA-Z0-9]*$/.test(componentName);

  // Validate filename (lowercase, hyphens, no spaces)
  const isValidFilename = /^[a-z0-9-]+$/.test(filename);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Landing Page
          </DialogTitle>
          <DialogDescription>
            Choose how you'd like to export your landing page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Export Type Selection */}
          <div className="space-y-3">
            <ExportOption
              icon={Globe}
              title="Static HTML"
              description="Self-contained HTML file ready for any hosting platform."
              badge="Recommended"
              selected={exportType === 'static'}
              onClick={() => setExportType('static')}
            />
            <ExportOption
              icon={FileCode}
              title="React Component"
              description="TSX/JSX component with Vite setup for development."
              selected={exportType === 'react'}
              onClick={() => setExportType('react')}
            />
          </div>

          {/* Configuration Options */}
          <div className="pt-4 border-t space-y-4">
            {exportType === 'react' ? (
              <>
                {/* React Options */}
                <div className="space-y-2">
                  <Label htmlFor="component-name">Component Name</Label>
                  <Input
                    id="component-name"
                    value={componentName}
                    onChange={(e) => setComponentName(e.target.value)}
                    placeholder="LandingPage"
                    className={cn(!isValidComponentName && componentName && 'border-destructive')}
                  />
                  {!isValidComponentName && componentName && (
                    <p className="text-xs text-destructive">
                      Use PascalCase (e.g., LandingPage, ProductHero)
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="typescript">TypeScript</Label>
                    <p className="text-xs text-muted-foreground">
                      Generate .tsx files with type definitions
                    </p>
                  </div>
                  <Switch
                    id="typescript"
                    checked={useTypeScript}
                    onCheckedChange={setUseTypeScript}
                  />
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Includes:</strong> Component file, package.json, Vite config, README
                  </AlertDescription>
                </Alert>
              </>
            ) : (
              <>
                {/* Static HTML Options */}
                <div className="space-y-2">
                  <Label htmlFor="filename">Folder Name</Label>
                  <Input
                    id="filename"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value.toLowerCase())}
                    placeholder="landing-page"
                    className={cn(!isValidFilename && filename && 'border-destructive')}
                  />
                  {!isValidFilename && filename && (
                    <p className="text-xs text-destructive">
                      Use lowercase letters, numbers, and hyphens only
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="minify">Minify HTML</Label>
                    <p className="text-xs text-muted-foreground">
                      Reduce file size for production
                    </p>
                  </div>
                  <Switch
                    id="minify"
                    checked={minify}
                    onCheckedChange={setMinify}
                  />
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Includes:</strong> index.html (with Tailwind CDN), README with deployment instructions
                  </AlertDescription>
                </Alert>
              </>
            )}

            {/* Quick Start Command */}
            <div className="pt-2">
              <Label className="text-xs text-muted-foreground">Quick Start</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono truncate">
                  {exportType === 'react' 
                    ? `cd ${componentName.toLowerCase()} && npm install && npm run dev`
                    : 'npx serve .'
                  }
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={handleCopyCommand}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport}
            disabled={
              isExporting || 
              (exportType === 'react' && !isValidComponentName) ||
              (exportType === 'static' && !isValidFilename)
            }
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Download ZIP
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
