"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth, User } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function Register() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail || !password) {
      toast.error(t("common.required"));
      return;
    }

    if (cleanName.length < 2) {
      toast.error("Name must be at least 2 characters long.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || t("common.error"));
        return;
      }

      login(
        {
          name: data.user.name,
          email: data.user.email,
          ...(data.user.settings ? { settings: data.user.settings } : {}),
        } as User,
        data.token
      );

      toast.success(t("auth.registerSuccess"));
      setName("");
      setEmail("");
      setPassword("");
      router.push("/dashboard");
    } catch (error) {
      console.error("Register Error:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-blue-50 dark:bg-gray-950 px-6">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-md page-animation border border-gray-200 dark:border-gray-800">
        <h1 className="text-3xl font-bold text-center text-blue-700 dark:text-blue-400">
          {t("auth.registerTitle")}
        </h1>

        <p className="text-center text-gray-600 dark:text-gray-400 mt-2 text-sm">
          {t("auth.registerSubtitle")}
        </p>

        <div className="mt-8">
          <label className="block mb-2 font-medium dark:text-white">
            {t("auth.fullName")}
          </label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("auth.fullName")}
            disabled={loading}
          />
        </div>

        <div className="mt-5">
          <label className="block mb-2 font-medium dark:text-white">
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
          <label className="block mb-2 font-medium dark:text-white">
            {t("auth.password")}
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("auth.password")}
            disabled={loading}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleRegister()}
          />
        </div>

        <Button onClick={handleRegister} disabled={loading} className="mt-8 w-full h-12 text-base">
          {loading ? "Creating Account..." : t("auth.registerButton")}
        </Button>

        <p className="text-center mt-6 text-gray-600 dark:text-gray-400 text-sm">
          {t("auth.alreadyHaveAccount")}{" "}
          <Link
            href="/login"
            className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
          >
            {t("auth.loginButton")}
          </Link>
        </p>
      </div>
    </main>
  );
}