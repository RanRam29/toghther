# WP6 — אזור מנהל שלב 2 + Analytics

> **בעלים:** שניהם · **תלוי ב:** WP3 (shell אדמין) · **אבן דרך:** 6
> **מטרה:** ניהול מלא של המערכת מאזור מנהל + תשתית data להכרעת התמחור (Q4).
> קרא: `product/10-ADMIN-SPEC.md` (S-ADM-01/03/04/05/06/07) · `product/08-ANALYTICS-EVENTS.md`.

## שלב A — Backend (Antigravity)
1. **`analytics_events`** (id, user_id nullable, event_name, properties jsonb, created_at) + RLS: insert למאומתים, קריאה לאדמין. **בלי PII** (08 — מזהים בלבד).
2. **`system_config`** (key, value jsonb, updated_by) + seed לפרמטרים החיים: geofence radius, ימי תפוגה (D8), מכסת בקשות (D7), עיר השקה (D18). RPC `admin_set_config`.
3. RPC-י אדמין: `admin_suspend_user`/`admin_restore_user` (auth.admin + suspended_at) · `admin_unpublish_child(child_id, reason)`. כולם audit.
4. Views לדשבורד: ספירות ומשפכים (conversion 4→6→9 מ-08) — שאילתות מצטברות.

## שלב B — UI אדמין (Cursor, web)
- **S-ADM-01 דשבורד:** מדדי הפלטפורמה + משפך, כל מספר לחיץ למסך מסונן.
- **S-ADM-03 משתמשים:** חיפוש/סינון, פרופיל, השהיה/שחזור/הערה.
- **S-ADM-04 ילדים ובקשות:** TIER 1 בלבד; איתור תקיעות משפך; unpublish.
- **S-ADM-05 matches:** בריאות תפעולית, סינון "מודאגים" (3+ ימים ללא פעילות) — בסיס ידני לחמ"ל v1.5.
- **S-ADM-06 audit:** סינון וקריאה בלבד (כולל admin_*).
- **S-ADM-07 תפעול:** עריכת `metric_catalog` ו-`system_config` בלי release; טבלאות analytics.

## שלב C — נקודות track (Cursor + Antigravity)
פונקציית `track(event, props)` אחת; ניקוב האירועים מ-08 בנקודות האמת (הצלחת RPC): משפך הורה, משפך משלבת, אופרציה. אירוע חדש = עדכון 08 באותו PR.

## Definition of Done
- [ ] אדמין מנהל משתמשים/ילדים/matches/config מה-UI; אין עריכת נתונים חופשית (הכול RPC+audit)
- [ ] analytics_events נכתב בכל נקודות המשפך; דשבורד מציג conversion אמיתי
- [ ] system_config שולט בפרמטרים — אין ערכים קשיחים בקוד
- [ ] אין PII ב-analytics — אומת
- [ ] המשפך 4→6→9 נמדד (הבסיס להכרעת Q4)
