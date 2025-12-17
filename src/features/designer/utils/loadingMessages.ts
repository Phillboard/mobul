/**
 * Loading Messages Utility
 * Context-aware loading messages for AI generation
 */

import { useState, useEffect } from 'react';
import type { DesignerContext, GiftCardBrand } from '../types/context';

export const GENERIC_LOADING_MESSAGES = [
  "Crafting your stunning design...",
  "Adding that prize-winner energy...",
  "Making your gift card look irresistible...",
  "Sprinkling some design magic...",
  "Almost there... adding the finishing touches...",
  "Creating something beautiful...",
  "Polishing the pixels...",
  "Making direct mail exciting again...",
];

export const BRAND_LOADING_MESSAGES: Record<GiftCardBrand, string[]> = {
  'jimmy-johns': [
    "Crafting your ${{amount}} Jimmy John's postcard...",
    "Making your sub sandwich look Freaky Fast delicious...",
    "Adding that prize-winner energy to your design...",
    "Your free lunch is almost ready...",
  ],
  
  'starbucks': [
    "Brewing up your ${{amount}} Starbucks design...",
    "Creating that cozy coffee shop feeling...",
    "Making your gift card look like a treat...",
    "Almost ready to serve up your design...",
  ],
  
  'marcos': [
    "Crafting your ${{amount}} Marco's Pizza postcard...",
    "Making that cheese pull look irresistible...",
    "Creating pizza night hero energy...",
    "Your design is almost hot and ready...",
  ],
  
  'dominos': [
    "Designing your ${{amount}} Domino's postcard...",
    "Adding that hot pizza energy...",
    "Making your gift card look delicious...",
    "Almost ready for delivery...",
  ],
  
  'subway': [
    "Crafting your ${{amount}} Subway design...",
    "Adding fresh ingredients to your postcard...",
    "Making your sandwich look irresistible...",
    "Your design is almost ready to eat...",
  ],
  
  'chilis': [
    "Creating your ${{amount}} Chili's postcard...",
    "Adding sizzle to your design...",
    "Making your gift card look appetizing...",
    "Almost ready to serve...",
  ],
  
  'panera': [
    "Baking up your ${{amount}} Panera design...",
    "Adding artisan touches...",
    "Making your gift card look fresh...",
    "Your design is almost ready...",
  ],
  
  'chipotle': [
    "Crafting your ${{amount}} Chipotle postcard...",
    "Adding fresh ingredients and flavor...",
    "Making your burrito bowl look delicious...",
    "Almost ready to enjoy...",
  ],
  
  'generic-food': [
    "Crafting your ${{amount}} gift card design...",
    "Making your reward look valuable...",
    "Adding that golden ticket energy...",
    "Your design is almost ready...",
  ],
  
  'generic-retail': [
    "Creating your ${{amount}} gift card design...",
    "Adding premium presentation...",
    "Making your reward irresistible...",
    "Almost done...",
  ],
  
  'unknown': [
    "Crafting your gift card design...",
    "Making your reward look valuable...",
    "Adding that golden ticket energy...",
    "Your design is almost ready...",
  ],
};

/**
 * Get contextual message based on designer context
 */
export function getContextualMessage(context: DesignerContext): string {
  if (!context.giftCard) {
    return getRandomMessage(GENERIC_LOADING_MESSAGES);
  }

  const brandMessages = BRAND_LOADING_MESSAGES[context.giftCard.brandKey] || GENERIC_LOADING_MESSAGES;
  const message = getRandomMessage(brandMessages);
  
  // Replace {{amount}} placeholder with actual amount
  return message.replace('{{amount}}', context.giftCard.amount.toString());
}

/**
 * Get random message from array
 */
function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Hook for rotating messages
 */
export function useRotatingMessage(
  messages: string[],
  intervalMs: number = 3000
): string {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % messages.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [messages.length, intervalMs]);

  return messages[currentIndex] || messages[0];
}

/**
 * Hook for context-aware loading message that rotates
 */
export function useContextualLoadingMessage(
  context: DesignerContext,
  isActive: boolean
): string {
  // Get appropriate messages based on context
  const messages = getContextualMessages(context);
  
  // Use rotating message when active
  const rotatingMessage = useRotatingMessage(messages, 3000);
  
  // Return static message when not active
  if (!isActive) {
    return messages[0];
  }
  
  return rotatingMessage;
}

/**
 * Get array of contextual messages
 */
function getContextualMessages(context: DesignerContext): string[] {
  if (!context.giftCard) {
    return GENERIC_LOADING_MESSAGES;
  }

  const brandMessages = BRAND_LOADING_MESSAGES[context.giftCard.brandKey] || GENERIC_LOADING_MESSAGES;
  
  // Replace placeholders
  return brandMessages.map(msg => 
    msg.replace('{{amount}}', context.giftCard!.amount.toString())
  );
}
