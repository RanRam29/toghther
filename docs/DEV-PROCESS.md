# 🔄 תהליך הפיתוח — כללי עבודה לכל הסוכנים

> משלים את `AGENTS.md` (כללי הבסיס) ואת לוח התיאום. חל על Antigravity, Cursor וכל סוכן עתידי.

## 1. מחזור משימה (Task Lifecycle)

```
בחירת משימה מהלוח → קריאת התיק הרלוונטי → מימוש → DoD → עדכון הלוח → commit
```

1. **בחירה:** רק משימות בתחום האחריות שלך (חלוקה: DEVELOPMENT_PLAN חלק ה'). משימה של הסוכן השני — לא נוגעים.
2. **לפני מימוש:** `product/00-INDEX.md` → ההחלטות (01) → המפרט הרלוונטי (05/10) → האילוצים (ARCHITECTURE_REVIEW אם backend).
3. **שאלה מוצרית פתוחה?** לא מחליטים לבד — רושמים ב-COORDINATION_BOARD תחת "שאלות לארכיטקט", עוברים למשימה אחרת.
4. **סיום:** צ'קליסט `product/09-DEFINITION-OF-DONE.md` במלואו → עדכון `COORDINATION_BOARD.md` + ‏`coordination_state.json`.

## 2. Git

- **ענף:** ב-MVP עובדים על `main` (סוכן אחד פעיל בכל תחום — הפרדת קבצים מונעת קונפליקטים). מעבר ל-feature branches + PR — כשמצטרף מפתח אנושי או סוכן שלישי.
- **Commits:** ‏Conventional — ‏`feat|fix|test|docs|refactor(scope): תיאור`. ‏scope = מזהה מסך (S-PAR-05) או תחום (rls, matching, admin). commit אחד = יחידה לוגית אחת.
- **אסור:** ‏force push · עריכת מיגרציה שרצה · commit של `.env`/סודות · דריסת קובץ שהסוכן השני עובד עליו (בדוק בלוח לפני).

## 3. תיאום בין סוכנים

- `COORDINATION_BOARD.md` — נקרא בתחילת כל סבב, מתעדכן בסופו. כולל סעיף **"שאלות לארכיטקט"** — הארכיטקט (Claude) עונה ומעדכן את יומן ההחלטות.
- **תלות בין סוכנים** (Cursor צריך RPC שעוד לא קיים): נרשמת בלוח כ-blocked_by; ה-backend קודם ל-UI (כלל קיים).
- **חוזה בין הצדדים:** ה-types המופקים (`packages/shared`). שינוי חתימת RPC = הודעה בלוח + הפקת types מחדש באותו סבב.

## 4. סדר עדיפויות תקף (מתעדכן על ידי הארכיטקט בלבד)

התוכניות המלאות ב-`docs/work-orders/` (מאסטר: `00-ROADMAP.md`). C1–C3 ו-H1 כבר תוקנו.

| WP | אבן דרך | סטטוס | קובץ |
|----|---------|--------|------|
| WP0 | **C4 — הסלמת אדמין (ראשון!)** | 🔴 פתוח — חוסם | `work-orders/C4-role-escalation.md` |
| WP1 | סגירת לולאת ה-match (+H4) | פתוח | `WP1-close-match-loop.md` |
| WP2 | תשתית Push | פתוח | `WP2-push-notifications.md` |
| WP3 | אימות משלבות + Admin-1 | פתוח | `WP3-verification-and-admin1.md` |
| WP4 | מנוע: H2/H3/M1 + מקור אמת (מקבילי) | פתוח | `WP4-engine-cleanup.md` |
| WP5 | אופרציה יומית (Cursor התחיל UI) | חלקי | `WP5-daily-operations.md` |
| WP6 | Admin-2 + analytics | פתוח | `WP6-admin2-analytics.md` |
| WP7 | Launch prep | פתוח | `WP7-launch-prep.md` |

## 5. עבודה עם AI (קוד שקורא ל-Claude)

- מודלים מאושרים: `claude-haiku-4-5` (ברירת מחדל — סיכומים, ניסוחים) · `claude-sonnet-5` (רק אם haiku לא מספק, באישור ארכיטקט).
- כל פרומפט חדש/שינוי פרומפט — מתועד בקובץ הפונקציה עם הערת "מה הפלט המצופה".
- עיקרון: AI מעשיר, לא חוסם — לכל קריאה יש fallback והמשתמש לא ממתין לה סינכרונית.

## 6. סודות וקונפיגורציה

- מקומי: `.env` (ב-gitignore) לפי `.env.example` שמתעדכן עם כל משתנה חדש.
- ענן: Supabase secrets (Edge) / EAS secrets (build). פרמטרים מוצריים (רדיוסים, מכסות, תפוגות) — ב-`system_config`, לא בקוד ולא ב-env.
