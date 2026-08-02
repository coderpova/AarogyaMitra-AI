import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Ramesh Kumar",
    role: "Farmer, Uttar Pradesh",
    review:
      "AarogyaMitra AI helped me understand my symptoms in Hindi and guided me to the nearest hospital.",
  },
  {
    name: "Priya Sharma",
    role: "Student, Delhi",
    review:
      "The medicine reminder and AI assistant are extremely useful for my family.",
  },
  {
    name: "Anita Devi",
    role: "ASHA Worker",
    review:
      "This platform makes healthcare information easy to understand for villagers.",
  },
];

export default function Testimonials() {
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
                "{item.review}"
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