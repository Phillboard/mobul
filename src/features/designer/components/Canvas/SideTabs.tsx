/**
 * Side Tabs Component
 * Tab navigation for switching between front and back of postcard
 */

import React from 'react';
import { cn } from '@/shared/utils';
import { Palette, Mail } from 'lucide-react';

export interface SideTabsProps {
  currentSide: 'front' | 'back';
  onChange: (side: 'front' | 'back') => void;
  frontHasContent?: boolean;
  backHasContent?: boolean;
  disabled?: boolean;
}

export function SideTabs({
  currentSide,
  onChange,
  frontHasContent = false,
  backHasContent = false,
  disabled = false,
}: SideTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <div className="flex gap-1" role="tablist">
        <SideTab
          side="front"
          label="FRONT"
          icon={<Palette className="h-4 w-4" />}
          isActive={currentSide === 'front'}
          hasContent={frontHasContent}
          onClick={() => onChange('front')}
          disabled={disabled}
        />
        <SideTab
          side="back"
          label="BACK"
          icon={<Mail className="h-4 w-4" />}
          isActive={currentSide === 'back'}
          hasContent={backHasContent}
          onClick={() => onChange('back')}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

interface SideTabProps {
  side: 'front' | 'back';
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  hasContent: boolean;
  onClick: () => void;
  disabled: boolean;
}

function SideTab({ side, label, icon, isActive, hasContent, onClick, disabled }: SideTabProps) {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`${side}-panel`}
      className={cn(
        "relative px-6 py-3 font-medium text-sm transition-all duration-200",
        "flex items-center gap-2",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
        isActive
          ? "text-primary border-b-2 border-primary"
          : "text-gray-600 hover:text-gray-900 border-b-2 border-transparent",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      {label}
      
      {/* Content indicator */}
      {hasContent && !isActive && (
        <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full" />
      )}
    </button>
  );
}
