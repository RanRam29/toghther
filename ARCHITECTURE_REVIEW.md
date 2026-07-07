# 🧠 Together — ביקורת ארכיטקטורה ומוצר (Claude, ארכיטקט ראשי)

> נכתב: 2026-07-07 · מבוסס על קריאת הקוד בפועל (migrations, RLS, matching, Edge Functions, mobile)
> **מסמך זה מחייב את הסוכנים המבצעים (Antigravity, Cursor).** סתירה מול DEVELOPMENT_PLAN.md — מסמך זה גובר בנושאי אבטחה וארכיטקטורה.

---

## 📊 סטטוס ממצאים (עדכני 2026-07-07)

| ממצא | סטטוס | הפניה |
|------|--------|-------|
| C1 self-approve · C2 חשיפת children · C3 audit | ✅ תוקנו (`security_overhaul`) | — |
| H1 באג ותק | ✅ תוקן (`engine_fixes`) | — |
| **C4 הסלמת אדמין** | ✅ תוקן ואומת מקומית (7/7 pgTAP) · ⏳ `db push` לענן — הרץ `scripts/deploy-c4-cloud.ps1` | `work-orders/C4-role-escalation.md` |
| H4 approve יוצר match מיד | 🟠 פתוח | WP1 |
| H2 כפילות scoring · H3 filters חסרים · M1 calculate-matches | 🟠🟡 פתוחים | WP4 |

תוכניות הביצוע המלאות: `docs/work-orders/00-ROADMAP.md`.

---

## חלק 1 — ממצאים קריטיים (לתיקון לפני כל פיתוח נוסף)

### ✅ C4: כל משתמש יכול למנות את עצמו לאדמין (הסלמת הרשאות מלאה) — **תוקן ואומת**
**חומרה: הקריטית ביותר שנמצאה. נוסף 2026-07-07 (סבב ביקורת אבטחה). נסגר 2026-07-07 (Antigravity + Cursor).**

**סטטוס סגירה (2026-07-07):**
- מיגרציה [`20260707120000_c4_protect_profile_role.sql`](supabase/migrations/20260707120000_c4_protect_profile_role.sql) — טריגר `BEFORE UPDATE ON profiles` שחוסם שינוי `role` ו-`id` לכל משתמש מאומת, פונקציית `public.is_admin()` מוקשחת (JWT `app_metadata.is_admin`), ומדיניות Storage של `documents` משתמשת ב-`is_admin()`.
- בדיקות [`c4_role_escalation_test.sql`](supabase/tests/c4_role_escalation_test.sql) — **7/7 pgTAP PASS** מקומית (`npx supabase test db --local`).
- מובייל: אין UPDATE ישיר על `role`; RPCs מוקשחים בלבד; types כוללים `is_admin`, `approve_request`, `respond_to_request`.
- **ענן:** מסביבת Cursor אין גישה ל-Supabase Cloud (`TransportError`). להשלמת DoD: `.\scripts\deploy-c4-cloud.ps1` (או `supabase db push --linked` + `supabase test db --linked`) ממכונה עם רשת.

**היסטוריית הממצא (לפני התיקון):**

המדיניות `profiles_own_update` ב-[002_rls_policies.sql:95](supabase/migrations/002_rls_policies.sql) התירה UPDATE על השורה של המשתמש **ללא הגבלת עמודות**. כל משתמש מאומת יכול היה להריץ:

```sql
UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
```

ומאותו רגע `get_user_role()` החזיר `admin` — מה שפתח **הכול**: כל הילדים, כל ה-child_details, כל ה-matches, וכל המסמכים בבאקט `documents`.

**תיקון שיושם:**
1. טריגר `BEFORE UPDATE ON profiles` — חוסם שינוי `role`/`id` ל-`authenticated`; `service_role` פטור (RPCs אדמיניים).
2. `public.is_admin()` — דורש גם `app_metadata.is_admin` ב-JWT.
3. Storage policy — `is_admin()` במקום `get_user_role()='admin'`.
4. pgTAP — 7 בדיקות ב-`c4_role_escalation_test.sql`.

### 🔴 C1: משלבת יכולה לאשר לעצמה בקשה — עקיפת מודל הכוח של ההורה
**חומרה: קריטית. שוברת את הבטחת הליבה של המוצר.**

המדיניות `match_requests_professional_update` ב-[002_rls_policies.sql:236](supabase/migrations/002_rls_policies.sql) מאפשרת למשלבת לעדכן כל עמודה בבקשה המופנית אליה — כולל `status`. אין `WITH CHECK` שמגביל אילו מעברי סטטוס מותרים לה. משמעות: משלבת יכולה להריץ דרך PostgREST:

```sql
UPDATE match_requests SET status = 'approved' WHERE professional_id = <שלה>;
```

וזה פותח לה מיידית TIER 2 — `child_details` כולל **פרטי הקשר של ההורה** — בלי שההורה אישר דבר. בדיקות ה-pgTAP הקיימות לא מכסות את התרחיש הזה (הבדיקה מאשרת בקשה בהקשר הורה בלבד).

**תיקון נדרש (Antigravity):**
1. לבטל UPDATE ישיר על `status` לשני הצדדים. מעברי סטטוס רק דרך RPC-ים ייעודיים עם state machine:
   - `respond_to_request(request_id, 'interested'|'rejected')` — רק המשלבת, רק מ-`pending`.
   - `approve_request(request_id)` / `reject_request(request_id)` / `withdraw_request(request_id)` — רק ההורה.
2. לחלופין (מינימום): טריגר `BEFORE UPDATE` שמאמת מי רשאי לבצע איזה מעבר, לפי `get_user_role()` ומצב קודם.
3. להוסיף בדיקת pgTAP: "professional CANNOT set own request to approved".

### 🔴 C2: TIER 0 חושף את כל שורת `children` — כולל מיקום מדויק
**חומרה: קריטית. דליפת מידע על ילדים.**

המדיניות `children_tier0_public` נותנת `SELECT` על **כל העמודות** לכל משלבת מאומתת — כולל `location` (נקודת PostGIS מדויקת של המסגרת/הבית), `needs` (jsonb רגיש), `hours_needed`, `functioning_level`. ההערה בקוד מודה: "enforced by SELECT query, not column-level RLS" — אבל זה בדיוק מה שהספק אוסר: *"מודל ה-TIER מיושם ב-database עצמו — לא בקוד"*. גם בדיקת ה-pgTAP הקיימת עושה `SELECT *` ומאשרת שהכול נגיש.

בנוסף, TIER 1 (אבחנה כללית, רמת תפקוד, תקשורת ורבלית אחרי הגשת בקשה) לא קיים בכלל כשכבה נפרדת — הכול נחשף כבר ב-TIER 0.

**תיקון נדרש (Antigravity):**
1. `REVOKE SELECT` על `children` מ-role `authenticated`, ולהעניק גישה דרך שתי דרכים בלבד:
   - **View ‏`children_tier0`** (security_invoker) עם עמודות TIER 0 בלבד: `first_name, age, category, framework, hours_needed_summary, area_general` — בלי `location`, בלי `needs`, בלי `functioning_level`.
   - **RPC ‏`get_child_tier_view(child_id)`** שמחזיר עמודות לפי `get_tier_for_child()` — זה גם המקום הנכון לכתוב `audit_log` (ראו C3).
2. ההורה עצמו ממשיך לגשת לטבלה המלאה דרך policy קיימת (`parent_id = auth.uid()` + column grants להורה).
3. מרחק גיאוגרפי ל-TIER 0 מוצג כ"אזור" (עיר) או כמרחק מחושב בצד השרת — לעולם לא הקואורדינטה עצמה.

### 🔴 C3: ה-audit log הוא פיקציה כרגע
הטריגר `log_tier3_access()` לעולם לא ייורה — **אין ב-Postgres טריגרים על SELECT**. ההערה בסוף 002 מודה בכך ומפנה ל"Edge Functions" — אבל האפליקציה ניגשת ל-`child_details` ישירות דרך PostgREST, לא דרך Edge Function. ההבטחה להורה ("רואה מי ניגש ומתי") לא ממומשת.

**תיקון נדרש (Antigravity):** גישת TIER 2–3 ל-`child_details` תעבור **אך ורק דרך RPC** (`get_child_details(child_id)`) שרושם ל-`audit_log` ואז מחזיר נתונים. לבטל SELECT ישיר של משלבות על הטבלה. זה מתלכד עם הפתרון של C2 — נקודת גישה אחת, מתועדת.

### 🟠 H4: `approve_request` יוצר match פעיל מיד — סטייה מ-D10 וממודל ה-TIER
**נוסף 2026-07-07 אחרי בדיקת `security_overhaul`.**

ה-RPC ‏`approve_request` ([20260707111544_security_overhaul.sql:154](supabase/migrations/20260707111544_security_overhaul.sql)) מאשר את הבקשה **ויוצר `matches` פעיל (TIER 3) באותה טרנזקציה**. אבל לפי החלטת המוצר D10 והמודל: אישור הורה = מעבר ל-TIER 2 (היכרות + פרטי קשר) בלבד; ה-match הפעיל נוצר בפעולת הורה נפרדת **אחרי** ההיכרות ("התחלנו לעבוד יחד"). כרגע הורה שמאשר בקשה נותן מיד גישת TIER 3 (יומן, checkins, תיק מלא) למשלבת שהוא עדיין לא פגש — עוקף את שלב ההיכרות. Cursor כבר בנה על ההתנהגות הזו ("אישור → יצירת match אטומרית → ניווט ישיר"), אז התיקון מחייב תיאום דו-צדדי.

**תיקון (אחרי C4):** לפצל — `approve_request` מעביר ל-`approved`/TIER 2 בלבד; RPC נפרד `create_match_from_request` (כבר קיים ב-003!) נקרא מפעולת "התחלנו לעבוד יחד". ליישר את מסכי Cursor S-PAR-05→06→07.

### 🟠 H1: שני באגים בניקוד הוותק במנוע ההתאמה (SQL)
ב-[003_functions.sql:134-139](supabase/migrations/003_functions.sql):
1. `SELECT created_at FROM profiles WHERE id = fp.id` — אבל `fp.id` הוא ה-PK של `professionals`, לא של `profiles` (‏`user_id` הוא הקישור). התוצאה תמיד NULL → `LEAST(NULL, 15)` = **15 נקודות ותק לכולם**, תמיד.
2. גם אחרי תיקון: `EXTRACT(MONTH FROM age(...))` מחזיר את רכיב החודשים (0–11), לא סך חודשים — משלבת עם שנה בדיוק תקבל 0 נקודות, ועם 11 חודשים 15.

### 🟠 H2: כפילות לוגיקת scoring — SQL מול TypeScript — וכבר יש drift
המנוע קיים פעמיים: `get_matches_for_child()` ב-SQL (הנתיב בפרודקשן) ו-`packages/matching` ב-TS (מה שנבדק ב-Jest). הן כבר סוטות זו מזו (חישוב הוותק ב-TS נכון, ב-SQL שבור — H1). בדיקות שעוברות על עותק שאינו רץ בפרודקשן נותנות ביטחון כוזב.

**הכרעה ארכיטקטונית:** מקור אמת אחד. ההמלצה: **ה-SQL נשאר המקור** (hard filters חייבים PostGIS, וזה יעיל), ו-`packages/matching` נמחק או הופך ל-thin types בלבד. הבדיקות עוברות ל-pgTAP מול הפונקציה האמיתית (יש כבר תשתית pgTAP). חלופה הפוכה (scoring ב-Edge Function) לגיטימית אך יקרה יותר — לא מומלצת עכשיו.

### 🟠 H3: hard filters חסרים מול הספק
הספק מגדיר סינון קשיח: גיאוגרפיה ✅ · מסגרת ✅ · אימות ✅ · **זמינות (חפיפת ימים/שעות) ❌ · שפה ❌** — שניהם לא ממומשים ב-`get_matches_for_child`. התאמה שמוצגת להורה ואז מתבררת כלא-זמינה שורפת אמון — הנכס היקר ביותר של הפלטפורמה.

### 🟡 M1: ‏Edge Function ‏`calculate-matches` — עיצוב יקר ושביר
1. קורא ל-Claude **פר-מועמדת, פר-צפייה** במסך הבית — N קריאות API בכל רענון. עלות + latency ללא תקרה.
2. המודל `claude-3-5-sonnet-latest` — מזהה לא קיים; הקריאות ייכשלו בשקט ויפלו ל-fallback.
3. אין persist של ההסבר.

**תיקון (Antigravity):** להפיק הסבר AI **פעם אחת** ולשמור אותו (עמודת `ai_reason` ב-cache table או על `match_requests`); מודל `claude-haiku-4-5-20251001` (מהיר וזול — מתאים בול למשימת ניסוח); קריאה אחת עם כל המועמדות בפרומפט אחד במקום N קריאות. ה-UI מציג מיידית את `match_reason` מה-DB ומעשיר כשה-AI מוכן (progressive enhancement).

---

## חלק 2 — הכרעות ארכיטקטוניות מנחות

### A. עיקרון הגישה לנתונים: "3 שערים"
כל גישה לנתוני ילד עוברת דרך אחד משלושה שערים, ולעולם לא SELECT ישיר של משלבת על טבלת בסיס:
1. **View ציבורי** (`children_tier0`) — עמודות TIER 0 בלבד.
2. **RPC מדורג** (`get_child_details`) — בודק tier, רושם audit, מחזיר בהתאם.
3. **RPC-י פעולה** (`approve_request`, `respond_to_request`, `verify_checkin`, `create_match_from_request`) — כל שינוי מצב הוא פעולה מפורשת עם ולידציה, לא UPDATE גולמי.

זה הופך את מודל ה-TIER מ"מוסכמה" ל"חוק פיזיקה" של המערכת, ומקטין את שטח התקיפה של PostgREST.

### B. ‏Push notifications הם תשתית ליבה, לא feature
לולאת המרקטפלייס — הורה שולח בקשה → משלבת מגיבה → הורה מאשר — מתה בלי push. משתמש לא פותח אפליקציה "ליתר ביטחון". סדר בנייה: `expo-notifications` + טבלת `push_tokens` + טריגר DB → Edge Function ‏`send-push` על שינויי סטטוס בקשה. **לפני** מסכי האופרציה היומית.

### C. צ'אט — לא בונים. בכוונה.
אין טבלת messages וזה נכון: הספק קובע "לא נלחמים בוואטסאפ על הצ'אט". TIER 2 חושף פרטי קשר — השיחה עוברת לטלפון במודע. ה-retention נבנה במה שוואטסאפ לא יכול: check-in, יומן, סיכומי AI. אל תתנו לאף אחד "להשלים" צ'אט כ-feature חסר.

### D. מבנה ניווט האפליקציה
`(active-match)` כ-route group נפרד נכון עקרונית, אבל ההחלטה: האופרציה היומית היא **שתי חוויות שונות** — למשלבת (check-in + מילוי שאלון) ולהורה (צפייה ביומן + סיכומי AI). לא מסך משותף. לפצל: `(professional)/match/[id]` ו-`(parent)/match-detail` (קיים) שמתרחב לתצוגת יומן.

### E. סביבות ובדיקות
כרגע עובדים ישירות מול פרויקט הענן (`flrflktlltmqbiamljlm`). לפני seeding אמיתי: לעבוד עם `supabase start` מקומי + branch לענן, ולהריץ pgTAP ב-CI (GitHub Action על כל PR). ה-RLS הוא המוצר — חייב רשת ביטחון אוטומטית.

---

## חלק 3 — מוצר: סדר עדיפויות מתוקן ל-MVP

העיקרון: **קודם סוגרים את הלולאה, אחר כך מעמיקים אותה.** ערך נמדד ב"הורה אחד השלים מסע מלא", לא בכמות מסכים.

| # | אבן דרך | תוכן | אחראי |
|---|---------|-------|--------|
| 0 | **תיקוני אבטחה C1–C3** | RPC state machine, tier views, audit דרך RPC, pgTAP חדשים | Antigravity |
| 1 | **סגירת לולאת ה-match** | אישור הורה → `create_match_from_request` → מסך "match פעיל" בסיסי | Cursor |
| 2 | **Push** | tokens, טריגרים, `send-push` | Antigravity + Cursor |
| 3 | **אימות משלבות** | העלאת מסמכים ל-Storage (bucket פרטי!) + runbook אימות ב-Studio | שניהם |
| 4 | **תיקון מנוע** | H1–H3 + מחיקת הכפילות + בדיקות pgTAP | Antigravity |
| 5 | **אופרציה יומית** | check-in (משלבת) → יומן (משלבת) → סיכום AI (הורה) → דירוג | שניהם |
| 6 | **Launch prep** | seed 50 משלבות, E2E ידני בעברית, EAS build, TestFlight | שניהם |

**מה במפורש לא ב-MVP** (אישור מחדש): חמ"ל חירום, תיק ילד TIER 3 מלא, personality matching, תשלומים, צ'אט, OCR, מודול זכויות.

**שאלת המוצר הפתוחה החשובה ביותר** (לא טכנית): תמחור עמלת match — על פתיחת בקשה או על match מוצלח. אי אפשר להכריע בקוד; צריך 10 שיחות עם הורים. עד אז — הכול חינם ב-beta, אבל **לתעד אירועי conversion מהיום** (טבלת analytics_events פשוטה) כדי שתהיה data להחלטה.

---

## חלק 4 — עיצוב ו-UX: עקרונות מחייבים

1. **הקהל בלחץ רגשי.** הורה שממלא פרופיל ילד עם צרכים מיוחדים נמצא ברגע פגיע. טפסים קצרים, שפה חמה ("ספרו לנו על נועם", לא "הזן אבחנה"), שמירה אוטומטית של טיוטה, אף פעם לא לאבד קלט.
2. **מסך הבית של ההורה הוא ה-hero.** "המשלבות שמתאימות לנועם" עם הסבר תאימות אנושי — זה המוצר. כל השאר תפריטים. ההסבר חייב להרגיש אישי, לא גנרי ("ניסיון של 4 שנים עם ילדים על הספקטרום בגיל הגן" ולא "score 87").
3. **ה-friction המכוון הוא feature.** מכתב 3–5 המשפטים של המשלבת מוצג להורה בבולטות — הוא כלי ההחלטה הרגשי. לעצב אותו ככרטיס מכתב, לא כשדה טקסט.
4. **RTL-first, לא RTL-supported.** מעצבים בעברית ובודקים שאנגלית עובדת — לא להפך. כל מסך נבדק פיזית ב-iOS+Android בעברית לפני merge.
5. **נגישות היא לא צ'קבוקס כאן.** חלק מההורים בקהל היעד הם עצמם אנשים עם מוגבלויות. יעדים: טקסט דינמי, קונטרסט AA, touch targets ‏44pt, תמיכת screen reader במסכי הליבה.
6. **מצבי ריק הם רגעי אמת.** "אין עדיין התאמות באזורך" חייב לתת מוצא: waitlist + "נעדכן אותך כשמשלבת חדשה תצטרף" (מחובר ל-push). מצב ריק קר = uninstall.
7. **אמון דרך שקיפות.** תג "מאומתת ✓" עם הסבר קצר מה עבר אימות (תעודה, תעודת יושר) — זה ההבדל בין הפלטפורמה לקבוצת פייסבוק.

---

## חלק 5 — סיכונים פתוחים (מעבר לקוד)

| סיכון | סטטוס | פעולה |
|-------|--------|-------|
| Cold start — אין 50 משלבות | לא מטופל | להתחיל גיוס ידני **עכשיו**, במקביל לפיתוח. עיר אחת, לא ארצית |
| אחריות משפטית — תעודת יושר | לא מטופל | ייעוץ משפטי לפני launch: מה מותר לפלטפורמה לאמת/להציג |
| מפתח Claude API בענן | לבדוק | לוודא שהמפתח ב-secrets של Supabase, לא בקוד |
| Bucket מסמכים | טרם קיים | חובה private bucket + signed URLs קצרי-מועד |

---

*מסמך חי · יעודכן על ידי הארכיטקט אחרי כל סבב ביקורת*
