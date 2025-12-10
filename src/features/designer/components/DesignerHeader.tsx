/**
 * DesignerHeader Component
 * 
 * Professional header bar for the mail designer with:
 * - Size selector dropdown
 * - Front/Back or Page tabs
 * - Undo/Redo buttons
 * - Zoom controls
 * - Save and Export buttons
 */

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Save,
  Download,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Mail,
  ChevronDown,
} from 'lucide-react';

export interface MailFormat {
  id: string;
  name: string;
  width: number;
  height: number;
  bleed: number;
  type: 'postcard' | 'letter' | 'bifold';
}

export const MAIL_FORMATS: MailFormat[] = [
  { id: 'postcard-4x6', name: '4" x 6" Postcard', width: 1200, height: 1800, bleed: 0.125, type: 'postcard' },
  { id: 'postcard-6x9', name: '6" x 9" Postcard', width: 1800, height: 2700, bleed: 0.125, type: 'postcard' },
  { id: 'postcard-6x11', name: '6" x 11" Postcard', width: 1800, height: 3300, bleed: 0.125, type: 'postcard' },
  { id: 'letter-8.5x11', name: '8.5" x 11" Letter', width: 2550, height: 3300, bleed: 0, type: 'letter' },
  { id: 'letter-8.5x14', name: '8.5" x 14" Letter', width: 2550, height: 4200, bleed: 0, type: 'letter' },
  { id: 'bifold', name: 'Bi-fold Self Mailer', width: 2550, height: 3300, bleed: 0.125, type: 'bifold' },
];

export interface DesignerHeaderProps {
  /** Current mail format */
  format: string;
  /** Callback when format changes */
  onFormatChange: (formatId: string) => void;
  /** Current side/page being edited */
  currentSide: 'front' | 'back' | number;
  /** Callback when side changes */
  onSideChange: (side: 'front' | 'back' | number) => void;
  /** Total pages (for letters) */
  totalPages?: number;
  /** Callback to add page (for letters) */
  onAddPage?: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Undo callback */
  onUndo: () => void;
  /** Redo callback */
  onRedo: () => void;
  /** Current zoom level (0-200) */
  zoom: number;
  /** Callback when zoom changes */
  onZoomChange: (zoom: number) => void;
  /** Whether save is enabled */
  canSave: boolean;
  /** Whether currently saving */
  isSaving: boolean;
  /** Save callback */
  onSave: () => void;
  /** Whether currently exporting */
  isExporting: boolean;
  /** Export callback */
  onExport: () => void;
  /** Back navigation callback */
  onBack: () => void;
  /** Template name */
  templateName?: string;
}

export function DesignerHeader({
  format,
  onFormatChange,
  currentSide,
  onSideChange,
  totalPages = 1,
  onAddPage,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zoom,
  onZoomChange,
  canSave,
  isSaving,
  onSave,
  isExporting,
  onExport,
  onBack,
  templateName,
}: DesignerHeaderProps) {
  const currentFormat = MAIL_FORMATS.find(f => f.id === format) || MAIL_FORMATS[0];
  const isLetter = currentFormat.type === 'letter';
  const isBifold = currentFormat.type === 'bifold';

  const handleZoomIn = () => {
    onZoomChange(Math.min(200, zoom + 25));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(25, zoom - 25));
  };

  const handleFitToScreen = () => {
    onZoomChange(100);
  };

  return (
    <div className="h-14 border-b bg-card flex items-center justify-between px-4">
      {/* Left Section - Logo, Format, Sides */}
      <div className="flex items-center gap-4">
        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-2 border-l pl-4">
          <Mail className="h-5 w-5 text-purple-600" />
          <span className="font-semibold">Mail Designer</span>
        </div>

        {/* Format Selector */}
        <Select value={format} onValueChange={onFormatChange}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            {MAIL_FORMATS.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Front/Back or Page Tabs */}
        <div className="flex items-center border rounded-lg overflow-hidden">
          {isLetter ? (
            // Letter pages
            <>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={currentSide === i ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-none h-8 px-3"
                  onClick={() => onSideChange(i)}
                >
                  Page {i + 1}
                </Button>
              ))}
              {totalPages < 6 && onAddPage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-none h-8 px-2"
                  onClick={onAddPage}
                >
                  +
                </Button>
              )}
            </>
          ) : isBifold ? (
            // Bifold sides
            <>
              <Button
                variant={currentSide === 'front' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-8 px-3"
                onClick={() => onSideChange('front')}
              >
                Outside
              </Button>
              <Button
                variant={currentSide === 'back' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-8 px-3"
                onClick={() => onSideChange('back')}
              >
                Inside
              </Button>
            </>
          ) : (
            // Postcard front/back
            <>
              <Button
                variant={currentSide === 'front' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-8 px-3"
                onClick={() => onSideChange('front')}
              >
                Front
              </Button>
              <Button
                variant={currentSide === 'back' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none h-8 px-3"
                onClick={() => onSideChange('back')}
              >
                Back
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Right Section - Controls */}
      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={zoom <= 25}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-16 font-mono">
                {zoom}%
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {[50, 75, 100, 125, 150, 200].map((z) => (
                <DropdownMenuItem key={z} onClick={() => onZoomChange(z)}>
                  {z}%
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFitToScreen}
            title="Fit to Screen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Save & Export */}
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={!canSave || isSaving}
        >
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          size="sm"
          onClick={onExport}
          disabled={isExporting}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exporting...' : 'Export'}
        </Button>
      </div>
    </div>
  );
}

