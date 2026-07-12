# WP3 — אימות משלבות + אזור מנהל שלב 1 (תור אימות)

> **בעלים:** שניהם · **תלוי ב:** WP0 (C4 — כי בונים על הרשאות אדמין) · **אבן דרך:** 3
> **מטרה:** שער ה-supply עובד end-to-end: משלבת מעלה מסמכים → אדמין מאמת מאזור מנהל → המשלבת פעילה. מחליף את ה-runbook ב-Studio.
> קרא: `product/04-FLOWS-PROFESSIONAL.md` F-02/F-03 + חלק ג' · `product/10-ADMIN-SPEC.md` (S-ADM-02) · `product/05-SCREENS.md` S-PRO-02/03 · `docs/AUTH-SPEC.md` §4-5.

## שלב A — Backend (Antigravity)

> **סטטוס (2026-07-08):** נכתב ע"י הארכיטקט — מיגרציה `20260708150000_wp3_admin_verification.sql` + בדיקות `supabase/tests/wp3_admin_verification_test.sql` (13 בדיקות). **נותר ל-Antigravity:** `db push` + הרצת pgTAP + `types:generate`, ופריט 4 (טריגר push, תלוי בחיווט pg_net מ-WP2).

1. ✅ **RPC-י אדמין** — נכתבו: `admin_verify_professional(pro_id, checklist)` (D15: נכשל אם חסר certificate/criminal_record/id_card; מסמן docs+pro verified; שומר checklist) · `admin_reject_document(doc_id, reason)` (סיבה חובה) · `admin_log_reasoned_view(resource, id, reason)`. כולם `is_admin()` + audit `admin_*`.
2. ✅ **`admin_notes`** (RLS admin-only) + **`suspended_at`** ב-profiles + **`verification_checklist`** ב-professionals — נכתבו.
3. ✅ **signed URL** — לא צריך RPC: מדיניות ה-Storage "Allow admins to view all documents" (מ-C4) כבר מאפשרת ל-web client של האדמין להנפיק `createSignedUrl(path, 300)` ישירות.
4. ⬜ **טריגר** `verified` משתנה → push למשלבת — תלוי בחיווט pg_net של WP2 (תבנית `notify_push` שם).
5. ✅ **pgTAP** — נכתב: לא-אדמין נחסם מכל `admin_*`; אישור עם מסמך חסר נכשל (D15); reject דורש סיבה; reasoned_view נרשם.

## שלב B — UI משלבת (Cursor)
- **S-PRO-02 המסמכים שלי:** checklist 3 מסמכים, העלאה (`expo-image-picker`/`expo-document-picker`, דחיסה), סטטוס פר-מסמך, נדחה→סיבה+העלאה מחדש. bucket פרטי (קיים).
- **S-PRO-03 ממתינה לאימות:** מסך בית זמני, progress, "עד 2 ימי עסקים", ניווט לילדים/בקשות חסום עד verified. Realtime/push מחליף את המסך באישור.

## שלב C — אזור מנהל (Cursor, web)
- **shell `(admin)`** + route guard (`is_admin`, web בלבד) — התשתית לכל מסכי האדמין.
- **S-ADM-02 תור אימות:** רשימת `submitted` לפי ותק + חיווי SLA; מסך משלבת עם viewer מסמכים (signed URL) + צ'קליסט אינטראקטיבי (כפתור אישור נעול עד השלמה) + "דחה מסמך"+סיבה; הדגשת דפוסי טלפון/מייל בביו.

## Definition of Done
- [ ] משלבת מעלה 3 מסמכים → סטטוס "בבדיקה"
- [ ] אדמין רואה בתור, פותח מסמכים, ממלא צ'קליסט, מאשר → משלבת מקבלת push ונפתחת
- [ ] דחיית מסמך עם סיבה → המשלבת רואה מה לתקן
- [ ] כל פעולת אדמין נרשמה ב-audit; לא-אדמין נחסם (pgTAP + ניסיון ידני)
- [ ] אישור חסום כשמסמך חסר (D15)
- [ ] E2E מלא של שער ה-supply
