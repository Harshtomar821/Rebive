import { StreamChat } from "stream-chat";

// Server side instance (never exposed to client)
const apiKey = process.env.STREAM_API_KEY!;
const apiSecret = process.env.STREAM_API_SECRET!;

if (!apiKey || !apiSecret) {
  throw new Error("Missing Stream API credentials in environment variables");
}

export const serverClient = StreamChat.getInstance(apiKey, apiSecret);
