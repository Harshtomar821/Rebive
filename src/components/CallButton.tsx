"use client";
import { VideoIcon } from "lucide-react";

export default function CallButton({ handleVideoCall }: { handleVideoCall: () => void }) {
  return (
    <div className="p-3 border-b flex items-center justify-end max-w-7xl mx-auto w-full absolute top-0 z-50">
      <button
        onClick={handleVideoCall}
        className="btn btn-success btn-sm text-white bg-green-500 p-2  flex items-center gap-1 shadow-md hover:scale-105 transition  position-sticky bottom-4 right-4"
        aria-label="Start Video Call"
      >
        <VideoIcon className="w-5 h-5" />
        <span className="hidden sm:inline">Start Call</span>
      </button>
    </div>
  );
}
