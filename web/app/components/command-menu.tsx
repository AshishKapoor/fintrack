"use client";

import {
  FileText,
  HelpCircle,
  Home,
  Search,
  User,
  Users
} from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router-dom";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 relative w-full justify-start text-muted-foreground sm:pr-12 md:w-40 lg:w-64"
      >
        <span className="inline-flex">
          <Search className="mr-2 h-4 w-4" />
          Search...
        </span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
              <Home className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
              {/* <CommandShortcut>⌘D</CommandShortcut> */}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/categories"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Categories</span>
              {/* <CommandShortcut>⌘U</CommandShortcut> */}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/budgets"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Budgets</span>
              {/* <CommandShortcut>⌘U</CommandShortcut> */}
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/transactions"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Transactions</span>
              {/* <CommandShortcut>⌘U</CommandShortcut> */}
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem
              onSelect={() => runCommand(() => navigate("/settings"))}
            >
              <User className="mr-2 h-4 w-4" />
              <span>General</span>
              {/* <CommandShortcut>⌘S</CommandShortcut> */}
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Resources">
            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  window.open(
                    "https://github.com/AshishKapoor/fintrack#readme",
                    "_blank",
                    "noopener,noreferrer"
                  )
                )
              }
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>Documentation</span>
            </CommandItem>
            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  window.open(
                    "https://github.com/AshishKapoor/fintrack/issues",
                    "_blank",
                    "noopener,noreferrer"
                  )
                )
              }
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Report an Issue</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
