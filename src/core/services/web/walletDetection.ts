/**
 * Platform detection for wallet integration
 */

export type Platform = 'ios' | 'android' | 'desktop';

/**
 * Detects the user's platform based on user agent
 */
export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'desktop';
  
  const ua = navigator.userAgent.toLowerCase();
  
  if (/iphone|ipad|ipod/.test(ua)) {
    return 'ios';
  }
  
  if (/android/.test(ua)) {
    return 'android';
  }
  
  return 'desktop';
}

/**
 * Checks if the current device supports wallet passes
 */
export function supportsWallet(): boolean {
  const platform = detectPlatform();
  return platform === 'ios' || platform === 'android';
}

/**
 * Gets the appropriate wallet name for the platform
 */
export function getWalletName(): string {
  const platform = detectPlatform();
  
  switch (platform) {
    case 'ios':
      return 'Apple Wallet';
    case 'android':
      return 'Google Wallet';
    default:
      return 'Wallet';
  }
}
