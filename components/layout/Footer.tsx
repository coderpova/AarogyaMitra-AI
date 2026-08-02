export default function Footer() {
  return (
    <footer
      className="
      bg-white
      dark:bg-gray-900
      border-t
      border-gray-200
      dark:border-gray-800
      mt-10
      px-8
      py-6
      transition-colors
      duration-300
      "
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">

        {/* Left */}

        <div>

          <h2 className="text-xl font-bold text-blue-700 dark:text-blue-400">
            AarogyaMitra AI
          </h2>

          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            AI Powered Rural Healthcare Assistant
          </p>

        </div>

        {/* Right */}

        <div className="text-gray-500 dark:text-gray-400 text-sm text-center">

          <p>
            © 2026 AarogyaMitra AI. All rights reserved.
          </p>

          <p className="mt-1">
            Healthcare support made easier with AI.
          </p>

        </div>

      </div>
    </footer>
  );
}