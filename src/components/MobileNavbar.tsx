"use client";

import {
  BellIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
  MessageCircleIcon,
  BotIcon,
  UserPlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, useEffect, useTransition } from "react";
import {
  useAuth,
  useUser,
  SignInButton,
  SignOutButton,
} from "@clerk/nextjs";
import { useTheme } from "next-themes";
import Link from "next/link";
import { chatNotify } from "@/actions/stream.action";
import { useRouter } from "next/navigation"; // 👈 Added

function MobileNavbar() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter(); // 👈 Added router

  // 🔁 Fetch unread message count every 10s
  useEffect(() => {
    let active = true;

    async function fetchUnread() {
      startTransition(async () => {
        try {
          const { totalUnread } = await chatNotify();
          if (active && typeof totalUnread === "number") {
            setUnreadCount(totalUnread);
          }
        } catch (err) {
          console.error("❌ Unread fetch error:", err);
        }
      });
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // 👇 This will handle navigation and close sidebar
  const handleNavigate = (path: string) => {
    setShowMobileMenu(false); // close sidebar
    router.push(path); // navigate
  };

  return (
    <div className="flex md:hidden items-center space-x-2 relative">
      {/* 🌙 Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <SunIcon className="h-5 w-5 rotate-0 dark:-rotate-90 transition-all" />
        <MoonIcon className="absolute h-5 w-5 rotate-90 dark:rotate-0 transition-all" />
      </Button>

      {/* 📱 Mobile Menu */}
      <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <MenuIcon className="h-5 w-5" />
          </Button>
        </SheetTrigger>

        <SheetContent side="right" className="w-[300px]">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col space-y-4 mt-6">
            {/* 🏠 Home */}
            <Button variant="ghost" onClick={() => handleNavigate("/")}>
              <HomeIcon className="w-4 h-4" />
              Home
            </Button>

            {/* 🤖 AI Chat */}
            <Button
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center gap-3"
              onClick={() => handleNavigate("/ai-chat")}
            >
              <BotIcon className="w-4 h-4" />
              Chat with AI
            </Button>

            {isSignedIn ? (
              <>
                {/* 💬 Chat with friends */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 text-pink-600 font-semibold pl-9"
                    onClick={() => handleNavigate("/chat")}
                  >
                    <MessageCircleIcon className="w-4 h-4 " />
                      Chat with friends
                  </Button>

                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-4 bg-red-500 text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>

                {/* 🧑‍🤝‍🧑 Follow */}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-pink-600 font-semibold border-pink-600 hover:bg-indigo-50 dark:hover:bg-indigo-900 dark:text-pink-300 transition-all"
                  onClick={() => handleNavigate("/follow")}
                >
                  <UserPlusIcon className="w-4 h-4" />
                  Follow Users
                </Button>

                {/* 🔔 Notifications */}
                <Button
                  variant="ghost"
                  onClick={() => handleNavigate("/notifications")}
                >
                  <BellIcon className="w-4 h-4" />
                  Notifications
                </Button>

                {/* 👤 Profile */}
                <Button
                  variant="ghost"
                  onClick={() =>
                    handleNavigate(
                      `/profile/${
                        user?.username ??
                        user?.primaryEmailAddress?.emailAddress.split("@")[0]
                      }`
                    )
                  }
                >
                  <UserIcon className="w-4 h-4" />
                  Profile
                </Button>

                {/* 🚪 Logout */}
                <SignOutButton>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-3 text-red-600"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    Logout
                  </Button>
                </SignOutButton>
              </>
            ) : (
              <SignInButton mode="modal">
                <Button variant="default" className="w-full">
                  Sign in & Unlock Features
                </Button>
              </SignInButton>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default MobileNavbar;
