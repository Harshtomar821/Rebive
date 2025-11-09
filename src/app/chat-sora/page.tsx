"use client";
import { useState, useRef, useEffect } from "react";
import { getGeminiReply } from "@/actions/gemini.action";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";

export default function ChatSora() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hey there! 💖 I’m Sora — your cheerful AI friend! Let’s chat ✨" },
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

    const reply = await getGeminiReply("sora", input);
    setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    setIsTyping(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-[#F8CDDA] to-[#1D2B64] ">
      <Card className="w-full max-w-2xl shadow-2xl rounded-3xl border-pink-500 ">
        <CardHeader className="border-b border-black">

             <div className="flex justify-center mt-2">
            <img
              src="/Comatozze.jpeg"
              alt="Somya AI Avatar"
              className="w-20 h-20 rounded-full border-2 border-purple-300 shadow-md object-cover"
            />
          </div>
          <CardTitle className="text-center text-pink-600 text-2xl font-bold font-sans">
            💖 Chat with Sora
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4">
          <ScrollArea className="h-[400px] pr-2">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex mb-3 ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl max-w-[75%] text-sm ${
                    m.role === "user"
                      ? "bg-pink-600 text-white rounded-br-none"
                      : "bg-white border border-pink-100 text-gray-700 rounded-bl-none"
                  }`}
                >
                  {m.text}
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <p className="text-gray-500 italic text-xs pl-1">Sora is typing...</p>
            )}
            <div ref={chatEndRef} />
          </ScrollArea>
        </CardContent>

        <CardFooter className="border-t border-pink-100 p-4 flex gap-2">
          <Input
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 focus:ring-pink-300"
          />
          <Button
            onClick={sendMessage}
            className="bg-pink-600 hover:bg-blue-600 text-white"
          >
            Send
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
