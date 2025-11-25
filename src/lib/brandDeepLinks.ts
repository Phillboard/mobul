/**
 * Brand-specific deep links and redemption URLs
 * Supports platform-specific app deep linking with website fallbacks
 */

export interface BrandLinks {
  website: string;
  ios?: string;
  android?: string;
  appStoreId?: string;
  packageName?: string;
}

export const brandDeepLinks: Record<string, BrandLinks> = {
  "Amazon": {
    website: "https://www.amazon.com/gc/redeem",
    ios: "com.amazon.mobile.shopping://giftcard/redeem",
    android: "intent://www.amazon.com/gc/redeem#Intent;scheme=https;package=com.amazon.mShop.android.shopping;end",
    appStoreId: "297606951",
    packageName: "com.amazon.mShop.android.shopping",
  },
  "Jimmy John's": {
    website: "https://www.jimmyjohns.com/myaccount/giftcards",
    ios: "jimmyjohns://giftcard",
    android: "intent://giftcard#Intent;scheme=jimmyjohns;package=com.jimmyjohns.app;end",
    packageName: "com.jimmyjohns.app",
  },
  "Starbucks": {
    website: "https://www.starbucks.com/card",
    ios: "starbucks://giftcard",
    android: "intent://card#Intent;scheme=starbucks;package=com.starbucks.mobilecard;end",
    appStoreId: "331177714",
    packageName: "com.starbucks.mobilecard",
  },
  "Target": {
    website: "https://www.target.com/gift-cards/balance",
    ios: "target://giftcard",
    android: "intent://giftcard#Intent;scheme=target;package=com.target.ui;end",
    appStoreId: "297430070",
    packageName: "com.target.ui",
  },
  "Walmart": {
    website: "https://www.walmart.com/account/giftcards",
    ios: "walmart://giftcard",
    android: "intent://giftcard#Intent;scheme=walmart;package=com.walmart.android;end",
    appStoreId: "338137227",
    packageName: "com.walmart.android",
  },
  "Best Buy": {
    website: "https://www.bestbuy.com/profile/c/signin?giftcard",
    ios: "bestbuy://giftcard",
    android: "intent://giftcard#Intent;scheme=bestbuy;package=com.bestbuy.android;end",
    appStoreId: "314855255",
    packageName: "com.bestbuy.android",
  },
  "iTunes": {
    website: "https://buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/freeProductCodeWizard",
    ios: "itms-apps://buy.itunes.apple.com/redeem",
  },
  "Google Play": {
    website: "https://play.google.com/store/account",
    android: "intent://play.google.com/redeem#Intent;scheme=https;package=com.android.vending;end",
    packageName: "com.android.vending",
  },
  "Uber": {
    website: "https://www.uber.com/payment",
    ios: "uber://payment",
    android: "intent://payment#Intent;scheme=uber;package=com.ubercab;end",
    appStoreId: "368677368",
    packageName: "com.ubercab",
  },
  "DoorDash": {
    website: "https://www.doordash.com/gift-cards/redeem/",
    ios: "doordash://giftcard",
    android: "intent://giftcard#Intent;scheme=doordash;package=com.dd.doordash;end",
    appStoreId: "719972451",
    packageName: "com.dd.doordash",
  },
};

/**
 * Get brand links for a specific brand (case-insensitive match)
 */
export function getBrandLinks(brandName: string): BrandLinks | null {
  const normalizedBrand = brandName.trim();
  
  // Exact match
  if (brandDeepLinks[normalizedBrand]) {
    return brandDeepLinks[normalizedBrand];
  }
  
  // Case-insensitive search
  const matchedKey = Object.keys(brandDeepLinks).find(
    key => key.toLowerCase() === normalizedBrand.toLowerCase()
  );
  
  return matchedKey ? brandDeepLinks[matchedKey] : null;
}

/**
 * Detect user's platform
 */
export function detectPlatform(): 'ios' | 'android' | 'desktop' {
  const userAgent = navigator.userAgent || navigator.vendor;
  
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return 'ios';
  }
  
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  return 'desktop';
}

/**
 * Check if app is installed (best effort - not always accurate)
 */
export function attemptDeepLink(url: string, fallbackUrl: string, timeout = 2000): void {
  const start = Date.now();
  let hasFocus = true;
  
  const onBlur = () => {
    hasFocus = false;
  };
  
  window.addEventListener('blur', onBlur);
  
  // Attempt deep link
  window.location.href = url;
  
  // Fallback if app not installed
  setTimeout(() => {
    window.removeEventListener('blur', onBlur);
    
    // If still has focus after timeout, app probably not installed
    if (hasFocus && Date.now() - start < timeout + 100) {
      window.location.href = fallbackUrl;
    }
  }, timeout);
}
