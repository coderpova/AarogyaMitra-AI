"use client";
import { useLanguage } from "@/context/LanguageContext";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useAuth } from "@/context/AuthContext";


export default function CTA() {
  const { t } = useLanguage();


  const {user} = useAuth();



  return (

    <section
      className="
      py-24
      bg-blue-700
      dark:bg-blue-900
      text-white
      transition-colors
      duration-300
      "
    >

      <div className="max-w-5xl mx-auto text-center px-6">


        <h2 className="text-5xl font-bold">

          {t('homeExt.ctaTitle')}

        </h2>



        <p className="mt-6 text-blue-100 dark:text-blue-200 text-lg">

          Join thousands of users and get instant healthcare guidance with
          AarogyaMitra AI.

        </p>





        {
          user ? (


            <Link href="/dashboard">


              <button

                className="
                mt-10
                bg-white
                dark:bg-gray-100
                text-blue-700
                px-8
                py-4
                rounded-xl
                font-bold
                hover:scale-105
                transition
                flex
                items-center
                gap-2
                mx-auto
                "

              >

                {t('homeExt.goDashboard')}

                <ArrowRight size={20}/>


              </button>


            </Link>


          ) : (


            <Link href="/register">


              <button

                className="
                mt-10
                bg-white
                dark:bg-gray-100
                text-blue-700
                px-8
                py-4
                rounded-xl
                font-bold
                hover:scale-105
                transition
                flex
                items-center
                gap-2
                mx-auto
                "

              >

                {t('homeExt.getStarted')}

                <ArrowRight size={20}/>


              </button>


            </Link>


          )
        }



      </div>


    </section>


  );

}