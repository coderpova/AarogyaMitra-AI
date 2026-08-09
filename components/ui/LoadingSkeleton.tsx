import { HeartPulse } from "lucide-react";

export function LoadingSkeleton({ text = "Loading securely..." }: { text?: string }) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8 space-y-6">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" />
        <div className="w-16 h-16 rounded-full bg-blue-500/5 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 dark:text-blue-400 relative">
          <HeartPulse size={32} className="animate-pulse" />
        </div>
      </div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">
        {text}
      </p>
    </div>
  );
}
