import { calculateMatchScore, ScoringChild, ScoringProfessional } from "../matching";

describe("Together Platform — Matching Algorithm Unit Tests", () => {
  // Test child: Autism, level 2, regular school
  const mockChild: ScoringChild = {
    category: "autism",
    secondary_category: "adhd",
    functioning_level: 2,
    framework: "regular_school",
  };

  test("Perfect Match — returns high score and complete details", () => {
    const perfectPro: ScoringProfessional = {
      id: "pro-perfect-1",
      display_name: "רות דוד",
      specialties: ["autism", "communication"],
      experience_years: 10,
      rating_avg: 5.0,
      rating_count: 5,
      // Registered 11 months ago to get full platform tenure points (11 * 1.5 = 16.5 -> capped at 15)
      created_at: new Date(new Date().setMonth(new Date().getMonth() - 11)),
    };

    const result = calculateMatchScore(mockChild, perfectPro, 1.5); // 1.5km distance (15 points)

    // Score calculations check:
    // 30 (primary specialty) + 20 (exp capped) + 20 (5.0 rating * 4) + 15 (1.5km distance) + 15 (tenure points) = 100 points
    expect(result.score).toBe(100);
    expect(result.reasons).toContain("ניסיון עם autism");
    expect(result.reasons).toContain("10 שנות ניסיון");
    expect(result.reasons).toContain("דירוג 5.0/5");
    expect(result.reasons).toContain("1.5 ק\"מ");
    expect(result.match_reason).toBe("ניסיון עם autism · 10 שנות ניסיון · דירוג 5.0/5 · 1.5 ק\"מ");
  });

  test("Partial Match — secondary specialty and average details", () => {
    const averagePro: ScoringProfessional = {
      id: "pro-average-1",
      display_name: "דנה כהן",
      specialties: ["adhd", "dyslexia"], // adhd is secondary category for the child
      experience_years: 3,
      rating_avg: 4.5,
      rating_count: 4,
      // Registered 5 months ago (5 * 1.5 = 7.5 points)
      created_at: new Date(new Date().setMonth(new Date().getMonth() - 5)),
    };

    const result = calculateMatchScore(mockChild, averagePro, 4.2); // 4.2km distance (12 points)

    // Score calculations check:
    // 15 (secondary specialty) + 6 (3 years exp * 2) + 18 (4.5 rating * 4) + 12 (4.2km distance) + 7.5 (tenure) = 58.5 -> rounded to 59
    expect(result.score).toBe(59);
    expect(result.reasons).toContain("ניסיון עם adhd");
    expect(result.reasons).toContain("3 שנות ניסיון");
    expect(result.reasons).toContain("דירוג 4.5/5");
    expect(result.reasons).toContain("4.2 ק\"מ");
    expect(result.match_reason).toBe("ניסיון עם adhd · 3 שנות ניסיון · דירוג 4.5/5 · 4.2 ק\"מ");
  });

  test("New User / Baseline Match — no ratings, no specialties, close distance", () => {
    const newPro: ScoringProfessional = {
      id: "pro-new-1",
      display_name: "שירה לוי",
      specialties: ["down_syndrome"],
      experience_years: 1,
      rating_avg: 0,
      rating_count: 0,
      created_at: new Date(), // Registered today (0 points tenure)
    };

    const result = calculateMatchScore(mockChild, newPro, 0.8); // 0.8km distance (15 points)

    // Score calculations check:
    // 0 (no specialty match) + 2 (1 year exp * 2) + 5 (new user baseline rating) + 15 (0.8km distance) + 0 (tenure) = 22 points
    expect(result.score).toBe(22);
    expect(result.reasons).not.toContain("ניסיון עם autism");
    expect(result.reasons).not.toContain("ניסיון עם adhd");
    expect(result.reasons).toContain("0.8 ק\"מ");
    // Since exp < 3 years and rating < 3 counts, they shouldn't appear in reasons
    expect(result.match_reason).toBe("0.8 ק\"מ");
  });

  test("Zero Match — extreme distance and no qualifications", () => {
    const badPro: ScoringProfessional = {
      id: "pro-bad-1",
      display_name: "מישהו רחוק",
      specialties: ["other"],
      experience_years: 0,
      rating_avg: 0,
      rating_count: 0,
      created_at: new Date(),
    };

    const result = calculateMatchScore(mockChild, badPro, 20.0); // 20km distance (0 points)

    // Score calculations check:
    // 0 (no specialty) + 0 (0 exp) + 5 (new user baseline rating) + 0 (20km distance) + 0 (tenure) = 5 points
    expect(result.score).toBe(5);
    expect(result.match_reason).toBe("20.0 ק\"מ");
  });
});
