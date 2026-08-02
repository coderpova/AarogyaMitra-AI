import { NextResponse } from "next/server";

import Groq from "groq-sdk";

import connectDB from "@/lib/mongodb";

import Chat from "@/models/chat";





const groq = new Groq({

  apiKey: process.env.GROQ_API_KEY,

});









export async function POST(req: Request) {


  try {



    const { message, userId } = await req.json();







    if(!message || message.trim() === ""){


      return NextResponse.json(

        {


          message:"Message required"


        },

        {


          status:400


        }


      );


    }









    // GROQ AI RESPONSE


    const chatCompletion = await groq.chat.completions.create({




      model:"llama-3.1-8b-instant",





      messages:[



        {


          role:"system",



          content:`

You are AarogyaMitra AI, a healthcare assistant.

Rules:

- Give simple health guidance.
- Do not provide final medical diagnosis.
- Ask follow-up questions when symptoms are unclear.
- Suggest doctor consultation when required.
- For emergency symptoms advise immediate medical help.

`

        },






        {


          role:"user",



          content:message


        }




      ],





      temperature:0.7,



      max_tokens:500




    });












    const reply =


      chatCompletion

      .choices[0]

      ?.message

      ?.content ||


      "Sorry, I could not generate response.";













    // SAVE CHAT TO MONGODB


    try{



      await connectDB();





      await Chat.create({



        userId:userId || "guest",



        message:message,



        reply:reply



      });





      console.log("Chat Saved ✅");





    }

    catch(dbError){



      console.log(

        "Mongo Save Error:",

        dbError

      );



    }












    return NextResponse.json({


      reply


    });







  }

  catch(error){



    console.log(

      "GROQ ERROR:",

      error

    );






    return NextResponse.json(

      {


        message:"AI response failed"


      },


      {


        status:500


      }


    );




  }



}