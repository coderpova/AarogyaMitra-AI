export interface UserProfile {
  age: number;
  gender: string;
  state: string;
  income: number;
  category: string;
  pregnant: boolean;
  seniorCitizen: boolean;
  disability: boolean;
}


export function matchSchemes(
  user: UserProfile,
  schemes: any[]
) {

  return schemes.filter((scheme) => {

    const rule = scheme.eligibility || {};



    // Minimum Age

    if (
      rule.minAge !== undefined &&
      user.age < rule.minAge
    ) {
      return false;
    }



    // Maximum Age

    if (
      rule.maxAge !== undefined &&
      user.age > rule.maxAge
    ) {
      return false;
    }



    // Maximum Income

    if (
      rule.maxIncome !== undefined &&
      user.income > rule.maxIncome
    ) {
      return false;
    }



    // Gender Check

    if (
      rule.gender &&
      rule.gender !== "any" &&
      rule.gender.toLowerCase() !== user.gender.toLowerCase()
    ) {
      return false;
    }



    // Pregnant Check
    // Only filter when scheme requires pregnancy

    if (
      rule.pregnant === true &&
      user.pregnant !== true
    ) {
      return false;
    }



    // Senior Citizen Check
    // Only filter when scheme requires senior citizen

    if (
      rule.seniorCitizen === true &&
      user.seniorCitizen !== true
    ) {
      return false;
    }



    // Disability Check
    // Only filter when scheme requires disability

    if (
      rule.disability === true &&
      user.disability !== true
    ) {
      return false;
    }



    return true;

  });

}