import Card from "@/components/ui/Card";

const features = [
  {
    title: "AI Health Assistant",
    description:
      "Get instant healthcare guidance using AI in your preferred language.",
    icon: "🤖",
  },
  {
    title: "Voice Support",
    description:
      "Talk with AI using voice for easy healthcare access.",
    icon: "🎤",
  },
  {
    title: "Hospital Finder",
    description:
      "Find nearby hospitals and healthcare centers quickly.",
    icon: "🏥",
  },
  {
    title: "Government Schemes",
    description:
      "Know about healthcare schemes and eligibility.",
    icon: "📄",
  },
  {
    title: "Medicine Reminder",
    description:
      "Never miss your important medicines.",
    icon: "💊",
  },
  {
    title: "Prescription Scanner",
    description:
      "Scan prescriptions and extract medicine details.",
    icon: "📷",
  },
];

export default function Features() {
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