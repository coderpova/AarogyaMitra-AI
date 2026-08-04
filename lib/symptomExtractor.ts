import { medicalKnowledge } from "./medicalKnowledge";



export function extractSymptoms(message:string){


  const text = message.toLowerCase();



  const detectedSymptoms:any[] = [];



  // =========================
  // SYMPTOM DETECTION
  // =========================


  Object.entries(medicalKnowledge)
  .forEach(([name,data]:any)=>{


    data.keywords.forEach((keyword:string)=>{


      if(text.includes(keyword.toLowerCase())){


        detectedSymptoms.push({

          name:name,

          emergency:data.emergency || false,

          questions:data.questions || []

        });


      }


    });


  });







  // =========================
  // DURATION DETECTION
  // =========================


  let duration = "";



  const durationMatch = text.match(
    /(\d+)\s*(day|days|din|week|weeks|hafte)/
  );



  if(durationMatch){


    duration = durationMatch[0];


  }







  // =========================
  // TEMPERATURE DETECTION
  // =========================


  let temperature:number|null = null;



  // Case 1:
  // 104 degree / 104°F / 104 f

  let tempMatch = text.match(
    /(\d+)\s*(degree|°f|f)/
  );



  // Case 2:
  // temperature 104

  if(!tempMatch){


    tempMatch = text.match(
      /temperature\s*(\d+)/
    );


  }





  if(tempMatch){


    temperature = Number(tempMatch[1]);


  }







  // =========================
  // RETURN NLP DATA
  // =========================


  return {


    symptoms:detectedSymptoms,


    duration,


    temperature



  };



}