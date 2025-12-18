/**
 * TokenInserterPopover Component
 * 
 * Popover UI for inserting template tokens into text.
 * Shows all available tokens organized by category.
 */

import React, { useState, useMemo, ReactNode } from 'react';
import { Braces, Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { cn } from '@shared/utils/cn';
import {
  getAllTokens,
  TokenDefinition,
  TokenCategory,
} from '../../utils/tokenManagement';

export interface TokenInserterPopoverProps {
  onInsert: (token: string) => void;
  trigger?: ReactNode;
  align?: 'start' | 'center' | 'end';
}

function TokenCategory({
  title,
  tokens,
  onInsert,
}: {
  title: string;
  tokens: TokenDefinition[];
  onInsert: (token: string) => void;
}) {
  if (tokens.length === 0) return null;
  
  return (
    <div className="mb-4 last:mb-0">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
        {title}
      </div>
      <div className="space-y-1">
        {tokens.map(token => (
          <button
            key={token.token}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md text-left",
              "hover:bg-gray-100 transition-colors",
              token.required && "border-l-2 border-l-purple-500"
            )}
            onClick={() => onInsert(token.token)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {token.name}
                </span>
                {token.required && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                    Required
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {token.description}
              </div>
              <div className="text-xs text-purple-600 font-mono mt-0.5">
                {token.token}
              </div>
            </div>
            <div className="ml-2 text-xs text-gray-400 flex-shrink-0">
              {token.previewValue}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function TokenInserterPopover({
  onInsert,
  trigger,
  align = 'start',
}: TokenInserterPopoverProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const allTokens = useMemo(() => getAllTokens(), []);
  
  const tokensByCategory = useMemo(() => {
    const filtered = search 
      ? allTokens.filter(t => 
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.token.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase())
        )
      : allTokens;
    
    return {
      personalization: filtered.filter(t => t.category === 'personalization'),
      tracking: filtered.filter(t => t.category === 'tracking'),
      address: filtered.filter(t => t.category === 'address'),
      campaign: filtered.filter(t => t.category === 'campaign'),
    };
  }, [search, allTokens]);
  
  const handleInsert = (token: string) => {
    onInsert(token);
    setIsOpen(false);
    setSearch(''); // Reset search
  };
  
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon">
            <Braces className="w-4 h-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-96" align={align}>
        <div className="space-y-3">
          {/* Header */}
          <div>
            <div className="font-medium text-sm flex items-center gap-2">
              <Braces className="w-4 h-4" />
              Insert Token
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Tokens are replaced with real data during mail merge
            </p>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tokens..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Tokens list */}
          <ScrollArea className="h-[400px] pr-3">
            <TokenCategory
              title="Personalization"
              tokens={tokensByCategory.personalization}
              onInsert={handleInsert}
            />
            <TokenCategory
              title="Tracking"
              tokens={tokensByCategory.tracking}
              onInsert={handleInsert}
            />
            <TokenCategory
              title="Address"
              tokens={tokensByCategory.address}
              onInsert={handleInsert}
            />
            <TokenCategory
              title="Campaign"
              tokens={tokensByCategory.campaign}
              onInsert={handleInsert}
            />
            
            {/* No results */}
            {search && Object.values(tokensByCategory).every(cat => cat.length === 0) && (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Braces className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No tokens found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

