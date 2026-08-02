"use client";

import Link from "next/link";

import {
  Menu,
  X,
  HeartPulse,
  LogOut,
  Settings,
} from "lucide-react";

import { useState, useEffect } from "react";

import { useAuth } from "@/context/AuthContext";

import { useRouter } from "next/navigation";

import Cookies from "js-cookie";



export default function Navbar() {


  const [menuOpen, setMenuOpen] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);



  const { logout } = useAuth();


  const router = useRouter();




  useEffect(() => {


    const checkAuth = () => {


      const token = localStorage.getItem("token");

      const user = localStorage.getItem("user");



      if(token && user){

        setIsLoggedIn(true);

      }

      else{

        setIsLoggedIn(false);

      }


    };



    checkAuth();



    window.addEventListener(
      "auth-change",
      checkAuth
    );



    window.addEventListener(
      "storage",
      checkAuth
    );



    return () => {


      window.removeEventListener(
        "auth-change",
        checkAuth
      );


      window.removeEventListener(
        "storage",
        checkAuth
      );


    };


  }, []);






  const handleLogout = () => {



    Cookies.remove("token");


    localStorage.removeItem("token");

    localStorage.removeItem("user");



    logout();



    setIsLoggedIn(false);



    window.dispatchEvent(
      new Event("auth-change")
    );



    setMenuOpen(false);



    router.replace("/");


  };








  return (


    <nav
      className="
      sticky
      top-0
      z-50
      bg-white/90
      dark:bg-gray-950/90
      backdrop-blur-lg
      border-b
      shadow-sm
      "
    >



      <div
        className="
        max-w-7xl
        mx-auto
        px-6
        py-4
        flex
        justify-between
        items-center
        "
      >



        {/* Logo */}


        <Link
          href="/"
          className="flex items-center gap-2"
        >


          <HeartPulse
            className="text-blue-600 w-8 h-8"
          />


          <span
            className="
            text-2xl
            font-bold
            text-blue-700
            "
          >

            AarogyaMitra AI

          </span>


        </Link>







        {/* Desktop Menu */}


        <div
          className="
          hidden
          md:flex
          gap-8
          items-center
          "
        >


          <Link href="/">

            Home

          </Link>



          <a href="#features">

            Features

          </a>



          <a href="#statistics">

            Statistics

          </a>




          {
          isLoggedIn &&

          <Link href="/dashboard">

            Dashboard

          </Link>

          }



        </div>










        {/* Desktop Buttons */}



        <div
          className="
          hidden
          md:flex
          gap-3
          "
        >




        {

        !isLoggedIn ?


        (


          <>


          <Link href="/login">

            <button
              className="
              border
              border-blue-600
              px-5
              py-2
              rounded-xl
              "
            >

              Login

            </button>


          </Link>






          <Link href="/register">


            <button
              className="
              bg-blue-600
              text-white
              px-5
              py-2
              rounded-xl
              "
            >

              Register

            </button>


          </Link>



          </>


        )


        :


        (


          <>


          <Link href="/settings">


            <button
              className="
              flex
              items-center
              gap-2
              border
              px-5
              py-2
              rounded-xl
              "
            >


              <Settings size={18}/>


              Settings


            </button>


          </Link>







          <button

            onClick={handleLogout}

            className="
            flex
            items-center
            gap-2
            bg-red-600
            text-white
            px-5
            py-2
            rounded-xl
            "
          >


            <LogOut size={18}/>


            Logout


          </button>




          </>


        )


        }



        </div>









        {/* Mobile Button */}



        <button

          className="md:hidden"

          onClick={()=>setMenuOpen(!menuOpen)}

        >


          {

          menuOpen ?

          <X/>

          :

          <Menu/>

          }


        </button>



      </div>









      {/* Mobile Menu */}


      {

      menuOpen &&


      <div
        className="
        md:hidden
        p-5
        flex
        flex-col
        gap-5
        "
      >



        <Link href="/">

          Home

        </Link>



        <a href="#features">

          Features

        </a>



        <a href="#statistics">

          Statistics

        </a>





        {

        isLoggedIn &&


        <Link href="/dashboard">

          Dashboard

        </Link>

        }







        {

        !isLoggedIn ?


        (

          <>


          <Link href="/login">

            Login

          </Link>



          <Link href="/register">

            Register

          </Link>


          </>


        )


        :


        (

          <>


          <Link href="/settings">

            Settings

          </Link>





          <button

            onClick={handleLogout}

            className="
            text-left
            text-red-600
            "

          >

            Logout

          </button>



          </>


        )


        }



      </div>


      }



    </nav>


  );

}