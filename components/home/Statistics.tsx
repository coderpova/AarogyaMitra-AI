"use client";
import { useLanguage } from "@/context/LanguageContext";
export default function Statistics() {
  const { t } = useLanguage();
  const stats = [
    { number: "50K+", label: t("homeExt.statUsers") },
    { number: "12+", label: t("homeExt.statLangs") },
    { number: "98%", label: t("homeExt.statAcc") },
    { number: "24/7", label: t("homeExt.statAvail") },
  ];

  return (
    <section id="statistics" className="bg-blue-700 text-white py-20">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
        {stats.map((item, index) => (
          <div key={index}>
            <h2 className="text-4xl font-bold">{item.number}</h2>
            <p className="mt-2 text-blue-100">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}