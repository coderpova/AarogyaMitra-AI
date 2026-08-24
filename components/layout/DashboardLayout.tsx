"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (typeof document !== "undefined") {
      if (open) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.overflow = "";
      }
    };
  }, [open]);

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-gray-950 flex flex-col md:flex-row transition-colors duration-300">
      <Sidebar open={open} setOpen={setOpen} />

      <div className="flex-1 flex flex-col min-w-0 text-slate-900 dark:text-white md:ml-72 min-h-screen bg-slate-50 dark:bg-gray-950">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-slate-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-3">
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
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 min-w-0 page-animation">{children}</main>

        {!hideFooter && <Footer variant="minimal" />}
      </div>
    </div>
  );
}
