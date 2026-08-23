"use client";

import { useLanguage } from "@/context/LanguageContext";
import {
  CheckCircle,
  ExternalLink,
  FileText,
  BadgeCheck,
  MapPin,
  Tag,
  Sparkles,
} from "lucide-react";
import { Scheme } from "@/lib/schemeMatcher";

interface Props {
  scheme: Scheme;
}

export default function SchemeCard({ scheme }: Props) {
  const { t } = useLanguage();

  return (
    <div
      className="
        bg-white
        dark:bg-gray-900
        rounded-3xl
        shadow-lg
        p-6 sm:p-8
        border
        border-gray-150
        dark:border-gray-800
        hover:shadow-2xl
        transition-all
        duration-300
        flex
        flex-col
        justify-between
      "
    >
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center shrink-0">
              <FileText size={24} className="text-blue-700 dark:text-blue-300" />
            </div>
            <div>
              {scheme.category && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                  <Tag size={10} />
                  {scheme.category}
                </span>
              )}
              {scheme.state && (
                <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                  <MapPin size={10} />
                  {scheme.state}
                </span>
              )}
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              scheme.isEligible !== false
                ? "bg-green-100 dark:bg-green-950/80 text-green-700 dark:text-green-300"
                : "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300"
            }`}
          >
            <BadgeCheck size={16} />
            <span>
              {scheme.isEligible !== false
                ? "Eligible Scheme"
                : "Review Eligibility Criteria"}
            </span>
          </div>
        </div>

        {/* Name */}
        <h3 className="text-xl sm:text-2xl font-bold mt-5 dark:text-white leading-snug">
          {scheme.name}
        </h3>

        {/* Match Reasons Explanation */}
        {scheme.matchReasons && scheme.matchReasons.length > 0 && (
          <div className="mt-3 inline-flex flex-wrap items-center gap-1.5 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 px-3 py-1.5 rounded-xl text-xs text-blue-800 dark:text-blue-200">
            <Sparkles size={12} className="text-amber-500 shrink-0" />
            <span className="font-semibold">Matched:</span>
            <span>{scheme.matchReasons.join(" • ")}</span>
          </div>
        )}

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 mt-3 text-sm leading-relaxed">
          {scheme.description}
        </p>

        {/* Benefits */}
        <div className="mt-5">
          <h4 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
            Key Benefit
          </h4>
          <div className="mt-2 bg-blue-50/60 dark:bg-blue-950/50 rounded-xl p-3.5 text-xs sm:text-sm text-gray-800 dark:text-gray-200 font-medium border border-blue-100/50 dark:border-blue-900/30">
            {scheme.benefit || t("schemesExt.benefitsDesc")}
          </div>
        </div>

        {/* Documents */}
        <div className="mt-5">
          <h4 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
            Required Documents
          </h4>
          <div className="space-y-2 mt-2">
            {scheme.documents && scheme.documents.length > 0 ? (
              scheme.documents.map((doc: string, index: number) => (
                <div key={index} className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle size={14} className="text-green-600 shrink-0" />
                  <span>{doc}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">{t("schemesExt.noDocs")}</p>
            )}
          </div>
        </div>
      </div>

      {/* Official Link Action */}
      {scheme.officialLink && (
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <a
            href={scheme.officialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl transition text-sm shadow-sm"
          >
            <span>Official Application Portal</span>
            <ExternalLink size={16} />
          </a>
        </div>
      )}
    </div>
  );
}