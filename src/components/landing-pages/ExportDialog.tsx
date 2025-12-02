import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileCode, Package, Wordpress, Globe, Check } from "lucide-react";
import { exportToStaticHTML, downloadExport } from "@/lib/landing-pages/exporters/static-exporter";
import { exportToReact } from "@/lib/landing-pages/exporters/react-exporter";
import { exportToWordPress } from "@/lib/landing-pages/exporters/wordpress-exporter";
import { toast } from "sonner";
import { ExportFormat } from "@/types/landingPages";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landingPageId: string;
  html: string;
  pageName: string;
}

export function ExportDialog({
  open,
  onOpenChange,
  landingPageId,
  html,
  pageName,
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('static');
  const [isExporting, setIsExporting] = useState(false);

  // Static options
  const [includeComments, setIncludeComments] = useState(false);
  const [minify, setMinify] = useState(true);

  // React options
  const [componentName, setComponentName] = useState('LandingPage');
  const [typescript, setTypescript] = useState(true);
  const [cssModules, setCssModules] = useState(false);

  // WordPress options
  const [pluginName, setPluginName] = useState(pageName || 'ACE Landing Page');
  const [shortcodePrefix, setShortcodePrefix] = useState('ace');

  const handleExport = async () => {
    setIsExporting(true);

    try {
      let blob: Blob;
      let filename: string;

      switch (selectedFormat) {
        case 'static':
          blob = await exportToStaticHTML(html, {
            includeComments,
            minify,
          });
          filename = `${pageName.replace(/\s+/g, '-').toLowerCase()}.zip`;
          break;

        case 'react':
          blob = await exportToReact(html, {
            componentName,
            typescript,
            cssModules,
          });
          filename = `${componentName.toLowerCase()}-component.zip`;
          break;

        case 'wordpress':
          blob = await exportToWordPress(html, {
            pluginName,
            shortcodePrefix,
          });
          filename = `${pluginName.replace(/\s+/g, '-').toLowerCase()}-plugin.zip`;
          break;

        default:
          throw new Error('Export format not supported yet');
      }

      downloadExport(blob, filename);
      toast.success('Export completed successfully!');
      
      // Track export in database
      // await trackExport(landingPageId, selectedFormat);
      
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export landing page');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Landing Page</DialogTitle>
          <DialogDescription>
            Choose how you'd like to export your landing page
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedFormat} onValueChange={(v) => setSelectedFormat(v as ExportFormat)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="static">Static HTML</TabsTrigger>
            <TabsTrigger value="react">React</TabsTrigger>
            <TabsTrigger value="wordpress">WordPress</TabsTrigger>
            <TabsTrigger value="hosted" disabled>Hosted</TabsTrigger>
          </TabsList>

          {/* Static HTML Export */}
          <TabsContent value="static" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <FileCode className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle>Static HTML Bundle</CardTitle>
                    <CardDescription>
                      Self-contained HTML file ready to deploy anywhere
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Features:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      No build process required
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Works on any web server
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Includes deployment instructions
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeComments"
                      checked={includeComments}
                      onCheckedChange={(checked) => setIncludeComments(checked as boolean)}
                    />
                    <label htmlFor="includeComments" className="text-sm font-medium">
                      Include HTML comments
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="minify"
                      checked={minify}
                      onCheckedChange={(checked) => setMinify(checked as boolean)}
                    />
                    <label htmlFor="minify" className="text-sm font-medium">
                      Minify HTML (recommended)
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* React Export */}
          <TabsContent value="react" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-cyan-500" />
                  </div>
                  <div>
                    <CardTitle>React Component</CardTitle>
                    <CardDescription>
                      Vite + React project with your landing page as a component
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Features:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Full Vite setup included
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      TypeScript or JavaScript
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Easy to customize
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="componentName">Component Name</Label>
                    <Input
                      id="componentName"
                      value={componentName}
                      onChange={(e) => setComponentName(e.target.value)}
                      placeholder="LandingPage"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="typescript"
                      checked={typescript}
                      onCheckedChange={(checked) => setTypescript(checked as boolean)}
                    />
                    <label htmlFor="typescript" className="text-sm font-medium">
                      Use TypeScript
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="cssModules"
                      checked={cssModules}
                      onCheckedChange={(checked) => setCssModules(checked as boolean)}
                    />
                    <label htmlFor="cssModules" className="text-sm font-medium">
                      Use CSS Modules
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WordPress Export */}
          <TabsContent value="wordpress" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Wordpress className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle>WordPress Plugin</CardTitle>
                    <CardDescription>
                      Complete WordPress plugin with shortcode support
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Features:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Easy installation
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Shortcode: [ace_landing_page]
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      Includes installation guide
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="pluginName">Plugin Name</Label>
                    <Input
                      id="pluginName"
                      value={pluginName}
                      onChange={(e) => setPluginName(e.target.value)}
                      placeholder="ACE Landing Page"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shortcodePrefix">Shortcode Prefix</Label>
                    <Input
                      id="shortcodePrefix"
                      value={shortcodePrefix}
                      onChange={(e) => setShortcodePrefix(e.target.value)}
                      placeholder="ace"
                    />
                    <p className="text-xs text-muted-foreground">
                      Shortcode will be: [{shortcodePrefix}_landing_page]
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hosted Export (Coming Soon) */}
          <TabsContent value="hosted" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Globe className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <CardTitle>Hosted Deployment</CardTitle>
                    <CardDescription>
                      Deploy to our edge network with custom domain support
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Hosted deployment coming soon! This will allow you to deploy your landing page directly to our global CDN with custom domain support.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export & Download'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

