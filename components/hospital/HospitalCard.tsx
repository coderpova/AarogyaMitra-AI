"use client";
import { useLanguage } from "@/context/LanguageContext";


interface HospitalCardProps {


    hospital: {

        name: string;

        address: string;

        lat: number;

        lon: number;

        phone?: string;

        website?: string;

        openingHours?: string;

        category?: string;

        rating?: number;

        distance?: number;

    };


}




export default function HospitalCard({

    hospital

}: HospitalCardProps) {
  const { t } = useLanguage();



    return (


        <div
            className="
            bg-white
            dark:bg-gray-800
            rounded-2xl
            shadow-md
            hover:shadow-xl
            transition
            p-5
            border
            dark:border-gray-700
            "
        >





            {/* Hospital Image Placeholder */}


            <div
                className="
                h-28
                rounded-xl
                bg-green-100
                dark:bg-green-900
                flex
                items-center
                justify-center
                text-6xl
                mb-5
                "
            >

                🏥

            </div>








            {/* Name */}


            <h2
                className="
                text-xl
                font-bold
                text-green-700
                dark:text-green-400
                "
            >

                {hospital.name}

            </h2>







            {/* Category */}


            <p
                className="
                text-sm
                text-blue-600
                dark:text-blue-400
                mt-1
                "
            >

                {hospital.category || t("hospitalsExt.facility")}

            </p>









            {/* Address */}


            <p
                className="
                mt-4
                text-gray-600
                dark:text-gray-300
                text-sm
                "
            >

                📍 {hospital.address}

            </p>
            {
                hospital.distance !== undefined && (

                <p
                  className="
                  mt-2
                  text-sm
                  text-gray-500
                  dark:text-gray-400
                  "
                >

                📍 {(hospital.distance / 1000).toFixed(1)} {t("hospitalsExt.kmAway")}

                </p>

              )
            }









            {/* Phone */}


            {

                hospital.phone && (

                    <p
                        className="
                        mt-3
                        text-gray-700
                        dark:text-gray-300
                        "
                    >

                        📞 {hospital.phone}

                    </p>

                )

            }









            {/* Opening Hours */}


            <p
                className="
                mt-3
                text-gray-700
                dark:text-gray-300
                "
            >

                🕒 {hospital.openingHours || t("hospitalsExt.timingNotAvail")}

            </p>










            {/* Website */}


            {

                hospital.website && (

                    <a

                        href={hospital.website}

                        target="_blank"

                        rel="noopener noreferrer"

                        className="
                        block
                        mt-3
                        text-blue-600
                        dark:text-blue-400
                        hover:underline
                        "

                    >

                        🌐 {t("hospitalsExt.visitWeb")}

                    </a>


                )

            }









            {/* Google Map */}


            <a


                href={
                    `https://www.google.com/maps?q=${hospital.lat},${hospital.lon}`
                }


                target="_blank"


                rel="noopener noreferrer"


                className="
                block
                text-center
                mt-5
                bg-blue-600
                text-white
                py-3
                rounded-xl
                hover:bg-blue-700
                transition
                "

            >

                🗺️ {t("hospitalsExt.openMap")}


            </a>





        </div>


    );


}