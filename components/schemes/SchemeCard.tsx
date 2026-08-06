"use client";
import { useLanguage } from "@/context/LanguageContext";

import {
  CheckCircle,
  ExternalLink,
  FileText,
  BadgeCheck,
} from "lucide-react";

interface Props {
  scheme: any;
}

export default function SchemeCard({ scheme }: Props) {
  const { t } = useLanguage();

  return (

    <div
      className="
        bg-white
        dark:bg-gray-900
        rounded-3xl
        shadow-lg
        p-8
        border
        hover:shadow-2xl
        transition-all
        duration-300
      "
    >


      {/* Top Section */}

      <div className="flex justify-between items-start">


        <div
          className="
            w-16
            h-16
            rounded-2xl
            bg-blue-100
            dark:bg-blue-900
            flex
            items-center
            justify-center
          "
        >

          <FileText
            size={32}
            className="text-blue-700 dark:text-blue-300"
          />

        </div>



        <div
          className="
            flex
            items-center
            gap-2
            bg-green-100
            text-green-700
            px-3
            py-2
            rounded-full
            text-sm
            font-semibold
          "
        >

          <BadgeCheck size={18}/>

          {t("schemesExt.eligibleBadge")}

        </div>


      </div>





      {/* Name */}

      <h2
        className="
          text-2xl
          font-bold
          mt-6
          dark:text-white
        "
      >

        {scheme.name}

      </h2>





      {/* Description */}

      <p
        className="
          text-gray-500
          dark:text-gray-400
          mt-4
        "
      >

        {scheme.description}

      </p>






      {/* Benefit */}

      <div className="mt-6">


        <h3 className="font-bold text-lg dark:text-white">

          Benefits

        </h3>



        <div
          className="
            mt-3
            bg-blue-50
            dark:bg-blue-950
            rounded-xl
            p-4
            text-gray-700
            dark:text-gray-200
          "
        >

          {scheme.benefit || t("schemesExt.benefitsDesc")}

        </div>


      </div>






      {/* Documents */}

      <div className="mt-6">


        <h3 className="font-bold text-lg dark:text-white">

          Required Documents

        </h3>



        <div className="space-y-3 mt-3">


          {
            scheme.documents?.length > 0 ? (

              scheme.documents.map(
                (doc:string,index:number)=>(


                  <div
                    key={index}
                    className="
                      flex
                      items-center
                      gap-3
                      text-gray-700
                      dark:text-gray-300
                    "
                  >

                    <CheckCircle
                      size={18}
                      className="text-green-600"
                    />


                    {doc}


                  </div>


                )

              )


            ) : (

              <p className="text-gray-500">

                {t("schemesExt.noDocs")}

              </p>

            )

          }


        </div>


      </div>






      {/* Official Link */}

      {
        scheme.officialLink && (

          <a
            href={scheme.officialLink}
            target="_blank"
            rel="noopener noreferrer"
            className="
              mt-8
              inline-flex
              items-center
              gap-2
              bg-blue-600
              hover:bg-blue-700
              text-white
              px-6
              py-3
              rounded-xl
              transition
            "
          >

            {t("schemesExt.applyWeb")}


            <ExternalLink size={18}/>


          </a>

        )
      }



    </div>

  );

}