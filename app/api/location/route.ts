import { NextResponse } from "next/server";


export async function GET(request: Request) {


  try {


    const { searchParams } = new URL(request.url);


    const city = searchParams.get("city");

    const state = searchParams.get("state");



    if (!city || !state) {


      return NextResponse.json(

        {
          message: "City and State required"
        },

        {
          status:400
        }

      );


    }





    const apiKey = process.env.GEOAPIFY_API_KEY;



    if(!apiKey){


      return NextResponse.json(

        {
          message:"API key missing"
        },

        {
          status:500
        }

      );


    }







    const url =

    `https://api.geoapify.com/v1/geocode/search?
    text=${city},${state},India&
    apiKey=${apiKey}`.replace(/\s+/g,"");







    const response = await fetch(url);



    const data = await response.json();







    if(!data.features || data.features.length === 0){


      return NextResponse.json(

        {
          message:"Location not found"
        },

        {
          status:404
        }

      );


    }








    const place = data.features[0].properties;







    return NextResponse.json(


      {


        lat: place.lat,


        lon: place.lon,


        city: place.city,


        state: place.state



      },


      {

        status:200

      }


    );





  }

  catch(error){


    console.error("Location API Error:", error);



    return NextResponse.json(

      {
        message:"Location fetch failed"
      },

      {
        status:500
      }

    );


  }


}