import { DrPhillipChat } from "./DrPhillipChat";
import { useDrPhillipPreference } from "@/shared/hooks";

export function DrPhillipChatWrapper() {
  const { isEnabled } = useDrPhillipPreference();
  
  if (!isEnabled) {
    return null;
  }
  
  return <DrPhillipChat />;
}
