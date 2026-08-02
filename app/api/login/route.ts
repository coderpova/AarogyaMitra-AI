import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


export async function POST(request: Request) {

  try {

    await connectDB();


    const { email, password } = await request.json();


    if (!email || !password) {

      return NextResponse.json(
        {
          message: "Please fill all fields"
        },
        {
          status: 400
        }
      );

    }



    const user = await User.findOne({ email });



    if (!user) {

      return NextResponse.json(
        {
          message: "User not found"
        },
        {
          status: 404
        }
      );

    }




    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );



    if (!isPasswordCorrect) {

      return NextResponse.json(
        {
          message: "Invalid password"
        },
        {
          status: 401
        }
      );

    }




    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email
      },

      process.env.JWT_SECRET!,

      {
        expiresIn: "7d"
      }

    );




    return NextResponse.json(
      {
        message: "Login successful",
        token,
        user:{
          name:user.name,
          email:user.email
        }
      },

      {
        status:200
      }

    );



  } catch(error) {


    console.log(error);


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