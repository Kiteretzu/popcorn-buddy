"use client";
import React from "react";
import { Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Navbar() {
  return (
    <nav className="bg-primary border-b border-foreground h-16 flex items-center px-6 gap-4 shrink-0 z-20">
      {/* Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-secondary to-red-quaternary flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-sm select-none">PB</span>
        </div>
        <span className="text-white font-bold text-lg tracking-tight hidden sm:block">
          Popcorn Buddies
        </span>
      </div>

      {/* Search */}
      <div className="flex-1 max-w-md relative mx-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        <Input
          type="text"
          placeholder="Search movies..."
          className="pl-9 bg-primary-dark border-strong/40 text-subtle placeholder:text-muted focus-visible:ring-0 focus-visible:border-blue-tertiary w-full"
        />
      </div>

      {/* CREATE WATCH PARTY */}
      <div className="ml-auto shrink-0">
        <Button className="bg-blue-tertiary hover:bg-blue-secondary text-white font-semibold gap-2 shadow transition-colors">
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Create Watch Party</span>
          <span className="sm:hidden">Watch Party</span>
        </Button>
      </div>
    </nav>
  );
}
