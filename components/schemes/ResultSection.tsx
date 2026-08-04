"use client";

import SchemeCard from "./SchemeCard";

interface Props {
  schemes: any[];
}

export default function ResultSection({
  schemes,
}: Props) {

  return (

    <div className="mt-12">


      <h2 className="
        text-3xl
        font-bold
        mb-8
        dark:text-white
      ">
        Eligible Government Schemes
      </h2>




      {
        schemes.length === 0 ? (


          <div className="
            bg-white
            dark:bg-gray-900
            rounded-2xl
            shadow-lg
            p-10
            text-center
          ">


            <h3 className="
              text-2xl
              font-semibold
              dark:text-white
            ">
              No Matching Scheme Found
            </h3>



            <p className="
              text-gray-500
              dark:text-gray-400
              mt-3
            ">
              Fill the eligibility form and click
              <strong> Check Eligibility </strong>
              to find suitable government schemes.
            </p>


          </div>


        ) : (



          <div className="
            grid
            lg:grid-cols-2
            gap-8
          ">


            {
              schemes.map((scheme,index)=>(


                <SchemeCard

                  key={scheme._id || scheme.id || index}

                  scheme={scheme}

                />


              ))
            }


          </div>


        )
      }



    </div>

  );
}