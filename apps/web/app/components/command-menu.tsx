"use client";

import {
  CreditCard,
  FileText,
  Gauge,
  HelpCircle,
  History,
  Home,
  Landmark,
  PieChart,
  Repeat,
  Search,
  Smartphone,
  Tag,
  User
} from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
          {t("commandMenu.trigger")}
        </span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("commandMenu.placeholder")} />
        <CommandList>
          <CommandEmpty>{t("commandMenu.noResults")}</CommandEmpty>
          <CommandGroup heading={t("commandMenu.groupActions")}>
            <CommandItem onSelect={() => runCommand(() => navigate("/transactions?new=1"))}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>{t("commandMenu.addTransaction")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/quick-add"))}>
              <Smartphone className="mr-2 h-4 w-4" />
              <span>{t("commandMenu.quickAdd")}</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t("commandMenu.groupNavigation")}>
            <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
              <Home className="mr-2 h-4 w-4" />
              <span>{t("nav.dashboard")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/categories"))}>
              <Tag className="mr-2 h-4 w-4" />
              <span>{t("nav.categories")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/budgets"))}>
              <PieChart className="mr-2 h-4 w-4" />
              <span>{t("nav.budgets")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/accounts"))}>
              <Landmark className="mr-2 h-4 w-4" />
              <span>{t("nav.accounts")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/transactions"))}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>{t("nav.transactions")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/reports"))}>
              <Gauge className="mr-2 h-4 w-4" />
              <span>{t("nav.reports")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/rules"))}>
              <Repeat className="mr-2 h-4 w-4" />
              <span>{t("nav.rules")}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate("/audit-log"))}>
              <History className="mr-2 h-4 w-4" />
              <span>{t("nav.auditLog")}</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t("commandMenu.groupSettings")}>
            <CommandItem
              onSelect={() => runCommand(() => navigate("/settings"))}
            >
              <User className="mr-2 h-4 w-4" />
              <span>{t("commandMenu.general")}</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading={t("commandMenu.groupResources")}>
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
              <span>{t("commandMenu.documentation")}</span>
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
              <span>{t("commandMenu.reportIssue")}</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
