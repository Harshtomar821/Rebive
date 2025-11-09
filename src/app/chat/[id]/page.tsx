"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { StreamChat, Channel as StreamChannel } from "stream-chat";
import {
  Chat,
  Channel,
  ChannelHeader,
  MessageList,
  MessageInput,
  Thread,
  Window,
} from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import {
  registerStreamUser,
  getStreamTokenAction,
  getOrCreateChatChannel,
} from "@/actions/stream.action";
import ChatLoader from "@/components/ChatLoader";
import CallButton from "@/components/CallButton";

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

export default function ChatWithUser() {
  const params = useParams();
  const { user, isLoaded } = useUser();
  const targetUserId = params?.id as string | undefined;

  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoaded || !user || !targetUserId) return;

    let client: StreamChat | null = null;
    let isMounted = true;

    const initChat = async () => {
      try {
        setLoading(true);

        const [_, token, res] = await Promise.all([
          registerStreamUser(),
          getStreamTokenAction(),
          getOrCreateChatChannel(targetUserId),
        ]);

        if (!res?.channelId) throw new Error("Channel creation failed");

        client = StreamChat.getInstance(STREAM_API_KEY);
        if (client.userID !== user.id) {
          await client.connectUser(
            {
              id: user.id,
              name:
                user.fullName ||
                user.username ||
                user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
                "User",
              image: user.imageUrl || "/avatar.png",
            },
            token
          );
        }

        const currChannel = client.channel("messaging", res.channelId);
        setChannel(currChannel);
        setChatClient(client);

        currChannel
          .watch()
          .then(() => currChannel.markRead().catch(() => null))
          .catch(() => null);

        setTimeout(() => {
          if (isMounted) setLoading(false);
        }, 600);
      } catch (err) {
        console.error("⚠️ Chat init error:", err);
        toast.error("Unable to load chat 😞");
        setLoading(false);
      }
    };

    initChat();

    return () => {
      isMounted = false;
      if (client) client.disconnectUser().catch(() => null);
    };
  }, [isLoaded, user, targetUserId]);

  // 🔁 Scroll tracking
  useEffect(() => {
    const container = chatContainerRef.current;
    const button = buttonRef.current;

    if (!container || !button) return;

    const handleScroll = () => {
      const buttonRect = button.getBoundingClientRect();
      const navbarHeight = 70; // adjust based on your navbar height

      // When button's top reaches navbar → fade out
      if (buttonRect.top <= navbarHeight) {
        setFadeOut(true);
      } else {
        setFadeOut(false);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ Loader
  if (loading)
    return (
      <div className="flex items-center justify-center h-[93vh] text-gray-500">
        <ChatLoader />
      </div>
    );

  if (!chatClient || !channel)
    return (
      <div className="flex items-center justify-center h-[93vh] text-gray-500">
        Unable to load chat 😞
      </div>
    );

  const handleVideoCall = async () => {
    try {
      const callId = channel.id;
      const link = `${window.location.origin}/call/${callId}`;
      await channel.sendMessage({
        text: `📞 **Join my video call:** [Click here to join](${link})`,
      });
      toast.success("Video call link sent!");
    } catch (err) {
      toast.error("Failed to send video call link");
    }
  };

  return (
    <div
      ref={chatContainerRef}
      className="h-[93vh] overflow-y-auto relative bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-100 rounded-xl shadow-inner"
    >
      {/* 📞 Scrollable Call Button */}
     {/* 📞 Scrollable Call Button */}
<div
  ref={buttonRef}
  className={`sticky top-0 flex justify-end px-4 z-20 transition-all duration-500 ease-in-out ${
    fadeOut ? "opacity-0 translate-y-[-6px]" : "opacity-100 translate-y-0"
  }`}
>
  <CallButton handleVideoCall={handleVideoCall} />
</div>


      {/* 💬 Stream Chat */}
      <Chat client={chatClient}>
        <Channel channel={channel}>
          <Window>
            <ChannelHeader />
            <MessageList />
            <MessageInput focus />
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  );
}
