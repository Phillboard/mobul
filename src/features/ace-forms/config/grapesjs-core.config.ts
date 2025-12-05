// Shared core configuration for both landing pages and mailers
import {
  rteProseMirror,
  flexComponent,
  iconifyComponent,
  canvasFullSize,
  canvasEmptyState,
  layoutSidebarButtons,
} from '@grapesjs/studio-sdk-plugins';

export const coreGrapesJSConfig = {
  license: import.meta.env.VITE_GRAPESJS_LICENSE_KEY || '',
  
  // Studio SDK settings
  theme: {
    dark: true,
    primaryColor: 'hsl(var(--primary))',
  },
  
  // Common plugins (used by both)
  plugins: [
    rteProseMirror,
    flexComponent,
    iconifyComponent,
    canvasFullSize,
    canvasEmptyState,
    layoutSidebarButtons,
  ],
  
  // Storage (handled by our custom save)
  storageManager: false,
  
  // Asset manager (Supabase Storage)
  assetManager: {
    upload: false, // We'll handle uploads separately
    multiUpload: true,
    autoAdd: true,
  },
  
  // Common device presets
  deviceManager: {
    devices: [
      { id: 'desktop', name: 'Desktop', width: '' },
      { id: 'tablet', name: 'Tablet', width: '768px' },
      { id: 'mobile', name: 'Mobile', width: '375px' },
    ],
  },
};
