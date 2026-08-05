"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  MessageCircle,
  Hospital,
  FileText,
  FileSearch,
  User,
  Settings,
  HeartPulse,
  Pill,
  Calendar,
  Moon,
  Sun,
  X,
  LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

export default function Sidebar({
  open,
  setOpen,
}: {
  open?: boolean;
  setOpen?: (value: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();
  const { logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { titleKey: "nav.home", href: "/", icon: Home },
    { titleKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
    { titleKey: "nav.aiChat", href: "/chat", icon: MessageCircle },
    { titleKey: "nav.reportScanner", href: "/report-analyzer", icon: FileSearch },
    { titleKey: "nav.hospitals", href: "/hospital", icon: Hospital },
    { titleKey: "nav.medicines", href: "/medicines", icon: Pill },
    { titleKey: "nav.appointments", href: "/appointments", icon: Calendar },
    { titleKey: "nav.schemes", href: "/schemes", icon: FileText },
    { titleKey: "nav.profile", href: "/profile", icon: User },
    { titleKey: "nav.settings", href: "/settings", icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    toast.success(t("auth.logoutSuccess"));
    router.push("/login");
    router.refresh();
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setOpen?.(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed md:static z-50 top-0 left-0
          h-screen w-72
          bg-gradient-to-b from-blue-700 to-blue-800
          dark:from-gray-950 dark:to-gray-900
          text-white shadow-2xl
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="p-5 pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <HeartPulse size={28} />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">AarogyaMitra</h1>
                <p className="text-blue-200 text-xs">AI Healthcare</p>
              </div>
            </div>
            <button
              onClick={() => setOpen?.(false)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close menu"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1 sidebar-scroll">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen?.(false)}
                className={`
                  flex items-center gap-3 rounded-xl px-4 py-3
                  transition-all duration-200
                  ${
                    active
                      ? "bg-white text-blue-700 font-semibold shadow-md scale-[1.02]"
                      : "hover:bg-white/15 active:scale-[0.98]"
                  }
                `}
              >
                <Icon size={20} className={active ? "text-blue-700" : ""} />
                <span className="text-sm">{t(item.titleKey)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-white/10 space-y-2 shrink-0">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 text-sm font-medium"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              {theme === "dark" ? t("nav.lightMode") : t("nav.darkMode")}
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/90 hover:bg-red-600 transition-all duration-200 text-sm font-medium"
          >
            <LogOut size={20} />
            {t("nav.logout")}
          </button>
        </div>
      </aside>
    </>
  );
}
