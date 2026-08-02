import {
  Brain,
  Languages,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react";

const benefits = [
  {
    icon: Brain,
    title: "AI Powered Diagnosis",
    description:
      "Get intelligent healthcare guidance powered by Artificial Intelligence.",
  },
  {
    icon: Languages,
    title: "Multi-Language Support",
    description:
      "Communicate in Hindi, English and regional Indian languages.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Private",
    description:
      "Your health information remains safe and protected.",
  },
  {
    icon: HeartHandshake,
    title: "Healthcare For Everyone",
    description:
      "Designed especially for rural citizens with easy accessibility.",
  },
];

export default function WhyChooseUs() {
  return (
    <section
      className="
      py-24
      bg-white
      dark:bg-gray-900
      transition-colors
      duration-300
      "
    >
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center">

          <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
            Why Choose AarogyaMitra AI?
          </h2>

          <p className="mt-5 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Our platform combines Artificial Intelligence with healthcare
            accessibility to deliver fast, reliable and multilingual assistance.
          </p>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">

          {benefits.map((item, index) => {
            const Icon = item.icon;

            return (
              <div
                key={index}
                className="
                bg-gray-50
                dark:bg-gray-800
                border
                border-transparent
                dark:border-gray-700
                rounded-2xl
                p-8
                shadow-md
                hover:shadow-xl
                hover:-translate-y-2
                transition-all
                duration-300
                "
              >

                <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">

                  <Icon className="text-blue-600 dark:text-blue-400 w-7 h-7" />

                </div>

                <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </h3>

                <p className="mt-3 text-gray-600 dark:text-gray-300">
                  {item.description}
                </p>

              </div>
            );
          })}

        </div>

      </div>
    </section>
  );
}