import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "dr-phillip-enabled";
const HIDDEN_UNTIL_KEY = "dr-phillip-hidden-until";

export type HideDuration = "1hour" | "1day" | "1week" | "forever";

interface DrPhillipPreference {
  isEnabled: boolean;
  isHidden: boolean;
  hiddenUntil: Date | null;
  setIsEnabled: (enabled: boolean) => void;
  hideFor: (duration: HideDuration) => void;
  show: () => void;
}

export function useDrPhillipPreference(): DrPhillipPreference {
  const [isEnabled, setIsEnabledState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  const [hiddenUntil, setHiddenUntilState] = useState<Date | null>(() => {
    const stored = localStorage.getItem(HIDDEN_UNTIL_KEY);
    if (!stored) return null;
    if (stored === "forever") return new Date(9999, 11, 31);
    const date = new Date(stored);
    return isNaN(date.getTime()) ? null : date;
  });

  // Check if currently hidden
  const isHidden = hiddenUntil !== null && hiddenUntil > new Date();

  // Persist enabled state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isEnabled));
  }, [isEnabled]);

  // Persist hidden until state
  useEffect(() => {
    if (hiddenUntil === null) {
      localStorage.removeItem(HIDDEN_UNTIL_KEY);
    } else if (hiddenUntil.getFullYear() === 9999) {
      localStorage.setItem(HIDDEN_UNTIL_KEY, "forever");
    } else {
      localStorage.setItem(HIDDEN_UNTIL_KEY, hiddenUntil.toISOString());
    }
  }, [hiddenUntil]);

  // Auto-show when hide period expires
  useEffect(() => {
    if (!hiddenUntil || hiddenUntil.getFullYear() === 9999) return;
    
    const now = new Date();
    const timeUntilShow = hiddenUntil.getTime() - now.getTime();
    
    if (timeUntilShow <= 0) {
      setHiddenUntilState(null);
      return;
    }
    
    // Set timeout to clear hidden state when time expires
    const timeout = setTimeout(() => {
      setHiddenUntilState(null);
    }, Math.min(timeUntilShow, 2147483647)); // Max setTimeout value
    
    return () => clearTimeout(timeout);
  }, [hiddenUntil]);

  const setIsEnabled = useCallback((enabled: boolean) => {
    setIsEnabledState(enabled);
    if (enabled) {
      // When enabling, also clear any hide timer
      setHiddenUntilState(null);
    }
  }, []);

  const hideFor = useCallback((duration: HideDuration) => {
    const now = new Date();
    let until: Date;
    
    switch (duration) {
      case "1hour":
        until = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case "1day":
        until = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case "1week":
        until = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case "forever":
        until = new Date(9999, 11, 31);
        break;
    }
    
    setHiddenUntilState(until);
  }, []);

  const show = useCallback(() => {
    setHiddenUntilState(null);
  }, []);

  return {
    isEnabled,
    isHidden,
    hiddenUntil,
    setIsEnabled,
    hideFor,
    show,
  };
}
