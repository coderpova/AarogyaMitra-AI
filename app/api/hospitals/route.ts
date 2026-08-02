import { NextResponse } from "next/server";


export async function GET(request: Request) {


  try {


    const { searchParams } = new URL(request.url);


    const lat = searchParams.get("lat");

    const lon = searchParams.get("lon");



    if (!lat || !lon) {


      return NextResponse.json(
        {
          message: "Location required",
          hospitals: []
        },
        {
          status: 400
        }
      );


    }





    const apiKey = process.env.GEOAPIFY_API_KEY;



    if (!apiKey) {


      return NextResponse.json(
        {
          message: "API key missing",
          hospitals: []
        },
        {
          status: 500
        }
      );


    }







    const url =

      `https://api.geoapify.com/v2/places?
      categories=healthcare.hospital&
      filter=circle:${lon},${lat},10000&
      bias=proximity:${lon},${lat}&
      limit=20&
      apiKey=${apiKey}`.replace(/\s+/g, "");








    const response = await fetch(url);



    const data = await response.json();



    console.log("GEOAPIFY RESPONSE:", data);








    const hospitals = (data.features || []).map((place:any)=>{


      const p = place.properties;



      return {


        name:

          p.name || "Hospital",




        address:

          p.formatted || "Address not available",




        lat:

          p.lat,




        lon:

          p.lon,

        distance:
            p.distance || 0,




        phone:

          p.phone ||
          p.datasource?.raw?.phone ||
          "",




        website:

          p.website ||
          p.datasource?.raw?.website ||
          "",




        openingHours:

          p.opening_hours ||
          p.datasource?.raw?.opening_hours ||
          "Not available",




        category:

          p.categories?.[0] ||
          "Hospital"



      };



    });








    return NextResponse.json(

      {
        hospitals
      },

      {
        status:200
      }

    );






  }

  catch(error){


    console.log("Hospital API Error:", error);



    return NextResponse.json(

      {
        message:"Hospital fetch failed",
        hospitals:[]
      },

      {
        status:500
      }

    );


  }


}