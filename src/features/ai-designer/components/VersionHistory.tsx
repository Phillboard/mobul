/**
 * VersionHistory Component
 * 
 * Timeline view of all AI generations and manual edits.
 * Allows restoring previous versions.
 */

import { useState, useCallback } from 'react';
import {
  History,
  RotateCcw,
  Sparkles,
  Pencil,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Badge } from '@/shared/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { cn } from '@/shared/utils/utils';
import type { Version } from '../types';

// ============================================================================
// Component Props
// ============================================================================

interface VersionHistoryProps {
  versions: Version[];
  currentVersion: number;
  onRestoreVersion: (versionNumber: number) => void;
  onPreviewVersion?: (version: Version) => void;
  className?: string;
}

// ============================================================================
// Version Item Component
// ============================================================================

function VersionItem({
  version,
  isCurrent,
  onRestore,
  onPreview,
}: {
  version: Version;
  isCurrent: boolean;
  onRestore: () => void;
  onPreview?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  const timestamp = new Date(version.timestamp);
  const timeAgo = getTimeAgo(timestamp);

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div
          className={cn(
            'relative pl-6 pb-6 border-l-2 ml-3',
            isCurrent ? 'border-primary' : 'border-muted'
          )}
        >
          {/* Timeline dot */}
          <div
            className={cn(
              'absolute -left-[9px] w-4 h-4 rounded-full border-2 bg-background',
              isCurrent ? 'border-primary bg-primary' : 'border-muted'
            )}
          >
            {version.isManualEdit ? (
              <Pencil className={cn('h-2 w-2 absolute top-0.5 left-0.5', isCurrent ? 'text-primary-foreground' : 'text-muted-foreground')} />
            ) : (
              <Sparkles className={cn('h-2 w-2 absolute top-0.5 left-0.5', isCurrent ? 'text-primary-foreground' : 'text-muted-foreground')} />
            )}
          </div>

          {/* Version card */}
          <div className={cn(
            'ml-4 p-3 rounded-lg border transition-colors',
            isCurrent ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
          )}>
            <CollapsibleTrigger className="w-full text-left">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      Version {version.version}
                    </span>
                    {isCurrent && (
                      <Badge variant="default" className="text-[10px] px-1 py-0">
                        <CheckCircle className="h-2 w-2 mr-0.5" />
                        Current
                      </Badge>
                    )}
                    {version.isManualEdit && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        Manual
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {version.changeDescription}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="mt-3 pt-3 border-t space-y-3">
                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span title={timestamp.toLocaleString()}>{timeAgo}</span>
                  </div>
                  {version.tokensUsed > 0 && (
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      <span>{version.tokensUsed.toLocaleString()} tokens</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {onPreview && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview();
                      }}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                  )}
                  {!isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRestoreDialog(true);
                      }}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </div>
      </Collapsible>

      {/* Restore confirmation dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version {version.version}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace your current design with this version. You can still access the current version in history after restoring.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onRestore}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

// ============================================================================
// Main Component
// ============================================================================

export function VersionHistory({
  versions,
  currentVersion,
  onRestoreVersion,
  onPreviewVersion,
  className,
}: VersionHistoryProps) {
  // Sort versions by version number descending (newest first)
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  if (versions.length === 0) {
    return (
      <div className={cn('p-4', className)}>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <History className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-medium mb-1">No History Yet</h3>
          <p className="text-sm text-muted-foreground">
            Your version history will appear here as you make changes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <h3 className="font-medium text-sm">Version History</h3>
          <Badge variant="secondary" className="text-xs">
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Click on a version to see details and restore options.
        </p>
      </div>

      {/* Version Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-4 pt-2">
          {sortedVersions.map((version) => (
            <VersionItem
              key={version.version}
              version={version}
              isCurrent={version.version === currentVersion}
              onRestore={() => onRestoreVersion(version.version)}
              onPreview={onPreviewVersion ? () => onPreviewVersion(version) : undefined}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Stats Footer */}
      <div className="flex-shrink-0 p-3 border-t bg-muted/30">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Total tokens used</span>
          <span className="font-medium">
            {versions.reduce((sum, v) => sum + (v.tokensUsed || 0), 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
