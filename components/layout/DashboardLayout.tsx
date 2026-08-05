"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { Menu, HeartPulse } from "lucide-react";

export default function DashboardLayout({
  children,
  hideFooter = false,
}: {
  children: React.ReactNode;
  hideFooter?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex transition-colors duration-300">
      <Sidebar open={open} setOpen={setOpen} />

      <div className="flex-1 flex flex-col min-w-0 text-gray-900 dark:text-white">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-xl text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <HeartPulse size={22} className="text-blue-600" />
            <h1 className="text-lg font-bold text-blue-700 dark:text-blue-400">
              AarogyaMitra AI
            </h1>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 page-animation">{children}</main>

        {!hideFooter && <Footer variant="minimal" />}
      </div>
    </div>
  );
}
