import { DrPhillipChat } from "./DrPhillipChat";
import { useDrPhillipPreference } from "@/hooks/useDrPhillipPreference";

export function DrPhillipChatWrapper() {
  const { isEnabled } = useDrPhillipPreference();
  
  if (!isEnabled) {
    return null;
  }
  
  return <DrPhillipChat />;
}
