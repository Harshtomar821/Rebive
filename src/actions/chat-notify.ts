"use server";

import { StreamChat } from "stream-chat";
import { currentUser } from "@clerk/nextjs/server";

/**
 * ✅ Clerk-safe unread messages counter for Stream
 * Works with client components (like Navbar)
 */
export async function chatNotify(): Promise<number> {
  try {
    // 👤 Securely get current user (instead of auth())
    const user = await currentUser();
    if (!user?.id) return 0;

    // 🟢 Initialize Stream client
    const client = StreamChat.getInstance(
      process.env.NEXT_PUBLIC_STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );

    // 🔎 Fetch channels with this user as member
    const channels = await client.queryChannels(
      { members: { $in: [user.id] } },
      {},
      { limit: 50 }
    );

    // 🔢 Calculate unread count
    const unreadCount = channels.reduce((sum, ch) => {
      return sum + (ch.state?.unreadCount || 0);
    }, 0);

    return unreadCount;
  } catch (err) {
    console.error("❌ chatNotify error:", err);
    return 0;
  }
}
