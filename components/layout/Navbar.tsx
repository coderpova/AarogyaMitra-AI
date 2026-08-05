"use client";

import Link from "next/link";
import { Menu, X, HeartPulse, LogOut, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const { logout } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");

      if (token && user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    };

    checkAuth();

    window.addEventListener("auth-change", checkAuth);
    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("auth-change", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  const handleLogout = () => {
    Cookies.remove("token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    logout();
    setIsLoggedIn(false);

    window.dispatchEvent(new Event("auth-change"));
    setMenuOpen(false);
    router.replace("/");
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-lg border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <HeartPulse className="text-blue-600 w-8 h-8" />
          <span className="text-lg sm:text-xl md:text-2xl font-bold text-blue-700 dark:text-blue-400">
            AarogyaMitra AI
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-8 items-center font-medium text-gray-700 dark:text-gray-200">
          <Link href="/" className="hover:text-blue-600 transition">
            {t("nav.home")}
          </Link>
          <a href="#features" className="hover:text-blue-600 transition">
            {t("nav.features")}
          </a>
          <a href="#statistics" className="hover:text-blue-600 transition">
            {t("nav.statistics")}
          </a>
          {isLoggedIn && (
            <Link href="/dashboard" className="hover:text-blue-600 transition">
              {t("nav.dashboard")}
            </Link>
          )}
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex gap-3 items-center">
          {!isLoggedIn ? (
            <>
              <Link href="/login">
                <button className="border border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 px-5 py-2 rounded-xl transition font-semibold">
                  {t("nav.login")}
                </button>
              </Link>
              <Link href="/register">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl transition font-semibold shadow-md">
                  {t("nav.register")}
                </button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/settings">
                <button className="flex items-center gap-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 px-5 py-2 rounded-xl transition font-medium dark:text-white">
                  <Settings size={18} />
                  {t("nav.settings")}
                </button>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl transition font-semibold shadow-md"
              >
                <LogOut size={18} />
                {t("nav.logout")}
              </button>
            </>
          )}
        </div>

        {/* Mobile Button */}
        <button
          className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden p-5 flex flex-col gap-4 border-t bg-white dark:bg-gray-900 dark:text-white">
          <Link href="/" onClick={() => setMenuOpen(false)}>
            {t("nav.home")}
          </Link>
          <a href="#features" onClick={() => setMenuOpen(false)}>
            {t("nav.features")}
          </a>
          <a href="#statistics" onClick={() => setMenuOpen(false)}>
            {t("nav.statistics")}
          </a>
          {isLoggedIn && (
            <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
              {t("nav.dashboard")}
            </Link>
          )}
          {!isLoggedIn ? (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                {t("nav.login")}
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>
                {t("nav.register")}
              </Link>
            </>
          ) : (
            <>
              <Link href="/settings" onClick={() => setMenuOpen(false)}>
                {t("nav.settings")}
              </Link>
              <button
                onClick={handleLogout}
                className="text-left text-red-600 font-semibold"
              >
                {t("nav.logout")}
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}