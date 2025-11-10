"use server";

import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { StreamChat } from "stream-chat";

export interface ChatUser {   
  id: string;
  clerkId: string;
  name?: string | null;
  username: string;
  image?: string | null;
  followersCount: number;
  followingCount: number;
  lastMessageAt?: string | null;
}

/**
 * Returns a list of ChatUser for current user:
 *  - includes followers and following (as before)
 *  - if none found (or to supplement), falls back to DB active users (excluding self)
 *  - attaches recent last message time from Stream if available
 */
export async function getChatUsers(): Promise<ChatUser[]> {
  try {
    const user = await currentUser();
    if (!user?.id) return [];

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
      select: { id: true, clerkId: true },
    });
    if (!dbUser) return [];

    const dbUserId = dbUser.id;
    const currentClerkId = dbUser.clerkId;

    // fetch followers & following
    const [following, followers] = await Promise.all([
      prisma.follows.findMany({
        where: { followerId: dbUserId },
        select: {
          following: {
            select: {
              id: true,
              clerkId: true,
              name: true,
              username: true,
              image: true,
              _count: { select: { followers: true, following: true } },
            },
          },
        },
      }),
      prisma.follows.findMany({
        where: { followingId: dbUserId },
        select: {
          follower: {
            select: {
              id: true,
              clerkId: true,
              name: true,
              username: true,
              image: true,
              _count: { select: { followers: true, following: true } },
            },
          },
        },
      }),
    ]);

    const userMap = new Map<string, ChatUser>();

    for (const f of followers) {
      const u = f.follower;
      if (u)
        userMap.set(u.clerkId, {
          id: u.id,
          clerkId: u.clerkId,
          name: u.name,
          username: u.username,
          image: u.image,
          followersCount: u._count.followers,
          followingCount: u._count.following,
          lastMessageAt: null,
        });
    }

    for (const f of following) {
      const u = f.following;
      if (u)
        userMap.set(u.clerkId, {
          id: u.id,
          clerkId: u.clerkId,
          name: u.name,
          username: u.username,
          image: u.image,
          followersCount: u._count.followers,
          followingCount: u._count.following,
          lastMessageAt: null,
        });
    }

    // If no follow-based users, fallback to active DB users excluding self
    if (userMap.size === 0) {
      const others = await prisma.user.findMany({
        where: { NOT: { clerkId: currentClerkId } },
        select: {
          id: true,
          clerkId: true,
          name: true,
          username: true,
          image: true,
        },
        take: 50,
      });
      for (const o of others) {
        userMap.set(o.clerkId, {
          id: o.id,
          clerkId: o.clerkId,
          name: o.name,
          username: o.username,
          image: o.image,
          followersCount: 0,
          followingCount: 0,
          lastMessageAt: null,
        });
      }
    }

    // Attach Stream last_message_at if any
    const client = StreamChat.getInstance(
      process.env.NEXT_PUBLIC_STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );

    const channels = await client.queryChannels(
      { members: { $in: [currentClerkId] } },
      { last_message_at: -1 },
      { limit: 100 }
    );

    const recentMap = new Map<string, Date>();
    for (const ch of channels) {
      const lastMsgAt = (ch as any).state?.last_message_at as Date | undefined;
      if (!lastMsgAt) continue;
      const members = Object.keys((ch as any).state?.members || {});
      const otherUserId = members.find((id) => id !== currentClerkId);
      if (!otherUserId) continue;
      recentMap.set(otherUserId, lastMsgAt);
    }

    let users = Array.from(userMap.values()).map((u) => ({
      ...u,
      lastMessageAt:
        u.clerkId && recentMap.has(u.clerkId)
          ? recentMap.get(u.clerkId)!.toISOString()
          : null,
    }));

    users.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt)
        return (
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
        );
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    return users;
  } catch (error) {
    console.error("⚠️ getChatUsers error:", error);
    return [];
  }
}
