export interface ScoringChild {
  category: string;
  secondary_category?: string | null;
  functioning_level: number;
  framework: string;
}

export interface ScoringProfessional {
  id: string;
  display_name: string;
  specialties: string[];
  experience_years: number;
  rating_avg: number;
  rating_count: number;
  created_at: string | Date; // Platform registration date to determine seniority
}

export interface MatchScoreResult {
  score: number;
  reasons: string[];
  match_reason: string; // Combined Hebrew text explanation
}

/**
 * Calculates the match score (0-100) between a child and a professional candidate,
 * along with a Hebrew explanation of the matching highlights.
 * 
 * Based on get_matches_for_child() database logic in DEVELOPMENT_PLAN.md v2.0.
 */
export function calculateMatchScore(
  child: ScoringChild,
  pro: ScoringProfessional,
  distanceKm: number
): MatchScoreResult {
  let score = 0;
  const reasons: string[] = [];

  // ============================================================
  // 1. Diagnosis Experience (max 30 points)
  // ============================================================
  let hasPrimarySpecialty = false;
  if (pro.specialties.includes(child.category)) {
    score += 30;
    hasPrimarySpecialty = true;
    reasons.push(`ניסיון עם ${child.category}`);
  } else if (child.secondary_category && pro.specialties.includes(child.secondary_category)) {
    score += 15;
    reasons.push(`ניסיון עם ${child.secondary_category}`);
  }

  // ============================================================
  // 2. Experience / Certifications (max 20 points)
  // ============================================================
  const expPoints = Math.min(pro.experience_years * 2, 20);
  score += expPoints;
  if (pro.experience_years >= 3) {
    reasons.push(`${pro.experience_years} שנות ניסיון`);
  }

  // ============================================================
  // 3. Parent Rating (max 20 points)
  // ============================================================
  if (pro.rating_count >= 3) {
    const ratingPoints = Math.round(pro.rating_avg * 4); // 5.0 -> 20 points
    score += ratingPoints;
    reasons.push(`דירוג ${pro.rating_avg.toFixed(1)}/5`);
  } else {
    score += 5; // New professional baseline
  }

  // ============================================================
  // 4. Geographic Proximity (max 15 points)
  // ============================================================
  if (distanceKm <= 2) {
    score += 15;
  } else if (distanceKm <= 5) {
    score += 12;
  } else if (distanceKm <= 10) {
    score += 8;
  } else if (distanceKm <= 15) {
    score += 4;
  }
  reasons.push(`${distanceKm.toFixed(1)} ק"מ`);

  // ============================================================
  // 5. Platform Tenure (max 15 points)
  // ============================================================
  const createdDate = new Date(pro.created_at);
  const now = new Date();
  const monthsDiff = (now.getFullYear() - createdDate.getFullYear()) * 12 + (now.getMonth() - createdDate.getMonth());
  const tenurePoints = Math.min(Math.max(monthsDiff, 0) * 1.5, 15);
  score += tenurePoints;

  // Round score to nearest integer
  const finalScore = Math.min(Math.round(score), 100);

  // Build match explanation string (Hebrew, separated by middle-dot)
  const matchReason = reasons.filter(Boolean).join(" · ");

  return {
    score: finalScore,
    reasons,
    match_reason: matchReason,
  };
}
