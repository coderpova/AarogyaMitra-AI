"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/LanguageContext";

function GoogleSuccessContent() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchSession = async () => {
      try {
        const res = await fetch("/api/auth/google/session", {
          credentials: "same-origin",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch session");
        }
        const data = await res.json();
        login(data.user);
        toast.success(t("auth.googleLoginSuccess"));
        router.replace("/dashboard");
      } catch (err) {
        console.error("Google session fetch error:", err);
        toast.error(t("auth.googleLoginFailed"));
        router.replace("/login");
      }
    };
    fetchSession();
  }, [login, router, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">{t("auth.signingIn")}</p>
      </div>
    </div>
  );
}

export default function GoogleSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-50 dark:bg-gray-950" />}>
      <GoogleSuccessContent />
    </Suspense>
  );
}
