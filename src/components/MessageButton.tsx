"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Loader2Icon } from "lucide-react";
import toast from "react-hot-toast";
import { toggleFollow } from "@/actions/user.action";

function MessageButton() {
    const [isLoading, setIsLoading] = useState(false);
    const handleFollow = async () => {
        toast.success("message send sucessfully");
    }
 
  return (
    <Button
      size={"sm"}
      variant={"secondary"}
      onClick={handleFollow}
      disabled={isLoading}
      className="w-20"
    >
      {isLoading ? <Loader2Icon className="size-4 animate-spin" /> : "message"}
    </Button>
  );
}
export default MessageButton;