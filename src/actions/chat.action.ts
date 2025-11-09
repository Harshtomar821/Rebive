"use server";

import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { StreamChat } from "stream-chat";

interface ChatUser {
  id: string;
  clerkId: string;
  name?: string | null;
  username: string;
  image?: string | null;
  followersCount: number;
  followingCount: number;
  lastMessageAt?: string | null;
}

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
        userMap.set(u.id, {
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
        userMap.set(u.id, {
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

    userMap.delete(dbUserId);
    let users = Array.from(userMap.values());
    if (users.length === 0) return [];

    const client = StreamChat.getInstance(
      process.env.NEXT_PUBLIC_STREAM_API_KEY!,
      process.env.STREAM_API_SECRET!
    );

    const channels = await client.queryChannels({
      members: { $in: [currentClerkId] },
    });

    const recentMap = new Map<string, Date>();

    channels.forEach((ch) => {
      const lastMsgAt = ch.state.last_message_at as Date | undefined;
      if (!lastMsgAt) return;

      const members = Object.keys(ch.state.members || {});
      const otherUserId = members.find((id) => id !== currentClerkId);
      if (!otherUserId) return;

      recentMap.set(otherUserId, lastMsgAt);
    });

    users = users.map((u) => ({
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
      else if (a.lastMessageAt) return -1;
      else if (b.lastMessageAt) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });

    return users;
  } catch (error) {
    console.error("⚠️ getChatUsers error:", error);
    return [];
  }
}
