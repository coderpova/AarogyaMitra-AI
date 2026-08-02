"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Moon,
  Bell,
  Globe,
  Shield,
  LogOut,
} from "lucide-react";


export default function SettingsPage() {


  return (

    <DashboardLayout>


      <div className="page-animation">


        {/* Header */}


        <div className="
          bg-blue-700
          text-white
          rounded-3xl
          p-8
        ">


          <h1 className="text-4xl font-bold">
            Settings
          </h1>


          <p className="text-blue-100 mt-2">
            Manage your application preferences.
          </p>


        </div>






        {/* Settings Container */}



        <div className="
          bg-white
          dark:bg-gray-900
          rounded-3xl
          shadow-lg
          mt-8
          p-8
          space-y-6
        ">





          <SettingCard

            icon={<Moon />}

            title="Dark Mode"

            description="Enable dark mode"

          />



          <SettingCard

            icon={<Bell />}

            title="Notifications"

            description="Manage medicine reminders and alerts"

          />



          <SettingCard

            icon={<Globe />}

            title="Language"

            description="Hindi / English / Regional Languages"

          />



          <SettingCard

            icon={<Shield />}

            title="Privacy"

            description="Manage your health data privacy"

          />







          <button

            className="
            flex
            items-center
            gap-3
            bg-red-600
            text-white
            px-6
            py-3
            rounded-xl
            hover:bg-red-700
            transition
            hover:scale-105
            "

          >

            <LogOut size={20}/>

            Logout


          </button>




        </div>


      </div>


    </DashboardLayout>

  );

}








function SettingCard({

  icon,

  title,

  description,

}: {

  icon: React.ReactNode;

  title: string;

  description: string;

}) {


  return (


    <div className="
      flex
      items-center
      justify-between
      border
      border-gray-200
      dark:border-gray-700
      rounded-xl
      p-5
      transition
      hover:bg-gray-50
      dark:hover:bg-gray-800
    ">





      <div className="flex items-center gap-4">



        <div className="
          text-blue-700
          dark:text-blue-400
        ">

          {icon}

        </div>





        <div>



          <h2 className="
            font-bold
            dark:text-white
          ">

            {title}

          </h2>





          <p className="
            text-gray-500
            dark:text-gray-400
            text-sm
          ">

            {description}

          </p>



        </div>




      </div>






      <button

        className="
        bg-blue-600
        text-white
        px-4
        py-2
        rounded-lg
        hover:bg-blue-700
        transition
        "

      >

        Configure


      </button>





    </div>


  );

}