"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Moon,
  Sun,
  Bell,
  Globe,
  Shield,
  LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    Cookies.remove("token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    logout();
    window.dispatchEvent(new Event("auth-change"));
    toast.success("Logged Out Successfully");
    router.push("/login");
  };

  return (
    <DashboardLayout>
      <div className="page-animation">
        {/* Header */}
        <div className="bg-blue-700 text-white rounded-3xl p-8 shadow-lg">
          <h1 className="text-4xl font-bold">Settings ⚙️</h1>
          <p className="text-blue-100 mt-2">
            Manage your application preferences and account settings.
          </p>
        </div>

        {/* Settings Container */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg mt-8 p-8 space-y-6 border border-gray-100 dark:border-gray-800">
          <SettingCard
            icon={theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
            title="Appearance Mode"
            description={`Currently using ${theme === "dark" ? "Dark" : "Light"} theme`}
            actionLabel={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            onAction={() => setTheme(theme === "dark" ? "light" : "dark")}
          />

          <SettingCard
            icon={<Bell size={24} />}
            title="Notifications & Alerts"
            description="Manage medicine reminders and email notifications"
            actionLabel="Configure"
            onAction={() => toast.success("Notifications configured!")}
          />

          <SettingCard
            icon={<Globe size={24} />}
            title="Language Preferences"
            description="Supported: Hindi / English / Regional Indian languages"
            actionLabel="Active (Hindi/English)"
            onAction={() => toast.success("AI automatic language detection active")}
          />

          <SettingCard
            icon={<Shield size={24} />}
            title="Privacy & Data Protection"
            description="Manage your health records and data privacy controls"
            actionLabel="Protected"
            onAction={() => toast.success("Health records are encrypted and protected")}
          />

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl transition hover:scale-105 shadow-md font-semibold"
            >
              <LogOut size={20} />
              Logout Account
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SettingCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between border border-gray-200 dark:border-gray-800 rounded-2xl p-5 gap-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <div className="flex items-center gap-4">
        <div className="text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 p-3 rounded-xl">
          {icon}
        </div>

        <div>
          <h3 className="font-bold text-lg dark:text-white">{title}</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{description}</p>
        </div>
      </div>

      <button
        onClick={onAction}
        className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition font-medium text-sm self-start sm:self-center"
      >
        {actionLabel}
      </button>
    </div>
  );
}