"use client";
import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, UserPlus, Settings, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import SidebarItem from "./sidebar-item";
import { MENU_ITEMS } from "./constants";
import { clearAuthCookie } from "@/lib/auth-cookie";
import { sendFriendRequest, listFriends } from "@/lib/api";

interface FriendUser {
  id: string;
  email: string;
  name?: string | null;
}

interface StoredUser {
  id: string;
  email: string;
  name?: string | null;
}

function getInitials(name?: string | null, email?: string): string {
  if (name) return name.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

const Sidebar = () => {
  const menuItems = MENU_ITEMS();
  const pathName = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<StoredUser | null>(null);
  const [friendEmail, setFriendEmail] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [friends, setFriends] = useState<FriendUser[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore parse errors
    }
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const res = await listFriends();
      setFriends(res.data as FriendUser[]);
    } catch {
      // ignore network errors
    }
  };

  const handleAddFriend = async () => {
    if (!friendEmail.trim()) return;
    setAddingFriend(true);
    try {
      await sendFriendRequest(friendEmail.trim());
      setFriendEmail("");
      await loadFriends();
    } catch {
      // ignore
    } finally {
      setAddingFriend(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    clearAuthCookie();
    router.push("/");
  };

  const SidebarContent = (
    <div className="h-full bg-primary w-64 flex flex-col border-r border-foreground">
      {/* Nav section */}
      <div className="p-4 pt-5">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-2 px-3">
          Menu
        </p>
        <ul className="space-y-0.5">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.title}
              href={item.href}
              icon={item.icon}
              title={item.title}
              selected={pathName === item.href}
            />
          ))}
        </ul>
      </div>

      <div className="h-px bg-foreground/40 mx-4" />

      {/* Friends section */}
      <div className="p-4 flex-1 min-h-0 flex flex-col overflow-hidden">
        <p className="text-muted text-xs font-semibold uppercase tracking-widest mb-3 px-3">
          Friends
        </p>

        {/* Add friend input */}
        <div className="flex gap-2 mb-3">
          <Input
            value={friendEmail}
            onChange={(e) => setFriendEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddFriend()}
            placeholder="Add by email..."
            className="bg-primary-dark border-strong/40 text-subtle placeholder:text-muted text-xs h-8 focus-visible:ring-0 focus-visible:border-blue-tertiary"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleAddFriend}
            disabled={addingFriend || !friendEmail.trim()}
            className="h-8 w-8 shrink-0 text-muted hover:text-blue-secondary hover:bg-primary-dark"
          >
            <UserPlus className="w-4 h-4" />
          </Button>
        </div>

        {/* Friends list */}
        <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0">
          {friends.length === 0 ? (
            <p className="text-muted text-xs px-3 py-6 text-center leading-relaxed">
              No friends yet.
              <br />
              Add someone by email!
            </p>
          ) : (
            friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-primary-dark transition-colors"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="bg-blue-tertiary/20 text-blue-secondary text-xs font-semibold">
                    {getInitials(friend.name, friend.email)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-subtle text-sm truncate">
                  {friend.name ?? friend.email}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="h-px bg-foreground/40 mx-4" />

      {/* Profile section */}
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary-dark transition-colors group focus:outline-none">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-gradient-to-br from-blue-tertiary to-cyan text-white text-xs font-bold">
                  {getInitials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-subtle text-sm font-medium truncate group-hover:text-white transition-colors">
                  {user?.name ?? user?.email ?? "User"}
                </p>
                {user?.name && (
                  <p className="text-muted text-xs truncate">{user.email}</p>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-52 bg-primary-dark border-foreground"
          >
            <DropdownMenuItem
              className="text-muted hover:text-white focus:bg-primary focus:text-white gap-2 cursor-pointer"
              onClick={() => router.push("/dashboard/settings")}
            >
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-foreground/40" />
            <DropdownMenuItem
              className="text-red-primary focus:bg-red-primary/10 focus:text-red-primary gap-2 cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: hamburger fixed below the Navbar */}
      <div className="md:hidden fixed top-[64px] left-0 z-30 p-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted hover:text-white hover:bg-primary-dark border border-foreground bg-primary"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-primary border-foreground">
            {SidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: static sidebar */}
      <div className="hidden md:block h-full shrink-0">{SidebarContent}</div>
    </>
  );
};

export default Sidebar;
