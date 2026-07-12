# 📈 אירועי אנליטיקס ומשפכים — מתועד מיום 1 (D17)

> המטרה: כשמגיע רגע הכרעת התמחור (Q4) — יש data. מימוש: טבלת `analytics_events` ‏(id, user_id nullable, event_name, properties jsonb, created_at) + פונקציית client אחת `track(event, props)`. בלי ספק חיצוני ב-MVP — הכול ב-Postgres, נשאילתות ב-Studio/אדמין.
> **פרטיות:** לעולם לא שם ילד, אבחנה, או טקסט חופשי ב-properties. מזהים בלבד.

## משפך ההורה (המשפך העסקי המרכזי)

| # | אירוע | properties | מודד |
|---|-------|-----------|------|
| 1 | `signup_completed` | role | כניסה |
| 2 | `child_profile_completed` | child_id, category | הפעלת ליבה |
| 3 | `child_published` | child_id | אמון בפרסום |
| 4 | `matches_viewed` | child_id, results_count | הרגע של R1 |
| 5 | `match_profile_viewed` | professional_id | עומק עניין |
| 6 | `request_sent` | request_id, initiated_by | 💰 נקודת התמחור המועמדת א' |
| 7 | `request_response_seen` | request_id, response | לולאה חיה |
| 8 | `request_approved` | request_id | אמון גבוה |
| 9 | `match_created` | match_id | 💰 נקודת התמחור המועמדת ב' |
| 10 | `match_ended` | match_id, reason, duration_days | איכות התאמה |

**KPI-י המשפך:** conversion ‏4→6 (כמה הורים שרואים התאמות שולחים בקשה) · 6→9 (כמה בקשות מבשילות ל-match) · זמן חציוני 6→9. אלה שלושת המספרים שיכריעו את מודל התמחור.

## משפך המשלבת (בריאות ה-supply)

| אירוע | properties | מודד |
|-------|-----------|------|
| `pro_onboarding_completed` | — | כניסת supply |
| `pro_docs_submitted` | — | רצינות |
| `pro_verified` | days_waited | SLA אימות בפועל |
| `pro_request_responded` | request_id, response, hours_to_respond | מהירות תגובה — קריטי לחוויית ההורה |
| `pro_browse_interest` | child_id | שימוש בערוץ המשני |

## אופרציה (ה-retention שמנצח וואטסאפ)

| אירוע | properties |
|-------|-----------|
| `checkin_done` | match_id, is_valid |
| `daily_log_submitted` | match_id, seconds_to_complete ← בודק את D11 בשטח |
| `ai_summary_viewed` | match_id ← ההורה באמת קורא? |
| `trend_chart_viewed` | match_id |
| `review_submitted` | match_id, role |

**KPI-י retention:** ‏% ימי match עם check-in · % עם שאלון · % סיכומים שנקראו תוך 24 שעות · D7/D30 של הורים עם match פעיל.

## כללים
1. אירוע נורה פעם אחת בנקודת האמת (הצלחת RPC, לא לחיצת כפתור).
2. שמות snake_case, בזמן עבר.
3. הוספת אירוע = עדכון המסמך הזה באותו PR.
