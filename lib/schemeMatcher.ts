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

export interface SchemeEligibility {
  minAge?: number;
  maxAge?: number;
  maxIncome?: number;
  gender?: string;
  pregnant?: boolean;
  seniorCitizen?: boolean;
  disability?: boolean;
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

  // Age checks
  if (rule.minAge !== undefined && user.age > 0 && user.age < rule.minAge) {
    return false;
  }
  if (rule.maxAge !== undefined && user.age > 0 && user.age > rule.maxAge) {
    return false;
  }

  // Income ceiling check
  if (rule.maxIncome !== undefined && user.income > 0 && user.income > rule.maxIncome) {
    return false;
  }

  // Gender check
  if (
    rule.gender &&
    rule.gender.toLowerCase() !== "any" &&
    user.gender &&
    rule.gender.toLowerCase() !== user.gender.toLowerCase()
  ) {
    return false;
  }

  // Maternal care check
  if (rule.pregnant === true && user.pregnant !== true) {
    return false;
  }

  // Senior citizen check (age 60+ or explicit flag)
  if (rule.seniorCitizen === true && user.seniorCitizen !== true && user.age < 60) {
    return false;
  }

  // Disability check
  if (rule.disability === true && user.disability !== true) {
    return false;
  }

  // State mismatch check
  if (user.state && scheme.state && scheme.state !== "All India") {
    const userStateNorm = normalizeState(user.state);
    const schemeStateNorm = normalizeState(scheme.state);
    if (userStateNorm && schemeStateNorm && userStateNorm !== schemeStateNorm) {
      return false;
    }
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
  const userStateNorm = normalizeState(user.state);

  const results = schemes.map((scheme) => {
    let score = 0;
    const matchReasons: string[] = [];

    const nameLower = scheme.name.toLowerCase();
    const descLower = scheme.description.toLowerCase();
    const benefitLower = scheme.benefit.toLowerCase();
    const catLower = (scheme.category || "").toLowerCase();
    const schemeStateNorm = normalizeState(scheme.state || "All India");
    const tags = (scheme.tags || []).map((t) => t.toLowerCase());

    // 1. Demographic & State Eligibility
    const isEligible = checkBasicEligibility(user, scheme);

    if (isEligible) {
      score += 20;

      // Add specific match reasons based on user profile inputs
      if (userStateNorm && (schemeStateNorm === userStateNorm || schemeStateNorm === "All India")) {
        matchReasons.push(`State: ${schemeStateNorm}`);
        score += 15;
      }

      if (user.income > 0 && scheme.eligibility?.maxIncome) {
        matchReasons.push(`Income Eligible (≤ ₹${scheme.eligibility.maxIncome.toLocaleString("en-IN")})`);
        score += 10;
      }

      if ((user.age >= 60 || user.seniorCitizen) && (scheme.eligibility?.seniorCitizen || catLower.includes("senior"))) {
        matchReasons.push("Senior Healthcare");
        score += 15;
      }

      if (user.pregnant && (scheme.eligibility?.pregnant || catLower.includes("maternal"))) {
        matchReasons.push("Maternal Healthcare");
        score += 15;
      }

      if (user.disability && (scheme.eligibility?.disability || catLower.includes("disability"))) {
        matchReasons.push("Disability Support");
        score += 15;
      }
    } else {
      // Ineligible schemes get reduced score when user filtering is active
      score -= 50;
    }

    // 2. Category Filter
    if (selectedCategory && selectedCategory !== "All") {
      const selCatLower = selectedCategory.toLowerCase();
      const catMatches = catLower.includes(selCatLower) || tags.some((t) => t.includes(selCatLower));
      if (!catMatches) {
        return { scheme: { ...scheme, isEligible: false }, score: -100, isEligible: false, matchReasons: [] };
      } else {
        score += 30;
        matchReasons.push(`Category: ${scheme.category || selectedCategory}`);
      }
    }

    // 3. Search Query Keyword Matching
    if (q) {
      // State search in query
      if (q.includes("uttar pradesh") || q.includes("up")) {
        if (schemeStateNorm === "Uttar Pradesh") {
          score += 40;
          matchReasons.push("State: Uttar Pradesh");
        } else if (schemeStateNorm !== "All India") {
          return { scheme: { ...scheme, isEligible: false }, score: -100, isEligible: false, matchReasons: [] };
        }
      } else if (q.includes("maharashtra") || q.includes("mh")) {
        if (schemeStateNorm === "Maharashtra") {
          score += 40;
          matchReasons.push("State: Maharashtra");
        } else if (schemeStateNorm !== "All India") {
          return { scheme: { ...scheme, isEligible: false }, score: -100, isEligible: false, matchReasons: [] };
        }
      } else if (q.includes("delhi") || q.includes("dl")) {
        if (schemeStateNorm === "Delhi") {
          score += 40;
          matchReasons.push("State: Delhi");
        } else if (schemeStateNorm !== "All India") {
          return { scheme: { ...scheme, isEligible: false }, score: -100, isEligible: false, matchReasons: [] };
        }
      }

      // Healthcare Intent keywords
      const isPregnantQuery = q.includes("pregnant") || q.includes("maternal") || q.includes("mother") || q.includes("delivery") || q.includes("janani");
      const isSeniorQuery = q.includes("senior") || q.includes("elderly") || q.includes("old age") || q.includes("vayoshri") || q.includes("vaya");
      const isInsuranceQuery = q.includes("insurance") || q.includes("ayushman") || q.includes("cashless") || q.includes("pmjay");
      const isDisabilityQuery = q.includes("disability") || q.includes("disabled") || q.includes("udid") || q.includes("wheelchair");
      const isCancerQuery = q.includes("cancer") || q.includes("ran") || q.includes("illness") || q.includes("surgery");

      if (isPregnantQuery && (catLower.includes("maternal") || tags.includes("pregnant"))) {
        score += 40;
        matchReasons.push("Maternal Healthcare");
      }
      if (isSeniorQuery && (catLower.includes("senior") || tags.includes("senior citizen"))) {
        score += 40;
        matchReasons.push("Senior Healthcare");
      }
      if (isInsuranceQuery && (catLower.includes("insurance") || tags.includes("insurance"))) {
        score += 40;
        matchReasons.push("Health Insurance");
      }
      if (isDisabilityQuery && (catLower.includes("disability") || tags.includes("disability"))) {
        score += 40;
        matchReasons.push("Disability Support");
      }
      if (isCancerQuery && (catLower.includes("assistance") || tags.includes("cancer"))) {
        score += 40;
        matchReasons.push("Medical Assistance");
      }

      // Substring matches
      if (nameLower.includes(q)) {
        score += 50;
        matchReasons.push("Title Match");
      } else {
        const terms = q.split(/\s+/).filter((t) => t.length > 2);
        terms.forEach((term) => {
          if (nameLower.includes(term)) score += 20;
          if (descLower.includes(term) || benefitLower.includes(term)) score += 10;
          if (tags.some((tag) => tag.includes(term))) score += 15;
        });
      }
    }

    // Default match reason
    if (matchReasons.length === 0 && isEligible) {
      matchReasons.push(`Healthcare Benefit (${scheme.category || "Government Assistance"})`);
    }

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

  // Filter out negative/irrelevant scores when query or category is applied
  const filtered = q || selectedCategory !== "All" || user.state || user.age > 0 || user.income > 0 || user.pregnant || user.disability || user.seniorCitizen
    ? results.filter((r) => r.score > 0 && r.isEligible)
    : results.filter((r) => r.score >= 0);

  // Sort by score descending
  filtered.sort((a, b) => b.score - a.score);

  return filtered.map((r) => r.scheme);
}

export function matchSchemes(user: UserProfile, schemes: Scheme[]): Scheme[] {
  return matchAndRankSchemes(user, schemes, "", "All");
}