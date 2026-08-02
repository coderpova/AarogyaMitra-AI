"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { Menu } from "lucide-react";


export default function DashboardLayout({

  children,

}: {

  children: React.ReactNode;

}) {


  const [open, setOpen] = useState(false);



  return (

    <div
      className="
      min-h-screen
      bg-gray-100
      dark:bg-gray-950
      flex
      "
    >


      {/* Sidebar */}

      <Sidebar
        open={open}
        setOpen={setOpen}
      />





      {/* Main Content */}


      <div
        className="
        flex-1
        flex
        flex-col
        text-gray-900
        dark:text-white
        "
      >




        {/* Mobile Header */}


        <div
          className="
          md:hidden
          bg-white
          dark:bg-gray-900
          p-4
          shadow
          flex
          items-center
          "
        >


          <button

            onClick={() => setOpen(true)}

            className="text-blue-700"

          >

            <Menu size={30}/>

          </button>



          <h1
            className="
            ml-4
            text-xl
            font-bold
            text-blue-700
            "
          >

            AarogyaMitra AI

          </h1>



        </div>





        <main
          className="
          p-4
          md:p-8
          flex-1
          "
        >

          {children}

        </main>





        {/* Footer */}


        <div
          className="
          bg-white
          dark:bg-gray-900
          "
        >

          <Footer />

        </div>



      </div>



    </div>

  );

}