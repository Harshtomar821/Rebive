"use client";
import Link from "next/link";
import React from "react";

export default function Sora() {
  return (
    <div className="w-full flex justify-center py-4">
      <div className="card card-side bg-black shadow-lg w-full max-w-2xl rounded-2xl overflow-hidden">
        <figure className="w-1/3">
          <img
            src="/Comatozze.jpeg"
            alt="Sora AI Assistant"
            className="object-cover h-full w-full"
          />
        </figure>

        <div className="card-body w-2/3 p-4">
          <h2 className="card-title text-pink-400 text-2xl font-bold">
            Talk with Sora ✨
          </h2>
          <p className="text-gray-300 text-sm leading-snug">
            Cheerful, fun, and full of energy — Sora is here to brighten your mood!  
            Click below to start your chat.
          </p>
          <div className="card-actions justify-end mt-4">
            <Link
              href="/chat-sora"
              className="btn btn-primary px-5 py-2 bg-pink-600 text-white hover:bg-pink-700 rounded-md transition-all"
            >
              Start Chat 💬
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
