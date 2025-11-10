"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StreamChat, Channel as StreamChannel } from "stream-chat";
import { Chat, Channel, ChannelHeader, MessageList, MessageInput, Thread, Window } from "stream-chat-react";
import "stream-chat-react/dist/css/v2/index.css";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { registerStreamUser, getStreamTokenAction, getOrCreateChatChannel } from "@/actions/stream.action";
import ChatLoader from "@/components/ChatLoader";
import CallButton from "@/components/CallButton";

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY!;
let globalClient: StreamChat | null = null;

export default function ChatWithUser() {
  const params = useParams();
  const { user, isLoaded } = useUser();
  const targetUserId = params?.id as string | undefined;

  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !user || !targetUserId) return;

    let mounted = true;
    let client: StreamChat | null = null;

    const init = async () => {
      try {
        setLoading(true);

        // 1) ensure server side user + token + channel exist
        const [_, tokenRes, channelRes] = await Promise.all([registerStreamUser(), getStreamTokenAction(), getOrCreateChatChannel(targetUserId)]);
        if (!channelRes?.channelId) throw new Error("Channel creation failed");

        // 2) reuse or connect client
        client = globalClient ?? StreamChat.getInstance(STREAM_API_KEY);
        if (client.userID !== user.id) {
          await client.connectUser({ id: user.id, name: user.fullName || user.username || "User", image: user.imageUrl || "/avatar.png" }, tokenRes);
          globalClient = client;
        }

        // 3) get channel and start watching (non-blocking)
        const currChannel = client.channel("messaging", channelRes.channelId);
        setChannel(currChannel);
        setChatClient(client);

        // watch + mark read in background
        currChannel.watch().then(() => currChannel.markRead().catch(() => null)).catch(() => null);

        // small delay so UI can show quickly
        setTimeout(() => {
          if (mounted) setLoading(false);
        }, 350);
      } catch (err) {
        console.error("⚠️ Chat init error:", err);
        toast.error("Unable to load chat");
        setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      // do NOT disconnect globalClient here (we reuse it)
      // but we can stop watching channel if needed (optional)
    };
  }, [isLoaded, user, targetUserId]);

  if (loading) return <ChatLoader />;

  if (!chatClient || !channel)
    return (
      <div className="flex items-center justify-center h-[93vh] text-gray-500">Unable to load chat 😞</div>
    );

  const handleVideoCall = async () => {
    try {
      const callId = channel.id;
      const link = `${window.location.origin}/call/${callId}`;
      await channel.sendMessage({ text: `📞 **Join my video call:** [Click here to join](${link})` });
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
