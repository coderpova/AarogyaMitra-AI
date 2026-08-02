"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  Send,
  Bot,
  User,
  ArrowLeft,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";



interface Message {

  role: "user" | "ai";

  text: string;

}






export default function ChatPage() {



  const router = useRouter();



  const { user } = useAuth();




  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);





  const [messages, setMessages] = useState<Message[]>([


    {

      role:"ai",

      text:"Hello 👋 I am AarogyaMitra AI. How can I help you today?"

    }


  ]);









  // LOAD CHAT HISTORY AFTER REFRESH


  useEffect(()=>{



    const loadHistory = async()=>{


      if(!user?.email) return;



      try{



        const res = await fetch("/api/chat/history",{


          method:"POST",


          headers:{


            "Content-Type":"application/json"


          },


          body:JSON.stringify({


            userId:user.email


          })


        });







        const data = await res.json();





        if(res.ok && data.chats.length>0){



          const oldMessages:Message[]=[];




          data.chats.reverse().forEach((chat:any)=>{



            oldMessages.push({


              role:"user",


              text:chat.message


            });





            oldMessages.push({


              role:"ai",


              text:chat.reply


            });



          });






          setMessages([


            {

              role:"ai",

              text:"Hello 👋 I am AarogyaMitra AI. How can I help you today?"

            },



            ...oldMessages


          ]);



        }





      }

      catch(error){


        console.log(error);


      }



    };





    loadHistory();




  },[user]);












  const sendMessage = async()=>{



    if(!message.trim() || loading) return;




    const userMessage = message;




    setMessages(prev=>[

      ...prev,

      {

        role:"user",

        text:userMessage

      }

    ]);




    setMessage("");

    setLoading(true);







    try{



      const res = await fetch("/api/chat",{



        method:"POST",



        headers:{



          "Content-Type":"application/json"


        },



        body:JSON.stringify({



          message:userMessage,



          userId:user?.email || "guest"



        })



      });







      const data = await res.json();





      if(!res.ok){


        throw new Error(data.message);


      }






      setMessages(prev=>[


        ...prev,



        {


          role:"ai",


          text:data.reply


        }


      ]);





    }

    catch(error){



      console.log(error);



      setMessages(prev=>[


        ...prev,

        {


          role:"ai",


          text:"Sorry, something went wrong."


        }


      ]);



    }

    finally{


      setLoading(false);


    }



  };














  return (



    <div

      className="
      min-h-screen
      bg-gray-100
      dark:bg-gray-950
      p-6
      "

    >




      <div

        className="
        max-w-4xl
        mx-auto
        bg-white
        dark:bg-gray-900
        rounded-3xl
        shadow-xl
        overflow-hidden
        "

      >






        <div

          className="
          bg-blue-700
          text-white
          p-6
          flex
          items-center
          gap-4
          "

        >



          <button

            onClick={()=>router.back()}

            className="
            bg-white/20
            px-4
            py-2
            rounded-xl
            flex
            items-center
            gap-2
            "

          >

            <ArrowLeft size={18}/>

            Back


          </button>






          <Bot size={35}/>



          <div>


            <h1 className="text-2xl font-bold">

              AarogyaMitra AI

            </h1>


            <p className="text-blue-100">

              Healthcare Assistant

            </p>


          </div>



        </div>









        <div

          className="
          h-[500px]
          overflow-y-auto
          p-6
          space-y-5
          "

        >



        {

          messages.map((msg,index)=>(


            <div

            key={index}

            className={`

            flex

            gap-3

            items-start

            ${
              msg.role==="user"

              ?

              "justify-end"

              :

              "justify-start"

            }

            `}

            >





            {

            msg.role==="ai" &&

            <Bot className="text-blue-600"/>

            }





            <div

            className={`

            max-w-md

            p-4

            rounded-2xl

            whitespace-pre-wrap


            ${
              msg.role==="user"

              ?

              "bg-blue-600 text-white"

              :

              "bg-gray-200 dark:bg-gray-800 dark:text-white"

            }


            `}

            >


              {msg.text}


            </div>





            {

            msg.role==="user" &&

            <User/>

            }



            </div>



          ))

        }





        {

          loading &&

          <p className="text-gray-500">

            AI is thinking...

          </p>

        }




        </div>








        <div

        className="
        border-t
        p-5
        flex
        gap-3
        "

        >



          <input


          value={message}


          onChange={(e)=>setMessage(e.target.value)}



          onKeyDown={(e)=>{


            if(e.key==="Enter")

              sendMessage();


          }}



          placeholder="Ask your health problem..."



          className="
          flex-1
          border
          rounded-xl
          px-4
          py-3
          dark:bg-gray-800
          dark:text-white
          "


          />







          <button


          onClick={sendMessage}


          disabled={loading}



          className="
          bg-blue-600
          hover:bg-blue-700
          disabled:opacity-50
          text-white
          px-5
          rounded-xl
          "


          >


            <Send/>


          </button>






        </div>






      </div>




    </div>


  );

}