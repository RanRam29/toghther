# 🏗️ Together — מסמך ארכיטקטורה

> המסמך הקבוע (מה המערכת) — משלים את `ARCHITECTURE_REVIEW.md` (ביקורת נקודתית ותיקונים). סתירה → REVIEW גובר עד שהתיקונים נטמעים, ואז מתעדכן כאן.

## 1. תמונה כללית

```
┌─────────────── Expo (repo אחד) ───────────────┐
│  (auth) │ (parent) │ (professional) │ (active-match) │ (admin: web) │
│  hooks → lib/api → Supabase JS client                 │
└──────────────────────┬────────────────────────┘
                       │ PostgREST / RPC / Realtime / Storage / Auth (OTP)
┌──────────────────────▼────────────────────────┐
│ Supabase — PostgreSQL יחיד (SSOT)              │
│  PostGIS · pg_cron · RLS (מודל TIER)           │
│  Edge Functions: calculate-matches,            │
│    process-daily-log, send-push (מתוכנן)       │
└───────┬──────────────────────┬─────────────────┘
        │ Anthropic API        │ Expo Push
     (Claude: סיכומים,        (התראות)
      הסברי התאמה)
```

- **מונורפו:** `apps/mobile` (כל הלקוחות כולל אדמין-web) · `packages/shared` (types מ-`supabase gen`) · `supabase/` (migrations, functions, tests).
- **אין backend נוסף.** כל לוגיקה עסקית: ב-DB (פונקציות/RPC/טריגרים) או ב-Edge Functions. אסור להוסיף שרת — הכרעה מהמסמך המנחה.

## 2. עקרון "שלושת השערים" (חוק ברזל)

כל גישה של משלבת לנתוני ילד — דרך אחד משלושה שערים בלבד:
1. **View ציבורי** (`children_tier0`) — עמודות TIER 0 בלבד. אין SELECT על טבלת `children` למשלבות.
2. **RPC קריאה מדורג** (`get_child_details`) — בודק tier דרך `get_tier_for_child()`, רושם `audit_log`, מחזיר בהתאם.
3. **RPC-י פעולה** (state machine): `respond_to_request`, `approve_request`, `create_match_from_request`, `verify_checkin`, `withdraw_request` — אין UPDATE ישיר על עמודות סטטוס משום צד, כולל אדמין (RPC-י `admin_*`, ראו product/10-ADMIN-SPEC).

הרציונל: מודל ה-TIER הוא הבטחת המוצר המרכזית; הוא נאכף ב-DB כך שבאג ב-UI לא יכול לדלוף מידע. (מקור: master_spec §11 + ARCHITECTURE_REVIEW C1–C3.)

## 3. מודל הנתונים (תמצית — הסכמה המלאה ב-migrations)

| קבוצה | טבלאות | הערות |
|--------|---------|-------|
| זהות | `profiles` (role) · `professionals` | professionals.id ≠ profiles.id — הצטרפות דרך user_id |
| ילד | `children` (TIER 0–1) · `child_details` (TIER 2–3) | ההפרדה הפיזית = הפרדת ה-RLS |
| שידוך | `match_requests` (state machine) · `matches` | request→match דרך RPC בלבד |
| אופרציה | `checkins` · `daily_logs` · `reviews` | daily_logs.metrics לפי `metric_catalog` |
| אמון | `document_uploads` · `audit_log` | bucket פרטי, signed URLs |
| תפעול | `system_config` · `metric_catalog` · `analytics_events` · `push_tokens` · `admin_notes` | פרמטרים חיים ב-DB, לא בקוד |

## 4. Frontend

- **ניווט:** Expo Router, route groups לפי תפקיד; `useProtectedRoute` אוכף role. אדמין — group ‏`(admin)` זמין ב-web בלבד.
- **State:** TanStack Query לכל server state (מפתחות אחידים ב-lib/api) · Zustand ל-client state בלבד (טיוטות onboarding, בורר ילד). אסור לשכפל server state ל-store.
- **שכבות:** קומפוננטה → hook (‏`useChildMatches`) → ‏lib/api → supabase client. קומפוננטות לא מדברות עם supabase ישירות (נאכף ב-DoD).
- **עיצוב:** NativeWind עם הטוקנים ב-`tailwind.config.js` בלבד; שפת העיצוב והשימוש הסמנטי — `PRODUCT_UX_SPEC.md` חלק 7.
- **Realtime:** מנויים על match_requests (שני הצדדים) ו-matches; ניתוק בעזיבת מסך.

## 5. AI

| שימוש | פונקציה | מודל | עיקרון |
|-------|----------|-------|---------|
| הסבר תאימות | calculate-matches | `claude-haiku-4-5` | נוצר פעם אחת, נשמר (cache), קריאה אחת מרוכזת לכל סט מועמדות |
| סיכום יומי + אסטרטגיה | process-daily-log | `claude-haiku-4-5` | אסינכרוני אחרי submit; ההורה רואה "בהכנה" עד שמוכן |

כללים: המפתח ב-Supabase secrets בלבד · לכל קריאה fallback לא-AI · אין נתונים מזהים מעבר לנחוץ בפרומפט · טמפרטורה/אורך קבועים בקוד הפונקציה.

## 6. התראות (תשתית ליבה)

`push_tokens` ‏(user_id, token, platform) → טריגרי DB על אירועי state machine → Edge ‏`send-push` → Expo Push API. קטגוריות עם opt-out פר-משתמש (S-SHARED-02). מטריצת האירועים: `PRODUCT_UX_SPEC.md` חלק 6.

## 7. סביבות

| סביבה | מה | שימוש |
|--------|-----|--------|
| מקומית | `supabase start` + Expo dev | פיתוח יומי; migrations נבדקות כאן קודם |
| ענן (`flrflktlltmqbiamljlm`) | Supabase Pro | staging עד launch; production בהמשך |
| CI | GitHub Actions | ‏pgTAP + tsc + lint על כל PR (ראו TESTING-STRATEGY) |

מיגרציות: קדימה בלבד, אף פעם לא עריכת מיגרציה שרצה. Types: ‏`npm run types:generate` אחרי כל שינוי סכמה.

## 8. גבולות מערכת מודעים (מה החלטנו לא לבנות)

צ'אט (D9) · OCR (ידני ב-MVP) · תשלומים (אחרי הכרעת Q4) · חמ"ל אוטומטי (v1.5 — הבסיס הידני: S-ADM-05) · vector search (pgvector כשיהיה צורך) · אפליקציית אדמין נפרדת (route group באותו קוד).
