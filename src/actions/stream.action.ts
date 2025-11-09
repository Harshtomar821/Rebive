"use server";

import { currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { StreamChat } from "stream-chat";
import prisma from "@/lib/prisma";
import crypto from "crypto";

const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY || "";
const STREAM_SECRET = process.env.STREAM_API_SECRET || "";

/**
 * Helper: safe pick of primary email local-part
 */
function emailToUsername(email?: string | null) {
  try {
    if (!email) return "";
    return email.split("@")[0] || "";
  } catch {
    return "";
  }
}

/**
 * Helper: safe full name
 */
function safeFullName(firstName?: string | null, lastName?: string | null) {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return name || "";
}

// ========================================================
// ✅ 1️⃣ Register Stream User (Safe — creates only once)
// ========================================================
export async function registerStreamUser() {
  try {
    const user = await currentUser();
    if (!user?.id) throw new Error("User not authenticated");

    const client = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);

    // Step 1: Check if user exists on Stream (server-side query)
    try {
      const existing = await client.queryUsers({ id: user.id }, undefined, { limit: 1 });
;
      if (existing.users && existing.users.length > 0) {
        console.log("ℹ️ Stream user already exists:", existing.users[0].name);
        return { success: true, alreadyExists: true };
      }
    } catch (err) {
      // queryUsers sometimes throws if not found; continue to upsert
    }

    // Step 2: Fetch from DB if available
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { name: true, username: true, image: true },
    });

    const displayName =
      dbUser?.name?.trim() ||
      dbUser?.username?.trim() ||
      safeFullName(user.firstName, user.lastName) ||
      user.fullName ||
      user.username ||
      emailToUsername(user.primaryEmailAddress?.emailAddress) ||
      "User";

    const userImage = dbUser?.image || user.imageUrl || "/avatar.png";

    // Step 3: Register user in Stream (upsertUser expects strings)
    await client.upsertUser({
      id: user.id,
      name: displayName,
      image: userImage,
    });

    console.log("✅ Stream user registered:", displayName);
    return { success: true };
  } catch (error) {
    console.error("❌ registerStreamUser error:", error);
    return { success: false, error: String(error) };
  }
}

// ========================================================
// ✅ 2️⃣ Generate Stream Token (Secure)
// ========================================================
export async function getStreamTokenAction(): Promise<string> {
  try {
    const user = await currentUser();
    if (!user?.id) throw new Error("User not authenticated");

    const client = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);
    return client.createToken(user.id);
  } catch (error) {
    console.error("❌ getStreamTokenAction error:", error);
    throw new Error("Unable to generate Stream token");
  }
}

// ========================================================
// ✅ 3️⃣ Create or Get Chat Channel (Clerk ID based + Auto Sync)
// ========================================================
export async function getOrCreateChatChannel(targetClerkId: string) {
  try {
    const user = await currentUser();
    if (!user?.id) throw new Error("User not authenticated");
    if (!targetClerkId) throw new Error("Target Clerk ID not provided");

    const client = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);

    // Ensure current DB user exists (create if missing)
    let currentDbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    });

    if (!currentDbUser) {
      currentDbUser = await prisma.user.create({
        data: {
          clerkId: user.id,
          name: safeFullName(user.firstName, user.lastName) || user.fullName || user.username || "",
          username:
            user.username ??
            emailToUsername(user.primaryEmailAddress?.emailAddress) ??
            "",
          email: user.primaryEmailAddress?.emailAddress ?? "",
          image: user.imageUrl ?? "",
        },
      });
    }

    // Ensure target user exists in DB: if not, sync from Clerk
    let targetUser = await prisma.user.findUnique({
      where: { clerkId: targetClerkId },
    });

    if (!targetUser) {
      // fetch from Clerk
      const targetClerkUser = await clerkClient.users.getUser(targetClerkId);
      if (!targetClerkUser) throw new Error("Target Clerk user not found in Clerk system");

      const targetEmail = targetClerkUser.emailAddresses?.[0]?.emailAddress ?? "";
      const targetUsername =
        targetClerkUser.username ?? emailToUsername(targetEmail) ?? "";

      targetUser = await prisma.user.create({
        data: {
          clerkId: targetClerkUser.id,
          name:
            safeFullName(targetClerkUser.firstName, targetClerkUser.lastName) ||
            targetClerkUser.fullName ||
            targetUsername ||
            "",
          username: targetUsername,
          email: targetEmail,
          image: targetClerkUser.imageUrl ?? "",
        },
      });

      console.log("🆕 Synced target user from Clerk to DB:", targetUser.username);
    }

    // Register both users on Stream (safe strings)
    await client.upsertUsers([
      {
        id: currentDbUser.clerkId,
        name: currentDbUser.name ?? currentDbUser.username ?? currentDbUser.clerkId,
        image: currentDbUser.image ?? "",
      },
      {
        id: targetUser.clerkId,
        name: targetUser.name ?? targetUser.username ?? targetUser.clerkId,
        image: targetUser.image ?? "",
      },
    ]);

    // Deterministic channel id (based on clerk ids)
    const members = [currentDbUser.clerkId, targetUser.clerkId].sort();
    const hash = crypto
      .createHash("sha1")
      .update(members.join("-"))
      .digest("hex")
      .slice(0, 20);
    const channelId = `chat-${hash}`;

    const channel = client.channel("messaging", channelId, {
      members,
      created_by_id: user.id,
    });

    // create if not exists
    await channel.create();

    console.log("✅ Channel ready:", channelId);
    return { success: true, channelId };
  } catch (error) {
    console.error("❌ getOrCreateChatChannel error:", error);
    return { success: false, error: String(error) };
  }
}

// ========================================================
// ✅ 4️⃣ Count Unread Messages (Accurate + User IDs)
// ========================================================
export async function chatNotify(): Promise<{
  totalUnread: number;
  unreadUserIds: string[];
}> {
  try {
    const user = await currentUser();
    if (!user?.id) return { totalUnread: 0, unreadUserIds: [] };

    const client = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);

    const channels = await client.queryChannels(
      { members: { $in: [user.id] } },
      { last_message_at: -1 },
      { limit: 50 }
    );

    let totalUnread = 0;
    const unreadUserIds: string[] = [];

    for (const ch of channels) {
      // `ch` can be a ChannelResponse; use any to access .state safely
      const readState = (ch as any).state?.read?.[user.id];
      const unread = (readState?.unread_messages as number) || 0;

      if (unread > 0) {
        totalUnread += unread;

        const members = Object.keys((ch as any).state?.members || {});
        const otherUserId = members.find((id) => id !== user.id);
        if (otherUserId) unreadUserIds.push(otherUserId);
      }
    }

    return { totalUnread, unreadUserIds };
  } catch (error) {
    console.error("❌ chatNotify error:", error);
    return { totalUnread: 0, unreadUserIds: [] };
  }
}
