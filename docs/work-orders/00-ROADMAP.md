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

## כללי עבודה לכל WP
- לפני התחלה: `product/00-INDEX.md` → ההחלטות (01) → המסכים (05) → DoD (09) → security (docs/).
- backend קודם ל-UI; שינוי חתימת RPC → `types:generate` + הודעה בלוח באותו סבב.
- כל WP נסגר עם E2E ידני של ה-flow שלו + עדכון הלוח.
