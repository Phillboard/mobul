/**
 * Logo Upload Utilities
 * 
 * Handles file validation, upload to Supabase Storage, and URL management
 * for gift card brand logos
 */

import { supabase } from '@core/services/supabase';

// Allowed file types for logos
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
}

export interface LogoUploadResult {
  success: boolean;
  publicUrl?: string;
  error?: string;
}

/**
 * Validate a logo file before upload
 */
export function validateLogoFile(file: File): UploadValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than 2MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    };
  }
  
  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: PNG, JPG, JPEG, SVG. Current type: ${file.type}`,
    };
  }
  
  return { valid: true };
}

/**
 * Generate a unique filename for a brand logo
 */
export function generateLogoFilename(brandName: string, file: File): string {
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop() || 'png';
  const safeBrandName = brandName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 30); // Limit length
  
  return `${safeBrandName}_${timestamp}.${fileExt}`;
}

/**
 * Upload a logo file to Supabase Storage
 */
export async function uploadBrandLogo(
  file: File,
  brandName: string,
  existingLogoUrl?: string
): Promise<LogoUploadResult> {
  try {
    // Validate file first
    const validation = validateLogoFile(file);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }
    
    // Delete existing logo if provided
    if (existingLogoUrl && existingLogoUrl.includes('gift-card-brand-logos')) {
      const oldPath = existingLogoUrl.split('/').pop();
      if (oldPath) {
        await supabase.storage
          .from('gift-card-brand-logos')
          .remove([oldPath]);
      }
    }
    
    // Generate unique filename
    const filename = generateLogoFilename(brandName, file);
    
    // Upload to Supabase Storage
    const { error: uploadError, data } = await supabase.storage
      .from('gift-card-brand-logos')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('gift-card-brand-logos')
      .getPublicUrl(filename);
    
    return {
      success: true,
      publicUrl,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to upload logo',
    };
  }
}

/**
 * Delete a brand logo from storage
 */
export async function deleteBrandLogo(logoUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Only delete if it's from our storage bucket
    if (!logoUrl.includes('gift-card-brand-logos')) {
      return {
        success: true, // Not our file, so "success" in terms of cleanup
      };
    }
    
    const filename = logoUrl.split('/').pop();
    if (!filename) {
      return {
        success: false,
        error: 'Invalid logo URL',
      };
    }
    
    const { error } = await supabase.storage
      .from('gift-card-brand-logos')
      .remove([filename]);
    
    if (error) {
      throw error;
    }
    
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete logo',
    };
  }
}

/**
 * Convert a file to a data URL for preview
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Check if a URL is a valid image
 */
export async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) return false;
    
    const contentType = response.headers.get('content-type');
    return contentType ? contentType.startsWith('image/') : false;
  } catch {
    return false;
  }
}

/**
 * Get file extension from mime type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/svg+xml': 'svg',
  };
  return map[mimeType] || 'png';
}

