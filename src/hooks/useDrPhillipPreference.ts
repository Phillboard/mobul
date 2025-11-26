import { useState, useEffect } from "react";

const STORAGE_KEY = "dr-phillip-enabled";

export function useDrPhillipPreference() {
  const [isEnabled, setIsEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true"; // Default to true (enabled)
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isEnabled));
  }, [isEnabled]);

  return { isEnabled, setIsEnabled };
}
