-- Together Platform — Seed Data
-- Development test data: 5 parents, 10 children, 15 professionals
-- Locations are in Israel (Tel Aviv, Haifa, Beer Sheva area)

-- ============================================================
-- PROFESSIONALS (via auth.users + profiles + professionals)
-- Note: In development, create users via Supabase Auth first,
-- then this seed populates the professional details.
-- For local dev, use supabase auth admin commands.
-- ============================================================

-- Sample professionals data (insert after auth users are created)
-- These are templates — actual UUIDs come from auth.users

-- Pro 1: רות — משלבת מנוסה, אוטיזם, תל אביב
-- Pro 2: מיכל — משלבת, ADHD + לקויות למידה, רמת גן
-- Pro 3: נועה — מטפלת בעיסוק, ספקטרום, חולון
-- Pro 4: שירה — משלבת, מוגבלויות פיזיות, הרצליה
-- Pro 5: דנה — משלבת חדשה, רב תחומי, תל אביב
-- Pro 6: יעל — משלבת מנוסה, אוטיזם + שכלי, חיפה
-- Pro 7: ליאת — מטפלת בדיבור, שפה ודיבור, חיפה
-- Pro 8: תמר — משלבת, ADHD, קריות
-- Pro 9: אורלי — משלבת, ראייה + שמיעה, באר שבע
-- Pro 10: הדר — משלבת, רגשי + התנהגותי, אשדוד
-- Pro 11–15: גיבוי (backup_available = true)

-- ============================================================
-- SEED SCRIPT — run after initial auth user creation
-- ============================================================

-- This function creates test data for development
-- Call it once: SELECT seed_test_data();

CREATE OR REPLACE FUNCTION seed_test_data()
RETURNS TEXT AS $$
DECLARE
  -- Parent IDs (will be created dynamically)
  parent_ids UUID[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid()
  ];
  -- Professional user IDs
  pro_user_ids UUID[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];
  pro_ids UUID[];
  child_ids UUID[];
  v_id UUID;
BEGIN
  -- ========== AUTH USERS (PARENTS) ==========
  INSERT INTO auth.users (id, phone, phone_confirmed_at, raw_user_meta_data, aud, role) VALUES
    (parent_ids[1], '0501111111', now(), '{"role": "parent"}', 'authenticated', 'authenticated'),
    (parent_ids[2], '0502222222', now(), '{"role": "parent"}', 'authenticated', 'authenticated'),
    (parent_ids[3], '0503333333', now(), '{"role": "parent"}', 'authenticated', 'authenticated'),
    (parent_ids[4], '0504444444', now(), '{"role": "parent"}', 'authenticated', 'authenticated'),
    (parent_ids[5], '0505555555', now(), '{"role": "parent"}', 'authenticated', 'authenticated');

  -- ========== AUTH USERS (PROFESSIONALS) ==========
  INSERT INTO auth.users (id, phone, phone_confirmed_at, raw_user_meta_data, aud, role) VALUES
    (pro_user_ids[1],  '0521111111', now(), '{"role": "professional"}', 'authenticated', 'authenticated'),
    (pro_user_ids[2],  '0522222222', now(), '{"role": "professional"}', 'authenticated', 'authenticated'),
    (pro_user_ids[3],  '0523333333', now(), '{"role": "professional"}', 'authenticated', 'authenticated'),
    (pro_user_ids[4],  '0524444444', now(), '{"role": "professional"}', 'authenticated', 'authenticated'),
    (pro_user_ids[5],  '0525555555', now(), '{"role": "professional"}', 'authenticated', 'authenticated'),
    (pro_user_ids[6],  '0526666666', now(), '{"role": "professional"}', 'authenticated', 'authenticated'),
    (pro_user_ids[7],  '0527777777', now(), '{"role": "professional"}', 'authenticated', 'authenticated'),
    (pro_user_ids[8],  '0528888888', now(), '{"role": "professional"}', 'authenticated', 'authenticated'),
    (pro_user_ids[9],  '0529999999', now(), '{"role": "professional"}', 'authenticated', 'authenticated'),
    (pro_user_ids[10], '0530000000', now(), '{"role": "professional"}', 'authenticated', 'authenticated'),
    (pro_user_ids[11], '0531111111', now(), '{"role": "professional"}', 'authenticated', 'authenticated'),
    (pro_user_ids[12], '0532222222', now(), '{"role": "professional"}', 'authenticated', 'authenticated'),
    (pro_user_ids[13], '0533333333', now(), '{"role": "professional"}', 'authenticated', 'authenticated'),
    (pro_user_ids[14], '0534444444', now(), '{"role": "professional"}', 'authenticated', 'authenticated'),
    (pro_user_ids[15], '0535555555', now(), '{"role": "professional"}', 'authenticated', 'authenticated');

  -- ========== PARENT PROFILES (UPDATE) ==========
  UPDATE profiles SET full_name = 'אבי כהן', area = 'תל אביב', preferred_language = 'he' WHERE id = parent_ids[1];
  UPDATE profiles SET full_name = 'מירב לוי', area = 'רמת גן', preferred_language = 'he' WHERE id = parent_ids[2];
  UPDATE profiles SET full_name = 'David Green', area = 'חיפה', preferred_language = 'en' WHERE id = parent_ids[3];
  UPDATE profiles SET full_name = 'רונית שמש', area = 'באר שבע', preferred_language = 'he' WHERE id = parent_ids[4];
  UPDATE profiles SET full_name = 'יוסי אברהם', area = 'הרצליה', preferred_language = 'he' WHERE id = parent_ids[5];

  -- ========== PROFESSIONAL PROFILES (UPDATE) ==========
  UPDATE profiles SET full_name = 'רות דוד', area = 'תל אביב', preferred_language = 'he' WHERE id = pro_user_ids[1];
  UPDATE profiles SET full_name = 'מיכל ברק', area = 'רמת גן', preferred_language = 'he' WHERE id = pro_user_ids[2];
  UPDATE profiles SET full_name = 'נועה שלום', area = 'חולון', preferred_language = 'he' WHERE id = pro_user_ids[3];
  UPDATE profiles SET full_name = 'שירה גולן', area = 'הרצליה', preferred_language = 'he' WHERE id = pro_user_ids[4];
  UPDATE profiles SET full_name = 'דנה מור', area = 'תל אביב', preferred_language = 'he' WHERE id = pro_user_ids[5];
  UPDATE profiles SET full_name = 'יעל חן', area = 'חיפה', preferred_language = 'he' WHERE id = pro_user_ids[6];
  UPDATE profiles SET full_name = 'ליאת רז', area = 'חיפה', preferred_language = 'he' WHERE id = pro_user_ids[7];
  UPDATE profiles SET full_name = 'תמר נוי', area = 'קריית ביאליק', preferred_language = 'he' WHERE id = pro_user_ids[8];
  UPDATE profiles SET full_name = 'אורלי קדם', area = 'באר שבע', preferred_language = 'he' WHERE id = pro_user_ids[9];
  UPDATE profiles SET full_name = 'הדר פלד', area = 'אשדוד', preferred_language = 'he' WHERE id = pro_user_ids[10];
  UPDATE profiles SET full_name = 'עדי רוזן', area = 'תל אביב', preferred_language = 'he' WHERE id = pro_user_ids[11];
  UPDATE profiles SET full_name = 'שגית אלון', area = 'רמת גן', preferred_language = 'he' WHERE id = pro_user_ids[12];
  UPDATE profiles SET full_name = 'ענת סגל', area = 'חיפה', preferred_language = 'he' WHERE id = pro_user_ids[13];
  UPDATE profiles SET full_name = 'Maya Cohen', area = 'תל אביב', preferred_language = 'en' WHERE id = pro_user_ids[14];
  UPDATE profiles SET full_name = 'רינת הלל', area = 'באר שבע', preferred_language = 'he' WHERE id = pro_user_ids[15];

  -- ========== PROFESSIONALS (details) ==========
  -- Tel Aviv area (lat ~32.07, lon ~34.78)
  INSERT INTO professionals (user_id, display_name, bio, type, specialties, certifications, experience_years, verified, rating_avg, rating_count, backup_available, location, max_radius_km, languages, framework_types, availability) VALUES
    (pro_user_ids[1], 'רות דוד', 'משלבת עם 8 שנות ניסיון בעבודה עם ילדים על הספקטרום. מאמינה בגישה התפתחותית ובבניית קשר.', 'mashlavit', '{autism,intellectual}', '{special_ed_cert,autism_specialist}', 8, 'verified', 4.7, 12, false, ST_SetSRID(ST_MakePoint(34.78, 32.08), 4326), 10, '{he}', '{regular_school,special_ed}',
     '{"sunday":[8,14],"monday":[8,14],"tuesday":[8,14],"wednesday":[8,14],"thursday":[8,13]}'),

    (pro_user_ids[2], 'מיכל ברק', 'מתמחה ב-ADHD ולקויות למידה. שילוב כלים מעולם ה-CBT בעבודה עם ילדים.', 'mashlavit', '{adhd,learning_disability}', '{special_ed_cert,cbt_for_children}', 5, 'verified', 4.5, 8, false, ST_SetSRID(ST_MakePoint(34.81, 32.07), 4326), 8, '{he}', '{regular_school,kindergarten}',
     '{"sunday":[8,16],"tuesday":[8,16],"thursday":[8,16]}'),

    (pro_user_ids[3], 'נועה שלום', 'מרפאה בעיסוק, עובדת עם ילדים על הספקטרום בשילוב סנסורי.', 'therapist', '{autism,emotional}', '{occupational_therapy,sensory_integration}', 6, 'verified', 4.8, 15, true, ST_SetSRID(ST_MakePoint(34.78, 32.02), 4326), 12, '{he,en}', '{regular_school,special_ed,kindergarten}',
     '{"sunday":[9,15],"monday":[9,15],"wednesday":[9,15]}'),

    (pro_user_ids[4], 'שירה גולן', 'משלבת עם ניסיון במוגבלויות פיזיות. נגישות וספורט מותאם.', 'mashlavit', '{physical}', '{special_ed_cert,adaptive_sports}', 4, 'verified', 4.3, 5, false, ST_SetSRID(ST_MakePoint(34.79, 32.16), 4326), 15, '{he}', '{regular_school,special_ed}',
     '{"sunday":[8,14],"monday":[8,14],"tuesday":[8,14],"wednesday":[8,14],"thursday":[8,14]}'),

    (pro_user_ids[5], 'דנה מור', 'בוגרת חינוך מיוחד, מתחילה בתחום. אנרגטית ומלאת מוטיבציה.', 'mashlavit', '{adhd,emotional,learning_disability}', '{special_ed_cert}', 1, 'verified', 0, 0, true, ST_SetSRID(ST_MakePoint(34.77, 32.06), 4326), 10, '{he,en}', '{regular_school,kindergarten}',
     '{"sunday":[8,16],"monday":[8,16],"tuesday":[8,16],"wednesday":[8,16],"thursday":[8,16]}');

  -- Haifa area (lat ~32.79, lon ~34.99)
  INSERT INTO professionals (user_id, display_name, bio, type, specialties, certifications, experience_years, verified, rating_avg, rating_count, backup_available, location, max_radius_km, languages, framework_types, availability) VALUES
    (pro_user_ids[6], 'יעל חן', 'משלבת בכירה עם 12 שנות ניסיון. מתמחה באוטיזם ומוגבלות שכלית.', 'mashlavit', '{autism,intellectual}', '{special_ed_cert,autism_specialist,behavioral_analysis}', 12, 'verified', 4.9, 20, false, ST_SetSRID(ST_MakePoint(34.99, 32.79), 4326), 15, '{he,ar}', '{regular_school,special_ed,special_kindergarten}',
     '{"sunday":[8,14],"monday":[8,14],"tuesday":[8,14],"wednesday":[8,14],"thursday":[8,13]}'),

    (pro_user_ids[7], 'ליאת רז', 'קלינאית תקשורת, מתמחה בהפרעות דיבור ושפה.', 'therapist', '{speech,autism}', '{speech_therapy_cert}', 7, 'verified', 4.6, 10, true, ST_SetSRID(ST_MakePoint(35.00, 32.80), 4326), 10, '{he}', '{kindergarten,special_kindergarten}',
     '{"sunday":[9,15],"tuesday":[9,15],"thursday":[9,15]}'),

    (pro_user_ids[8], 'תמר נוי', 'משלבת עם התמחות ב-ADHD, עובדת בקריות.', 'mashlavit', '{adhd,learning_disability}', '{special_ed_cert}', 3, 'verified', 4.2, 4, false, ST_SetSRID(ST_MakePoint(35.07, 32.83), 4326), 12, '{he}', '{regular_school}',
     '{"sunday":[8,14],"monday":[8,14],"wednesday":[8,14],"thursday":[8,14]}');

  -- Beer Sheva area (lat ~31.25, lon ~34.79)
  INSERT INTO professionals (user_id, display_name, bio, type, specialties, certifications, experience_years, verified, rating_avg, rating_count, backup_available, location, max_radius_km, languages, framework_types, availability) VALUES
    (pro_user_ids[9], 'אורלי קדם', 'משלבת מנוסה עם מוגבלויות חושיות — ראייה ושמיעה.', 'mashlavit', '{hearing,vision}', '{special_ed_cert,sign_language}', 9, 'verified', 4.4, 7, true, ST_SetSRID(ST_MakePoint(34.79, 31.25), 4326), 20, '{he}', '{regular_school,special_ed}',
     '{"sunday":[8,15],"monday":[8,15],"tuesday":[8,15],"wednesday":[8,15],"thursday":[8,14]}'),

    (pro_user_ids[10], 'הדר פלד', 'משלבת עם התמחות רגשית-התנהגותית, עובדת באשדוד.', 'mashlavit', '{emotional,adhd}', '{special_ed_cert,play_therapy}', 4, 'verified', 4.1, 3, false, ST_SetSRID(ST_MakePoint(34.65, 31.80), 4326), 15, '{he}', '{regular_school,kindergarten}',
     '{"sunday":[8,14],"tuesday":[8,14],"thursday":[8,14]}');

  -- Backup professionals
  INSERT INTO professionals (user_id, display_name, bio, type, specialties, certifications, experience_years, verified, rating_avg, rating_count, backup_available, location, max_radius_km, languages, framework_types, availability) VALUES
    (pro_user_ids[11], 'עדי רוזן', 'זמינה להחלפות, ניסיון רב-תחומי.', 'mashlavit', '{autism,adhd,emotional}', '{special_ed_cert}', 3, 'verified', 4.0, 2, true, ST_SetSRID(ST_MakePoint(34.78, 32.07), 4326), 8, '{he}', '{regular_school}', '{"flexible": true}'),
    (pro_user_ids[12], 'שגית אלון', 'זמינה להחלפות ברמת גן.', 'mashlavit', '{adhd,learning_disability}', '{special_ed_cert}', 2, 'verified', 0, 0, true, ST_SetSRID(ST_MakePoint(34.81, 32.07), 4326), 10, '{he}', '{regular_school,kindergarten}', '{"flexible": true}'),
    (pro_user_ids[13], 'ענת סגל', 'זמינה להחלפות בחיפה.', 'mashlavit', '{autism,intellectual}', '{special_ed_cert}', 5, 'verified', 4.3, 6, true, ST_SetSRID(ST_MakePoint(34.99, 32.79), 4326), 12, '{he}', '{regular_school,special_ed}', '{"flexible": true}'),
    (pro_user_ids[14], 'Maya Cohen', 'English-speaking integration aide, Tel Aviv.', 'mashlavit', '{adhd,learning_disability}', '{special_ed_cert}', 2, 'verified', 0, 0, true, ST_SetSRID(ST_MakePoint(34.77, 32.06), 4326), 10, '{he,en}', '{regular_school}', '{"flexible": true}'),
    (pro_user_ids[15], 'רינת הלל', 'זמינה להחלפות בבאר שבע.', 'mashlavit', '{hearing,physical}', '{special_ed_cert}', 3, 'verified', 0, 0, true, ST_SetSRID(ST_MakePoint(34.79, 31.25), 4326), 20, '{he}', '{regular_school,special_ed}', '{"flexible": true}');

  -- ========== CHILDREN ==========
  -- Parent 1 (אבי כהן, תל אביב) — 2 children
  INSERT INTO children (parent_id, first_name, age, category, functioning_level, framework, communication_verbal, published, location, needs, hours_needed) VALUES
    (parent_ids[1], 'נועם', 7, 'autism', 2, 'regular_school', false, true,
     ST_SetSRID(ST_MakePoint(34.78, 32.07), 4326),
     '{"sensory_needs": true, "regulation_support": true, "social_skills": true}',
     '{"sunday":[8,14],"monday":[8,14],"tuesday":[8,14],"wednesday":[8,14],"thursday":[8,13]}'),
    (parent_ids[1], 'עדן', 5, 'adhd', 1, 'kindergarten', true, true,
     ST_SetSRID(ST_MakePoint(34.78, 32.07), 4326),
     '{"attention_support": true, "behavioral": true}',
     '{"sunday":[8,13],"monday":[8,13],"tuesday":[8,13],"wednesday":[8,13],"thursday":[8,12]}');

  -- Parent 2 (מירב לוי, רמת גן) — 1 child
  INSERT INTO children (parent_id, first_name, age, category, functioning_level, framework, communication_verbal, published, location, needs) VALUES
    (parent_ids[2], 'אור', 9, 'learning_disability', 1, 'regular_school', true, true,
     ST_SetSRID(ST_MakePoint(34.81, 32.07), 4326),
     '{"reading_support": true, "math_support": true, "self_esteem": true}');

  -- Parent 3 (David Green, חיפה) — 2 children
  INSERT INTO children (parent_id, first_name, age, category, functioning_level, framework, communication_verbal, published, location, needs) VALUES
    (parent_ids[3], 'Maya', 6, 'autism', 3, 'special_kindergarten', false, true,
     ST_SetSRID(ST_MakePoint(34.99, 32.79), 4326),
     '{"aac_device": true, "sensory_diet": true, "aba_approach": true}'),
    (parent_ids[3], 'Daniel', 10, 'adhd', 1, 'regular_school', true, true,
     ST_SetSRID(ST_MakePoint(34.99, 32.79), 4326),
     '{"executive_function": true, "social_skills": true}');

  -- Parent 4 (רונית שמש, באר שבע) — 2 children
  INSERT INTO children (parent_id, first_name, age, category, functioning_level, framework, communication_verbal, published, location, needs) VALUES
    (parent_ids[4], 'תומר', 8, 'hearing', 2, 'regular_school', true, true,
     ST_SetSRID(ST_MakePoint(34.79, 31.25), 4326),
     '{"hearing_aids": true, "sign_language": true, "integration_support": true}'),
    (parent_ids[4], 'שני', 4, 'physical', 2, 'kindergarten', true, true,
     ST_SetSRID(ST_MakePoint(34.79, 31.25), 4326),
     '{"mobility_support": true, "adaptive_equipment": true}');

  -- Parent 5 (יוסי אברהם, הרצליה) — 3 children
  INSERT INTO children (parent_id, first_name, age, category, secondary_category, functioning_level, framework, communication_verbal, published, location, needs) VALUES
    (parent_ids[5], 'רוני', 11, 'autism', 'intellectual', 3, 'special_ed', false, true,
     ST_SetSRID(ST_MakePoint(34.79, 32.16), 4326),
     '{"full_support": true, "communication_device": true, "behavioral_plan": true}'),
    (parent_ids[5], 'ליאם', 7, 'emotional', NULL, 1, 'regular_school', true, true,
     ST_SetSRID(ST_MakePoint(34.79, 32.16), 4326),
     '{"emotional_regulation": true, "social_skills": true}'),
    (parent_ids[5], 'מעיין', 5, 'speech', NULL, 1, 'kindergarten', true, true,
     ST_SetSRID(ST_MakePoint(34.79, 32.16), 4326),
     '{"speech_therapy": true, "language_development": true}');

  -- ========== CHILD DETAILS (TIER 2–3) ==========
  -- Create details for the first few children
  INSERT INTO child_details (child_id, full_name, diagnosis_full, what_works, what_triggers, win_definition)
  SELECT
    c.id,
    CASE c.first_name
      WHEN 'נועם' THEN 'נועם כהן'
      WHEN 'עדן' THEN 'עדן כהן'
      WHEN 'אור' THEN 'אור לוי'
      WHEN 'Maya' THEN 'Maya Green'
      WHEN 'תומר' THEN 'תומר שמש'
      ELSE c.first_name
    END,
    CASE c.first_name
      WHEN 'נועם' THEN 'ASD רמה 2, עם אתגרי ויסות סנסורי ותקשורת מוגבלת'
      WHEN 'עדן' THEN 'ADHD משולב, עם קשיי ריכוז ואימפולסיביות'
      WHEN 'אור' THEN 'דיסלקציה ודיסקלקוליה, תפקוד כללי טוב'
      WHEN 'Maya' THEN 'ASD Level 3, non-verbal, requires full support'
      WHEN 'תומר' THEN 'ליקוי שמיעה דו-צדדי בינוני, עם מכשיר שמיעה'
      ELSE 'פרטים יתווספו'
    END,
    CASE c.first_name
      WHEN 'נועם' THEN 'שגרה ברורה, תזכורות ויזואליות, הפסקות סנסוריות'
      WHEN 'עדן' THEN 'משחקי תנועה, תגמול מיידי, משימות קצרות'
      WHEN 'אור' THEN 'הקראה, זמן נוסף, עזרים ויזואליים'
      WHEN 'Maya' THEN 'AAC device, visual schedules, sensory breaks'
      WHEN 'תומר' THEN 'ישיבה קדמית, כתוביות, שפת סימנים'
      ELSE 'יתווסף'
    END,
    CASE c.first_name
      WHEN 'נועם' THEN 'רעש פתאומי, שינוי שגרה, עומס חברתי'
      WHEN 'עדן' THEN 'המתנה ארוכה, שעמום, כישלונות'
      WHEN 'אור' THEN 'קריאה בקול מול הכיתה, השוואה לאחרים'
      WHEN 'Maya' THEN 'Loud noises, routine changes, crowded spaces'
      WHEN 'תומר' THEN 'רעשי רקע, דיבור מהיר, ישיבה אחורית'
      ELSE 'יתווסף'
    END,
    CASE c.first_name
      WHEN 'נועם' THEN 'שייצא מההפסקה עם חיוך'
      WHEN 'עדן' THEN 'שישב 10 דקות רצופות במשימה'
      WHEN 'אור' THEN 'שיקרא עמוד שלם בביטחון'
      WHEN 'Maya' THEN 'That she initiates communication using her device'
      WHEN 'תומר' THEN 'שישתתף בשיחה קבוצתית'
      ELSE 'יוגדר'
    END
  FROM children c
  WHERE c.first_name IN ('נועם', 'עדן', 'אור', 'Maya', 'תומר');

  -- ========== GENERATE 50 ADDITIONAL PROFESSIONALS FOR COLD-START ==========
  FOR i IN 1..50 LOOP
    v_id := gen_random_uuid();
    -- Insert into auth.users
    INSERT INTO auth.users (id, phone, phone_confirmed_at, raw_user_meta_data, aud, role)
    VALUES (v_id, '059' || lpad(i::text, 7, '0'), now(), '{"role": "professional"}', 'authenticated', 'authenticated');
    
    -- Update profile
    UPDATE profiles SET full_name = 'משלבת דמו ' || i, area = 'תל אביב', preferred_language = 'he' WHERE id = v_id;
    
    -- Insert into professionals
    -- We randomly assign specialties and location around Tel Aviv (lat 32.05-32.10, lon 34.75-34.80)
    INSERT INTO professionals (user_id, display_name, bio, type, specialties, certifications, experience_years, verified, rating_avg, rating_count, backup_available, location, max_radius_km, languages, framework_types, availability)
    VALUES (
      v_id, 
      'משלבת דמו ' || i, 
      'פרופיל דמו שנוצר אוטומטית לטובת בדיקות עומס והדגמת אלגוריתם בעיר ההשקה.', 
      'mashlavit', 
      CASE WHEN i % 3 = 0 THEN '{autism,adhd}'::text[] WHEN i % 2 = 0 THEN '{emotional,learning_disability}'::text[] ELSE '{physical,intellectual}'::text[] END, 
      '{special_ed_cert}', 
      (i % 10) + 1, 
      'verified', 
      4.0 + (i % 10) * 0.1, 
      i % 20, 
      (i % 5 = 0), 
      ST_SetSRID(ST_MakePoint(34.75 + random() * 0.05, 32.05 + random() * 0.05), 4326), 
      10 + (i % 5), 
      '{he}', 
      '{regular_school,special_ed}', 
      '{"sunday":[8,14],"monday":[8,14],"tuesday":[8,14],"wednesday":[8,14],"thursday":[8,14]}'
    );
  END LOOP;

  -- ========== MOCK MATCHES & DAILY OPS LOGS ==========
  -- Get the UUID of the first child (נועם)
  SELECT id INTO v_id FROM children WHERE parent_id = parent_ids[1] LIMIT 1;
  
  -- Create an active match with Pro 1
  INSERT INTO matches (child_id, professional_id, status, hourly_rate, metric_keys)
  VALUES (v_id, pro_user_ids[1], 'active', 75, '{sensory_regulation,social_interaction,routine_transition}');
  
  -- Insert some checkins and daily logs for this match to demonstrate WP5 retention charts
  -- We assume the match_id is the one we just inserted. Since matches has no explicit UUID returned easily here, we do it via subquery
  INSERT INTO checkins (match_id, lat, lng, is_valid)
  SELECT id, 32.08, 34.78, true FROM matches WHERE child_id = v_id AND professional_id = pro_user_ids[1];

  INSERT INTO daily_logs (match_id, log_date, mood, metrics, notes, ai_summary)
  SELECT id, current_date, 'great', '{"sensory_regulation": 4, "social_interaction": 5, "routine_transition": 4}'::jsonb, 'היה יום מצוין, נועם שיחק יפה עם חברים.', 'נועם חווה יום חיובי עם הצלחות חברתיות משמעותיות וויסות סנסורי טוב.' 
  FROM matches WHERE child_id = v_id AND professional_id = pro_user_ids[1];

  RETURN 'Seed data created: 5 parents, 10 children, 65 professionals, and mock ops data';
END;
$$ LANGUAGE plpgsql;

-- Run the seed
-- SELECT seed_test_data();
