"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import { useLanguage } from "@/context/LanguageContext";

function GoogleSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const token = searchParams.get("token");
    const name = searchParams.get("name");
    const email = searchParams.get("email");
    const gmail = searchParams.get("gmail") === "true";

    if (token && name && email) {
      login(
        { name, email, gmailConnected: gmail },
        token
      );
      toast.success(t("auth.googleLoginSuccess"));
      router.replace("/dashboard");
    } else {
      toast.error(t("auth.googleLoginFailed"));
      router.replace("/login");
    }
  }, [searchParams, login, router, t]);

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
