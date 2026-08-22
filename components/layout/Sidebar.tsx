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
  Bell,
  Trash2,
  AlertTriangle,
  Shield,
  MessageSquare,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";

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
  const { notifications, markAsRead, clearAll } = useNotification();
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
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
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden overlay-animation"
          onClick={() => setOpen?.(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed z-50 top-0 left-0
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
                <p className="text-blue-200 text-xs">{t("navExt.aiHealthcare")}</p>
              </div>
            </div>

            {/* Notification Bell Dropdown */}
            <div className="relative shrink-0 flex items-center gap-1">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className={`relative p-2 rounded-xl transition-all duration-200 ${
                  notifOpen ? "bg-white/20 text-white" : "hover:bg-white/10 text-blue-100"
                }`}
                aria-label="Toggle notifications"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-blue-700 animate-pulse" />
                )}
              </button>
              
              {open && setOpen && (
                <button
                  onClick={() => setOpen(false)}
                  className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors text-blue-100"
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              )}
            </div>
          </div>

          {/* Absolute floating panel for notifications list dropdown */}
          {notifOpen && (
            <div className="absolute left-4 right-4 mt-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 p-4 z-50 space-y-3 text-xs modal-animation max-w-sm">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-800">
                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">Notifications</span>
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      clearAll();
                      setNotifOpen(false);
                    }}
                    className="text-red-600 dark:text-red-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Clear all
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 sidebar-scroll">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 dark:text-gray-600">
                    <Bell className="mx-auto mb-2 text-gray-300 dark:text-gray-700" size={32} />
                    <p className="font-semibold text-xs">No notifications yet</p>
                    <p className="text-[10px] mt-0.5">Your reminders and alerts will appear here.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={`p-2.5 rounded-2xl transition cursor-pointer flex gap-2.5 items-start ${
                        n.read
                          ? "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                          : "bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/40 border-l-2 border-blue-500"
                      }`}
                    >
                      <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 shrink-0 mt-0.5">
                        {n.category === "medication" ? (
                          <Pill size={12} className="text-blue-600" />
                        ) : n.category === "appointment" ? (
                          <Calendar size={12} className="text-purple-600" />
                        ) : n.category === "emergency" ? (
                          <AlertTriangle size={12} className="text-red-600 animate-pulse" />
                        ) : n.category === "message" ? (
                          <MessageSquare size={12} className="text-teal-600" />
                        ) : n.category === "security" ? (
                          <Shield size={12} className="text-amber-600" />
                        ) : (
                          <Bell size={12} className="text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <p className={`font-semibold truncate ${n.read ? "text-gray-700 dark:text-gray-300" : "text-gray-900 dark:text-white"}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-gray-400 shrink-0">{n.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {n.text}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <Link
                  href="/settings"
                  onClick={() => setNotifOpen(false)}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                >
                  Notification settings &rarr;
                </Link>
              </div>
            </div>
          )}
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
