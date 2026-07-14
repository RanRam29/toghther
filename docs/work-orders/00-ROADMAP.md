# 🗺️ תוכנית ביצוע — Work Packages ל-MVP

> מאסטר לכל חבילות העבודה. כל WP הוא קובץ נפרד עם תוכנית מלאה. סוכן לוקח WP שלם או משימה מתוכו לפי תחום האחריות.
> מעודכן: 2026-07-07 · ארכיטקט (Claude). סדר העדיפויות כאן גובר על הטבלה ב-DEV-PROCESS (מסונכרן).

## מצב הממצאים (עדכני)

| ממצא | תיאור | סטטוס |
|------|--------|--------|
| C1 | self-approve בקשה | ✅ תוקן (security_overhaul) |
| C2 | חשיפת children ב-TIER 0 | ✅ תוקן (view + RPC) |
| C3 | audit לא עובד | ✅ תוקן (get_child_details) |
| C4 | הסלמת אדמין דרך role | 🔴 **פתוח** — `work-orders/C4-role-escalation.md` |
| H1 | באג ותק במנוע | ✅ תוקן (engine_fixes) |
| H2 | כפילות scoring SQL/TS | 🟠 פתוח → WP4 |
| H3 | חוסר hard filters (זמינות/שפה) | 🟠 פתוח → WP4 |
| H4 | approve יוצר match מיד (סטיית D10) | 🟠 פתוח → WP1 |
| M1 | calculate-matches: מודל+עלות | 🟡 פתוח → WP4 |

## רצף וחבילות

```
WP0 (C4) ──▶ WP1 ──▶ WP2 ──▶ WP3 ──▶ WP5 ──▶ WP7
 אבטחה     לולאת    Push    אימות   אופרציה  launch
                match          +Admin1  יומית
                              WP4 (מנוע) ─ במקביל ל-WP2/3 (Antigravity)
                              WP6 (Admin2+analytics) ─ אחרי WP3
```

| WP | כותרת | בעלים | תלוי ב־ | קובץ |
|----|--------|--------|---------|------|
| WP0 | תיקון C4 | Antigravity | — | [C4-role-escalation.md](C4-role-escalation.md) |
| WP1 | סגירת לולאת ה-match (+H4) | שניהם | WP0 | [WP1-close-match-loop.md](WP1-close-match-loop.md) |
| WP2 | תשתית Push | שניהם | WP1 | [WP2-push-notifications.md](WP2-push-notifications.md) |
| WP3 | אימות משלבות + Admin-1 + **מפקח (D26)** | שניהם | WP0 | [WP3-verification-and-admin1.md](WP3-verification-and-admin1.md) · [WP3-supervisor-role.md](WP3-supervisor-role.md) |
| WP4 | מנוע: H2/H3/M1 + מקור אמת | Antigravity | — (מקבילי) | [WP4-engine-cleanup.md](WP4-engine-cleanup.md) |
| WP5 | אופרציה יומית | שניהם | WP1, WP2 | [WP5-daily-operations.md](WP5-daily-operations.md) |
| WP6 | Admin-2 + analytics | שניהם | WP3 | [WP6-admin2-analytics.md](WP6-admin2-analytics.md) |
| WP7 | Launch prep | שניהם | הכול | [WP7-launch-prep.md](WP7-launch-prep.md) |

## גל שני (2026-07-13) — אחרי סגירת פערי הביקורת

> תנאי כניסה לגל: תיקון טיוטת v3 לפי [2026-07-13-v3-hardening-review.md](2026-07-13-v3-hardening-review.md) ופריסתה, ומשימה 1.3 של Cursor (מחיקת בלוק הייצוא). תוכנית-העל: [2026-07-13-continuation-plan.md](2026-07-13-continuation-plan.md).

```
שלב 1 (ביקורת) ──▶ WP8 (D45 מתגים) ──▶ WP10 (דוחות) ──▶ WP11 (קדם-השקה)
                └─▶ WP9 (D31 UI + D44) ─ במקביל ל-WP8 (Cursor מוביל)
משפטי (WP11 סעיף 5) ─ במקביל לכול, חוסם פתיחה לציבור בלבד
```

| WP | כותרת | בעלים | תלוי ב־ | קובץ |
|----|--------|--------|---------|------|
| WP8 | D45 — מתגי "מה דנה רואה" פר-שדה פר-זוג | Antigravity→Cursor | שלב 1 | [WP8-d45-field-visibility.md](WP8-d45-field-visibility.md) |
| WP9 | D31 ממשק הורה שני + D44 הגנת צילום מסך | Cursor (+RPC קטן) | שלב 1 | [WP9-secondary-parent-ui-d44.md](WP9-secondary-parent-ui-d44.md) |
| WP10 | דוחות אדמין מצטברים (תחליף הייצוא) + הצעת D49 | Antigravity→Cursor | שלב 1 | [WP10-admin-reports.md](WP10-admin-reports.md) |
| WP11 | הקשחת קדם-השקה: קצב, CORS, גיבויים, E2E, משפטי | שניהם + בעל המוצר | WP8–WP10 (חלקו מקבילי) | [WP11-launch-hardening.md](WP11-launch-hardening.md) |

## גל שלישי (2026-07-14) — היקשרות והישארות

> תוכנית מלאה + הצעות החלטה D51–D56: [2026-07-14-wave3-retention-plan.md](2026-07-14-wave3-retention-plan.md).
> תנאי כניסה: פריסת מיגרציית התיקון `20260713120000`, סיום ממשקי WP9+WP10, ואישור בעל המוצר להצעות ההחלטה. work orders מפורטים ייכתבו פר-חבילה עם פתיחתה.

```
שער כניסה ──▶ WP12 ──▶ WP14 ∥ WP13 ──▶ WP15
              WP16 + P-1..P-4 ─ מתמשך במקביל
```

| WP | כותרת | בעלים | מהות |
|----|--------|--------|-------|
| WP12 | "השבוע של {שם הילד}" + "רגע היום" | Antigravity→Cursor | סיכום שבועי תבניתי + שדה רגע-היום בשאלון |
| WP13 | דוח התקדמות להורה | Antigravity→Cursor | זכות עיון של ההורה; האפליקציה כתיק הפדגוגי |
| WP14 | כלים מקצועיים למשלבת | Antigravity→Cursor | סיכום שעות חודשי, יומן מאוחד, ותק מקצועי |
| WP15 | רצף ליווי והחלפה מהירה | Antigravity→Cursor | זרימת "נמצא מחליפה" + מנוע רשימת המתנה |
| WP16 | היגיינת התראות ולולאות עדינות | שניהם | שעות שקט, תזכורות מדודות, סיכום תפעול שבועי |

## כללי עבודה לכל WP
- לפני התחלה: `product/00-INDEX.md` → ההחלטות (01) → המסכים (05) → DoD (09) → security (docs/).
- backend קודם ל-UI; שינוי חתימת RPC → `types:generate` + הודעה בלוח באותו סבב.
- כל WP נסגר עם E2E ידני של ה-flow שלו + עדכון הלוח.
