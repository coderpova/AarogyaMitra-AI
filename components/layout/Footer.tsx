"use client";

import Link from "next/link";
import { HeartPulse, Mail, Code2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function Footer({ variant = "default" }: { variant?: "default" | "minimal" }) {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  const quickLinks = [
    { label: t("nav.dashboard"), href: "/dashboard" },
    { label: t("nav.aiChat"), href: "/chat" },
    { label: t("nav.hospitals"), href: "/hospital" },
    { label: t("nav.schemes"), href: "/schemes" },
  ];

  const supportLinks = [
    { label: t("footer.privacy"), href: "/settings" },
    { label: t("footer.contact"), href: "mailto:support@aarogyamitra.ai" },
    { label: t("footer.help"), href: "/chat" },
  ];

  if (variant === "minimal") {
    return (
      <footer className="mt-auto shrink-0 border-t border-gray-200 dark:border-gray-800 px-6 py-4 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <p>© {year} AarogyaMitra AI</p>
          <p>{t("footer.tagline")}</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-auto shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-lg">
                <HeartPulse className="text-blue-600 dark:text-blue-400" size={22} />
              </div>
              <span className="text-lg font-bold text-blue-700 dark:text-blue-400">
                AarogyaMitra AI
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              {t("footer.description")}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wide">
              {t("footer.quickLinks")}
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors duration-200 flex items-center gap-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wide">
              {t("footer.support")}
            </h3>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm transition-colors duration-200 flex items-center gap-1"
                  >
                    {link.label}
                    {link.href.startsWith("mailto") && <Mail size={12} />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm uppercase tracking-wide">
              {t("footer.connect")}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              {t("footer.connectDesc")}
            </p>
            <div className="flex gap-3">
              <a
                href="mailto:support@aarogyamitra.ai"
                className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-all duration-200"
                aria-label="Email"
              >
                <Mail size={18} />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-600 transition-all duration-200"
                aria-label="GitHub"
              >
                <Code2 size={18} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            © {year} AarogyaMitra AI. {t("footer.rights")}
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs flex items-center gap-1">
            {t("footer.madeWith")} <HeartPulse size={12} className="text-red-500" /> {t("footer.forIndia")}
          </p>
        </div>
      </div>
    </footer>
  );
}
