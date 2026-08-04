"use client";

import {
  useState,
  useEffect,
  useRef
} from "react";


import {
  Send,
  Bot,
  User,
  ArrowLeft,
  Mic,
  Volume2,
  Trash2,
  Stethoscope
} from "lucide-react";


import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";





interface Message {

  role:"user" | "ai";

  text:string;

}








export default function ChatPage(){



const router = useRouter();



const {user}=useAuth();





const [message,setMessage]=useState("");

const [loading,setLoading]=useState(false);


const [listening,setListening]=useState(false);


const [voiceOpen,setVoiceOpen]=useState(false);





const chatEndRef = useRef<HTMLDivElement>(null);






const [messages,setMessages]=useState<Message[]>([


{

role:"ai",

text:
"Namaste 👋 Main AarogyaMitra AI hoon. Aapki health problem me doctor ki tarah guide kar sakta hoon."

}


]);









// ==========================
// AI VOICE REPLY
// ==========================


const speakReply=(text:string)=>{


if(typeof window==="undefined")

return;




const speech = new SpeechSynthesisUtterance(text);



speech.rate=0.9;


speech.pitch=1;





if(/[\u0900-\u097F]/.test(text)){


speech.lang="hi-IN";


}



else if(/[\u0980-\u09FF]/.test(text)){


speech.lang="bn-IN";


}



else if(/[\u0B80-\u0BFF]/.test(text)){


speech.lang="ta-IN";


}



else{


speech.lang="en-IN";


}






window.speechSynthesis.cancel();


window.speechSynthesis.speak(speech);



};









// ==========================
// AUTO SCROLL
// ==========================


useEffect(()=>{


chatEndRef.current?.scrollIntoView({

behavior:"smooth"

});


},[messages]);
// ==========================
// LOAD OLD CHAT
// ==========================


useEffect(()=>{


const loadHistory = async()=>{


if(!user?.email)

return;



try{


const res = await fetch(

"/api/chat/history",

{

method:"POST",

headers:{

"Content-Type":"application/json"

},


body:JSON.stringify({

userId:user.email

})


}

);





const data = await res.json();





if(res.ok && data.chats?.length){



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

text:
"Namaste 👋 Main AarogyaMitra AI hoon. Aapki health me kaise help kar sakta hoon?"

},


...oldMessages



]);



}





}


catch(error){


console.log(

"History error:",

error

);


}



};



loadHistory();



},[user]);













// ==========================
// VOICE INPUT
// ==========================



const startListening=()=>{



const SpeechRecognition =

(window as any).SpeechRecognition ||

(window as any).webkitSpeechRecognition;




if(!SpeechRecognition){


alert(

"Speech recognition supported nahi hai. Chrome use karo."

);


return;


}




const recognition = new SpeechRecognition();




recognition.lang = navigator.language || "en-IN";


recognition.continuous=false;


recognition.interimResults=false;





setVoiceOpen(true);


setListening(true);





try{


recognition.start();



}


catch(error){


console.log(

"Mic start error",

error

);


}






recognition.onresult=(event:any)=>{


const text =

event.results[0][0].transcript;




console.log(

"Voice text:",

text

);




setMessage(text);



};







recognition.onerror=(event:any)=>{


console.log(

"Mic Error:",

event.error

);



setListening(false);


setVoiceOpen(false);



};






recognition.onend=()=>{


setListening(false);


setVoiceOpen(false);



};



};












// ==========================
// SEND MESSAGE
// ==========================



const sendMessage=async()=>{


if(!message.trim() || loading)

return;




const userText=message;





setMessages(prev=>[

...prev,

{

role:"user",

text:userText

}

]);






setMessage("");

setLoading(true);







try{



const res = await fetch(

"/api/chat",

{

method:"POST",


headers:{


"Content-Type":"application/json"


},


body:JSON.stringify({


message:userText,


userId:user?.email || "guest"


})


}

);







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







// AI VOICE START

speakReply(data.reply);







}



catch(error){


console.log(error);





setMessages(prev=>[


...prev,


{


role:"ai",

text:
"Sorry, abhi response generate nahi ho pa raha."


}


]);




}



finally{


setLoading(false);


}



};







// ==========================
// CLEAR CHAT
// ==========================



const clearChat=()=>{


setMessages([


{

role:"ai",

text:
"Namaste 👋 Main AarogyaMitra AI hoon. Aapki health problem bataiye."

}


]);



};
// ==========================
// RETURN UI START
// ==========================


return (


<div

className="
h-screen
flex
flex-col
bg-gray-100
dark:bg-gray-950
"

>






{/* VOICE POPUP */}



{

voiceOpen &&


<div

className="
fixed
inset-0
z-50
bg-black/50
flex
items-center
justify-center
"

>



<div

className="
bg-white
dark:bg-gray-900
rounded-3xl
p-10
text-center
shadow-2xl
"

>


<div

className="
w-32
h-32
mx-auto
rounded-full
bg-blue-600
flex
items-center
justify-center
animate-pulse
"

>


<Mic

size={55}

className="text-white"

/>



</div>






<h2

className="
text-2xl
font-bold
mt-6
dark:text-white
"

>

Listening...

</h2>





<p

className="
text-gray-500
mt-2
"

>

Apni health problem boliye

</p>





<button


onClick={()=>{


setVoiceOpen(false);

setListening(false);


}}



className="
mt-6
bg-red-500
text-white
px-6
py-3
rounded-xl
"

>


Cancel


</button>





</div>


</div>



}








{/* HEADER */}



<div

className="
bg-blue-700
text-white
p-5
flex
items-center
justify-between
"

>



<div

className="
flex
items-center
gap-4
"

>



<button

onClick={()=>router.back()}


className="
bg-white/20
p-2
rounded-xl
"

>


<ArrowLeft size={22}/>


</button>







<Stethoscope size={35}/>







<div>


<h1

className="
text-2xl
font-bold
"

>

AarogyaMitra AI

</h1>



<p

className="
text-blue-100
"

>

Healthcare Assistant • Online

</p>


</div>




</div>









<button

onClick={clearChat}


className="
bg-white/20
p-3
rounded-xl
"

>


🗑️


</button>




</div>













{/* CHAT AREA */}



<div

className="
flex-1
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


<Bot

size={28}

className="
text-blue-600
mt-2
"

/>



}









<div

className={`

max-w-xl
p-4
rounded-2xl
whitespace-pre-wrap


${
msg.role==="user"


?


"bg-blue-600 text-white"


:


"bg-white dark:bg-gray-800 dark:text-white"

}


`}

>


{msg.text}



</div>










{

msg.role==="ai" &&



<button


onClick={()=>speakReply(msg.text)}


className="
text-blue-600
mt-3
hover:scale-110
transition
"


title="Listen"


>



<Volume2 size={22}/>



</button>



}








{

msg.role==="user" &&


<User

size={28}

className="
mt-2
"

/>


}





</div>



))


}







{

loading &&



<p

className="
text-gray-500
"

>


AarogyaMitra AI is typing...


</p>



}







<div ref={chatEndRef}/>




</div>


<div

className="
border-t
bg-white
dark:bg-gray-900
p-4
"

>



<div

className="
flex
items-center
gap-3
bg-gray-100
dark:bg-gray-800
rounded-2xl
px-4
py-2
"

>







<input


value={message}



onChange={(e)=>setMessage(e.target.value)}



onKeyDown={(e)=>{


if(e.key==="Enter")

sendMessage();


}}




placeholder={


listening

?

"Sun raha hoon..."

:

"Apni health problem bataiye..."


}




className="
flex-1
bg-transparent
outline-none
px-2
py-3
dark:text-white
"


/>









{/* MIC BUTTON */}



<button


onClick={startListening}



disabled={loading}



className="
text-green-600
hover:scale-110
transition
"


title="Voice Input"


>


<Mic size={27}/>



</button>









{/* SEND BUTTON */}



<button


onClick={sendMessage}



disabled={loading}



className="
bg-blue-600
hover:bg-blue-700
text-white
p-3
rounded-xl
"


>



<Send size={20}/>



</button>







</div>



</div>








</div>


);



}
