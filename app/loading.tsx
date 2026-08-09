import { HeartPulse } from "lucide-react";

export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Scoped CSS to handle fast navigation delay fades and prefers-reduced-motion */}
      <style>{`
        @keyframes loaderFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-loader-fade {
          opacity: 0;
          animation: loaderFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          animation-delay: 200ms;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-loader-fade {
            opacity: 1 !important;
            animation: none !important;
          }
        }
      `}</style>

      <div className="text-center animate-loader-fade">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 dark:bg-blue-650 p-5 rounded-full animate-pulse">
            <HeartPulse
              size={50}
              className="text-white"
            />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-400">
          AarogyaMitra AI
        </h1>

        <p className="text-gray-500 dark:text-gray-400 mt-3">
          Loading healthcare assistant...
        </p>

        <div className="mt-6 flex justify-center">
          <div className="w-10 h-10 border-4 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin">
          </div>
        </div>
      </div>
    </main>
  );
}