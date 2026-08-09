"use client";
import { useLanguage } from "@/context/LanguageContext";
import { Star } from "lucide-react";


export default function Testimonials() {
  const { t } = useLanguage();
  const testimonials = [
  {
    name: t("homeExt.testiName1"),
    role: t("homeExt.testiRole1"),
    review: t("homeExt.testiDesc1"),
  },
  {
    name: t("homeExt.testiName2"),
    role: t("homeExt.testiRole2"),
    review: t("homeExt.testiDesc2"),
  },
  {
    name: t("homeExt.testiName3"),
    role: t("homeExt.testiRole3"),
    review: t("homeExt.testiDesc3"),
  },
];

  return (
    <section
      className="
        py-24
        bg-gray-50
        dark:bg-gray-950
        transition-colors
        duration-300
      "
    >
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center">

          <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
            What People Say
          </h2>

          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Trusted by users across India.
          </p>

        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">

          {testimonials.map((item, index) => (

            <div
              key={index}
              className="
                bg-white
                dark:bg-gray-900
                border
                border-transparent
                dark:border-gray-800
                rounded-2xl
                shadow-lg
                p-8
                hover:shadow-xl
                hover:-translate-y-2
                transition-all
                duration-300
              "
            >

              <div className="flex mb-5">

                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="w-5 h-5 fill-yellow-400 text-yellow-400"
                  />
                ))}

              </div>

              <p className="text-gray-600 dark:text-gray-300 italic">
                &ldquo;{item.review}&rdquo;
              </p>

              <div className="mt-6">

                <h3 className="font-bold text-gray-900 dark:text-white">
                  {item.name}
                </h3>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {item.role}
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>
    </section>
  );
}