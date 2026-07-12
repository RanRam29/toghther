# WP1 — סגירת לולאת ה-match (כולל תיקון H4)

> **בעלים:** Antigravity (backend) → Cursor (UI) · **תלוי ב:** WP0 (C4) · **אבן דרך:** 1
> **מטרה:** הורה יכול לעבור מסלול מלא — אישור בקשה → היכרות → הפעלת עבודה משותפת — בהתאם ל-D10 ולמודל ה-TIER. זו החוליה שמחברת את כל מה שכבר נבנה.
> קרא: `product/03-FLOWS-PARENT.md` P-06→P-08 · `product/05-SCREENS.md` S-PAR-05/06/07 · `product/01-DECISIONS.md` D5,D10.

## הבעיה שנסגרת (H4)
כיום `approve_request` מאשר **ויוצר match פעיל (TIER 3) מיד**. לפי D10: אישור = TIER 2 (היכרות + פרטי קשר) בלבד; ה-match נוצר בפעולת הורה נפרדת אחרי ההיכרות. יש לפצל, וליישר את מסכי Cursor.

## שלב A — Backend (Antigravity)

> **סטטוס (2026-07-08):** המיגרציה **וגם** בדיקות ה-pgTAP נכתבו ע"י הארכיטקט:
> `supabase/migrations/20260708130000_wp1_split_approve_from_match.sql` (פיצול `approve_request`→void/TIER2, חיזוק `create_match_from_request`, `decline_after_intro`, עמודת `decline_reason`) + `supabase/tests/wp1_match_loop_test.sql` (7 בדיקות המכסות את סעיף 4).
> **נותר ל-Antigravity:** `supabase db push` → הרצת הבדיקות מול הענן → `npm run types:generate` + הודעת לוח. ⚠️ שינוי חתימה: `approve_request` מחזיר כעת `void` — שובר את מסכי Cursor הקיימים עד שלב B.

1. **פיצול `approve_request`:** שיישאר אחראי רק על מעבר ל-`approved` + `tier_reached=2`. **להסיר** את יצירת ה-match ואת קידום ל-TIER 3 מתוכו.
2. **`create_match_from_request`** (כבר קיים ב-003) — לוודא שהוא: נקרא רק ע"י ההורה, רק על בקשה ב-`approved`, יוצר `matches` פעיל + `tier_reached=3`. לתקן אם צריך שיתאים לפיצול.
3. **`decline_after_intro(request_id, reason)`** — RPC חדש: הורה שההיכרות לא צלחה מעביר את הבקשה ל-`withdrawn`/`rejected` עם סיבה, בלי ליצור match.
4. **בדיקות pgTAP:** approve → TIER 2 ולא נוצר match · create_match רק מ-approved · משלבת לא יכולה לקרוא ל-create_match · מעבר כפול נחסם.
5. `types:generate` + הודעה בלוח על שינוי החתימה (Cursor תלוי).

## שלב B — UI (Cursor), אחרי שלב A — מפרט מוכן למימוש

> **מינוח (D5):** אף פעם לא להציג "TIER" למשתמש. השתמשו ב-06-COPY-TONE: "שלב ההיכרות" / "היכרות" / "עבודה משותפת".

### חוזי ה-RPC (אחרי המיגרציה — לעדכן `types:generate` ואז לצרוך)
| RPC | חתימה | מתי נקרא | תוצאה ב-UI |
|-----|--------|----------|------------|
| `approve_request(p_request_id)` | **`→ void`** (היה `uuid`) | S-PAR-05, אישור מפורש | בהצלחה: מעבר ל-**S-PAR-06**. ⚠️ כבר **לא** מחזיר `match_id` ו**לא** יוצר match — להסיר כל ניווט ישיר ל-active match |
| `create_match_from_request(p_request_id)` | `→ uuid` (match_id) | S-PAR-06, "התחלנו לעבוד יחד" | מעבר ל-**S-PAR-07** עם ה-`match_id` שחוזר |
| `decline_after_intro(p_request_id, p_reason)` | `→ void` | S-PAR-06, "לא התאים" | חזרה ל-S-PAR-01. ⚠️ **מחליף את `withdraw_request`** שהוזכר ב-P-07 (הוא עובד רק על `pending`; אחרי אישור הסטטוס `approved`) |

**מיפוי שגיאות RPC → קופי (toast, נשארים במסך):**
- `Request cannot be approved from status: …` → "הבקשה כבר טופלה." (לרענן את הרשימה)
- `Match already exists for this request` → "כבר התחלתם לעבוד יחד." (מעבר ל-S-PAR-07)
- `… access denied` / `not found` → "לא נמצאה בקשה פעילה." (חזרה ל-S-PAR-04)

### S-PAR-05 · אישור היכרות (sheet מעל S-PAR-04) — *עדכון מסך קיים*
- מקור: `05-SCREENS` S-PAR-05, `03-FLOWS-PARENT` P-06.
- Sheet גילוי מלא: מה ייחשף בהיכרות — שם מלא, אבחנה, "מה עובד/מקשה", פרטי קשר — ואישור מפורש. **אין אישור בלי לראות את הרשימה**; ביטול לא משנה כלום.
- על אישור → `approve_request(requestId)` → בהצלחה `router.push` ל-**S-PAR-06** עם `requestId`. **לשנות את הקוד הקיים** שמנווט היום ל-active match.
- מצבים: loading (ספינר בכפתור), error (toast לפי המיפוי), offline (חסימת האישור + הודעה).

### S-PAR-06 · פרטי היכרות — *מסך חדש* (`app/(parent)/intro-details.tsx`, param `requestId`)
- מקור: `05-SCREENS` S-PAR-06, `03-FLOWS-PARENT` P-07.
- **פריסה:** כרטיס משלבת (שם, ביו, דירוג) → **מספר טלפון גדול** → כפתורי **חיוג** (`tel:`) ו-**וואטסאפ** (`wa.me/…`) → הנחיה: "קבעו שיחה קצרה ואז מפגש עם {childName}" → שני CTA:
  - **"התחלנו לעבוד יחד! 🎉"** → `create_match_from_request(requestId)` → `router.replace` ל-**S-PAR-07** עם `match_id`.
  - **"לא התאים"** → sheet עם שדה סיבה **אופציונלי** → `decline_after_intro(requestId, reason)` → `router.replace` ל-S-PAR-01 (המכסה משוחררת).
- מצבים: loading (טעינת פרטי הקשר), empty לא רלוונטי, error, offline (השבתת שני ה-CTA).
- ✅ **מקור פרטי הקשר (נכתב):** `profiles.phone` אינו קריא בין-משתמשים (RLS `profiles_own_read`) ו-`professionals` בלי טלפון — לכן נוסף RPC מבוקר **`get_intro_contact(p_request_id) → (professional_id, display_name, phone)`** (במיגרציה 20260708130000). מחזיר את הקשר **רק** להורה של בקשה ב-`approved`, ורושם ל-`audit_log` (`resource='professional_contact'`). Cursor: קרא לו ב-load של S-PAR-06.

### S-PAR-07 · עבודה משותפת (match) — *ברובו קיים; לוודא כניסה מהזרימה החדשה*
- מקור: `05-SCREENS` S-PAR-07, `03-FLOWS-PARENT` P-08. ב-WP1 — **גרסה בסיסית**; פיד היומן והגרף מתמלאים ב-WP5.
- ראש: סטטוס נוכחות היום מ-`checkins` ("דנה הגיעה ✓ 08:03" teal / "עוד לא נרשמה הגעה" אפור). גוף: פיד `daily_logs` (כרטיס ליום); גרף מגמה שבועי **רק מ-3 ימי נתונים ומעלה**.
- קבלה: יום ללא שאלון = כרטיס "אין דיווח" שקט; סיכום AI חסר = "הסיכום בהכנה".
- לוודא שהמסך נגיש עם `match_id` שחוזר מ-`create_match_from_request`, ולא דרך ניווט האישור הישן.

### צד המשלבת (S-PRO-01) — תיאום
- אחרי שההורה אישר (`approved`) אבל **לפני** יצירת match, להציג בבקשה סטטוס **"ממתין להפעלה על ידי ההורה"** (request `approved` + אין match). כשנוצר match → הבקשה עוברת ל-S-PRO-06 (active).

### Analytics (08-ANALYTICS-EVENTS)
- `request_approved` בעת `approve_request` מוצלח · `match_created` בעת `create_match_from_request` · `intro_declined` בעת `decline_after_intro` (עם/בלי סיבה).

## Definition of Done
- [ ] backend מפוצל + 4 בדיקות pgTAP ירוקות
- [ ] שלושת המסכים לפי המפרט + 4 המצבים (loading/empty/error/offline)
- [ ] E2E: הורה מאשר → רואה פרטי קשר → "התחלנו" → match פעיל; ומסלול "לא התאים" מחזיר להתאמות
- [ ] אירועי analytics: `request_approved`, `match_created` (08-ANALYTICS-EVENTS)
- [ ] אין TIER 3 לפני "התחלנו לעבוד יחד" — אומת ידנית מול DB
- [ ] עדכון לוח + `coordination_state.json`
