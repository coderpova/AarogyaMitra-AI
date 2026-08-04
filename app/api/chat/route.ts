import { NextResponse } from "next/server";

import Groq from "groq-sdk";

import connectDB from "@/lib/mongodb";

import Chat from "@/models/chat";

import { getAIContext } from "@/lib/aiContext";

import { extractSymptoms } from "@/lib/symptomExtractor";




const groq = new Groq({

  apiKey: process.env.GROQ_API_KEY,

});





// LANGUAGE DETECTOR

function detectLanguage(text:string){


  const hindiPattern = /[\u0900-\u097F]/;

  const bengaliPattern = /[\u0980-\u09FF]/;

  const tamilPattern = /[\u0B80-\u0BFF]/;

  const teluguPattern = /[\u0C00-\u0C7F]/;

  const gujaratiPattern = /[\u0A80-\u0AFF]/;



  if(hindiPattern.test(text)){

    return "Hindi";

  }



  if(bengaliPattern.test(text)){

    return "Bengali";

  }



  if(tamilPattern.test(text)){

    return "Tamil";

  }



  if(teluguPattern.test(text)){

    return "Telugu";

  }



  if(gujaratiPattern.test(text)){

    return "Gujarati";

  }



  return "English";

}







export async function POST(req:Request){


try{



const {

message,

userId

}=await req.json();





if(!message || message.trim()===""){


return NextResponse.json(

{

message:"Message required"

},

{

status:400

}

);


}






// LANGUAGE DETECTION


const userLanguage = detectLanguage(message);



console.log(

"Detected Language:",

userLanguage

);


// NLP SYMPTOM EXTRACTION

const detectedSymptoms = extractSymptoms(message);


console.log(
"Detected Symptoms:",
detectedSymptoms
);








// ==========================
// AI USER CONTEXT
// ==========================


let userContext = "";



if(

userId &&

userId !== "guest"

){



try{



userContext = await getAIContext(userId);




console.log(
"=============================="
);


console.log(
"AI CONTEXT DATA:"
);


console.log(
userContext
);


console.log(
"=============================="
);



}



catch(error){



console.log(

"AI Context Error:",

error

);



}



}

else{


console.log(

"Guest User - No Context"

);


}







// ==========================
// GROQ RESPONSE
// ==========================


const chatCompletion = await groq.chat.completions.create({


model:"llama-3.1-8b-instant",



messages:[


{

role:"system",


content:`

You are AarogyaMitra AI.

You are a multilingual Indian healthcare assistant.



Detected User Language:

${userLanguage}




LANGUAGE RULES:


- Reply only in user's language.
- Never switch language.
- English input = English output.
- Hindi input = Hindi output.
- Hinglish input = Hinglish output.
- Regional Indian language = same language.



PERSONALITY:


- Talk like a caring doctor.
- Be polite.
- Understand emotions.
- Explain simply.
- Ask follow up questions.



MEDICAL SAFETY:


EMERGENCY RULES:


- If user mentions chest pain, difficulty breathing, severe shortness of breath, unconsciousness, stroke symptoms, heavy bleeding, or severe allergic reaction:
  - Treat it as a possible emergency.
  - Immediately advise seeking emergency medical help.
  - Do not delay with too many questions.
  - Ask only short safety questions after emergency advice.


Emergency response example:

"Yeh symptoms serious ho sakte hain. Kripya turant emergency medical help lein ya apne najdeeki hospital se contact karein.

Kya aap abhi akela hain? Kya koi aapke paas hai jo help kar sake?"


PATIENT DASHBOARD CONTEXT:


${userContext}

IMPORTANT PATIENT CONTEXT RULES:

- If patient name is available, address patient politely using their name.
- Use age, gender, medicines, allergies and health information when relevant.
- Do not mention hidden database information unnecessarily.
- Use patient history only when it helps answer the health question.
- Never reveal that you are reading a database.


CONVERSATION STYLE:
IMPORTANT RESPONSE QUALITY RULES:


- Never provide translation after the answer.
- Never write "Translation:".
- Always respond naturally like a real Indian doctor.
- Avoid literal translations from English.
- Use grammatically correct Hindi.
- Do not use phrases like "maine dekha hai ki".
- Prefer natural phrases like:
  "Aapne bataya hai ki..."
  "Mujhe samajh aa raha hai..."
  "Aapko ye problem kab se hai?"


SYMPTOM ANALYSIS RULES:


When user mentions a symptom:

- First acknowledge the problem politely.
- Ask relevant follow-up questions.
- Do not create unnecessary fear.
- Do not call every symptom serious.
- Use the user's language naturally.



For fever symptoms ask:

- Fever kitne din se hai?
- Temperature kitna gaya tha?
- Body pain hai?
- Cough, cold ya throat pain hai?
- Koi medicine li hai?
- Age aur existing health conditions consider karo.



For headache ask:

- Headache kaha ho raha hai?
- Pain kitna hai (1-10)?
- Kab se hai?
- Nausea, vomiting ya dizziness hai?



For stomach pain ask:

- Dard kaha hai?
- Kab se hai?
- Khana khane ke baad badhta hai?
- Vomiting ya loose motion hai?


- Never say "chinta ki baat hai" for common symptoms like mild fever, headache, cold.
- Use neutral phrases like:
  "Aapko fever hai, thoda aur detail bataiye."
  "Fever ke baare me kuch aur information lete hain."
- Only mention concern when symptoms are severe or emergency signs are present.



`

},


{

role:"user",

content:message

}


],


temperature:0.5,


max_tokens:700


});
const reply =

chatCompletion

.choices[0]

?.message

?.content ||


"Sorry, I could not generate response.";







// ==========================
// SAVE CHAT HISTORY
// ==========================


try{


await connectDB();



await Chat.create({



userId:userId || "guest",



message:message,



reply:reply



});





console.log(

"Chat Saved ✅"

);




}

catch(dbError){



console.log(

"Mongo Save Error:",

dbError

);



}











// RETURN RESPONSE


return NextResponse.json({

reply

});







}

catch(error){



console.log(

"GROQ ERROR:",

error

);





return NextResponse.json(

{

message:"AI response failed"

},

{

status:500

}

);



}



}