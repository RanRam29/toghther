# 📕 Together — תיק מוצר (Product Dossier)

> נכתב: 2026-07-07 · ארכיטקט ראשי (Claude)
> **זהו שער הכניסה לכל סוכן שלוקח משימה.** אם אתה סוכן (Cursor / Antigravity / אחר) — קרא את הסעיף "איך משתמשים" לפני שאתה נוגע בקוד.

---

## איך משתמשים בתיק (חובה לכל סוכן)

1. **לפני כל משימה:** פתח את [01-DECISIONS.md](01-DECISIONS.md) — אם ההחלטה שרלוונטית למשימה שלך מופיעה שם, היא **סופית**. אל תמציא חלופה ואל תשאל מחדש.
2. **משימת UI/מסך:** המפרט המחייב נמצא ב-[05-SCREENS.md](05-SCREENS.md) — מטרה, נתונים, מצבים, קופי וקריטריוני קבלה לכל מסך. טקסטים לפי [06-COPY-TONE.md](06-COPY-TONE.md).
3. **משימת backend:** מכונות המצבים והחוזים ב-`PRODUCT_UX_SPEC.md` חלק 5, והאילוצים הטכניים ב-`ARCHITECTURE_REVIEW.md` (שורש הריפו).
4. **לפני סימון משימה כגמורה:** עבור על [09-DEFINITION-OF-DONE.md](09-DEFINITION-OF-DONE.md) — כל סעיף חובה.
5. **נתקלת בשאלה מוצרית שאין לה תשובה בתיק?** אל תחליט לבד — רשום אותה ב-`COORDINATION_BOARD.md` תחת "שאלות לארכיטקט" והמשך במשימה אחרת.

## סדר קדימות בין מסמכים (בסתירה — העליון גובר)

1. `docs/SECURITY-GUIDELINES.md` + `docs/AUTH-SPEC.md` + `ARCHITECTURE_REVIEW.md` — אבטחה, הרשאות, פרטיות
2. `docs/ARCHITECTURE.md` — ארכיטקטורת המערכת
3. **תיק המוצר הזה (`product/`)** — מוצר, UX, קופי ועיצוב
4. `PRODUCT_UX_SPEC.md` — תהליכי עבודה מפורטים
5. `master_spec.html` — חזון, שוק ועסק
6. `DEVELOPMENT_PLAN.md` — תכנון וחלוקת עבודה

## תוכן התיק

| קובץ | מה יש בו | למי |
|------|-----------|-----|
| [01-DECISIONS.md](01-DECISIONS.md) | יומן החלטות מוצר ממוספרות (D1–D22) — סופיות | כולם |
| [02-PERSONAS.md](02-PERSONAS.md) | פרסונות: מטרות, חרדות, מדדי הצלחה | כולם |
| [03-FLOWS-PARENT.md](03-FLOWS-PARENT.md) | מסע ההורה צעד-צעד כולל קריאות/כתיבות נתונים | Cursor, Antigravity |
| [04-FLOWS-PROFESSIONAL.md](04-FLOWS-PROFESSIONAL.md) | מסע המשלבת צעד-צעד + runbook אדמין | Cursor, Antigravity |
| [05-SCREENS.md](05-SCREENS.md) | **מפרט מסך-אחר-מסך** — הלב של התיק | Cursor |
| [06-COPY-TONE.md](06-COPY-TONE.md) | טון, מילון מונחים, תבניות הודעות, כללי i18n | Cursor |
| [07-METRICS-CATALOG.md](07-METRICS-CATALOG.md) | קטלוג המדדים הפדגוגיים לפי אבחנה (טיוטה לתיקוף) | Antigravity, Cursor |
| [08-ANALYTICS-EVENTS.md](08-ANALYTICS-EVENTS.md) | אירועי אנליטיקס ומשפכי המרה — לתיעוד מיום 1 | Antigravity |
| [09-DEFINITION-OF-DONE.md](09-DEFINITION-OF-DONE.md) | צ'קליסט סיום משימה — חובה | כולם |
| [10-ADMIN-SPEC.md](10-ADMIN-SPEC.md) | אזור המנהל — מפרט מלא (D23) | Cursor, Antigravity |
| [11-BUSINESS-PLAN.md](11-BUSINESS-PLAN.md) | תוכנית עסקית: מחקר משווה, מודל הכנסה, שערי הכרעה, תהליכי עבודה נגזרים | בעל המוצר, ארכיטקט |

## מסמכי הנדסה (`docs/`)

| קובץ | מה יש בו |
|------|-----------|
| [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) | ארכיטקטורת המערכת הקבועה: שכבות, שלושת השערים, מודל נתונים, AI, סביבות |
| [../docs/SECURITY-GUIDELINES.md](../docs/SECURITY-GUIDELINES.md) | **פיתוח מונחה־אבטחה** — סיווג נתונים, DB/Storage/Edge/client, סודות, פרטיות, Security DoD |
| [../docs/AUTH-SPEC.md](../docs/AUTH-SPEC.md) | **אימות והרשאות** — OTP, sessions, מודל תפקיד קפוא, מטריצת הרשאות מלאה, service role |
| [../docs/WORK-ALLOCATION.md](../docs/WORK-ALLOCATION.md) | **חלוקת עבודה מרכזית** — מי אחראי על מה, לפי WP/תחום/ארטיפקט + handoffs |
| [../docs/DEV-PROCESS.md](../docs/DEV-PROCESS.md) | מחזור משימה, Git, תיאום סוכנים, סדר עדיפויות תקף |
| [../docs/TESTING-STRATEGY.md](../docs/TESTING-STRATEGY.md) | שכבות בדיקה, חוקי RLS, צ'קליסט E2E, ‏CI |
| [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) | **Runbook פריסה** — Supabase + EAS, שער אבטחה, secrets, rollback |

## תוכניות ביצוע (`docs/work-orders/`)

נקודת הכניסה: [../docs/work-orders/00-ROADMAP.md](../docs/work-orders/00-ROADMAP.md) — מאסטר עם רצף, תלויות ובעלות. חבילות: C4 (אבטחה), WP1 לולאת match, WP2 push, WP3 אימות+Admin-1, WP4 מנוע, WP5 אופרציה יומית, WP6 Admin-2+analytics, WP7 launch. סוכן לוקח WP שלם או משימה מתוכו לפי תחום.

## מפת מסמכים בשורש הריפו (הקשר רחב)

- `master_spec.html` — המסמך המנחה המקורי (חזון, מחקר שוק, מודל עסקי)
- `PRODUCT_UX_SPEC.md` — תהליכי עבודה, מכונות מצבים, מטריצת התראות, כיוון עיצובי
- `ARCHITECTURE_REVIEW.md` — ממצאי אבטחה C1–C3, הכרעות ארכיטקטוניות, סדר עדיפויות MVP
- `COORDINATION_BOARD.md` — סטטוס וחלוקת משימות בין סוכנים

---

*מסמך חי · מתעדכן על ידי הארכיטקט בלבד*
