/**
 * Tags Hook
 * 
 * Manages tags for campaigns, contacts, and other entities.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/shared/hooks';

export type TagEntityType = 'campaign' | 'contact' | 'list' | 'form' | 'template';

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  entity_type: TagEntityType;
  client_id: string;
  is_system: boolean;
  created_at: string;
}

export interface TagAssignment {
  tag_id: string;
  tag_name: string;
  tag_color: string;
  assigned_at: string;
}

/**
 * Get all tags for a client and entity type
 */
export function useTags(clientId: string | undefined, entityType?: TagEntityType) {
  return useQuery({
    queryKey: ['tags', clientId, entityType],
    queryFn: async () => {
      let query = supabase
        .from('tags')
        .select('*')
        .order('name');

      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      
      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Tag[];
    },
    enabled: !!clientId,
  });
}

/**
 * Get tags assigned to a specific entity
 */
export function useEntityTags(entityId: string | undefined, entityType: TagEntityType) {
  return useQuery({
    queryKey: ['entity-tags', entityId, entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_entity_tags', {
          p_entity_id: entityId,
          p_entity_type: entityType,
        });
      
      if (error) throw error;
      return data as TagAssignment[];
    },
    enabled: !!entityId,
  });
}

/**
 * Create a new tag
 */
export function useCreateTag() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tag: {
      name: string;
      color?: string;
      description?: string;
      entity_type: TagEntityType;
      client_id: string;
    }) => {
      const { data, error } = await supabase
        .from('tags')
        .insert({
          name: tag.name,
          color: tag.color || '#6366f1',
          description: tag.description,
          entity_type: tag.entity_type,
          client_id: tag.client_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tags', variables.client_id] });
      toast({
        title: 'Tag Created',
        description: `Tag "${variables.name}" has been created`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update a tag
 */
export function useUpdateTag() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tag> & { id: string }) => {
      const { data, error } = await supabase
        .from('tags')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({
        title: 'Tag Updated',
        description: `Tag "${data.name}" has been updated`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete a tag
 */
export function useDeleteTag() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      toast({
        title: 'Tag Deleted',
        description: 'Tag has been removed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Assign a tag to an entity
 */
export function useAssignTag() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      tagId, 
      entityId, 
      entityType 
    }: { 
      tagId: string; 
      entityId: string; 
      entityType: TagEntityType;
    }) => {
      const { data, error } = await supabase
        .rpc('assign_tag', {
          p_tag_id: tagId,
          p_entity_id: entityId,
          p_entity_type: entityType,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['entity-tags', variables.entityId, variables.entityType] 
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Remove a tag from an entity
 */
export function useRemoveTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      tagId, 
      entityId,
      entityType,
    }: { 
      tagId: string; 
      entityId: string;
      entityType: TagEntityType;
    }) => {
      const { data, error } = await supabase
        .rpc('remove_tag', {
          p_tag_id: tagId,
          p_entity_id: entityId,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['entity-tags', variables.entityId, variables.entityType] 
      });
    },
  });
}

/**
 * Predefined tag colors
 */
export const TAG_COLORS = [
  { name: 'Gray', value: '#6b7280' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
];

