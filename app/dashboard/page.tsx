"use client";

import { useEffect, useState } from "react";

import DashboardLayout from "@/components/layout/DashboardLayout";

import ActionCard from "@/components/dashboard/ActionCard";
import InfoCard from "@/components/dashboard/InfoCard";
import HospitalCard from "@/components/hospital/HospitalCard";



interface User {

  name:string;

  email:string;

  profile?:{

    age:number;

    gender:string;

    bloodGroup:string;

    phone:string;

    address:string;

  };


  health?:{

    heartRate:number;

    steps:number;

    healthScore:number;

  };


  medicines?:any[];

  appointments?:any[];

}



interface Hospital {

  name:string;

  address:string;

  lat:number;

  lon:number;

  phone?:string;

  website?:string;

  openingHours?:string;

  category?:string;

}


export default function DashboardPage(){



  const [user,setUser] = useState<User | null>(null);



  const [hospitals,setHospitals] = useState<Hospital[]>([]);



  const [loading,setLoading] = useState(false);



  const [locationError,setLocationError] = useState("");









  // ================= GET USER =================



  useEffect(()=>{



    const getUser = async()=>{



      try{



        const token = localStorage.getItem("token");



        if(!token){

          return;

        }




        const response = await fetch("/api/user",{

          headers:{

            Authorization:`Bearer ${token}`

          }

        });





        const data = await response.json();





        setUser(data.user);





      }

      catch(error){


        console.log(error);


      }



    };




    getUser();



  },[]);












  // ================= FIND HOSPITAL =================



  const findHospitals = ()=>{



    setLoading(true);

    setLocationError("");





    if(!navigator.geolocation){


      setLocationError("Location not supported");

      setLoading(false);

      return;


    }







    navigator.geolocation.getCurrentPosition(



      async(position)=>{



        const lat = position.coords.latitude;

        const lon = position.coords.longitude;





        try{



          const response = await fetch(

            `/api/hospitals?lat=${lat}&lon=${lon}`

          );





          const data = await response.json();




          setHospitals(

            data.hospitals || []

          );




        }

        catch(error){



          console.log(error);

          setLocationError(

            "Unable to fetch hospitals"

          );



        }

        finally{


          setLoading(false);


        }



      },



      ()=>{


        setLocationError(

          "Please allow location access"

        );


        setLoading(false);



      }



    );



  };





  const healthScore = user?.health?.healthScore || 0;


  const heartRate = user?.health?.heartRate || 0;


  const steps = user?.health?.steps || 0;


  const medicineCount = user?.medicines?.length || 0;


  const appointmentCount = user?.appointments?.length || 0;





  return (



    <DashboardLayout>


      <div className="
      
        min-h-screen
        
        bg-gray-100
        
        dark:bg-gray-900
        
        p-6
        
      ">





        {/* Welcome */}



        <div className="
        
          bg-gradient-to-r
          
          from-blue-700
          
          to-blue-500
          
          rounded-3xl
          
          p-8
          
          text-white
          
          shadow-lg
          
          mb-8
          
        ">



          <h1 className="
          
            text-4xl
            
            font-bold
            
          ">


            Welcome {user?.name || "User"} 👋


          </h1>




          <p className="mt-3 text-blue-100">


            {user?.email}


          </p>




        </div>








        {/* Health Score */}



        <div className="
        
          bg-white
          
          dark:bg-gray-800
          
          rounded-3xl
          
          p-8
          
          shadow-md
          
          mb-8
          
        ">



          <h2 className="
          
            text-2xl
            
            font-bold
            
            dark:text-white
            
          ">


            Health Score


          </h2>





          <div className="
          
            text-6xl
            
            font-bold
            
            text-blue-600
            
            mt-4
            
          ">


            {healthScore}%


          </div>




        </div>
                {/* Quick Actions */}


        <h2 className="
          text-2xl
          font-bold
          mb-5
          dark:text-white
        ">

          Quick Actions

        </h2>




        <div className="
          grid
          grid-cols-1
          sm:grid-cols-2
          xl:grid-cols-4
          gap-6
          mb-10
        ">


          <ActionCard

            title="AI Chat 🤖"

            description="Talk with AarogyaMitra AI"

            link="/chat"

          />



          <ActionCard

            title="Hospital Finder 🏥"

            description="Find nearby hospitals"

            link="/hospital"

          />



          <ActionCard

            title="Medicines 💊"

            description="Manage your medicines"

            link="/medicines"

          />



          <ActionCard

            title="Appointments 📅"

            description="Manage appointments"

            link="/appointments"

          />



        </div>









        {/* Hospital Finder */}



        <div className="
        
          bg-white
          
          dark:bg-gray-800
          
          rounded-3xl
          
          shadow-md
          
          p-8
          
          mb-10
          
        ">




          <div className="
          
            flex
            
            justify-between
            
            items-center
            
            mb-6
            
          ">



            <h2 className="
            
              text-2xl
              
              font-bold
              
              dark:text-white
              
            ">


              Hospital Finder 🏥


            </h2>




            <button

              onClick={findHospitals}

              className="
              
                bg-blue-600
                
                hover:bg-blue-700
                
                text-white
                
                px-6
                
                py-3
                
                rounded-xl
                
              "

            >


              {
                loading
                ?
                "Finding..."
                :
                "Find Nearby"
              }


            </button>



          </div>






          {

            locationError && (

              <p className="
              
                text-red-500
                
                mb-4
                
              ">


                {locationError}


              </p>


            )

          }







          <div className="
          
            grid
            
            md:grid-cols-3
            
            gap-6
            
          ">




            {


              hospitals.length > 0 ?



              hospitals.map((hospital,index)=>(


                <HospitalCard

                  key={index}

                  hospital={hospital}

                />


              ))



              :



              <p className="
              
                text-gray-500
                
                dark:text-gray-400
                
              ">


                Click Find Nearby to search hospitals.


              </p>


            }



          </div>






        </div>












        {/* Health Overview */}



        <h2 className="
        
          text-2xl
          
          font-bold
          
          mb-5
          
          dark:text-white
          
        ">


          Health Overview


        </h2>








        <div className="
        
          grid
          
          grid-cols-1
          
          sm:grid-cols-2
          
          xl:grid-cols-4
          
          gap-6
          
        ">






          <InfoCard

            title="Heart Rate"

            value={
              heartRate
              ?
              `${heartRate} BPM`
              :
              "Not Added"
            }

            icon="❤️"

          />







          <InfoCard

            title="Steps"

            value={
              steps
              ?
              `${steps} Steps`
              :
              "Not Added"
            }

            icon="🚶"

          />








          <InfoCard

            title="Medicines"

            value={
              `${medicineCount} Medicines`
            }

            icon="💊"

          />








          <InfoCard

            title="Appointments"

            value={
              `${appointmentCount} Scheduled`
            }

            icon="📅"

          />







        </div>





      </div>


    </DashboardLayout>


  );


}