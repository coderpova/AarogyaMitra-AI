"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Calendar,
  Clock,
  UserRound,
  Hospital,
} from "lucide-react";
import toast from "react-hot-toast";


const appointments = [

  {
    doctor: "Dr. Raj Sharma",
    hospital: "AIIMS Delhi",
    date: "12 August 2026",
    time: "10:30 AM",
    status: "Confirmed",
  },

  {
    doctor: "Dr. Priya Singh",
    hospital: "Apollo Hospital",
    date: "18 August 2026",
    time: "02:00 PM",
    status: "Pending",
  },

];



export default function AppointmentsPage() {


  const bookAppointment = () => {

    toast.success("Appointment booking feature coming soon!");

  };



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

            My Appointments

          </h1>


          <p className="text-blue-100 mt-2">

            Manage your doctor appointments.

          </p>


        </div>






        {/* Add Button */}



        <div className="flex justify-end mt-6">


          <button

            onClick={bookAppointment}

            className="
            bg-blue-600
            text-white
            px-5
            py-3
            rounded-xl
            hover:bg-blue-700
            transition
            hover:scale-105
            "

          >

            + Book Appointment

          </button>


        </div>







        {/* Appointment Cards */}



        <div className="
          grid
          md:grid-cols-2
          gap-6
          mt-8
        ">



          {appointments.map((appointment,index)=>(



            <div

              key={index}

              className="
              bg-white
              dark:bg-gray-900
              rounded-2xl
              shadow-lg
              p-6
              transition
              hover:shadow-2xl
              hover:-translate-y-2
              "

            >



              <div className="flex items-center gap-3">


                <div className="
                  bg-blue-100
                  dark:bg-blue-900
                  p-3
                  rounded-full
                ">


                  <UserRound

                    className="
                    text-blue-700
                    dark:text-blue-300
                    "

                  />


                </div>




                <h2 className="
                  text-xl
                  font-bold
                  dark:text-white
                ">

                  {appointment.doctor}

                </h2>



              </div>







              <div className="
                mt-5
                space-y-3
                text-gray-600
                dark:text-gray-300
              ">


                <p className="flex items-center gap-2">

                  <Hospital size={18}/>

                  {appointment.hospital}

                </p>



                <p className="flex items-center gap-2">

                  <Calendar size={18}/>

                  {appointment.date}

                </p>



                <p className="flex items-center gap-2">

                  <Clock size={18}/>

                  {appointment.time}

                </p>



              </div>







              <div className="mt-5">


                <span className="
                  bg-green-100
                  dark:bg-green-900
                  text-green-700
                  dark:text-green-300
                  px-3
                  py-1
                  rounded-full
                  text-sm
                  font-semibold
                ">

                  {appointment.status}

                </span>


              </div>



            </div>



          ))}



        </div>



      </div>


    </DashboardLayout>

  );

}