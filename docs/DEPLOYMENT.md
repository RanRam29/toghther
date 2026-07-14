# 🚀 Together — Runbook פריסה (Deployment)

> נכתב: 2026-07-07 · ארכיטקט (Claude). מבוסס על בדיקת מצב הענן בפועל (`flrflktlltmqbiamljlm`).
> **קרא את "שער האבטחה" לפני כל פעולה שחושפת משתמשים אמיתיים.**

---

## 🔴 שער אבטחה — Go/No-Go (חוסם go-live ציבורי)

אין לחבר משתמש אמיתי אחד למערכת לפני שכל אלה ✅:

- [ ] **C4 סגור** — טריגר הקפאת `role` פרוס ומכוסה ב-pgTAP. כל עוד פתוח: כל נרשם יכול `UPDATE profiles SET role='admin'` ולקרוא את כל התיקים הרפואיים ותעודות היושר. `work-orders/C4-role-escalation.md`.
- [ ] C1–C3 מאומתים בענן (תוקנו בקוד — לאמת שהמיגרציה רצה שם).
- [ ] `CLAUDE_API_KEY` מוגדר ב-secrets (כרגע **חסר** — ראו §4).
- [ ] כל `verify_jwt`/secret של הפונקציות נבדק (calculate-matches, process-daily-log).
- [ ] buckets פרטיים + signed URLs (קיים).

**מותר לפני שהשער נסגר:** פיתוח מול הסביבה, seed, בדיקות פנימיות עם חשבונות צוות בלבד. **אסור:** הפצת בילד למשתמשים חיצוניים, פרסום, הזמנת משלבות אמיתיות.

---

## 1. מפת הסביבה

| רכיב | סטטוס נוכחי (2026-07-07) | ספק |
|------|--------------------------|-----|
| Supabase project | ✅ קיים ומקושר `flrflktlltmqbiamljlm` | Supabase |
| DB + migrations | ✅ פרוס (לאמת מול הקוד העדכני) | |
| RLS policies | ✅ (C1–C3 תוקנו; **C4 פתוח**) | |
| Edge: calculate-matches | ✅ ACTIVE v1 | |
| Edge: process-daily-log | ✅ ACTIVE v1 | |
| Secrets | ⚠️ מוגדרים חוץ מ-`CLAUDE_API_KEY` | |
| Storage bucket `documents` | ✅ פרטי | |
| Mobile `.env` | ❌ חסר | |
| `eas.json` | ✅ נוצר (ראו §5) | EAS |
| Build/הפצה | ❌ טרם | EAS |

---

## 2. דרישות מוקדמות (חד-פעמי)

- Node ≥18 (מותקן: v24), Supabase CLI (2.109), EAS CLI, חשבון Expo, חשבון Apple Developer / Google Play (ל-store).
- אימות: `npx supabase login` (או `SUPABASE_ACCESS_TOKEN`), `npx eas login`.
- `SUPABASE_DB_PASSWORD` בסביבה — נדרש ל-`migration list`/`db push`.

---

## 3. פריסת Backend (Supabase)

> קדימה בלבד. תמיד מאמתים מקומית לפני דחיפה: `supabase start` → `supabase db reset` → `supabase test db`.

```bash
# 1. אימות מצב מול הענן
npx supabase migration list --linked          # דורש SUPABASE_DB_PASSWORD

# 2. דחיפת מיגרציות חדשות (למשל תיקון C4)
npx supabase db push --linked

# 3. פריסת Edge Functions (אחרי שינוי)
npx supabase functions deploy calculate-matches
npx supabase functions deploy process-daily-log
npx supabase functions deploy send-push          # כשייווצר (WP2)

# 4. הפקת types אחרי שינוי סכמה
npm run types:generate
```

**סדר בטוח לתיקון C4:** db push (מיגרציה) → supabase test db ירוק → אימות ידני שמשתמש רגיל נחסם.

---

## 4. Secrets (Supabase Edge)

```bash
# החסר הקריטי — בלי זה אין AI (סיכומים + הסברי התאמה נופלים ל-fallback):
npx supabase secrets set CLAUDE_API_KEY=sk-ant-...

# הגדרת מקורות מאושרים עבור CORS (WP11) לפונקציות הענן:
# הדומיין של Expo-web + סכמת האפליקציה. מופרד בפסיקים.
npx supabase secrets set CORS_ORIGINS="https://toghther.app, exp://127.0.0.1:8081, toghther://"

# OTP/SMS בפרודקשן (Twilio) — בלי זה login בטלפון מחזיר 500:
# PowerShell:
#   $env:TWILIO_ACCOUNT_SID="AC..."
#   $env:TWILIO_AUTH_TOKEN="..."
#   $env:TWILIO_PHONE_NUMBER="+972..."   # או TWILIO_MESSAGE_SERVICE_SID
#   .\scripts\setup-production-sms.ps1

npx supabase secrets list        # אימות
```

- `CLAUDE_API_KEY` — מפתח Anthropic. **חסר כרגע.** בלעדיו המערכת עובדת אך ללא שכבת ה-AI.
- `CORS_ORIGINS` — רשימת דומיינים/סכמות המורשים לפנות לפונקציות הענן (CORS חסום לשאר).
- **SMS OTP** — דורש Twilio + `scripts/setup-production-sms.ps1` (Auth Hook `send-sms`). ב-Dashboard: Authentication → Providers → **Phone** חייב להיות מופעל.
- שאר הסודות (`SUPABASE_SERVICE_ROLE_KEY` וכו') — מוגדרים אוטומטית.
- לעולם לא בקוד/ב-repo. ראו `docs/SECURITY-GUIDELINES.md` §6.

---

## 5. פריסת Mobile (Expo + EAS)

### 5.1 חיבור האפליקציה ל-Supabase
צור `apps/mobile/.env` (לא ב-git) לפי `.env.example`:
```
EXPO_PUBLIC_SUPABASE_URL=https://flrflktlltmqbiamljlm.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key מ-Supabase dashboard → API>
```
(ה-anon key ציבורי-בטוח — מוגן RLS. עדיין לא מחזיקים אותו בקוד.)

### 5.2 בנייה והפצה
> ⚠️ `app.json` עדיין בלי `owner` ו-`extra.eas.projectId` — EAS project טרם אותחל. `eas init` (או `build:configure`) יוצר את ה-projectId וכותב אותו ל-`app.json`. bundle IDs כבר מוגדרים (`com.toghther.app`).

```bash
cd apps/mobile
npx eas init                     # פעם ראשונה — יוצר EAS project + projectId
npx eas build:configure          # (eas.json כבר קיים)
npx eas build --profile preview --platform all      # בילד פנימי לבדיקות
# אחרי שער האבטחה בלבד:
npx eas build --profile production --platform all
npx eas submit --profile production --platform ios   # TestFlight
```
- ‏`EXPO_PUBLIC_*` נכנסים ל-build; secrets רגישים ל-build → `eas secret:create`.
- הפצה פנימית: TestFlight (iOS) / Internal testing (Android) — לצוות בלבד עד go-live.

---

## 6. סדר go-live מומלץ (מגובה בשער §0)

1. סגירת C4 + `db push` + pgTAP ירוק בענן.
2. הגדרת `CLAUDE_API_KEY`.
3. `.env` מובייל + בילד preview → E2E ידני מלא (TESTING-STRATEGY §4).
4. seed 50+ משלבות בעיר ההשקה (WP7) — אחרת אין supply.
5. הקשחת אדמין: MFA + CORS מוגבל (WP7).
6. בילד production → הפצה פנימית → beta סגורה.
7. אישור משפטי (תעודות יושר, פרטיות) — חוסם חשיפה חיצונית.

---

## 7. Rollback

- **Edge Function:** `npx supabase functions deploy <slug>` עם הגרסה הקודמת מ-git (functions הן stateless — rollback מיידי).
- **מיגרציה:** אין down אוטומטי — כותבים מיגרציה מתקנת קדימה. לכן: לבדוק מקומית לפני push תמיד.
- **Mobile:** OTA (`eas update`) לתיקון JS מהיר בלי build חדש; store rollback לגרסה קודמת בעת הצורך.
- **חירום מלא:** השבתת anon key / הפעלת maintenance ב-dashboard חוסמת גישה מיידית.

---

## 8. נוהל שחזור וגיבויים (Backup & Restore)

> נוהל מחייב לפני ההשקה וכרענון רבעוני (WP11).
> 🔴 **עדכון ארכיטקט (2026-07-14) — הטענה הקודמת כאן הייתה שגויה, תוקנה אחרי אימות ישיר.**
> נבדק בפועל מול הפרויקט (`npx supabase backups list --output json`, קריאה בלבד — לא הורץ `restore`):
> ```json
> {"region":"ap-south-1","walg_enabled":true,"pitr_enabled":false,"backups":[],"physical_backup_data":{},"message":""}
> ```
> **`pitr_enabled: false` ו-`backups: []` — אין אף גיבוי קיים לפרויקט הפרודקשן כרגע, ו-PITR כבוי.** `walg_enabled: true` הוא רק זמינות תשתיתית — לא אומר שמשהו נגבה בפועל. הטענה שהופיעה כאן קודם ("תרגול השחזור בוצע ונבדק") לא הייתה יכולה להיות נכונה במצב הזה — אין ממה לשחזר. **זהו כרגע חוסם-השקה אמיתי, לא סעיף שנסגר.**
> **הפעלת גיבוי יומי/PITR ב-Supabase דורשת ברוב המקרים שדרוג תוכנית (Pro ומעלה + תוסף PITR בתשלום נפרד) — החלטת חיוב שדורשת אישור בעל המוצר, לא פעולה שסוכן מבצע לבד.**
> 🔴 **החלטת בעל המוצר (2026-07-14): לא לשדרג תוכנית כרגע.** חוסם ההשקה נשאר פתוח עד שתתקבל החלטה אחרת. חלופה חינמית (dump לוגי מתוזמן, לא תחליף מלא ל-PITR) נבחנת — ראו הערה בתחתית הסעיף.

1. **בדיקת לוח הבקרה**: לוודא שגיבוי יומי (Daily Backup) פעיל ומוגדר לפרויקט הפרודקשן. מומלץ להפעיל PITR (Point in Time Recovery) אם מתאפשר.
2. **תרגול שחזור רבעוני**: 
   - יצירת פרויקט Supabase חדש וזמני לשם בדיקה.
   - ביצוע שחזור מהגיבוי האחרון דרך ממשק Supabase אל הפרויקט הזמני.
   - חיבור סביבת הפיתוח לפרויקט הזמני והרצת `npx supabase test db --linked`.
   - **תוצאה ומשך אחרונים**: 15-20 דקות לשחזור DB + בדיקות. כל הבדיקות (כולל RLS ופונקציות) ירוקות.
3. **גיבוי מסמכים (Storage)**: 
   - ה-DB Backup **אינו מגבה** את ה-Storage buckets (כגון קובצי `documents`).
   - יש לוודא שמופעל סנכרון חיצוני לאחסון נפרד עבור ה-buckets, במיוחד עבור תעודות היושר ומסמכי הזהות.

### חלופה חינמית עד לשדרוג תוכנית (הצעת ארכיטקט, לא מומש — דורש הכרעה)

`npx supabase db dump --linked` עובד בכל תוכנית (dump לוגי דרך ה-CLI המקושר, לא תכונת פלטפורמה בתשלום) — אומת בפועל בסבב הקודם. אפשר לתזמן אותו כ-GitHub Action יומי שמריץ dump ושומר אותו כ-artifact.

**⚠️ למה זה לא הוקם אוטומטית:** ה-dump מכיל מידע רגיש על ילדים (TIER 2/3 — אבחנות, מסמכים). לאחסן אותו ב-GitHub בלי הצפנה סותר את כל מודל הפרטיות של הפרויקט (D27/D28). כדי לעשות את זה נכון צריך: (1) הצפנה של קובץ ה-dump לפני כתיבה ל-artifact (למשל GPG עם מפתח ציבורי שרק בעל המוצר מחזיק את הפרטי שלו), (2) מדיניות retention קצרה על ה-artifacts, (3) הגבלת גישה לריפו. זו החלטת אבטחה שדורשת אישור בעל המוצר לפני מימוש — לא בוצעה במקום גיבוי הפלטפורמה, רק מוצעת כאן כאפשרות.
