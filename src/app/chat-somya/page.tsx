"use client";
import { useEffect, useRef, useState } from "react";
import { getGeminiReply } from "@/actions/gemini.action";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ChatSomya() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hey there 💫 I’m Somya — I’m here to listen and understand you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const reply = await getGeminiReply("somya", input);
    setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    setIsTyping(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-violet-100 to-indigo-100 p-4">
      <Card className="w-full max-w-2xl shadow-2xl rounded-3xl border-purple-200">
        <CardHeader className="flex flex-col items-center border-b border-purple-100">
          {/* Avatar Image */}
          <div className="flex justify-center mt-2">
            <img
              src="/somya.webp"
              alt="Somya AI Avatar"
              className="w-20 h-20 rounded-full border-2 border-purple-300 shadow-md object-cover"
            />
          </div>

          {/* Title */}
          <CardTitle className="text-center text-purple-700 text-2xl font-bold mt-3">
            💬 Chat with Somya
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4">
          <ScrollArea className="h-[400px] pr-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex mb-3 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl max-w-[75%] text-sm ${
                    m.role === "user"
                      ? "bg-purple-600 text-white rounded-br-none"
                      : "bg-white border border-purple-100 text-gray-800 rounded-bl-none"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <p className="text-gray-500 italic text-xs pl-1">
                Somya is typing...
              </p>
            )}
            <div ref={chatEndRef} />
          </ScrollArea>
        </CardContent>

        <CardFooter className="border-t border-purple-100 p-4 flex gap-2">
          <Input
            placeholder="Talk to Somya..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 focus:ring-purple-300"
          />
          <Button
            onClick={sendMessage}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Send
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
