import { invoke } from "@tauri-apps/api/core";

import type { ChatMessage } from "@/types/chat";

export const chatService = {
  /** The backend's in-memory ring, oldest first. Chat is never persisted. */
  getRecent: () => invoke<ChatMessage[]>("get_recent_chat"),
};
