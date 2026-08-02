"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import { useAuth } from "@/context/AuthContext";


export default function Login() {


  const router = useRouter();

  const { login } = useAuth();



  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");




  const handleLogin = async () => {


    if (!email || !password) {


      toast.error("Please fill all fields");

      return;


    }





    try {


      const res = await fetch("/api/login", {


        method:"POST",


        headers:{


          "Content-Type":"application/json",


        },


        body:JSON.stringify({


          email,

          password,


        }),


      });






      const data = await res.json();






      if(!res.ok){


        toast.error(data.message);

        return;


      }







      // Update Auth Context

      login(


        {

          name:data.user.name,

          email:data.user.email,


        },


        data.token


      );







      // Save token in cookie for middleware

      Cookies.set(

        "token",

        data.token,

        {

          expires:7,

        }

      );







      toast.success("Login Successful!");






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
      transition-colors
      duration-300
      px-6
      "
    >


      <div
        className="
        bg-white
        dark:bg-gray-900
        border
        border-gray-200
        dark:border-gray-800
        p-8
        rounded-2xl
        shadow-xl
        w-full
        max-w-md
        page-animation
        "
      >


        <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-400 text-center">

          Login

        </h1>



        <p className="text-center text-gray-600 dark:text-gray-400 mt-2">

          Welcome back to AarogyaMitra AI

        </p>





        <div className="mt-8">

          <label className="block mb-2 font-medium text-gray-800 dark:text-white">

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

          <label className="block mb-2 font-medium text-gray-800 dark:text-white">

            Password

          </label>


          <Input

            type="password"

            value={password}

            onChange={(e)=>setPassword(e.target.value)}

            placeholder="Enter your password"

          />


        </div>






        <Button

          onClick={handleLogin}

          className="mt-8 w-full h-12 text-base"

        >

          Login


        </Button>





        <p className="text-center text-gray-600 dark:text-gray-400 mt-6">

          Don't have an account?


          <a

            href="/register"

            className="
            ml-2
            text-blue-600
            dark:text-blue-400
            hover:underline
            "

          >

            Register


          </a>


        </p>


      </div>


    </main>

  );

}