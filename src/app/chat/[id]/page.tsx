"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!isLoaded || !user || !targetUserId) return;

    let client: StreamChat | null = null;
    let isMounted = true;

    const initChat = async () => {
      try {
        setLoading(true);

        // ✅ Run Stream setup calls in parallel
        const [_, token, res] = await Promise.all([
          registerStreamUser(),
          getStreamTokenAction(),
          getOrCreateChatChannel(targetUserId),
        ]);

        if (!res?.channelId) throw new Error("Channel creation failed");

        // ✅ Reuse client if already exists
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

        // ✅ Use existing channel or create new one
        const currChannel = client.channel("messaging", res.channelId);

        // Fast resolve: load UI while watching happens in background
        setChannel(currChannel);
        setChatClient(client);

        // Background loading (non-blocking)
        currChannel
          .watch()
          .then(() => currChannel.markRead().catch(() => null))
          .catch(() => null);

        // Fallback timeout — never stuck on loader
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

  // ✅ Show fallback only if really needed
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

  // ✅ Video Call
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
    <div className="h-[93vh] relative bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-100 rounded-xl shadow-inner">
      <CallButton handleVideoCall={handleVideoCall} />

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
