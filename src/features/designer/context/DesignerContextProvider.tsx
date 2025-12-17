/**
 * Designer Context Provider
 * Provides campaign context throughout the designer component tree
 */

import React, { createContext, useContext, ReactNode } from 'react';
import type { DesignerContext } from '../types/context';
import { useCampaignContext } from '../hooks/useCampaignContext';

const DesignerContextContext = createContext<DesignerContext | null>(null);

export interface DesignerContextProviderProps {
  clientId: string | undefined;
  children: ReactNode;
}

/**
 * Provider component for designer context
 */
export function DesignerContextProvider({ clientId, children }: DesignerContextProviderProps) {
  const context = useCampaignContext(clientId);
  
  return (
    <DesignerContextContext.Provider value={context}>
      {children}
    </DesignerContextContext.Provider>
  );
}

/**
 * Hook to access designer context
 * Must be used within DesignerContextProvider
 */
export function useDesignerContext(): DesignerContext {
  const context = useContext(DesignerContextContext);
  
  if (!context) {
    throw new Error('useDesignerContext must be used within DesignerContextProvider');
  }
  
  return context;
}
