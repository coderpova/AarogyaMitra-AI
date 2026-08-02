"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";

import {
  Pill,
  Clock,
  Trash2,
  Plus
} from "lucide-react";

import { useEffect, useState } from "react";

import toast from "react-hot-toast";



export default function MedicinesPage() {


  const [medicines,setMedicines] = useState<any[]>([]);

  const [loading,setLoading] = useState(true);

  const [showForm,setShowForm] = useState(false);



  const [formData,setFormData] = useState({

    name:"",
    dose:"",
    time:"",
    reminder:false

  });






  useEffect(()=>{

    fetchMedicines();

  },[]);







  const fetchMedicines = async()=>{


    try{


      const token = localStorage.getItem("token");


      const res = await fetch("/api/medicines",{

        headers:{

          Authorization:`Bearer ${token}`

        }

      });



      const data = await res.json();



      if(res.ok){

        setMedicines(data.medicines || []);

      }



    }
    catch(error){

      console.log(error);

      toast.error("Unable to fetch medicines");

    }
    finally{

      setLoading(false);

    }


  };









  const addMedicine = async()=>{


    try{


      const token = localStorage.getItem("token");



      const res = await fetch("/api/medicines",{


        method:"POST",


        headers:{


          "Content-Type":"application/json",

          Authorization:`Bearer ${token}`


        },


        body:JSON.stringify(formData)


      });





      const data = await res.json();




      if(res.ok){


        toast.success("Medicine Added");


        setMedicines(data.medicines);



        setFormData({

          name:"",
          dose:"",
          time:"",
          reminder:false

        });



        setShowForm(false);


      }
      else{

        toast.error(data.message);

      }


    }
    catch(error){

      console.log(error);

      toast.error("Something went wrong");

    }


  };








  const deleteMedicine = async(id:string)=>{


    try{


      const token = localStorage.getItem("token");



      const res = await fetch("/api/medicines",{


        method:"DELETE",


        headers:{


          "Content-Type":"application/json",

          Authorization:`Bearer ${token}`


        },


        body:JSON.stringify({

          id

        })


      });





      if(res.ok){


        toast.success("Medicine Deleted");


        fetchMedicines();


      }



    }
    catch(error){

      console.log(error);

    }


  };









  if(loading){


    return(

      <DashboardLayout>

        <div className="p-10">

          Loading Medicines...

        </div>

      </DashboardLayout>

    )

  }








  return(


    <DashboardLayout>


      <div className="page-animation">





        <div className="
          bg-blue-700
          text-white
          rounded-3xl
          p-8
        ">


          <h1 className="text-4xl font-bold">

            Medicine Reminder

          </h1>


          <p className="text-blue-100 mt-2">

            Never miss your medicines.

          </p>


        </div>







        <div className="flex justify-end mt-6">


          <button


            onClick={()=>setShowForm(!showForm)}


            className="
            bg-blue-600
            text-white
            px-5
            py-3
            rounded-xl
            flex
            items-center
            gap-2
            "


          >


            <Plus size={18}/>

            Add Medicine


          </button>


        </div>








        {
          showForm &&


          <div className="
          bg-white
          dark:bg-gray-900
          rounded-3xl
          shadow-lg
          p-8
          mt-6
          grid
          gap-4
          ">


            <input

              placeholder="Medicine Name"

              value={formData.name}


              onChange={(e)=>
                setFormData({
                  ...formData,
                  name:e.target.value
                })
              }


              className="border p-3 rounded-xl"

            />




            <input

              placeholder="Dose"

              value={formData.dose}


              onChange={(e)=>
                setFormData({
                  ...formData,
                  dose:e.target.value
                })
              }


              className="border p-3 rounded-xl"

            />





            <input

              placeholder="Time"

              value={formData.time}


              onChange={(e)=>
                setFormData({
                  ...formData,
                  time:e.target.value
                })
              }


              className="border p-3 rounded-xl"

            />






            <label className="flex gap-2">


              <input

                type="checkbox"

                checked={formData.reminder}


                onChange={(e)=>
                  setFormData({
                    ...formData,
                    reminder:e.target.checked
                  })
                }

              />


              Reminder


            </label>







            <button

              onClick={addMedicine}


              className="
              bg-green-600
              text-white
              p-3
              rounded-xl
              "

            >

              Save Medicine

            </button>




          </div>


        }









        <div className="
        grid
        md:grid-cols-2
        lg:grid-cols-3
        gap-6
        mt-8
        ">



          {

          medicines.map((medicine)=>(


            <div

              key={medicine._id}

              className="
              bg-white
              dark:bg-gray-900
              rounded-2xl
              shadow-lg
              p-6
              "

            >



              <div className="flex justify-between items-center">


                <div className="flex items-center gap-3">


                  <Pill className="text-blue-600"/>


                  <h2 className="
                  text-xl
                  font-bold
                  dark:text-white
                  ">

                    {medicine.name}

                  </h2>


                </div>



                <button

                onClick={()=>deleteMedicine(medicine._id)}

                >

                  <Trash2 className="text-red-500"/>


                </button>



              </div>






              <p className="mt-5 dark:text-gray-300">

                Dose : {medicine.dose}

              </p>





              <div className="
              flex
              items-center
              gap-2
              mt-3
              dark:text-gray-300
              ">


                <Clock size={18}/>


                {medicine.time}


              </div>





              {
                medicine.reminder &&

                <p className="text-green-600 mt-4">

                  Reminder ON

                </p>

              }



            </div>


          ))

          }



        </div>





      </div>


    </DashboardLayout>


  );

}