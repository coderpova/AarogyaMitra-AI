"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import { FileText, CheckCircle, ExternalLink } from "lucide-react";


const schemes = [

  {
    name: "Ayushman Bharat Yojana",
    description:
      "Health insurance scheme providing cashless treatment facilities.",
    benefits: [
      "Free hospital treatment",
      "Coverage up to ₹5 lakh",
      "Available in empanelled hospitals",
    ],
  },


  {
    name: "Pradhan Mantri Jan Arogya Yojana",
    description:
      "Financial protection for poor and vulnerable families.",
    benefits: [
      "Cashless healthcare",
      "Family coverage",
      "Government supported",
    ],
  },


  {
    name: "National Health Mission",
    description:
      "Improving healthcare access in rural and urban areas.",
    benefits: [
      "Free health services",
      "Maternal care",
      "Child healthcare",
    ],
  },


];


export default function SchemesPage() {


  return (

    <DashboardLayout>


      <div className="page-animation">



        {/* Header */}


        <div className="
          bg-blue-700
          text-white
          rounded-3xl
          p-8
        ">


          <h1 className="text-4xl font-bold">

            Government Health Schemes

          </h1>


          <p className="text-blue-100 mt-2">

            Explore healthcare schemes and benefits.

          </p>


        </div>







        {/* Cards */}



        <div className="
          grid
          md:grid-cols-2
          xl:grid-cols-3
          gap-6
          mt-8
        ">



          {schemes.map((scheme,index)=>(


            <div

              key={index}

              className="
              bg-white
              dark:bg-gray-900
              rounded-2xl
              shadow-lg
              p-6
              transition-all
              duration-300
              hover:shadow-2xl
              hover:-translate-y-2
              "

            >





              <div className="
                bg-blue-100
                dark:bg-blue-900
                w-14
                h-14
                rounded-xl
                flex
                items-center
                justify-center
              ">


                <FileText

                  className="
                  text-blue-700
                  dark:text-blue-300
                  "

                  size={30}

                />


              </div>






              <h2 className="
                text-xl
                font-bold
                mt-5
                dark:text-white
              ">

                {scheme.name}

              </h2>





              <p className="
                text-gray-500
                dark:text-gray-400
                mt-3
              ">

                {scheme.description}

              </p>







              <div className="mt-5 space-y-3">


                {scheme.benefits.map((benefit,i)=>(


                  <div

                    key={i}

                    className="
                    flex
                    items-center
                    gap-2
                    text-gray-700
                    dark:text-gray-300
                    "

                  >

                    <CheckCircle

                      size={18}

                      className="text-green-600"

                    />

                    {benefit}


                  </div>


                ))}


              </div>







              <button

                className="
                mt-6
                flex
                items-center
                gap-2
                bg-blue-600
                text-white
                px-5
                py-2
                rounded-xl
                hover:bg-blue-700
                transition
                "

              >

                Apply Now

                <ExternalLink size={18}/>


              </button>





            </div>



          ))}



        </div>



      </div>


    </DashboardLayout>

  );

}