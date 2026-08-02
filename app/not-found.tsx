import Link from "next/link";
import { AlertTriangle, HeartPulse } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">

      <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-lg w-full">

        {/* Icon */}

        <div className="flex justify-center mb-6">

          <div className="bg-red-100 p-5 rounded-full">

            <AlertTriangle
              size={60}
              className="text-red-600"
            />

          </div>

        </div>


        <h1 className="text-6xl font-bold text-blue-700">
          404
        </h1>


        <h2 className="text-2xl font-bold mt-4">
          Page Not Found
        </h2>


        <p className="text-gray-500 mt-3">
          Sorry, the page you are looking for does not exist.
        </p>


        <div className="flex justify-center items-center gap-2 mt-6 text-blue-700 font-semibold">

          <HeartPulse size={24}/>

          AarogyaMitra AI

        </div>


        <Link
          href="/dashboard"
          className="inline-block mt-8 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition"
        >
          Go To Dashboard
        </Link>


      </div>

    </main>
  );
}