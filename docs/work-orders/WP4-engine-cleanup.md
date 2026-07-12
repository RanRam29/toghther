# WP4 — מנוע ההתאמה: H2/H3/M1 + מקור אמת יחיד

> **בעלים:** Antigravity · **תלוי ב:** — (מקבילי ל-WP2/WP3) · **אבן דרך:** 4
> **מטרה:** מנוע נכון, יעיל וללא כפילות. התאמה שגויה או לא-זמינה שורפת אמון — הנכס היקר.
> קרא: `master_spec` §5 · `PRODUCT_UX_SPEC` (מנוע) · `product/07-METRICS-CATALOG.md` · `docs/ARCHITECTURE.md` §5.

## 🔴 M0 (חוסם) — `calculate-matches` מחזיר 500: הקשר המשתמש לא מועבר ל-RPC
**תסמין (אומת בדפדפן 2026-07-08):** `POST /functions/v1/calculate-matches → 500` בכל קריאה. האפליקציה נופלת ל-RPC הישיר `get_matches_for_child` (מחזיר 200), אז ההתאמות עדיין מוצגות — אבל ההעשרה מ-Claude **לעולם לא רצה**, וה-Edge Function למעשה מת.

**שורש הבעיה:** הפונקציה מוגדרת `withSupabase({ auth: ["publishable"] })` (`supabase/functions/calculate-matches/index.ts:17`). במצב זה `ctx.supabase` **לא נושא את ה-JWT של הקורא**. ה-RPC `get_matches_for_child` (SECURITY DEFINER) מאמת בעלות דרך `WHERE c.parent_id = auth.uid()` — וכש-`auth.uid()` הוא `NULL`, `v_child` ריק → `RAISE EXCEPTION 'Child not found or access denied'` → `dbError` → 500 (`index.ts:43-48`). ה-RPC הישיר מהאפליקציה עובד כי הוא נושא את ה-session של המשתמש.

**כיוון תיקון:**
1. לוודא ש-`ctx.supabase` פועל בהקשר המשתמש — לקבל משתמש מאומת (למשל `auth: ["publishable", "authenticated"]` או המקבילה ב-`@supabase/server@^1`), כך ש-`ctx.supabase.rpc(...)` יעביר את כותרת ה-`Authorization` של הקורא ל-PostgREST → `auth.uid()` יזוהה. **לאמת מול תיעוד `@supabase/server@^1`** לפני הפריסה.
2. **לא** להשתמש ב-`ctx.supabaseAdmin` כאן — זה יעקוף את בדיקת הבעלות (`auth.uid()` עדיין `NULL`, המנוע יחזיר מועמדות לילד שאינו של הקורא = פרצת פרטיות).
3. `supabase.functions.invoke` בצד הלקוח כבר שולח את ה-JWT — אין שינוי באפליקציה.

**אימות (מול הענן):**
- קריאה מחשבון ההורה של הילד → `200` עם `matches`.
- קריאה ללא JWT או מהורה זר → `400/403` (לא `500`, ולא דליפת מועמדות).
- קונסול: אין יותר `calculate-matches 500`, ורואים `match_reason` (מ-DB, או מועשר אם `CLAUDE_API_KEY` מוגדר).

## H3 — השלמת hard filters
ל-`get_matches_for_child` חסרים שני מסננים שהספק מגדיר כפסילה קשיחה:
1. **זמינות** — חפיפת ימים/שעות בין `professionals.availability` ל-`children.hours_needed` (שניהם JSONB באותו מבנה `{day:[from,to]}`). לפחות חפיפה חלקית ביום אחד. פונקציית עזר `availability_overlaps(avail, needed) → boolean`.
2. **שפה** — `children` צריך שדה שפת תקשורת (אם אין — להוסיף `communication_language` עם ברירת מחדל 'he'), ולסנן `= ANY(professionals.languages)`.
- pgTAP: משלבת ללא חפיפת זמינות / ללא שפה — לא מופיעה בתוצאות.

## H2 — מקור אמת יחיד
- ה-SQL (`get_matches_for_child`) הוא המקור. **למחוק `packages/matching`** (או לצמצם ל-types בלבד) ולהסיר מ-workspace.
- בדיקות ה-scoring עוברות ל-pgTAP מול הפונקציה האמיתית: תרחיש לכל רכיב ניקוד (אבחנה ראשית/משנית, ניסיון, דירוג, מרחק, ותק) + מיון יורד + LIMIT.
- לעדכן `docs/TESTING-STRATEGY.md` §1 (כבר מציין את המחיקה — לאמת).

## M1 — יעילות ומודל AI ב-calculate-matches
1. מודל → `claude-haiku-4-5` (לפי `docs/DEV-PROCESS.md` §5; להחליף גם ב-`process-daily-log`).
2. **קריאה אחת מרוכזת** לכל סט המועמדות במקום N קריאות פר-מועמדת פר-צפייה.
3. **שמירת ההסבר** (cache): עמודה/טבלה שמאחסנת `ai_reason` פר (child,professional) עם TTL/גרסה; ה-UI מציג מיד את `match_reason` מה-DB ומעשיר כשמוכן (progressive enhancement).
4. fallback ל-`match_reason` מה-DB בכל כשל (קיים — לשמר).

## Definition of Done
- [ ] **M0**: `calculate-matches` מחזיר `200` מחשבון ההורה (לא `500`); הורה זר מקבל `400/403` ולא מועמדות; אין שימוש ב-supabaseAdmin לעקיפת הבעלות
- [ ] זמינות ושפה מסננים בפועל; pgTAP מוכיח פסילה
- [ ] `packages/matching` הוסר; בדיקות scoring ב-pgTAP ירוקות
- [ ] calculate-matches: קריאה אחת, מודל מאושר, הסבר נשמר ולא מחושב מחדש כל צפייה
- [ ] אין drift: אין שתי מימושי scoring בריפו
- [ ] תיעוד המנוע ב-ARCHITECTURE §5 תואם למימוש
