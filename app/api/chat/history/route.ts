import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";

import Chat from "@/models/chat"





export async function POST(req: Request) {


  try {



    const { userId } = await req.json();

    if(!userId){
      return NextResponse.json(
        {
          message:"User id required"
        },
        {
          status:400
        }
      );
    }

    await connectDB();

    const chats = await Chat.find({
      userId:userId
    })
    .sort({
      createdAt:1
    })
    .limit(50);

    return NextResponse.json({
      chats
    });

  }
  catch(error){
    console.error(
      "HISTORY ERROR:",
      error
    );




    return NextResponse.json(

      {


        message:"Failed to fetch history"


      },

      {


        status:500

      }

    );



  }



}