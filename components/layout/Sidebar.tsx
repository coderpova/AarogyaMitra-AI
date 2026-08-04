"use client";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import Cookies from "js-cookie";
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

const menuItems = [
  {
    title: "Home",
    href: "/",
    icon: Home,
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "AI Chat",
    href: "/chat",
    icon: MessageCircle,
  },
  {
    title: "Report Scanner",
    href: "/report-analyzer",
    icon: FileSearch,
  },
  {
    title: "Hospitals",
    href: "/hospital",
    icon: Hospital,
  },
  {
    title: "Medicines",
    href: "/medicines",
    icon: Pill,
  },
  {
    title: "Appointments",
    href: "/appointments",
    icon: Calendar,
  },
  {
    title: "Schemes",
    href: "/schemes",
    icon: FileText,
  },
  {
    title: "Profile",
    href: "/profile",
    icon: User,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

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

  useEffect(() => {
    setMounted(true);
  }, []);

  const logout = () => {
    Cookies.remove("token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth-change"));
    window.dispatchEvent(new Event("storage"));
    toast.success("Logged Out");
    router.push("/login");
    router.refresh();
  };

  return (

    <aside
      className={`
      fixed
      md:static
      z-50
      top-0
      left-0
      h-screen
      w-72
      bg-blue-700
      dark:bg-gray-950
      text-white
      p-6
      shadow-xl
      transform
      transition-transform
      duration-300

      ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
    >

      {/* Mobile Close */}

      <div className="md:hidden flex justify-end mb-4">

        <button
          onClick={() => setOpen?.(false)}
          className="
          p-2
          rounded-lg
          hover:bg-blue-600
          dark:hover:bg-gray-800
          "
        >

          <X size={25} />

        </button>

      </div>

      {/* Logo */}

      <div className="flex items-center gap-3 mb-10">

        <div
          className="
          bg-white/20
          p-2
          rounded-xl
          "
        >

          <HeartPulse size={34} />

        </div>

        <h1 className="text-2xl font-bold">

          AarogyaMitra AI

        </h1>

      </div>

      {/* Navigation */}

      <nav className="space-y-3">

        {menuItems.map((item) => {

          const Icon = item.icon;

          const active = pathname === item.href;

          return (

            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen?.(false)}
              className={`
              flex
              items-center
              gap-4
              rounded-xl
              px-4
              py-3
              transition-all

              ${
                active
                  ? "bg-white text-blue-700 font-semibold shadow-md"
                  : "hover:bg-blue-600 dark:hover:bg-gray-800"
              }
              `}
            >

              <Icon size={22} />

              {item.title}

            </Link>

          );

        })}

      </nav>
            {/* Theme Button */}

      {mounted && (

        <button
          onClick={() => {

            setTheme(theme === "dark" ? "light" : "dark");

          }}
          className="
          mt-8
          w-full
          flex
          items-center
          gap-4
          px-4
          py-3
          rounded-xl
          bg-white/10
          hover:bg-white/20
          transition
          "
        >

          {theme === "dark"
            ? <Sun size={22}/>
            : <Moon size={22}/>
          }

          {theme === "dark"
            ? "Light Mode"
            : "Dark Mode"
          }

        </button>

      )}

      {/* Logout Button */}

      <button

        onClick={logout}

        className="
        mt-4
        w-full
        flex
        items-center
        gap-4
        px-4
        py-3
        rounded-xl
        bg-red-600
        hover:bg-red-700
        transition
        "

      >

        <LogOut size={22} />

        Logout

      </button>

    </aside>

  );

}