"use client";

import { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import { getStreamTokenAction } from "@/actions/stream.action";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircleIcon } from "lucide-react";
import ChatLoader from "@/components/ChatLoader";

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

// ✅ Cache client globally to avoid re-connects
let globalClient: StreamChat | null = null;
let isClientConnecting = false;

export default function ChatListPage() {
  const { user, isLoaded } = useUser();
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user) return;

    let active = true;

    const initChatList = async () => {
      try {
        setLoading(true);

        // ✅ Reuse existing client or create new
        let client = globalClient ?? StreamChat.getInstance(STREAM_API_KEY);

        // ✅ If not connected, connect once globally
        if (!client.userID && !isClientConnecting) {
          isClientConnecting = true;
          const token = await getStreamTokenAction();

          await client.connectUser(
            {
              id: user.id,
              name: user.fullName || user.username || "User",
              image: user.imageUrl || "/avatar.png",
            },
            token
          );

          globalClient = client;
          isClientConnecting = false;
        }

        // 🔄 Wait until client is connected
        let retries = 0;
        while (!client.userID && retries < 10) {
          await new Promise((res) => setTimeout(res, 200));
          retries++;
        }

        if (!client.userID) throw new Error("Client not connected");

        // ✅ Query channels safely
        const userChannels = await client.queryChannels(
          { type: "messaging", members: { $in: [user.id] } },
          { last_message_at: -1 },
          { limit: 30 }
        );

        // ✅ Format UI-friendly data
        const formatted = userChannels.map((ch) => {
          const other = Object.values(ch.state.members || {}).find(
            (m: any) => m.user?.id !== user.id
          ) as any;

          return {
            id: ch.id,
            name: other?.user?.name || "Unknown",
            username:
              other?.user?.id?.slice(0, 8) ||
              other?.user?.username ||
              "unknown",
            image: other?.user?.image || "/avatar.png",
            lastMessageAt: ch.state.last_message_at,
            unreadCount: ch.countUnread(),
            clerkId: other?.user?.id,
          };
        });

        if (active) {
          setChannels(formatted);
          setLoading(false);
        }

        // ✅ Real-time: move chat to top
        client.on("message.new", (event) => {
          const chanId = event.channel_id;
          if (!chanId) return;

          setChannels((prev) => {
            const updated = [...prev];
            const index = updated.findIndex((c) => c.id === chanId);
            if (index !== -1) {
              const [moved] = updated.splice(index, 1);
              moved.lastMessageAt = new Date().toISOString();
              moved.unreadCount = (moved.unreadCount ?? 0) + 1;
              updated.unshift(moved);
            }
            return [...updated];
          });
        });
      } catch (err) {
        console.error("❌ Stream setup error:", err);
        setLoading(false);
      }
    };

    initChatList();

    return () => {
      active = false;
    };
  }, [isLoaded, user]);

  if (loading) return <ChatLoader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-100 flex flex-col items-center py-12 px-4 transition-all">
      <h1 className="text-3xl sm:text-4xl font-bold text-indigo-700 mb-8 text-center drop-shadow-sm">
        💬 Chats
      </h1>

      {channels.length === 0 ? (
        <div className="text-gray-500 text-center mt-16 animate-fade-in">
          No active chats yet 😕
        </div>
      ) : (
        <div className="w-full max-w-2xl grid gap-5 animate-fade-in">
          {channels.map((ch) => (
            <ChatCard key={ch.id} chat={ch} />
          ))}
        </div>
      )}
    </div>
  );
}

// ===================================
// ✅ ChatCard Component
// ===================================
function ChatCard({ chat }: { chat: any }) {
  const isUnread = chat.unreadCount > 0;

  return (
    <Card
      className={`relative hover:shadow-xl hover:-translate-y-1 transition-all bg-white/80 backdrop-blur-md border ${
        isUnread ? "border-red-300" : "border-indigo-100"
      } rounded-2xl`}
    >
      <CardContent className="flex items-center justify-between p-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Image
              src={chat.image}
              alt={chat.name}
              width={60}
              height={60}
              className="rounded-full border border-indigo-200 shadow-sm hover:scale-105 transition-transform"
            />
            {isUnread && (
              <span className="absolute top-0 right-0 bg-red-500 w-3 h-3 rounded-full animate-pulse border-2 border-white"></span>
            )}
          </div>

          <div>
            <h3
              className={`font-semibold text-lg ${
                isUnread ? "text-red-600" : "text-gray-800"
              }`}
            >
              {chat.name}
            </h3>
            <p className="text-sm text-gray-500"></p>
            {chat.lastMessageAt && (
              <p
                className={`text-xs mt-1 italic ${
                  isUnread ? "text-red-400" : "text-gray-400"
                }`}
              >
                Last message:{" "}
                {new Date(chat.lastMessageAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        </div>

        <Link href={`/chat/${chat.clerkId}`} prefetch={false}>
          <Button
            className={`${
              isUnread
                ? "bg-red-500 hover:bg-red-600"
                : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90"
            } text-white rounded-lg flex items-center gap-2 transition-all`}
          >
            <MessageCircleIcon className="w-4 h-4" />
            Chat
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
