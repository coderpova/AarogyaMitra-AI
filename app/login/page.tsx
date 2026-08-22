"use client";

import { useState, useEffect, Suspense } from "react";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "google_not_configured") {
      toast.error("Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local");
    } else if (error) {
      toast.error(t("auth.googleLoginFailed"));
    }
  }, [searchParams, t]);

  const handleLogin = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      toast.error(t("common.required"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || t("auth.invalidCredentials"));
        return;
      }

      login(
        {
          name: data.user.name,
          email: data.user.email,
          ...(data.user.settings ? { settings: data.user.settings } : {}),
          gmailConnected: data.user.gmailConnected || false,
        },
        data.token
      );

      toast.success(t("auth.loginSuccess"));
      router.push("/dashboard");
    } catch (error) {
      console.error("Login Error:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-blue-50 dark:bg-gray-950 transition-colors duration-300 px-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md page-animation">
        <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-400 text-center">
          {t("auth.loginTitle")}
        </h1>

        <p className="text-center text-gray-600 dark:text-gray-400 mt-2 text-sm">
          {t("auth.loginSubtitle")}
        </p>

        <GoogleSignInButton />

        <div className="mt-6">
          <label className="block mb-2 font-medium text-gray-800 dark:text-white">
            {t("auth.email")}
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.email")}
            disabled={loading}
          />
        </div>

        <div className="mt-5">
          <label className="block mb-2 font-medium text-gray-800 dark:text-white">
            {t("auth.password")}
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.password")}
            disabled={loading}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}
          />
        </div>

        <Button onClick={handleLogin} disabled={loading} className="mt-8 w-full h-12 text-base">
          {loading ? "Signing in..." : t("auth.loginButton")}
        </Button>

        <p className="text-center text-gray-600 dark:text-gray-400 mt-6 text-sm">
          {t("auth.dontHaveAccount")}{" "}
          <a
            href="/register"
            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          >
            {t("auth.registerButton")}
          </a>
        </p>
      </div>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blue-50 dark:bg-gray-950" />}>
      <LoginForm />
    </Suspense>
  );
}
