import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";


// ================= GET USER =================

export async function GET(request: Request) {

  try {

    await connectDB();


    const authHeader = request.headers.get("authorization");


    if (!authHeader) {

      return NextResponse.json(
        {
          message: "No token provided"
        },
        {
          status: 401
        }
      );

    }


    const token = authHeader.split(" ")[1];


    const decoded:any = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );


    const user = await User.findById(
      decoded.userId
    ).select("-password");


    if (!user) {

      return NextResponse.json(
        {
          message:"User not found"
        },
        {
          status:404
        }
      );

    }


    return NextResponse.json(
      {
        user
      },
      {
        status:200
      }
    );


  } catch(error) {


    console.log(error);


    return NextResponse.json(
      {
        message:"Invalid token"
      },
      {
        status:401
      }
    );

  }

}





// ================= UPDATE PROFILE =================


export async function PUT(request: Request) {


  try {


    await connectDB();


    const authHeader = request.headers.get("authorization");


    if (!authHeader) {

      return NextResponse.json(
        {
          message:"No token provided"
        },
        {
          status:401
        }
      );

    }



    const token = authHeader.split(" ")[1];


    const decoded:any = jwt.verify(
      token,
      process.env.JWT_SECRET!
    );



    const body = await request.json();

    const updatedUser = await User.findByIdAndUpdate(
      decoded.userId,
      {
        $set:{
          "profile.age": Number(body.age),
          "profile.gender": body.gender,
          "profile.bloodGroup": body.bloodGroup,
          "profile.phone": body.phone,
          "profile.address": body.address
        }
      },
      {
        new:true
      }
    ).select("-password");

    return NextResponse.json(
      {
        message:"Profile updated successfully",
        user:updatedUser
      },
      {
        status:200
      }
    );

  } catch(error) {
    console.error("User profile update error:", error);


    return NextResponse.json(

      {
        message:"Internal Server Error"
      },

      {
        status:500
      }

    );

  }

}