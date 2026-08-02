import { HeartPulse } from "lucide-react";

export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="text-center">

        <div className="flex justify-center mb-6">

          <div className="bg-blue-600 p-5 rounded-full animate-pulse">

            <HeartPulse
              size={50}
              className="text-white"
            />

          </div>

        </div>


        <h1 className="text-3xl font-bold text-blue-700">
          AarogyaMitra AI
        </h1>


        <p className="text-gray-500 mt-3">
          Loading healthcare assistant...
        </p>


        <div className="mt-6 flex justify-center">

          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin">

          </div>

        </div>


      </div>

    </main>
  );
}