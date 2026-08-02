"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import SearchBar from "@/components/hospital/SearchBar";
import HospitalCard from "@/components/hospital/HospitalCard";

import { useState } from "react";

import { locations } from "@/data/locations";



interface Hospital {

  name: string;

  address: string;

  lat: number;

  lon: number;

  phone?: string;

  website?: string;

  openingHours?: string;

  category?: string;

  distance?: number;

}





export default function HospitalPage() {



  const [search, setSearch] = useState("");

  const [state, setState] = useState("");

  const [city, setCity] = useState("");



  const [hospitals, setHospitals] = useState<Hospital[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");







  const findHospitals = async () => {



    setLoading(true);

    setError("");




    // state select hai but city nahi

    if(state && !city){


      setError("Please select city");

      setLoading(false);

      return;


    }





    try {



      let lat = "";

      let lon = "";






      // =========================
      // CITY SEARCH
      // =========================


      if(state && city){



        const locationResponse = await fetch(

          `/api/location?city=${city}&state=${state}`

        );




        const locationData = await locationResponse.json();





        if(!locationData.lat || !locationData.lon){


          setError("Location not found");

          setLoading(false);

          return;


        }





        lat = locationData.lat;

        lon = locationData.lon;



      }






      // =========================
      // CURRENT LOCATION
      // =========================


      else {



        if(!navigator.geolocation){


          setError("Location is not supported");

          setLoading(false);

          return;


        }





        const position:any = await new Promise(

          (resolve,reject)=>{


            navigator.geolocation.getCurrentPosition(

              resolve,

              reject

            );


          }

        );






        lat = position.coords.latitude;

        lon = position.coords.longitude;



      }








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

      setError("Unable to fetch hospitals");



    }

    finally{


      setLoading(false);


    }



  };







    const filteredHospitals = [...hospitals]

      . sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity))

        .filter((hospital) =>

        hospital.name

        .toLowerCase()

      . includes(search.toLowerCase())

    ); 

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

            Nearby Hospitals 🏥

          </h1>




          <p className="text-blue-100 mt-2">

            Find hospitals near your location.

          </p>



        </div>









        {/* State City Selection */}



        <div className="
          mt-8
          grid
          md:grid-cols-2
          gap-4
        ">



          <select


            value={state}


            onChange={(e)=>{


              setState(e.target.value);

              setCity("");

              setHospitals([]);

            }}


            className="
              p-3
              rounded-xl
              border
              dark:bg-gray-800
              dark:text-white
            "


          >


            <option value="">

              Select State

            </option>



            {

              Object.keys(locations).map((item:string)=>(


                <option

                  key={item}

                  value={item}

                >

                  {item}

                </option>


              ))

            }


          </select>








          <select


            value={city}


            onChange={(e)=>{


              setCity(e.target.value);

              setHospitals([]);

            }}


            className="
              p-3
              rounded-xl
              border
              dark:bg-gray-800
              dark:text-white
            "


          >


            <option value="">

              Select City

            </option>





            {


              state &&

              locations[state].map((item:string)=>(


                <option

                  key={item}

                  value={item}

                >

                  {item}

                </option>


              ))


            }




          </select>




        </div>









        {/* Search + Button */}




        <div className="mt-8 flex gap-4 items-center">



          <div className="flex-1">


            <SearchBar


              search={search}


              setSearch={setSearch}


            />


          </div>






          <button


            onClick={findHospitals}


            className="
              bg-blue-700
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


              state && city

              ?

              "Search Hospital"

              :

              "Find Nearby"


            }



          </button>



        </div>









        {

          error && (


            <p className="text-red-500 mt-5">


              {error}


            </p>


          )


        }









        {/* Hospital List */}



        <div className="
          grid
          md:grid-cols-2
          xl:grid-cols-3
          gap-6
          mt-8
        ">




          {


            filteredHospitals.length > 0 ?



            filteredHospitals.map((hospital,index)=>(



              <HospitalCard


                key={index}


                hospital={hospital}


              />


            ))





            :





            <p className="text-gray-500">


              Click Find Nearby to search hospitals.


            </p>



          }




        </div>







      </div>




    </DashboardLayout>


  );


}