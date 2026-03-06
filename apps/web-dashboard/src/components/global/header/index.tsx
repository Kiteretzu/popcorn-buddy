"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Settings,
  User,
  ChevronDown,
  Search,
  Shield,
  LogOut,
  UserCircle,
  Cog,
  HelpCircle,
} from "lucide-react";
import { clearAuthCookie } from "@/lib/auth-cookie";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AdminNavbar() {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    clearAuthCookie();
    router.push("/");
  };

  // Mock data for notifications
  const notifications = [
    {
      id: 1,
      title: "New user registration",
      message: "5 new users signed up today",
      time: "2 min ago",
      unread: true,
    },
    {
      id: 2,
      title: "System update",
      message: "Security patch applied successfully",
      time: "1 hour ago",
      unread: true,
    },
    {
      id: 3,
      title: "Database backup",
      message: "Daily backup completed",
      time: "3 hours ago",
      unread: false,
    },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <nav className="bg-slate-900 border-b border-slate-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Search */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-400 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white text-xl font-bold">Admin Panel</h1>
                <p className="text-slate-400 text-xs">Control Center</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="hidden md:block">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="bg-slate-800 text-white rounded-lg pl-10 pr-4 py-2 w-64 border border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200 text-sm"
                  placeholder="Search dashboard..."
                />
              </div>
            </div>
          </div>

          {/* Right side - User, Notifications, Settings */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </Badge>
                )}
              </Button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 z-50">
                  <div className="p-4 border-b border-slate-700">
                    <h3 className="text-white font-semibold text-lg">
                      Notifications
                    </h3>
                    <p className="text-slate-400 text-sm">
                      {unreadCount} unread notifications
                    </p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border-b border-slate-700 hover:bg-slate-700/50 transition-colors cursor-pointer ${
                          notification.unread ? "bg-blue-500/5" : ""
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 ${
                              notification.unread
                                ? "bg-blue-500"
                                : "bg-slate-600"
                            }`}
                          ></div>
                          <div className="flex-1">
                            <h4 className="text-white font-medium text-sm">
                              {notification.title}
                            </h4>
                            <p className="text-slate-400 text-sm mt-1">
                              {notification.message}
                            </p>
                            <p className="text-slate-500 text-xs mt-2">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-slate-700">
                    <Button
                      variant="ghost"
                      className="w-full text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    >
                      View all notifications
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-3 h-auto px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm">
                      AU
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">Admin User</p>
                    <p className="text-xs text-slate-400">Super Admin</p>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-slate-800 border-slate-700">
                <DropdownMenuLabel className="p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                        AU
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-white font-semibold">Admin User</h3>
                      <p className="text-slate-400 text-sm">
                        admin@company.com
                      </p>
                      <Badge className="mt-1 bg-red-500/20 text-red-400 hover:bg-red-500/30">
                        Super Admin
                      </Badge>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem className="text-slate-300 hover:text-white focus:bg-slate-700 focus:text-white">
                  <UserCircle className="h-4 w-4 mr-2" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="text-slate-300 hover:text-white focus:bg-slate-700 focus:text-white">
                  <Shield className="h-4 w-4 mr-2" />
                  Security Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem
                  className="text-red-400 hover:text-red-300 focus:bg-red-500/10 focus:text-red-300"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            
          </div>
        </div>
      </div>

      {/* Overlay to close notifications dropdown when clicking outside */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        ></div>
      )}
    </nav>
  );
}
