"use client";
import Link from "next/link";
import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AIChat() {
  const bots = [
    {
      name: "Sora",
      emoji: "✨",
      desc: "Cheerful, fun, and full of energy — Sora is here to brighten your mood!",
      color: "from-pink-500 to-rose-500",
      img: "/Comatozze.jpeg",
      href: "/chat-sora",
    },
    {
      name: "Ram",
      emoji: "🕊️",
      desc: "Calm, wise, and logical — Ram will guide you with patience and clarity.",
      color: "from-blue-500 to-indigo-500",
      img: "/ram.jpg",
      href: "/chat-ram",
    },
    {
      name: "Somya",
      emoji: "💫",
      desc: "Gentle, kind, and caring — Somya is here to listen and understand you.",
      color: "from-purple-500 to-violet-500",
      img: "/somya.webp",
      href: "/chat-somya",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#F8CDDA] to-[#1D2B64] p-4">
      {/* Title Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight drop-shadow-sm">
          💫 Start a chat that fits your vibe
        </h1>
        <p className="text-gray-500 text-sm mt-2">
          Select your virtual friend and start chatting instantly
        </p>
      </div>

      {/* Bot Cards Grid */}
      <div className="grid gap-6 w-full max-w-lg sm:grid-cols-2 lg:grid-cols-3">
        {bots.map((bot, i) => (
          <Card
            key={i}
            className="bg-black/80 text-white shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all backdrop-blur-lg border border-gray-700"
          >
            <CardHeader className="flex flex-col items-center">
              <div className="avatar mb-3">
                <div className="w-24 rounded-full ring ring-offset-2 ring-offset-base-100 ring-white">
                  <img
                    src={bot.img}
                    alt={`${bot.name} Avatar`}
                    className="object-cover"
                  />
                </div>
              </div>
              <CardTitle
                className={`text-xl font-bold bg-gradient-to-r ${bot.color} bg-clip-text text-transparent`}
              >
                {bot.emoji} {bot.name}
              </CardTitle>
            </CardHeader>

            <CardContent className="text-center px-4 pb-4">
              <p className="text-gray-300 text-sm leading-relaxed">
                {bot.desc}
              </p>
            </CardContent>

            <CardFooter className="flex justify-center pb-4">
              <Link href={bot.href}>
                <Button
                  className={`bg-gradient-to-r ${bot.color} text-white px-5 py-2 rounded-lg font-medium shadow hover:opacity-90 transition-all`}
                >
                  Start Chat 💬
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
