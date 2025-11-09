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

// ✅ Keep client globally cached to avoid unnecessary reconnects
let globalClient: StreamChat | null = null;

interface ChatChannel {
  id: string;
  name: string;
  username: string;
  image: string;
  lastMessageAt?: string;
  unreadCount: number;
  clerkId: string;
}

export default function ChatListPage() {
  const { user, isLoaded } = useUser();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Function to safely connect or reconnect Stream client
  const connectAndLoad = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // ✅ Reuse existing Stream client or create new
      let client = globalClient ?? StreamChat.getInstance(STREAM_API_KEY);

      // ✅ Access internal connection state safely
      const state = (client as any)?.connectionState;

      // ✅ Reconnect if user not connected or connection invalid
      if (
        !client.userID ||
        state === "disconnecting" ||
        state === "disconnected"
      ) {
        console.log("🔄 Reconnecting Stream client...");

        if (state === "disconnecting" || state === "disconnected") {
          await client.disconnectUser().catch(() => null);
        }

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
        console.log("✅ Stream client connected");
      }

      // ✅ Query user’s channels
      const userChannels = await client.queryChannels(
        { type: "messaging", members: { $in: [user.id] } },
        { last_message_at: -1 },
        { limit: 30 }
      );

      const formatted: ChatChannel[] = userChannels.map((ch) => {
        const otherMember = Object.values(ch.state.members || {}).find(
          (m: any) => m.user?.id !== user.id
        ) as any;

        return {
          id: ch.id ?? "", // ensure string
          name: otherMember?.user?.name || "Unknown",
          username:
            otherMember?.user?.username ||
            otherMember?.user?.id?.slice(0, 8) ||
            "unknown",
          image: otherMember?.user?.image || "/avatar.png",
          lastMessageAt: ch.state.last_message_at
            ? new Date(ch.state.last_message_at).toISOString()
            : "",
          unreadCount: ch.countUnread() ?? 0,
          clerkId: otherMember?.user?.id ?? "",
        };
      });

      setChannels(formatted);
      setLoading(false);

      // ✅ Realtime updates: move chat to top on new message
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

  // ✅ Initial load + auto reconnect when user comes back
  useEffect(() => {
    if (!isLoaded || !user) return;

    connectAndLoad();

    // 👇 Auto reconnect when user refocuses the window or navigates back
    const handleFocus = () => {
      if (!globalClient?.userID) {
        console.log("👀 Refocus: reconnecting client...");
        connectAndLoad();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [isLoaded, user]);

  // ✅ Loader
  if (loading) return <ChatLoader />;

  // ✅ Main UI
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
function ChatCard({ chat }: { chat: ChatChannel }) {
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
