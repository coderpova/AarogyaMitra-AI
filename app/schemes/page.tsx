"use client";

import EligibilityForm from "@/components/schemes/EligibilityForm";
import { matchSchemes, UserProfile, Scheme } from "@/lib/schemeMatcher";
import { useState, useEffect, useRef } from "react";
import ResultSection from "@/components/schemes/ResultSection";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useLanguage } from "@/context/LanguageContext";

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
  const [eligibleSchemes, setEligibleSchemes] = useState<Scheme[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const response = await fetch("/api/schemes");
        const data = await response.json();
        setSchemes(data.schemes || []);
      } catch (error) {
        console.log(error);
      }
    };
    fetchSchemes();
  }, []);

  const checkEligibility = () => {
    const result = matchSchemes(formData, schemes);
    setEligibleSchemes(result);

    setTimeout(() => {
      resultRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  return (
    <DashboardLayout>
      <div className="page-animation space-y-6">
        {/* Header */}
        <div className="bg-blue-700 text-white rounded-3xl p-8 shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold">
            {t("schemes.title")}
          </h1>
          <p className="text-blue-100 mt-2">{t("schemes.subtitle")}</p>
        </div>

        {/* Eligibility Form */}
        <div className="mt-8">
          <EligibilityForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={checkEligibility}
          />
        </div>

        {/* Results */}
        <div ref={resultRef} className="mt-10">
          <ResultSection schemes={eligibleSchemes} />
        </div>
      </div>
    </DashboardLayout>
  );
}