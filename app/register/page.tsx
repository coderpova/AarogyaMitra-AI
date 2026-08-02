"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import Cookies from "js-cookie";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

import { useAuth } from "@/context/AuthContext";


export default function Register() {


  const router = useRouter();

  const { login } = useAuth();



  const [name, setName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");





  const handleRegister = async () => {


    if (!name || !email || !password) {


      toast.error("Please fill all fields");

      return;


    }




    try {


      const response = await fetch("/api/register", {


        method:"POST",


        headers:{


          "Content-Type":"application/json",


        },


        body:JSON.stringify({


          name,

          email,

          password,


        }),


      });






      const data = await response.json();






      if(!response.ok){


        toast.error(data.message);

        return;


      }








      // AuthContext update

      login(

        {

          name:data.user.name,

          email:data.user.email

        },

        data.token

      );





      // Save token in cookie

      Cookies.set(

        "token",

        data.token,

        {

          expires:7,

        }

      );





      toast.success("Registration successful");





      setName("");

      setEmail("");

      setPassword("");





      router.push("/dashboard");





    }

    catch(error){


      console.log(error);


      toast.error("Something went wrong");


    }


  };
    return (

    <main

      className="
      min-h-screen
      flex
      items-center
      justify-center
      bg-blue-50
      dark:bg-gray-950
      px-6
      "

    >





      <div

        className="
        bg-white
        dark:bg-gray-900
        rounded-2xl
        shadow-xl
        p-8
        w-full
        max-w-md
        page-animation
        "

      >




        <h1

          className="
          text-3xl
          font-bold
          text-center
          text-blue-700
          dark:text-blue-400
          "

        >

          Register

        </h1>







        <p

          className="
          text-center
          text-gray-600
          dark:text-gray-400
          mt-2
          "

        >

          Create your AarogyaMitra AI account

        </p>









        <div className="mt-8">


          <label className="block mb-2 font-medium">

            Name

          </label>



          <Input

            type="text"

            value={name}

            onChange={(e)=>setName(e.target.value)}

            placeholder="Enter your name"

          />



        </div>









        <div className="mt-5">


          <label className="block mb-2 font-medium">

            Email

          </label>



          <Input

            type="email"

            value={email}

            onChange={(e)=>setEmail(e.target.value)}

            placeholder="Enter your email"

          />



        </div>









        <div className="mt-5">


          <label className="block mb-2 font-medium">

            Password

          </label>



          <Input

            type="password"

            value={password}

            onChange={(e)=>setPassword(e.target.value)}

            placeholder="Create password"

          />



        </div>









        <Button

          onClick={handleRegister}

          className="mt-8 w-full h-12"

        >

          Register

        </Button>









        <p className="text-center mt-6 text-gray-600">


          Already have an account?


          <Link

            href="/login"

            className="
            ml-2
            text-blue-600
            font-semibold
            "

          >

            Login

          </Link>


        </p>







      </div>




    </main>


  );


}