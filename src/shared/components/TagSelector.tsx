/**
 * TagSelector Component
 * 
 * A reusable component for selecting and managing tags on entities.
 * Supports creating new tags, assigning/removing tags, and inline editing.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Plus, X, Tag as TagIcon, Check, Loader2 } from "lucide-react";
import { 
  useTags, 
  useEntityTags, 
  useCreateTag, 
  useAssignTag, 
  useRemoveTag,
  TAG_COLORS,
  TagEntityType,
  Tag,
  TagAssignment,
} from "@shared/hooks/useTags";
import { cn } from '@shared/utils/cn';

interface TagSelectorProps {
  entityId: string;
  entityType: TagEntityType;
  clientId: string;
  className?: string;
  readOnly?: boolean;
}

export function TagSelector({
  entityId,
  entityType,
  clientId,
  className,
  readOnly = false,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[12].value); // Default indigo
  const [isCreating, setIsCreating] = useState(false);

  const { data: allTags = [], isLoading: tagsLoading } = useTags(clientId, entityType);
  const { data: entityTags = [], isLoading: entityTagsLoading } = useEntityTags(entityId, entityType);
  
  const createTag = useCreateTag();
  const assignTag = useAssignTag();
  const removeTag = useRemoveTag();

  const assignedTagIds = new Set(entityTags.map(t => t.tag_id));
  const availableTags = allTags.filter(t => !assignedTagIds.has(t.id));

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    setIsCreating(true);
    try {
      const newTag = await createTag.mutateAsync({
        name: newTagName.trim(),
        color: selectedColor,
        entity_type: entityType,
        client_id: clientId,
      });
      
      // Auto-assign the new tag
      await assignTag.mutateAsync({
        tagId: newTag.id,
        entityId,
        entityType,
      });
      
      setNewTagName("");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssignTag = async (tag: Tag) => {
    await assignTag.mutateAsync({
      tagId: tag.id,
      entityId,
      entityType,
    });
  };

  const handleRemoveTag = async (tagId: string) => {
    await removeTag.mutateAsync({
      tagId,
      entityId,
      entityType,
    });
  };

  if (tagsLoading || entityTagsLoading) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {/* Display assigned tags */}
      {entityTags.map((tag) => (
        <Badge
          key={tag.tag_id}
          variant="secondary"
          className="gap-1 pr-1"
          style={{ backgroundColor: `${tag.tag_color}20`, borderColor: tag.tag_color, color: tag.tag_color }}
        >
          {tag.tag_name}
          {!readOnly && (
            <button
              onClick={() => handleRemoveTag(tag.tag_id)}
              className="ml-1 hover:bg-black/10 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}

      {/* Add tag button */}
      {!readOnly && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 gap-1">
              <Plus className="h-3 w-3" />
              <span className="text-xs">Add Tag</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandList>
                <CommandEmpty>
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    No tags found
                  </div>
                </CommandEmpty>
                
                {availableTags.length > 0 && (
                  <CommandGroup heading="Available Tags">
                    {availableTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => {
                          handleAssignTag(tag);
                          setOpen(false);
                        }}
                        className="cursor-pointer"
                      >
                        <div 
                          className="h-3 w-3 rounded-full mr-2"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                <CommandSeparator />

                {/* Create new tag section */}
                <div className="p-2 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Create New Tag
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateTag();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={handleCreateTag}
                      disabled={!newTagName.trim() || isCreating}
                    >
                      {isCreating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Color picker */}
                  <div className="flex flex-wrap gap-1">
                    {TAG_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setSelectedColor(color.value)}
                        className={cn(
                          "h-5 w-5 rounded-full transition-all",
                          selectedColor === color.value && "ring-2 ring-offset-2 ring-primary"
                        )}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Empty state */}
      {entityTags.length === 0 && readOnly && (
        <span className="text-xs text-muted-foreground">No tags</span>
      )}
    </div>
  );
}

/**
 * Inline tag badge display (read-only)
 */
export function TagBadges({ tags }: { tags: TagAssignment[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <Badge
          key={tag.tag_id}
          variant="secondary"
          className="text-xs"
          style={{ 
            backgroundColor: `${tag.tag_color}20`, 
            borderColor: tag.tag_color, 
            color: tag.tag_color 
          }}
        >
          {tag.tag_name}
        </Badge>
      ))}
    </div>
  );
}

