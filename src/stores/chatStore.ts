import { create } from "zustand";

import { chatService } from "@/services/chatService";
import type { ChatMessage } from "@/types/chat";

/** Matches the backend's ring: past this, the window is holding text nobody
 *  is going to scroll back to. */
const LIMIT = 200;

interface ChatState {
  messages: ChatMessage[];
  /** Newest last, the way a chat log reads. */
  load: () => Promise<void>;
  push: (message: ChatMessage) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  load: async () => set({ messages: await chatService.getRecent() }),
  push: (message) =>
    set((state) => ({ messages: [...state.messages, message].slice(-LIMIT) })),
  clear: () => set({ messages: [] }),
}));
