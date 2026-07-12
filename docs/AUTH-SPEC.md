# 🔐 Authentication & Authorization — מפרט מחייב

> חלק ממערך התיעוד: `docs/ARCHITECTURE.md` (המערכת) · `docs/SECURITY-GUIDELINES.md` (פיתוח מאובטח) · מסמך זה (זהות והרשאות).
> **עקרון-העל: הלקוח (האפליקציה) הוא UX בלבד. אכיפת ההרשאות היחידה שנחשבת היא ב-DB (RLS/RPC) וב-Edge Functions. כל בדיקת הרשאה בצד לקוח היא נוחות, לא אבטחה.**

---

## חלק א' — Authentication (מי אתה)

### 1. שיטת האימות: טלפון + OTP בלבד

- אין סיסמאות בשום תרחיש. זהות = בעלות על מספר טלפון ישראלי, מאומתת ב-OTP ‏(SMS) דרך Supabase Auth.
- נימוק מוצרי: הקהל רחב ולא-טכני; סיסמה = חיכוך + וקטור תקיפה (reuse, phishing). המכשיר האישי הוא ה-factor.
- **נורמליזציה:** טלפון נשמר בפורמט E.164 ‏(`+9725...`) בלבד — `lib/phone.ts` הוא המקור היחיד להמרה.

### 2. מדיניות OTP (להגדיר ב-Supabase Auth settings — Antigravity)

| פרמטר | ערך | נימוק |
|--------|-----|--------|
| תוקף קוד | 5 דקות | ברירת מחדל סבירה |
| אורך | 6 ספרות | סטנדרט |
| Resend cooldown | 30 שניות (UI) + 60 שניות (שרת) | מניעת SMS bombing |
| ניסיונות אימות לקוד | 3 → הקוד נפסל | brute force |
| בקשות OTP למספר | 5 בשעה, 10 ביממה | ניצול SMS + הצפת קורבן |
| בקשות OTP מ-IP | rate limit ברמת Supabase | הגנת ספק |

- הודעת כשל אחידה: "לא הצלחנו לשלוח קוד כרגע — נסו שוב מאוחר יותר" — **בלי לחשוף אם המספר קיים במערכת** (user enumeration).

### 3. Sessions ו-JWT

- **אחסון בלקוח:** ה-session (access + refresh token) נשמר ב-`expo-secure-store` (Keychain/Keystore) — **לא** ב-AsyncStorage. ליישם כ-storage adapter ל-supabase client. ב-web (אדמין): httpOnly session דרך ברירת המחדל של supabase-js; אין localStorage למסמכים רגישים.
- **תוקף:** access token ‏1 שעה (ברירת מחדל) · refresh rotation מופעל · session ללא שימוש 30 יום → נדרש OTP מחדש.
- **Logout:** ‏`signOut()` + ניקוי SecureStore + ניקוי כל ה-caches ‏(TanStack) + ביטול מנויי Realtime + מחיקת push token מהשרת.
- **אימות ב-Edge Functions:** כל פונקציה מאמתת JWT ופועלת בהקשר המשתמש (`ctx.supabase` עם ה-JWT — RLS חל). שימוש ב-service role — רק לפי הכללים בחלק ג'.

### 4. זהות ותפקיד — מודל קשיח

```
auth.users (Supabase) ──1:1──▶ profiles(id, role)  ← ה-role נקבע ב-signup, קפוא
                                    │
                    professional? ──▶ professionals(user_id) + verified
```

- ה-role נכתב פעם אחת ב-trigger ‏`handle_new_user` מתוך metadata של ה-signup.
- **ה-role קפוא למשתמש** (ראו C4 ב-ARCHITECTURE_REVIEW): טריגר חוסם UPDATE של `role` שלא דרך service_role / RPC אדמיני. שינוי תפקיד = תהליך תמיכה.
- **אדמין:** לעולם לא נוצר בהרשמה. מוקם ידנית: `role='admin'` + `app_metadata.is_admin=true`. MFA חובה לפני production.
- **מפקח (D26):** מוקם ידנית: `role='supervisor'` בלבד, **ללא** `is_admin`. **OTP בלבד** — אין MFA. אימות משלבות בלבד.

### 5. השעיה וחסימה

- השעיית משתמש (S-ADM-03) = ‏`auth.admin.updateUserById(banned_until)` דרך RPC/Edge עם service role — הורגת גם sessions קיימים, לא רק כניסות חדשות. בנוסף `profiles.suspended_at` לסינון בשאילתות (התאמות, browse).
- מחיקת חשבון (יוזמת משתמש): אישור כפול → מחיקת auth.user → CASCADE. בקשות פתוחות אצל הצד השני מקבלות "הכרטיס הוסר".

---

## חלק ב' — Authorization (מה מותר לך)

### 1. שלוש שכבות, מהחלשה לחזקה

| שכבה | תפקיד | סטטוס אמון |
|-------|--------|-------------|
| Route guards ‏(Expo) | UX — לא להראות מסכים לא רלוונטיים | ❌ לא אבטחה |
| RLS policies | ברירת המחדל לכל טבלה | ✅ אכיפה |
| RPC-ים (state machine / מדורגים / admin) | פעולות ומידע רגיש + audit | ✅ אכיפה + תיעוד |

### 2. מטריצת ההרשאות (מקור אמת — כל שינוי RLS מיישר מולה)

מקרא: ✅ מלא · 🔶 דרך RPC בלבד · 👁️ קריאה · ⛔ אין

| משאב | הורה (בעלים) | הורה אחר | משלבת מאומתת ללא קשר | משלבת TIER 1 (בקשה) | משלבת TIER 2 (אושרה) | משלבת TIER 3 (match) | משלבת לא מאומתת | אדמין |
|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| children ‏(TIER 0) | ✅ | ⛔ | 👁️ view בלבד | 👁️ | 👁️ | 👁️ | ⛔ | 👁️ |
| children ‏(שדות TIER 1: תפקוד, ורבלי) | ✅ | ⛔ | ⛔ | 🔶 RPC | 🔶 | 🔶 | ⛔ | 👁️ |
| child_details ‏(TIER 2) | ✅ | ⛔ | ⛔ | ⛔ | 🔶 RPC+audit | 🔶 | ⛔ | 🔶 מנומק (D25) |
| מסמכי ילד (TIER 3) | ✅ | ⛔ | ⛔ | ⛔ | ⛔ | 🔶 לפי הרשאות הורה | ⛔ | 🔶 מנומק |
| professionals (פרופיל ציבורי) | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | עצמה בלבד | ✅ |
| document_uploads + Storage | עצמו | ⛔ | עצמה | עצמה | עצמה | עצמה | עצמה | 👁️ (אימות) |
| match_requests | 👁️ + 🔶 מעברי הורה | ⛔ | ⛔ | 👁️ + 🔶 respond | 👁️ | 👁️ | ⛔ | 👁️ |
| matches | 👁️ + 🔶 יצירה/סיום | ⛔ | ⛔ | ⛔ | ⛔ | 👁️ | ⛔ | 👁️ + 🔶 |
| checkins | 👁️ | ⛔ | ⛔ | ⛔ | ⛔ | 🔶 create ‏(verify_checkin) | ⛔ | 👁️ |
| daily_logs | 👁️ | ⛔ | ⛔ | ⛔ | ⛔ | 🔶 upsert שלה | ⛔ | 🔶 מנומק |
| reviews | 🔶 create + 👁️ לפי D14 | 👁️ ציבורי (הורים) | 👁️ שלה | — | — | 🔶 | ⛔ | 👁️ |
| audit_log | 👁️ על ילדיו | ⛔ | 👁️ על עצמה | — | — | — | ⛔ | 👁️ |
| analytics_events / system_config | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ |
| תור אימות + מסמכי משלבת | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ✅ |
| תור אימות (שיוך) + מסמכים | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | ⛔ | 🔶 מפקח |

> **מפקח (`supervisor`, D26):** שורה אחרונה — רק `verified=submitted` בתור שלו או פנוי; טלפון משלבת רק דרך `supervisor_reject_document` אחרי צפייה במסמכים. אין גישה לילדים, matches, config.

### 3. כללי כתיבת RLS (מחייבים כל מיגרציה)

1. **טבלה חדשה = RLS enabled באותה מיגרציה.** אין חלון זמן חשוף.
2. **כל UPDATE policy חייבת WITH CHECK מפורש** — לעולם לא ברירת המחדל. אם רק חלק מהעמודות מותרות — טריגר guard על העמודות הקפואות (הלקח מ-C1 ו-C4).
3. **עמודות סטטוס/כסף/תפקיד לעולם לא נכתבות ב-UPDATE ישיר** — רק RPC.
4. **פונקציות SECURITY DEFINER:** ‏`SET search_path = public, pg_temp` חובה; ולידציית קלט בראש הפונקציה; בדיקת בעלות לפני כל פעולה.
5. **אין policy על בסיס נתון שהמשתמש שולט בו.** (הלקח מ-C4: ‏role בטבלה שהמשתמש מעדכן = לא בסיס לאמון בלי הגנת טריגר.)
6. שינוי RLS = עדכון המטריצה כאן + בדיקות pgTAP לשני הכיוונים באותו PR.

### 4. Service Role — כללי ברזל

- קיים **רק** ב-Edge Functions (secrets) וב-CI. לעולם לא בלקוח, לעולם לא ב-repo.
- כל שימוש עוקף-RLS מנומק בהערת קוד ("למה חייבים כאן service role") ורושם audit.
- שימושים לגיטימיים בלבד: שליחת push לפי טריגר · השעיית משתמש (auth.admin) · ‏jobs של pg_cron.

### 5. הרשאות אזור Staff `(staff)` — web

- **מפקח:** `role='supervisor'` + OTP. מסכי אימות בלבד (S-STF-01).
- **אדמין:** `is_admin()` + MFA (production). כל מסכי WP6.
- כל פעולה — RPC `supervisor_*` / `admin_*` + audit (D24).
