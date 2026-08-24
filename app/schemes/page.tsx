"use client";

import EligibilityForm from "@/components/schemes/EligibilityForm";
import { matchAndRankSchemes, UserProfile, Scheme } from "@/lib/schemeMatcher";
import { useState, useEffect, useRef, useMemo } from "react";
import ResultSection from "@/components/schemes/ResultSection";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useLanguage } from "@/context/LanguageContext";
import fallbackSchemes from "@/data/schemes.json";
import {
  Search,
  Filter,
  Sparkles,
  Shield,
  HeartPulse,
  Baby,
  UserCheck,
  MapPin,
  Stethoscope,
} from "lucide-react";

export default function SchemesPage() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<UserProfile>({
    age: 0,
    gender: "",
    state: "",
    income: 0,
    category: "",
    pregnant: false,
    seniorCitizen: false,
    disability: false,
  });

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const response = await fetch("/api/schemes");
        const data = await response.json();
        if (data.schemes && data.schemes.length > 0) {
          // Filter out non-healthcare schemes if database contains legacy records
          const healthOnly = (data.schemes as Scheme[]).filter((s) => {
            const cat = (s.category || "").toLowerCase();
            return !["education", "farmers", "employment", "housing"].includes(cat);
          });
          setSchemes(healthOnly.length > 0 ? healthOnly : (fallbackSchemes as Scheme[]));
        } else {
          setSchemes(fallbackSchemes as Scheme[]);
        }
      } catch (error) {
        console.log("Using fallback healthcare schemes dataset:", error);
        setSchemes(fallbackSchemes as Scheme[]);
      }
    };
    fetchSchemes();
  }, []);

  const categories = [
    { label: "All", icon: Filter },
    { label: "Health Insurance", icon: Shield },
    { label: "Maternal & Child Health", icon: Baby },
    { label: "Senior Healthcare", icon: UserCheck },
    { label: "Disability Support", icon: Stethoscope },
    { label: "Medical Assistance", icon: HeartPulse },
    { label: "State Health Schemes", icon: MapPin },
  ];

  // Perform targeted deterministic matching & ranking
  const filteredSchemes = useMemo(() => {
    return matchAndRankSchemes(formData, schemes, searchQuery, selectedCategory);
  }, [formData, schemes, searchQuery, selectedCategory]);

  const checkEligibility = () => {
    setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const handleCategorySelect = (cat: string) => {
    setSelectedCategory(cat);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold mb-3">
              <Sparkles size={14} className="text-amber-300" />
              <span>Healthcare Benefit Discovery Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {t("schemes.title")}
            </h1>
            <p className="text-blue-100 mt-2 text-sm sm:text-base leading-relaxed">
              Find cashless health insurance, maternal care, senior healthcare support, disability medical aid, and government health benefits tailored for you.
            </p>

            {/* Direct Search Bar */}
            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search healthcare schemes e.g. Ayushman Bharat, maternal care, Uttar Pradesh, senior health insurance..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white text-gray-900 placeholder-gray-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-md"
                />
              </div>
              <button
                onClick={checkEligibility}
                className="bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold px-6 py-3.5 rounded-2xl text-sm transition shadow-lg shrink-0 flex items-center justify-center gap-2"
              >
                <Search size={16} />
                Find Healthcare Schemes
              </button>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() => handleCategorySelect(cat.label)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap transition border ${
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <Icon size={14} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Eligibility Form */}
        <div className="mt-6">
          <EligibilityForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={checkEligibility}
          />
        </div>

        {/* Results Section */}
        <div ref={resultRef} className="mt-10">
          <ResultSection
            schemes={filteredSchemes}
            searchQuery={searchQuery}
            selectedCategory={selectedCategory}
            onSelectCategory={handleCategorySelect}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}