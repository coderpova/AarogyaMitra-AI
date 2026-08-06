"use client";
import { useLanguage } from "@/context/LanguageContext";
import { Button } from "../ui/Button";
import {
  ArrowRight,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

export default function Hero() {
  const { t } = useLanguage();
  return (
    <section
      className="
        bg-gradient-to-br
        from-blue-50
        to-white
        dark:from-gray-950
        dark:to-gray-900
        py-24
        transition-colors
        duration-300
      "
    >
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">

        {/* Left */}

        <div>

          <div
            className="
              inline-flex
              items-center
              gap-2
              bg-blue-100
              dark:bg-blue-900/40
              text-blue-700
              dark:text-blue-300
              px-4
              py-2
              rounded-full
              mb-6
            "
          >
            <HeartPulse size={18} />
            AI Powered Healthcare
          </div>

          <h1
            className="
              text-5xl
              md:text-6xl
              font-extrabold
              leading-tight
              text-gray-900
              dark:text-white
            "
          >
            Healthcare
            <span className="text-blue-600 dark:text-blue-400">
              {" "}for Everyone
            </span>
          </h1>

          <p
            className="
              mt-6
              text-lg
              leading-8
              text-gray-600
              dark:text-gray-300
            "
          >
            AarogyaMitra AI helps rural citizens with multilingual healthcare
            guidance, hospital discovery, medicine reminders, and government
            health schemes using Artificial Intelligence.
          </p>

          <div className="mt-8 flex gap-4">

            <Button>
              Start Chat
            </Button>

            <Button variant="secondary">
              Learn More
            </Button>

          </div>

          <div className="mt-10 flex flex-wrap gap-6">

            <div className="flex items-center gap-2 dark:text-gray-300">
              <ShieldCheck className="text-green-600" />
              <span>{t("homeExt.badgeSecure")}</span>
            </div>

            <div className="flex items-center gap-2 dark:text-gray-300">
              <Stethoscope className="text-blue-600" />
              <span>{t("homeExt.badgeDoctor")}</span>
            </div>

            <div className="flex items-center gap-2 dark:text-gray-300">
              <HeartPulse className="text-red-500" />
              <span>{t("homeExt.badgeSupport")}</span>
            </div>

          </div>

        </div>

        {/* Right */}

        <div className="flex justify-center">

          <div
            className="
              bg-white
              dark:bg-gray-900
              border
              border-gray-200
              dark:border-gray-800
              shadow-2xl
              rounded-3xl
              p-8
              w-full
              max-w-md
            "
          >

            <div className="flex items-center justify-between">

              <h2 className="font-bold text-xl dark:text-white">
                AI Assistant
              </h2>

              <HeartPulse className="text-red-500" />

            </div>

            <div className="mt-8 space-y-4">

              <div
                className="
                  bg-blue-100
                  dark:bg-blue-900/40
                  dark:text-blue-100
                  p-4
                  rounded-xl
                "
              >
                👋 Hello! How can I help you today?
              </div>

              <div
                className="
                  bg-gray-100
                  dark:bg-gray-800
                  dark:text-gray-200
                  p-4
                  rounded-xl
                "
              >
                I have fever and headache.
              </div>

              <div className="bg-blue-600 text-white p-4 rounded-xl">
                Drink plenty of water, take rest, and consult a doctor if symptoms persist.
              </div>

            </div>

            <button
              className="
                mt-8
                w-full
                bg-blue-600
                text-white
                py-3
                rounded-xl
                flex
                items-center
                justify-center
                gap-2
                hover:bg-blue-700
                transition
              "
            >
              Start Conversation
              <ArrowRight size={18} />
            </button>

          </div>

        </div>

      </div>
    </section>
  );
}