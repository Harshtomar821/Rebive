"use client";

import {
  BellIcon,
  HomeIcon,
  UserIcon,
  MessageCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SignInButton, useUser, UserButton } from "@clerk/nextjs";
import ModeToggle from "./ModeToggle";
import { useEffect, useState } from "react";
import { getStreamTokenAction } from "@/actions/stream.action";
import { useRouter, usePathname } from "next/navigation";
import { StreamChat } from "stream-chat";

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

function DesktopNavbar() {
  const { user, isLoaded } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const [client, setClient] = useState<StreamChat | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // ✅ SETUP STREAM CLIENT & UNREAD LISTENER
  useEffect(() => {
    if (!isLoaded || !user) return;

    let streamClient: StreamChat | null = null;
    let interval: NodeJS.Timeout;
    let isConnected = false; // Guard flag

    const setupStream = async () => {
      try {
        const token = await getStreamTokenAction();

        streamClient = StreamChat.getInstance(STREAM_API_KEY);

        await streamClient.connectUser(
          {
            id: user.id,
            name: user.fullName || user.username || "User",
            image: user.imageUrl || "/avatar.png",
          },
          token
        );

        isConnected = true;
        setClient(streamClient);

        // 🔹 Fetch unread chats safely
        const updateUnread = async () => {
          if (!streamClient || !isConnected) return;
          try {
            const channels = await streamClient.queryChannels(
              { type: "messaging", members: { $in: [user.id] } },
              { last_message_at: -1 },
              { limit: 50 }
            );

            const unreadChats = channels.filter(
              (ch) => ch.countUnread() > 0
            ).length;

            setUnreadCount(unreadChats);
          } catch (err) {
            // Ignore Stream SDK reconnect warnings
            if (
              (err as Error).message.includes(
                "Both secret and user tokens are not set"
              )
            )
              return;
            console.error("⚠️ updateUnread error:", err);
          }
        };

        // Initial fetch + periodic + real-time
        await updateUnread();
        interval = setInterval(updateUnread, 10000);

        streamClient.on("message.new", updateUnread);
        streamClient.on("message.read", updateUnread);
        streamClient.on("notification.mark_read", updateUnread);
        streamClient.on("connection.recovered", updateUnread);
      } catch (error) {
        console.error("❌ Stream setup error:", error);
      }
    };

    setupStream();

    // 🧹 Cleanup
    return () => {
      isConnected = false;
      if (interval) clearInterval(interval);
      if (streamClient) {
        streamClient.disconnectUser().catch(() => null);
      }
    };
  }, [isLoaded, user]);

  // ✅ MARK CHAT AS READ WHEN USER OPENS A CHAT PAGE
  useEffect(() => {
    if (!client || !user) return;

    const isChatPage = pathname.startsWith("/chat/");
    if (!isChatPage) return;

    const markChannelAsRead = async () => {
      try {
        const channelId = pathname.split("/chat/")[1];
        if (!channelId || !client) return;

        const channel = client.channel("messaging", channelId);
        await channel.watch();
        await channel.markRead();

        // Refresh unread count
        const channels = await client.queryChannels(
          { type: "messaging", members: { $in: [user.id] } },
          { last_message_at: -1 },
          { limit: 50 }
        );

        const unreadChats = channels.filter(
          (ch) => ch.countUnread() > 0
        ).length;

        setUnreadCount(unreadChats);
      } catch (err) {
        console.error("⚠️ Error marking chat as read:", err);
      }
    };

    markChannelAsRead();
  }, [pathname, client, user]);

  // ✅ NAVBAR UI
  return (
    <div className="hidden md:flex items-center space-x-4 relative">
      {/* 🌙 Theme Toggle */}
      <ModeToggle />

      {/* 🏠 Home */}
      <Button variant="ghost" asChild onClick={() => router.push("/")}>
        <Link href="/" className="flex items-center gap-2">
          <HomeIcon className="w-4 h-4" />
          <span className="hidden lg:inline">Home</span>
        </Link>
      </Button>

      {user ? (
        <>
          {/* 🔔 Notifications */}
          <Button
            variant="ghost"
            asChild
            onClick={() => router.push("/notifications")}
          >
            <Link href="/notifications" className="flex items-center gap-2">
              <BellIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Notifications</span>
            </Link>
          </Button>

          {/* 💬 Chat Button with Red Unread Badge */}
          <div className="relative">
            <Button
              variant="ghost"
              asChild
              onClick={() => router.push("/chat")}
            >
              <Link
                href="/chat"
                className="flex items-center gap-2 text-pink-600 hover:text-blue-700 font-semibold"
              >
                <MessageCircleIcon className="w-4 h-4" />
                <span className="hidden lg:inline">Messages</span>
              </Link>
            </Button>

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>

          {/* 👤 Profile */}
          <Button
            variant="ghost"
            asChild
            onClick={() =>
              router.push(
                `/profile/${
                  user.username ??
                  user.primaryEmailAddress?.emailAddress.split("@")[0]
                }`
              )
            }
          >
            <Link
              href={`/profile/${
                user.username ??
                user.primaryEmailAddress?.emailAddress.split("@")[0]
              }`}
              className="flex items-center gap-2"
            >
              <UserIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Profile</span>
            </Link>
          </Button>

          <UserButton />
        </>
      ) : (
        <SignInButton mode="modal">
          <Button variant="default">Sign In</Button>
        </SignInButton>
      )}
    </div>
  );
}

export default DesktopNavbar;
