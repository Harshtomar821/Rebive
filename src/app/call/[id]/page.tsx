"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  StreamVideoClient,
  StreamCall,
  StreamVideo,
  StreamTheme,
  SpeakerLayout,
  CallControls,
  CallingState,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { useUser } from "@clerk/nextjs";
import {
  registerStreamUser,
  getStreamTokenAction,
} from "@/actions/stream.action";
import toast from "react-hot-toast";
import ChatLoader from "@/components/ChatLoader";

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY!;

export default function CallPage() {
  const { id } = useParams();
  const callId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  const initializedRef = useRef(false);

  // ✅ Leave Call
  const handleLeaveCall = useCallback(async () => {
    if (isLeaving) return;
    setIsLeaving(true);

    try {
      if (call && call.state.callingState !== CallingState.LEFT) {
        await call.leave().catch(() => null);
      }
      if (client) {
        await client.disconnectUser().catch(() => null);
      }
      toast.success(" Call ended");
      router.push("/chat");
    } catch (err) {
      console.error("⚠️ Error leaving call:", err);
      router.push("/chat");
    } finally {
      setIsLeaving(false);
    }
  }, [call, client, router, isLeaving]);

  // ✅ Initialize Call
  useEffect(() => {
    if (initializedRef.current || !isLoaded || !user || !callId) return;
    initializedRef.current = true;

    let videoClient: StreamVideoClient | null = null;
    let isMounted = true;

    const setupVideoCall = async () => {
      try {
        // ✅ Register user once
        const reg = await registerStreamUser();
        if (!reg?.success) throw new Error("Stream registration failed");

        // ✅ Get token
        const token = await getStreamTokenAction();
        if (!token) throw new Error("Stream token missing");

        // ✅ Connect Stream video client
        videoClient = new StreamVideoClient({
          apiKey: STREAM_API_KEY,
          user: {
            id: user.id,
            name:
              user.fullName ||
              user.username ||
              user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
              "User",
            image: user.imageUrl || "/avatar.png",
          },
          token,
        });

        const callInstance = videoClient.call("default", callId);

        // ✅ Join safely with retry
        let joined = false;
        for (let i = 0; i < 3; i++) {
          try {
            await callInstance.join({ create: true });
            joined = true;
            break;
          } catch {
            console.warn("Retrying join...");
            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        if (!joined) throw new Error("Failed to join call after retries");

        if (!isMounted) return;
        setClient(videoClient);
        setCall(callInstance);
        setLoading(false);
        console.log("✅ Joined Stream Video Call:", callId);
      } catch (err) {
        console.error("❌ Call init failed:", err);
        toast.error("Unable to join call 😞");
        router.push("/chat");
      }
    };

    setupVideoCall();

    // ✅ Cleanup only when component unmounts
    return () => {
      isMounted = false;
      (async () => {
        try {
          if (call && call.state.callingState !== CallingState.LEFT) {
            await call.leave().catch(() => null);
          }
          if (videoClient) await videoClient.disconnectUser().catch(() => null);
        } catch (e) {
          console.warn("Cleanup error:", e);
        }
      })();
    };
  }, [isLoaded, user, callId, router]);

  // ⏳ Loading
  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        <ChatLoader />
      </div>
    );

  // ❌ Fallback
  if (!client || !call)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Unable to load video call 😞
      </div>
    );

  // 🎥 Live Call UI
  return (
    <div className="h-screen w-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center">
      <StreamVideo client={client}>
        <StreamCall call={call}>
          <StreamTheme>
            <div className="relative w-full h-screen flex flex-col items-center justify-center">
              <SpeakerLayout />
              <div className="absolute bottom-6 flex justify-center w-full">
                <CallControls onLeave={handleLeaveCall} />
              </div>
            </div>
          </StreamTheme>
        </StreamCall>
      </StreamVideo>
    </div>
  );
}
