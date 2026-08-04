"use client";

import EligibilityForm from "@/components/schemes/EligibilityForm";
import { matchSchemes, UserProfile } from "@/lib/schemeMatcher";
import { useState, useEffect, useRef } from "react";
import ResultSection from "@/components/schemes/ResultSection";
import DashboardLayout from "@/components/layout/DashboardLayout";


export default function SchemesPage() {


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



  // MongoDB schemes
  const [schemes, setSchemes] = useState<any[]>([]);



  // Matched schemes
  const [eligibleSchemes, setEligibleSchemes] = useState<any[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);



  // Fetch schemes from MongoDB


    useEffect(() => {

      const fetchSchemes = async () => {

        try {

          const response = await fetch("/api/schemes");

          const data = await response.json();

          console.log("Mongo Schemes:", data.schemes);

          setSchemes(data.schemes || []);

        } catch(error){

          console.log(error);

        }

      };

      fetchSchemes();

    }, []);




  // Check eligibility

  const checkEligibility = () => {

      const result = matchSchemes(
        formData,
        schemes
      );


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


      <div className="page-animation">



        {/* Header */}

        <div
          className="
            bg-blue-700
            text-white
            rounded-3xl
            p-8
          "
        >


          <h1 className="text-4xl font-bold">

            Government Health Schemes

          </h1>


          <p className="text-blue-100 mt-2">

            Find schemes based on your eligibility.

          </p>


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

        <div 
          ref={resultRef}
          className="mt-10"
        >


          <ResultSection

            schemes={eligibleSchemes}

          />


        </div>



      </div>


    </DashboardLayout>

  );

}