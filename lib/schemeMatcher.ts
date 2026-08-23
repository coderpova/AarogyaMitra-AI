export interface UserProfile {
  age: number;
  gender: string;
  state: string;
  income: number;
  category: string;
  pregnant: boolean;
  seniorCitizen: boolean;
  disability: boolean;
  student?: boolean;
  farmer?: boolean;
  unemployed?: boolean;
}

export interface SchemeEligibility {
  minAge?: number;
  maxAge?: number;
  maxIncome?: number;
  gender?: string;
  pregnant?: boolean;
  seniorCitizen?: boolean;
  disability?: boolean;
  student?: boolean;
  farmer?: boolean;
  unemployed?: boolean;
}

export interface Scheme {
  _id?: string;
  id?: string | number;
  name: string;
  description: string;
  benefit: string;
  category?: string;
  state?: string;
  tags?: string[];
  documents?: string[];
  officialLink?: string;
  eligibility?: SchemeEligibility;
  matchReasons?: string[];
  isEligible?: boolean;
}

export function normalizeState(inputState: string): string {
  if (!inputState) return "";
  const clean = inputState.trim().toLowerCase();
  if (clean === "up" || clean === "u.p." || clean === "uttar pradesh") {
    return "Uttar Pradesh";
  }
  if (clean === "mh" || clean === "maharashtra") {
    return "Maharashtra";
  }
  if (clean === "dl" || clean === "delhi") {
    return "Delhi";
  }
  return inputState;
}

export function checkBasicEligibility(user: UserProfile, scheme: Scheme): boolean {
  const rule = scheme.eligibility || {};

  if (rule.minAge !== undefined && user.age > 0 && user.age < rule.minAge) {
    return false;
  }
  if (rule.maxAge !== undefined && user.age > 0 && user.age > rule.maxAge) {
    return false;
  }
  if (rule.maxIncome !== undefined && user.income > 0 && user.income > rule.maxIncome) {
    return false;
  }
  if (
    rule.gender &&
    rule.gender !== "any" &&
    user.gender &&
    rule.gender.toLowerCase() !== user.gender.toLowerCase()
  ) {
    return false;
  }
  if (rule.pregnant === true && user.pregnant !== true) {
    return false;
  }
  if (rule.seniorCitizen === true && user.seniorCitizen !== true) {
    return false;
  }
  if (rule.disability === true && user.disability !== true) {
    return false;
  }

  return true;
}

export function matchAndRankSchemes(
  user: UserProfile,
  schemes: Scheme[],
  searchQuery: string = "",
  selectedCategory: string = ""
): Scheme[] {
  const q = searchQuery.toLowerCase().trim();
  const targetState = normalizeState(user.state || (q.includes("uttar pradesh") || q.includes("up") ? "Uttar Pradesh" : ""));

  const results = schemes.map((scheme) => {
    let score = 0;
    const matchReasons: string[] = [];

    const nameLower = scheme.name.toLowerCase();
    const descLower = scheme.description.toLowerCase();
    const benefitLower = scheme.benefit.toLowerCase();
    const catLower = (scheme.category || "").toLowerCase();
    const schemeStateNorm = normalizeState(scheme.state || "All India");
    const tags = (scheme.tags || []).map((t) => t.toLowerCase());

    // 1. Basic Demographic Eligibility Check
    const isEligible = checkBasicEligibility(user, scheme);
    if (isEligible) {
      score += 10;
    }

    // 2. Category Filter Selection
    if (selectedCategory && selectedCategory !== "All") {
      const selCatLower = selectedCategory.toLowerCase();
      if (!catLower.includes(selCatLower) && !tags.some((t) => t.includes(selCatLower))) {
        return { scheme, score: -100, isEligible, matchReasons: [] };
      } else {
        score += 30;
        matchReasons.push(`Category: ${scheme.category || selectedCategory}`);
      }
    }

    // 3. Search Query Matching & Ranking
    if (q) {
      // Check state mention in query
      if (q.includes("uttar pradesh") || q.includes("up")) {
        if (schemeStateNorm === "Uttar Pradesh") {
          score += 40;
          matchReasons.push("State: Uttar Pradesh");
        } else if (schemeStateNorm !== "All India") {
          // Scheme belongs to another specific state
          return { scheme, score: -100, isEligible, matchReasons: [] };
        }
      }

      // Keyword / Intent checks
      const isStudentQuery = q.includes("student") || q.includes("scholarship") || q.includes("education") || q.includes("school") || q.includes("college");
      const isPregnantQuery = q.includes("pregnant") || q.includes("maternal") || q.includes("mother") || q.includes("women") || q.includes("mahila");
      const isSeniorQuery = q.includes("senior") || q.includes("elderly") || q.includes("pension") || q.includes("old age");
      const isHealthQuery = q.includes("health") || q.includes("insurance") || q.includes("hospital") || q.includes("medical");
      const isFarmerQuery = q.includes("farmer") || q.includes("kisan") || q.includes("agriculture") || q.includes("crop");
      const isYouthQuery = q.includes("unemployed") || q.includes("youth") || q.includes("job") || q.includes("skill") || q.includes("employment") || q.includes("berojgar");
      const isHousingQuery = q.includes("housing") || q.includes("house") || q.includes("awas") || q.includes("home");

      if (isStudentQuery) {
        if (catLower.includes("education") || tags.includes("student") || tags.includes("scholarship")) {
          score += 50;
          if (q.includes("scholarship")) matchReasons.push("Scholarship");
          matchReasons.push("Education & Student");
        }
      }

      if (isPregnantQuery) {
        if (catLower.includes("women") || tags.includes("pregnant") || tags.includes("women") || scheme.eligibility?.pregnant) {
          score += 50;
          matchReasons.push("Maternal & Women Welfare");
        }
      }

      if (isSeniorQuery) {
        if (catLower.includes("senior") || tags.includes("senior citizen") || tags.includes("pension") || scheme.eligibility?.seniorCitizen) {
          score += 50;
          matchReasons.push("Senior Citizens");
        }
      }

      if (isHealthQuery) {
        if (catLower.includes("health") || tags.includes("health") || tags.includes("insurance")) {
          score += 50;
          matchReasons.push("Healthcare & Insurance");
        }
      }

      if (isFarmerQuery) {
        if (catLower.includes("farmer") || tags.includes("farmer") || tags.includes("kisan")) {
          score += 50;
          matchReasons.push("Farmers & Agriculture");
        }
      }

      if (isYouthQuery) {
        if (catLower.includes("employment") || tags.includes("unemployed") || tags.includes("youth")) {
          score += 50;
          matchReasons.push("Employment & Skill");
        }
      }

      if (isHousingQuery) {
        if (catLower.includes("housing") || tags.includes("housing") || tags.includes("awas")) {
          score += 50;
          matchReasons.push("Housing Assistance");
        }
      }

      // Title & Text exact substring matches
      if (nameLower.includes(q)) {
        score += 60;
        matchReasons.push("Title Match");
      } else {
        const terms = q.split(/\s+/).filter((t) => t.length > 2);
        terms.forEach((term) => {
          if (nameLower.includes(term)) {
            score += 20;
          }
          if (descLower.includes(term) || benefitLower.includes(term)) {
            score += 10;
          }
          if (tags.some((tag) => tag.includes(term))) {
            score += 15;
          }
        });
      }
    } else {
      // No query entered: return all valid schemes ordered by form eligibility
      if (targetState && (schemeStateNorm === targetState || schemeStateNorm === "All India")) {
        score += 20;
        matchReasons.push(`State: ${schemeStateNorm}`);
      }
    }

    // Default match reason if none added
    if (matchReasons.length === 0 && score > 0) {
      matchReasons.push(`Category: ${scheme.category || "Government Assistance"}`);
    }

    // Remove duplicates from matchReasons
    const uniqueReasons = Array.from(new Set(matchReasons));

    return {
      scheme: {
        ...scheme,
        matchReasons: uniqueReasons,
        isEligible,
      },
      score,
      isEligible,
      matchReasons: uniqueReasons,
    };
  });

  // Filter out negative scores when search query is entered
  const filtered = q || selectedCategory
    ? results.filter((r) => r.score > 15)
    : results.filter((r) => r.score >= 0);

  // Sort by score descending
  filtered.sort((a, b) => b.score - a.score);

  return filtered.map((r) => r.scheme);
}

export function matchSchemes(user: UserProfile, schemes: Scheme[]): Scheme[] {
  return matchAndRankSchemes(user, schemes, "", "");
}