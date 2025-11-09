"use client";
import Link from "next/link";
import React from "react";

export default function Ram() {
  return (
    <div className="w-full flex justify-center py-4">
      <div className="bg-black shadow-lg w-full max-w-2xl rounded-2xl overflow-hidden flex">
        {/* Left Side Image */}
        <div className="w-1/3 h-auto">
          <img
            src="/raam.webp"
            alt="Ram AI Assistant"
            className="object-cover w-full h-full aspect-[3/4]"
          />
        </div>

        {/* Right Side Content */}
        <div className="flex flex-col justify-center w-2/3 p-4">
          <h2 className="text-blue-400 text-2xl font-bold mb-2">
            Talk with Ram 🕊️
          </h2>
          <p className="text-gray-300 text-sm leading-snug mb-4">
            Calm, wise, and logical — Ram is here to guide you.<br />
            Click below to start your chat.
          </p>

          <div className="flex justify-end">
            <Link
              href="/chat-ram"
              className="px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-all"
            >
              Start Chat 💬
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
