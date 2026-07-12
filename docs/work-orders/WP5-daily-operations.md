# WP5 — אופרציה יומית (ה-retention)

> **בעלים:** שניהם · **תלוי ב:** WP1 (match פעיל), WP2 (push) · **אבן דרך:** 5
> **מטרה:** הערך החוזר שמנצח וואטסאפ — check-in, שאלון 60 שניות, סיכום AI, גרף מגמה, דירוג.
> קרא: `product/03-FLOWS-PARENT.md` P-08 · `product/04-FLOWS-PROFESSIONAL.md` F-08/F-09 · `product/05-SCREENS.md` S-PRO-06/07, S-PAR-07, S-SHARED-01 · `product/07-METRICS-CATALOG.md` · `product/01-DECISIONS.md` D11/D12/D13/D14.

## שלב A — Backend (Antigravity)
1. **`metric_catalog`** — טבלה עם הקטלוג מ-07 (key, he/en, categories[], is_core), + seed. RPC `get_metrics_for_child` (ליבה + תוספות הקטגוריה).
2. **בחירת 3 מדדים ל-match** (D12): עמודה `matches.metric_keys text[]` + RPC `set_match_metrics(match_id, keys[])` (הורה בלבד, בדיוק 3).
3. **`verify_checkin`** (קיים, תוקן) — לוודא geofence ±100m (D13, checkin חד-כיווני) + טריגר push להורה.
4. **`daily_logs`** — upsert(match_id, log_date) קיים; לוודא טריגר → `process-daily-log` (webhook) → push. **בוטל (D30, 2026-07-12): אין קריאה ל-AI חיצוני.** `process-daily-log` מפיק `ai_summary`/`ai_strategy` ממשפטי תבנית קבועים (לפי מצב הרוח) בטון חם — לא ניסוח דינמי. רטרואקטיבי עד 48ש' (D11).
5. **reviews** — `verify_checkin`... כלומר RPC `submit_review` שאוכף: match ב-`ended`, חשיפה עיוורת (D14 — נחשף כששניהם דירגו או אחרי 14 יום), חד-פעמי. טריגר rating קיים.
6. pgTAP: checkin רק ב-match פעיל של המשלבת · daily_log רק בעלים · review עיוור עד תנאי.

## שלב B — UI (Cursor)
| מסך | עיקר | החלטה |
|------|------|--------|
| S-PRO-06 "היום שלי" | כרטיס פר-match: בוקר "הגעתי"(GPS, הרשאה בזמן D22)→verify_checkin; אחה"צ→שאלון | geofence fail: הודעה+retry, לא רושם valid שגוי |
| S-PRO-07 שאלון | mood(חובה)+≤3 סליידרים(מהקטלוג)+הערה | ≤60 שניות (D11); upsert; רטרו 48ש' |
| S-PAR-07 (הרחבה) | פיד יומן + סיכומי AI + TrendChart שבועי + "מי צפה בתיק" | גרף רק מ-3 ימי נתונים; סיכום "בהכנה" עד שמוכן |
| S-SHARED-01 דירוג | 3 קריטריונים + טקסט | עיוור (D14) |

## Definition of Done
- [ ] הורה בוחר 3 מדדים בתחילת match; המשלבת מדווחת עליהם בלבד
- [ ] check-in בתוך/מחוץ geofence — שתי התוצאות נכונות; push להורה
- [ ] שאלון ≤60ש' (נמדד ב-`seconds_to_complete`); סיכום AI מופיע להורה + push
- [ ] גרף מגמה + פיד יומן להורה; "מי צפה בתיק" מציג audit
- [ ] דירוג עיוור עובד לפי D14
- [ ] E2E יום עבודה מלא דו-מכשירי
