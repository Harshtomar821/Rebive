"use client";

import { useEffect, useState } from "react";
import { StreamChat, Channel, ChannelMemberResponse } from "stream-chat";
import { getStreamTokenAction } from "@/actions/stream.action";
import { getChatUsers, type ChatUser } from "@/actions/chat.action";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { MessageCircleIcon, UserPlusIcon } from "lucide-react";
import ChatLoader from "@/components/ChatLoader";

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY!;
let globalClient: StreamChat | null = null;

export default function ChatListPage() {
  const { user, isLoaded } = useUser();
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);

  const connectStream = async () => {
    if (!user) return null;
    if (!globalClient) {
      const token = await getStreamTokenAction();
      const client = StreamChat.getInstance(STREAM_API_KEY);
      await client.connectUser(
        {
          id: user.id,
          name: user.fullName || user.username || "User",
          image: user.imageUrl || "/avatar.png",
        },
        token
      );
      globalClient = client;
    }
    return globalClient;
  };

  const loadUsers = async () => {
    try {
      const client = await connectStream();
      if (!client || !user) return;

      const [channels, dbUsers] = await Promise.all([
        client.queryChannels(
          { type: "messaging", members: { $in: [user.id] } },
          { last_message_at: -1 }
        ),
        getChatUsers(),
      ]);

      const activeChats: ChatUser[] = channels
        .map((ch: Channel): ChatUser | null => {
          const members = Object.values(
            (ch.state.members || {}) as Record<string, ChannelMemberResponse>
          );
          const other = members.find(
            (m) => m.user && m.user.id !== user.id
          )?.user;

          if (!other) return null;

          const lastMsg =
            ch.state.last_message_at instanceof Date
              ? ch.state.last_message_at.toISOString()
              : ch.state.last_message_at
              ? new Date(ch.state.last_message_at as string).toISOString()
              : null;

          return {
            id: other.id,
            clerkId: other.id,
            name: other.name || other.id,
            username: other.username || other.id.slice(0, 8),
            image: other.image || "/avatar.png",
            lastMessageAt: lastMsg,
            followersCount: 0,
            followingCount: 0,
          };
        })
        .filter((u): u is ChatUser => Boolean(u));

      const activeIds = new Set(activeChats.map((u) => u.clerkId));
      const restUsers: ChatUser[] = dbUsers.filter(
        (u) => !activeIds.has(u.clerkId)
      );

      setUsers([...activeChats, ...restUsers]);
      setLoading(false);
    } catch (err) {
      console.error("⚠️ Chat load error:", err);
    }
  };

  useEffect(() => {
    if (!isLoaded || !user) return;
    loadUsers();
  }, [isLoaded, user]);

  if (loading) return <ChatLoader />;

  const activeChats = users.filter((u) => u.lastMessageAt !== null);
  const newUsers = users.filter((u) => u.lastMessageAt === null);

  return (
    <div className="min-h-screen  bg-gradient-to-br from-[#F8CDDA] to-[#1D2B64] py-10 px-5 sm:px-10">
      {/* 🌟 Header */}
      <div className="max-w-6xl mx-auto mb-12 text-center">
        <h1 className="text-3xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 drop-shadow-lg">
          💬 Chat Dashboard
        </h1>
        <p className="text-gray-600 text-lg mt-2">
          Connect, chat, and build meaningful conversations effortlessly.
        </p>
      </div>

      <div className="max-w-6xl mx-auto space-y-16">
        {/* 🌈 Active Chats */}
        <ChatSection
          title="Active Chats"
          subtitle="Continue your conversations"
          users={activeChats}
          emptyText="No active chats yet 😕"
          gradient="from-indigo-500 via-purple-500 to-pink-500"
          buttonText="Continue Chat"
          icon={<MessageCircleIcon className="w-4 h-4" />}
        />

        {/* 🌸 New Users */}
        <ChatSection
          title="Discover People"
          subtitle="Start chatting with new users"
          users={newUsers}
          emptyText="No new users found 🕊️"
          gradient="from-pink-500 via-rose-400 to-orange-400"
          buttonText="Start Chat"
          icon={<UserPlusIcon className="w-4 h-4" />}
        />
      </div>
    </div>
  );
}

/* ==============================
   💫 ChatSection Component
============================== */
function ChatSection({
  title,
  subtitle,
  users,
  emptyText,
  gradient,
  icon,
  buttonText,
}: {
  title: string;
  subtitle: string;
  users: ChatUser[];
  emptyText: string;
  gradient: string;
  icon: React.ReactNode;
  buttonText: string;
}) {
  return (
    <section className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-1">{title}</h2>
          <p className="text-gray-500 text-sm">{subtitle}</p>
        </div>
        <div className="badge badge-lg bg-gradient-to-r from-indigo-200 to-purple-200 text-gray-700 border-0">
          {users.length} Users
        </div>
      </div>

      {users.length === 0 ? (
        <div className="p-8 bg-white/80 backdrop-blur-md rounded-2xl border border-indigo-100 text-center text-gray-500 shadow-sm">
          {emptyText}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {users.map((user) => (
            <div
              key={user.clerkId}
              className="relative group card overflow-hidden border border-transparent rounded-2xl bg-gradient-to-br from-white/80 via-white/70 to-indigo-50/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_8px_40px_rgb(99,102,241,0.15)] transition-all duration-500 hover:-translate-y-1"
            >
              {/* 🩵 Gradient glow */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-700" />

              <div className="card-body relative p-6 flex flex-col justify-between">
                <div className="flex items-center gap-4">
                  <div className="avatar">
                    <div className="w-16 rounded-full ring ring-white ring-offset-base-100 ring-offset-2 group-hover:ring-purple-400 transition-all duration-500">
                      <Image
                        src={user.image ?? "/avatar.png"}
                        alt={user.name ?? "User"}
                        width={64}
                        height={64}
                        className="rounded-full"
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800 group-hover:text-indigo-700 transition-colors duration-300">
                      {user.name}
                    </h3>
                    {/* <p className="text-sm text-gray-500">@{user.username}</p> */}
                    {user.lastMessageAt && (
                      <p className="text-xs text-gray-400 mt-1 italic">
                        Last message:{" "}
                        {new Date(user.lastMessageAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>

                <Link href={`/chat/${user.clerkId}`} prefetch={false}>
                  <button
                    className={`btn mt-5 w-full border-0 bg-gradient-to-r ${gradient} text-white hover:opacity-90 hover:scale-[1.02] transition-all shadow-md`}
                  >
                    {icon} {buttonText}
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
