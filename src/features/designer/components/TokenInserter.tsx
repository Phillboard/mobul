/**
 * TokenInserter Component
 * 
 * Interface for inserting template tokens into designs.
 * Shows all available tokens with previews and descriptions.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Copy, Check, Sparkles } from 'lucide-react';
import { TEMPLATE_TOKEN_METADATA } from '@/lib/terminology';
import { useToast } from '@shared/hooks';

export interface TokenInserterProps {
  /** Callback when token is selected */
  onTokenSelect: (token: string) => void;
  /** Available tokens (defaults to all standard tokens) */
  availableTokens?: string[];
  /** Show copy button for tokens */
  showCopyButton?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * TokenInserter component
 */
export function TokenInserter({
  onTokenSelect,
  availableTokens,
  showCopyButton = true,
  className = '',
}: TokenInserterProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Get all token metadata
  const allTokens = Object.values(TEMPLATE_TOKEN_METADATA);
  
  // Filter tokens based on availability and search
  const filteredTokens = allTokens.filter(tokenMeta => {
    // Check if token is in available list
    if (availableTokens && !availableTokens.includes(tokenMeta.token)) {
      return false;
    }

    // Check search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        tokenMeta.label.toLowerCase().includes(query) ||
        tokenMeta.token.toLowerCase().includes(query) ||
        tokenMeta.description?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  /**
   * Handle token insertion
   */
  const handleInsert = (token: string) => {
    onTokenSelect(token);
    toast({
      title: 'Token added',
      description: `${token} has been added to your design.`,
    });
  };

  /**
   * Handle token copy
   */
  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopiedToken(token);
      
      toast({
        title: 'Copied!',
        description: `${token} copied to clipboard.`,
      });

      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy token to clipboard.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          Template Tokens
        </CardTitle>
        <CardDescription className="text-xs">
          Personalization variables for dynamic content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {/* Token List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredTokens.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No tokens found
            </p>
          ) : (
            filteredTokens.map((tokenMeta) => (
              <div
                key={tokenMeta.token}
                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium mb-1">
                      {tokenMeta.label}
                    </h4>
                    <code className="text-xs bg-muted px-2 py-0.5 rounded">
                      {tokenMeta.token}
                    </code>
                  </div>
                  <div className="flex gap-1">
                    {showCopyButton && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCopy(tokenMeta.token)}
                        className="h-7 w-7 p-0"
                      >
                        {copiedToken === tokenMeta.token ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleInsert(tokenMeta.token)}
                      className="h-7 text-xs"
                    >
                      Insert
                    </Button>
                  </div>
                </div>

                {tokenMeta.description && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {tokenMeta.description}
                  </p>
                )}

                {tokenMeta.fallback && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Default:</span>
                    <Badge variant="outline" className="text-xs">
                      {tokenMeta.fallback}
                    </Badge>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Help text */}
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            💡 Tokens are replaced with actual recipient data when the design is exported or delivered.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact token picker (dropdown variant)
 */
export function TokenPickerButton({
  onTokenSelect,
  availableTokens,
}: {
  onTokenSelect: (token: string) => void;
  availableTokens?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  const allTokens = Object.values(TEMPLATE_TOKEN_METADATA);
  const tokens = availableTokens
    ? allTokens.filter(t => availableTokens.includes(t.token))
    : allTokens;

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Insert Token
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-2 w-64 bg-popover border rounded-lg shadow-lg z-50 p-2">
            <div className="max-h-64 overflow-y-auto space-y-1">
              {tokens.map((tokenMeta) => (
                <button
                  key={tokenMeta.token}
                  className="w-full text-left p-2 rounded hover:bg-accent transition-colors"
                  onClick={() => {
                    onTokenSelect(tokenMeta.token);
                    setIsOpen(false);
                  }}
                >
                  <div className="font-medium text-sm">{tokenMeta.label}</div>
                  <code className="text-xs text-muted-foreground">
                    {tokenMeta.token}
                  </code>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

