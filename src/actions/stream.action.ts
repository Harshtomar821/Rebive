"use server";

import { currentUser } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { StreamChat } from "stream-chat";
import prisma from "@/lib/prisma";
import crypto from "crypto";

const STREAM_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY || "";
const STREAM_SECRET = process.env.STREAM_API_SECRET || "";

/* Helpers */
function emailToUsername(email?: string | null) {
  if (!email) return "";
  return email.split("@")[0] || "";
}
function safeFullName(firstName?: string | null, lastName?: string | null) {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return name || "";
}

/**
 * 1) Register current Clerk user on Stream (server-side).
 *    - ensures DB record exists (creates if missing)
 *    - upserts user on Stream
 */
export async function registerStreamUser() {
  try {
    const user = await currentUser();
    if (!user?.id) throw new Error("User not authenticated");

    const client = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);

    // quick check if exists on Stream
    try {
      const existing = await client.queryUsers({ id: user.id }, undefined, { limit: 1 });
      if (existing.users && existing.users.length > 0) {
        return { success: true, alreadyExists: true };
      }
    } catch {
      // continue to upsert
    }

    // ensure DB record
    let dbUser = await prisma.user.findUnique({ where: { clerkId: user.id } });
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          clerkId: user.id,
          name: safeFullName(user.firstName, user.lastName) || user.fullName || user.username || "",
          username: user.username ?? emailToUsername(user.primaryEmailAddress?.emailAddress) ?? "",
          email: user.primaryEmailAddress?.emailAddress ?? "",
          image: user.imageUrl ?? "",
        },
      });
    }

    const displayName =
      dbUser.name || dbUser.username || safeFullName(user.firstName, user.lastName) || user.fullName || user.username || emailToUsername(user.primaryEmailAddress?.emailAddress) || "User";
    const image = dbUser.image || user.imageUrl || "/avatar.png";

    await client.upsertUser({
      id: user.id,
      name: displayName,
      image,
    });

    return { success: true };
  } catch (error) {
    console.error("❌ registerStreamUser error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * 2) Create server-side token for the current user
 */
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

/**
 * 3) Get or create a deterministic private channel between current user and target (by Clerk ID).
 *    Ensures both users exist in DB and Stream (auto sync).
 *    Accepts targetClerkId (Clerk user id).
 */
export async function getOrCreateChatChannel(targetClerkId: string) {
  try {
    const user = await currentUser();
    if (!user?.id) throw new Error("User not authenticated");
    if (!targetClerkId) throw new Error("Target Clerk ID not provided");

    const client = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);

    // ensure current DB user
    let currentDbUser = await prisma.user.findUnique({ where: { clerkId: user.id } });
    if (!currentDbUser) {
      currentDbUser = await prisma.user.create({
        data: {
          clerkId: user.id,
          name: safeFullName(user.firstName, user.lastName) || user.fullName || user.username || "",
          username: user.username ?? emailToUsername(user.primaryEmailAddress?.emailAddress) ?? "",
          email: user.primaryEmailAddress?.emailAddress ?? "",
          image: user.imageUrl ?? "",
        },
      });
    }

    // ensure target DB user
    let targetUser = await prisma.user.findUnique({ where: { clerkId: targetClerkId } });
    if (!targetUser) {
      // try fetch from Clerk and sync
      const targetClerkUser = await clerkClient.users.getUser(targetClerkId);
      if (!targetClerkUser) throw new Error("Target Clerk user not found");

      const targetEmail = targetClerkUser.emailAddresses?.[0]?.emailAddress ?? "";
      const targetUsername = targetClerkUser.username ?? emailToUsername(targetEmail) ?? "";

      targetUser = await prisma.user.create({
        data: {
          clerkId: targetClerkUser.id,
          name: safeFullName(targetClerkUser.firstName, targetClerkUser.lastName) || targetClerkUser.fullName || targetUsername || "",
          username: targetUsername,
          email: targetEmail,
          image: targetClerkUser.imageUrl ?? "",
        },
      });
    }

    // upsert both users on Stream
    await client.upsertUsers([
      { id: currentDbUser.clerkId, name: currentDbUser.name ?? currentDbUser.username ?? currentDbUser.clerkId, image: currentDbUser.image ?? "" },
      { id: targetUser.clerkId, name: targetUser.name ?? targetUser.username ?? targetUser.clerkId, image: targetUser.image ?? "" },
    ]);

    // deterministic channel id
    const members = [currentDbUser.clerkId, targetUser.clerkId].sort();
    const hash = crypto.createHash("sha1").update(members.join("-")).digest("hex").slice(0, 20);
    const channelId = `chat-${hash}`;

    const channel = client.channel("messaging", channelId, { members, created_by_id: user.id });

    // create if not exists (Stream will no-op if exists)
    await channel.create();

    return { success: true, channelId };
  } catch (error) {
    console.error("❌ getOrCreateChatChannel error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * 4) chatNotify — returns totalUnread and list of other-user clerk ids that have unread messages
 */
export async function chatNotify(): Promise<{ totalUnread: number; unreadUserIds: string[] }> {
  try {
    const user = await currentUser();
    if (!user?.id) return { totalUnread: 0, unreadUserIds: [] };

    const client = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);

    const channels = await client.queryChannels({ members: { $in: [user.id] } }, { last_message_at: -1 }, { limit: 50 });

    let totalUnread = 0;
    const unreadUserIds: string[] = [];

    for (const ch of channels) {
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
