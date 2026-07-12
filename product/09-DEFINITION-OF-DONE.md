# ✅ Definition of Done — צ'קליסט חובה לכל משימה

> סוכן לא מסמן משימה כ-completed ב-`coordination_state.json` לפני שכל הסעיפים הרלוונטיים מסומנים. "עובד אצלי" ≠ Done.

## לכל משימה (תמיד)

- [ ] תואם להחלטות ב-[01-DECISIONS.md](01-DECISIONS.md) — נבדק מול הרשימה, לא מהזיכרון
- [ ] `npx tsc --noEmit` נקי + lint נקי
- [ ] אין סודות/מפתחות בקוד — הכול ב-env / Supabase secrets
- [ ] עדכון `COORDINATION_BOARD.md` + ‏`coordination_state.json` בסוף הסבב
- [ ] commit עם prefix מוסכם (feat/fix/test/docs) והפניה למזהה מסך/החלטה (למשל `feat(S-PAR-05): ...`)

## משימת UI (Cursor)

- [ ] מומש לפי המפרט ב-[05-SCREENS.md](05-SCREENS.md) כולל **כל** קריטריוני הקבלה של המסך
- [ ] ארבעת המצבים קיימים: loading (skeleton) / empty (תבנית 3 חלקים) / error+retry / offline
- [ ] כל הטקסטים ב-i18n — ‏`he.json` **וגם** `en.json` באותו commit; אפס מחרוזות קשיחות
- [ ] קופי לפי [06-COPY-TONE.md](06-COPY-TONE.md) — כולל המילון (אין "TIER"/"match" בפני משתמש)
- [ ] נבדק ויזואלית ב-RTL עברית (iOS או Android אחד לפחות) — כיווניות, יישור, אייקונים
- [ ] נגישות: touch targets ≥44pt, labels לאלמנטים אינטראקטיביים, קונטרסט לפי הפלטה הסמנטית
- [ ] צבעים/רדיוסים מהטוקנים בלבד (`tailwind.config.js`) — אין hex בקוד
- [ ] אירועי analytics של המסך (לפי [08-ANALYTICS-EVENTS.md](08-ANALYTICS-EVENTS.md)) נורים בנקודת האמת
- [ ] קריאות נתונים דרך ה-hooks/api layer — אין supabase client ישיר בקומפוננטות

## משימת Backend/DB ‏(Antigravity)

- [ ] מיגרציה חדשה — לעולם לא עריכת מיגרציה שכבר רצה בענן
- [ ] כל טבלה חדשה: RLS enabled + policies + בדיקת pgTAP שמוכיחה חסימה (לא רק גישה)
- [ ] שינויי מצב דרך RPC עם ולידציית state machine — אין UPDATE ישיר על עמודות סטטוס (C1)
- [ ] גישת משלבת לנתוני ילד — דרך views/RPC מדורגים בלבד (C2) + רישום audit ב-TIER 2+ ‏(C3)
- [ ] `supabase test db` ירוק מקומית לפני push
- [ ] שינוי סכמה → הרצת `npm run types:generate` ועדכון `packages/shared`
- [ ] Edge Function: טיפול בשגיאות + CORS + אימות קלט; מודל AI מהרשימה המאושרת בלבד (`claude-haiku-4-5`, `claude-sonnet-5`)

## משימת flow חוצה (שניהם)

- [ ] ה-flow המלא הורץ ידנית end-to-end עם שני משתמשי בדיקה (הורה + משלבת) מול סביבת פיתוח
- [ ] push נשלח ומתקבל בכל נקודות המטריצה של ה-flow
- [ ] Realtime מעדכן את הצד השני בלי refresh ידני
