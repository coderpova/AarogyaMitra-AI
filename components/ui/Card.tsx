interface CardProps {
  title: string;
  description: string;
  icon: string;
}

export default function Card({
  title,
  description,
  icon,
}: CardProps) {
  return (
    <div
      className="
      rounded-2xl
      bg-white
      dark:bg-gray-900
      border
      border-gray-200
      dark:border-gray-800
      shadow-lg
      p-6
      hover:shadow-2xl
      hover:-translate-y-2
      transition-all
      duration-300
      "
    >

      <div className="text-5xl">
        {icon}
      </div>

      <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
        {title}
      </h3>

      <p className="mt-3 text-gray-600 dark:text-gray-300">
        {description}
      </p>

    </div>
  );
}