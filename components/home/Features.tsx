"use client";
import { useLanguage } from "@/context/LanguageContext";
import Card from "@/components/ui/Card";


export default function Features() {
  const { t } = useLanguage();
  const features = [
  {
    title: t("homeExt.featTitle1"),
    description: t("homeExt.featDesc1"),
    icon: "🤖",
  },
  {
    title: t("homeExt.featTitle2"),
    description: t("homeExt.featDesc2"),
    icon: "🎤",
  },
  {
    title: t("homeExt.featTitle3"),
    description: t("homeExt.featDesc3"),
    icon: "🏥",
  },
  {
    title: t("homeExt.featTitle4"),
    description: t("homeExt.featDesc4"),
    icon: "📄",
  },
  {
    title: t("homeExt.featTitle5"),
    description: t("homeExt.featDesc5"),
    icon: "💊",
  },
  {
    title: t("homeExt.featTitle6"),
    description: t("homeExt.featDesc6"),
    icon: "📷",
  },
];

  return (
    <section
      id="features"
      className="
      py-20
      px-6
      bg-gray-50
      dark:bg-gray-950
      transition-colors
      duration-300
      "
    >
      <div className="max-w-7xl mx-auto">

        <h2 className="text-4xl font-bold text-center text-blue-700 dark:text-blue-400">
          Our Features
        </h2>

        <p className="text-center text-gray-600 dark:text-gray-300 mt-4 max-w-2xl mx-auto">
          AarogyaMitra AI provides intelligent healthcare solutions designed to
          improve accessibility, awareness, and patient care across India.
        </p>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {features.map((feature, index) => (

            <Card
              key={index}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
            />

          ))}

        </div>

      </div>
    </section>
  );
}