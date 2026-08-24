"use client";

import SchemeCard from "./SchemeCard";
import { Scheme } from "@/lib/schemeMatcher";
import { SearchX, Shield, HeartPulse, Baby, UserCheck, Stethoscope, MapPin } from "lucide-react";

interface Props {
  schemes: Scheme[];
  searchQuery?: string;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export default function ResultSection({
  schemes,
  searchQuery = "",
  selectedCategory = "All",
  onSelectCategory,
}: Props) {
  const suggestedCategories = [
    { label: "Health Insurance", icon: Shield },
    { label: "Maternal & Child Health", icon: Baby },
    { label: "Senior Healthcare", icon: UserCheck },
    { label: "Disability Support", icon: Stethoscope },
    { label: "Medical Assistance", icon: HeartPulse },
    { label: "State Health Schemes", icon: MapPin },
  ];

  return (
    <div className="mt-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold dark:text-white flex items-center gap-2">
            Available Healthcare Schemes
            <span className="text-xs bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold px-2.5 py-1 rounded-full">
              {schemes.length} Matches
            </span>
          </h2>
          {searchQuery && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Showing results for query: <span className="font-semibold text-blue-600 dark:text-blue-400">&quot;{searchQuery}&quot;</span>
            </p>
          )}
        </div>
      </div>

      {schemes.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg p-10 text-center border border-gray-100 dark:border-gray-800">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/40 rounded-2xl flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400 mb-4">
            <SearchX size={32} />
          </div>

          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
            No matching healthcare scheme was found.
          </h3>

          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm max-w-md mx-auto">
            Try adjusting your age, income, state of residence, or explore popular healthcare categories below:
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
            {suggestedCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.label}
                  onClick={() => onSelectCategory && onSelectCategory(cat.label)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-xs font-medium transition border border-gray-200 dark:border-gray-700"
                >
                  <Icon size={14} className="text-blue-600 dark:text-blue-400" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          {schemes.map((scheme, index) => (
            <SchemeCard
              key={scheme._id || scheme.id || index}
              scheme={scheme}
            />
          ))}
        </div>
      )}
    </div>
  );
}