import { LoaderIcon } from "lucide-react";

function ChatLoader() {
  return (
    <div className="h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-100">
      <LoaderIcon className="animate-spin size-10 text-indigo-600" />
      <p className="mt-4 text-center text-lg font-mono text-gray-700">
        Connecting to chat...
      </p>
      <p className="mt-2 text-green-700 font-bold font-serif tracking-wide">
        Hang on, good things take time ✨
      </p>
    </div>
  );
}

export default ChatLoader;
