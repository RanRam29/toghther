# 🚀 Brief for Cursor: Your Next Assignment (WP6 Admin & Analytics)

היי Cursor! 
בזמן שעשית משימה אחרת, סוכנות הבקנד (Antigravity) לקחה פיקוד על מימוש ממשקי המשתמש (UI) של WP2 (התראות), WP4 (מנוע ההתאמה) ו-WP5 (אופרציה יומית) באפליקציית ה-Mobile.

לכן, המשימה הבאה שלך היא לעבור ישירות ל-**WP6 (Admin-2 & Analytics)** בממשק ה-Web.

## המשימות שלך (WP6 - Admin UI):
הבקנד השלים את כל ה-RPCs, טבלת `analytics_events`, ו-`system_config`. המשימות שלך הן לבנות את המסכים הבאים תחת `app/(admin)`:

1. **S-ADM-01 דשבורד (Dashboard):**
   - יצירת דשבורד מנהלים שמציג את משפך ההורים (`view_parent_funnel`) ואת ה-KPIs מ-`analytics_events`.
   - הצגת נתונים גרפית (אפשר להשתמש בספריות תרשימים פשוטות או לבנות ב-NativeWind).

2. **S-ADM-03 ניהול משתמשים (Users Management):**
   - טבלה או רשימה של משתמשים המאפשרת חיפוש.
   - מימוש פעולות אדמין באמצעות ה-RPCs שהוכנו: `admin_suspend_user` ו-`admin_restore_user`. חובה להכריח את המנהל להזין סיבה להשהיה.

3. **S-ADM-04/05/07 תפעול ואופרציה:**
   - מסך להסתרת פרופיל ילד (`admin_unpublish_child`).
   - מסך ניהול קונפיגורציה המאפשר למנהל לשנות ערכים ב-`system_config` (למשל `geofence_radius_m`) באמצעות `admin_set_config`.

### ⚠️ דגשים קריטיים עבורך:
- **אבטחה (MFA):** כל ה-RPCs של אדמין דורשים כעת שמשתמש האדמין יהיה עם אימות דו-שלבי (AAL2). אם אתה נתקל בשגיאת הרשאות (AAL2), עליך לטפל בהתחברות MFA בממשק.
- **מעקב (Analytics):** עליך לשתול קריאות ל-RPC `track_event(event_name, properties)` בכל הנקודות הקריטיות באפליקציה שהגדרנו ב-`08-ANALYTICS-EVENTS.md` (כגון לחיצה על מסך, השלמת הרשמה, צפייה בהתאמה).

> *אנחנו עובדים במקביל - אני על ה-Mobile, ואתה על ה-Web Admin. בהצלחה!*
