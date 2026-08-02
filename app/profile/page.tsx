"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";

import {
  User,
  Mail,
  Phone,
  HeartPulse,
  Calendar,
  Globe,
  MapPin,
  Pencil,
  Save,
} from "lucide-react";

import toast from "react-hot-toast";


export default function ProfilePage() {


  const [user,setUser] = useState<any>(null);

  const [editMode,setEditMode] = useState(false);

  const [loading,setLoading] = useState(true);



  const [formData,setFormData] = useState({

    age:"",
    gender:"",
    bloodGroup:"",
    phone:"",
    address:"",

  });



  useEffect(()=>{

    fetchUser();

  },[]);



  const fetchUser = async()=>{

    try{


      const token = localStorage.getItem("token");


      if(!token){

        toast.error("Please login first");
        return;

      }



      const res = await fetch("/api/user",{

        headers:{

          Authorization:`Bearer ${token}`

        }

      });



      const data = await res.json();



      if(res.ok){


        setUser(data.user);



        setFormData({

          age:data.user.profile?.age || "",

          gender:data.user.profile?.gender || "",

          bloodGroup:data.user.profile?.bloodGroup || "",

          phone:data.user.profile?.phone || "",

          address:data.user.profile?.address || "",

        });



      }
      else{

        toast.error(data.message);

      }


    }
    catch(error){

      console.log(error);

      toast.error("Something went wrong");

    }
    finally{

      setLoading(false);

    }


  };






  const handleUpdate = async()=>{


    try{


      const token = localStorage.getItem("token");



      const res = await fetch("/api/user",{

        method:"PUT",

        headers:{

          "Content-Type":"application/json",

          Authorization:`Bearer ${token}`

        },


        body:JSON.stringify(formData)


      });



      const data = await res.json();



      if(res.ok){


        toast.success("Profile Updated Successfully");


        setUser(data.user);


        setEditMode(false);



      }
      else{


        toast.error(data.message);


      }



    }
    catch(error){

      console.log(error);

      toast.error("Update failed");

    }


  };




  if(loading){

    return (

      <DashboardLayout>

        <div className="p-10 text-xl">
          Loading profile...
        </div>

      </DashboardLayout>

    );

  }





  return (

    <DashboardLayout>


      <div className="page-animation">



        <div className="
        bg-blue-700
        text-white
        rounded-3xl
        p-8
        ">


          <h1 className="text-4xl font-bold">
            My Profile
          </h1>


          <p className="text-blue-100 mt-2">
            Manage your healthcare profile.
          </p>


        </div>






        <div className="
        bg-white
        dark:bg-gray-900
        rounded-3xl
        shadow-lg
        mt-8
        p-8
        ">


          <div className="flex items-center gap-8">


            <div className="
            w-36
            h-36
            rounded-full
            bg-blue-100
            flex
            items-center
            justify-center
            ">


              <User
              size={70}
              className="text-blue-700"
              />


            </div>



            <div>


              <h2 className="
              text-3xl
              font-bold
              dark:text-white
              ">

                {user?.name}

              </h2>



              <p className="text-gray-500">

                {user?.email}

              </p>




              <button

              onClick={()=>setEditMode(!editMode)}

              className="
              mt-5
              bg-blue-600
              text-white
              px-5
              py-2
              rounded-xl
              flex
              gap-2
              items-center
              "

              >

                <Pencil size={18}/>

                {editMode?"Cancel":"Edit Profile"}

              </button>


            </div>


          </div>


        </div>






        {
        editMode &&

        <div className="
        bg-white
        dark:bg-gray-900
        rounded-3xl
        shadow-lg
        mt-8
        p-8
        grid
        md:grid-cols-2
        gap-5
        ">


          {
          Object.keys(formData).map((key)=>(
            
            <input

            key={key}

            placeholder={key}

            value={(formData as any)[key]}

            onChange={(e)=>

              setFormData({

                ...formData,

                [key]:e.target.value

              })

            }


            className="
            border
            p-3
            rounded-xl
            "

            />

          ))

          }



          <button

          onClick={handleUpdate}

          className="
          bg-green-600
          text-white
          rounded-xl
          p-3
          flex
          justify-center
          gap-2
          md:col-span-2
          "

          >

          <Save size={18}/>

          Save Changes

          </button>



        </div>

        }






        <div className="
        grid
        md:grid-cols-2
        gap-6
        mt-8
        ">


          <InfoCard
          icon={<Mail/>}
          title="Email"
          value={user?.email}
          />


          <InfoCard
          icon={<Phone/>}
          title="Phone"
          value={user?.profile?.phone || "Not Added"}
          />


          <InfoCard
          icon={<HeartPulse/>}
          title="Blood Group"
          value={user?.profile?.bloodGroup || "Not Added"}
          />


          <InfoCard
          icon={<Calendar/>}
          title="Age"
          value={
            user?.profile?.age
            ? `${user.profile.age} Years`
            :"Not Added"
          }
          />


          <InfoCard
          icon={<Globe/>}
          title="Language"
          value="Hindi / English"
          />


          <InfoCard
          icon={<User/>}
          title="Gender"
          value={user?.profile?.gender || "Not Added"}
          />


          <InfoCard
          icon={<MapPin/>}
          title="Address"
          value={user?.profile?.address || "Not Added"}
          />


        </div>


      </div>


    </DashboardLayout>

  );

}






function InfoCard({

icon,

title,

value,

}:{

icon:React.ReactNode;

title:string;

value:string;

}){


return (

<div className="
bg-white
dark:bg-gray-900
rounded-2xl
shadow-lg
p-6
">


<div className="flex gap-3 items-center">

{icon}

<h2 className="font-semibold dark:text-white">

{title}

</h2>

</div>


<p className="mt-4 text-gray-600 dark:text-gray-300">

{value}

</p>


</div>

);


}