"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";
import { TopBar } from "@/components/top-bar";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardLayoutProps {
  children: ReactNode;
}

function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileSidebarOpen(prev => !prev);
    } else {
      setSidebarExpanded(prev => !prev);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar 
        expanded={sidebarExpanded} 
        toggleSidebar={toggleSidebar}
        isMobile={isMobile}
        isOpen={mobileSidebarOpen}
        onOpenChange={setMobileSidebarOpen}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar onMenuClick={toggleSidebar} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;
