interface HealthData {

  symptoms:string[];

  duration?:string;

  temperature?:number;

  chestPain?:boolean;

  breathingProblem?:boolean;

}



export function calculateRisk(data:HealthData){


  let risk = "Low";

  let reason = "Normal symptoms";



  // Emergency condition

  if(
    data.chestPain ||
    data.breathingProblem
  ){

    return {

      risk:"High",

      reason:
      "Chest pain or breathing difficulty detected"

    };

  }




  // High fever

  if(
    data.temperature &&
    data.temperature >= 103
  ){

    risk="High";

    reason="High fever detected";

  }




  // Fever for many days

  else if(
    data.duration &&
    data.duration.includes("day")
  ){

    risk="Medium";

    reason=
    "Fever continuing for multiple days";

  }



  return {

    risk,

    reason

  };


}