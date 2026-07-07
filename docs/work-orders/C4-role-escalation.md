# 🔴 הנחיית עבודה — C4: חסימת הסלמת הרשאות לאדמין

> **אל:** Antigravity (Backend & DB) · **מאת:** ארכיטקט (Claude) · **תאריך:** 2026-07-07
> **עדיפות:** חוסמת. הראשונה בתור באבן דרך 0. **אין למזג פיתוח אחר שנוגע ב-`profiles` לפני שזה נסגר.**
> קרא לפני התחלה: `docs/AUTH-SPEC.md` חלק א' §4 + חלק ב' §3 · `docs/SECURITY-GUIDELINES.md` §2.

---

## 1. הרקע — למה זה קריטי

המדיניות `profiles_own_update` ([002_rls_policies.sql:95](../../supabase/migrations/002_rls_policies.sql)) מתירה למשתמש לעדכן את השורה של עצמו ללא הגבלת עמודות וללא `WITH CHECK`. אין טריגר שמגן על `role`. לכן כל משתמש מאומת יכול:

```sql
UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
```

מרגע זה `get_user_role()` מחזיר `admin` ונפתחים: כל `children` ו-`child_details` (policies של admin), כל ה-`matches`, וכל הבאקט `documents` — **תעודות זהות ותעודות יושר של כל המשלבות** (מדיניות ה-Storage סומכת על `get_user_role()='admin'`).

C1–C3 כבר טופלו ב-`security_overhaul`. C4 עדיין חשוף — וזו הפרצה החמורה ביותר כי היא נותנת גישה להכול בבת אחת.

## 2. הפתרון (שתי שכבות הגנה)

### שכבה א' — טריגר שמקפיא את `role` ואת `id` (חובה)
מיגרציה חדשה קדימה (אל תערוך מיגרציה שרצה). מבנה מוצע:

```sql
-- Migration: <timestamp>_protect_profile_immutable_fields.sql
-- C4 fix: freeze role/id on profiles; role changes only via service_role (admin RPC / backend)

CREATE OR REPLACE FUNCTION public.protect_profile_immutable_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- id never changes
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Changing profile id is not allowed';
  END IF;

  -- role change allowed ONLY for service_role (backend / admin_* RPCs running elevated)
  IF NEW.role IS DISTINCT FROM OLD.role
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Changing role is not allowed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_profile_immutable ON public.profiles;
CREATE TRIGGER trg_protect_profile_immutable
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_immutable_fields();
```

הערות:
- `auth.role()` מחזיר את ה-role claim של הבקשה; מפתח service_role → `'service_role'`. משתמש רגיל → `'authenticated'` → נחסם.
- `handle_new_user` הוא INSERT (לא UPDATE) — לא מושפע. יצירת role ב-signup ממשיכה לעבוד.
- אל תסתמך על `WITH CHECK` בלבד לעניין ה-role — הוא לא רואה את OLD ולכן לא יכול לאכוף "ללא שינוי". הטריגר הוא המנגנון הנכון.

### שכבה ב' — הקשחת בדיקת האדמין (defense-in-depth, מומלץ באותה מיגרציה)
כדי שגם אם תיפרץ שכבה כלשהי בעתיד, הרשאת אדמין לא תסתמך רק על טבלה שהמשתמש נוגע בה — הוסף אימות כפול מול `app_metadata` (נכנס ל-JWT, לא ניתן לעריכת משתמש):

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT
    get_user_role() = 'admin'
    AND COALESCE((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean, false);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp;
```

- חשבונות אדמין יסומנו ב-`app_metadata.is_admin=true` (נעשה ידנית ביצירת אדמין — ראו AUTH-SPEC).
- **אל תחליף עדיין** את כל השימושים ב-`get_user_role()='admin'` — זה שינוי רחב. למשימה הזו: הוסף את הפונקציה, והשתמש בה **במדיניות ה-Storage של המסמכים** (הנכס הכי רגיש) ובכל RPC אדמיני עתידי. החלפה גורפת תתוזמן בנפרד ל-Admin-1.

## 3. בדיקות pgTAP נדרשות (חובה — חסימה, לא רק הצלחה)

הוסף ל-`supabase/tests/` (קובץ נפרד או הרחבת הקיים). לכל אחת — הרצה בהקשר המשתמש המתאים דרך `set_config('request.jwt.claims', ...)`:

1. `throws_ok` — משתמש הורה שמנסה `UPDATE profiles SET role='admin' WHERE id=<שלו>` → נכשל.
2. `throws_ok` — משלבת שמנסה אותו דבר → נכשל.
3. `throws_ok` — ניסיון `UPDATE profiles SET id=<אחר>` → נכשל.
4. `lives_ok` — הורה מעדכן שדה מותר (`full_name`, `area`) → מצליח, וה-role לא השתנה.
5. `lives_ok` — הקשר service_role משנה role → מצליח (מדמה RPC אדמיני).
6. `is` — אחרי כל הניסיונות הכושלים, `SELECT role FROM profiles WHERE id=<המשתמש>` עדיין הערך המקורי.
7. (שכבה ב') `is(is_admin(), false)` — למשתמש עם `role='admin'` בטבלה אך בלי `app_metadata.is_admin`.

## 4. Definition of Done

- [x] מיגרציה חדשה קדימה; רצה נקי מקומית (`supabase db reset`) — **20260707120000_c4_protect_profile_role.sql**
- [ ] רצה בענן — **`supabase db push --linked`** (חסום מסביבת Cursor: `TransportError` / pooler EOF; הרץ `scripts/deploy-c4-cloud.ps1` ממכונה עם גישה לענן)
- [x] 7 בדיקות ה-pgTAP עוברות; `supabase test db --local` → **PASS** (2026-07-07, Cursor)
- [x] מדיניות Storage של `documents` משתמשת ב-`is_admin()` במקום `get_user_role()='admin'`
- [x] `npm run types:generate` — fallback ל-local כש-Cloud חסום; `is_admin` + RPCs ב-`database.ts`; `tsc --noEmit` נקי
- [x] עדכון `COORDINATION_BOARD.md` + `coordination_state.json`
- [x] סימון הממצא כסגור ב-`ARCHITECTURE_REVIEW.md` (מקומי מאומת; ענן = צעד DevOps אחד)

## 5. הערת ארכיטקט נלווית (לא חלק מ-C4 — לטיפול נפרד)
במהלך הביקורת נמצאה **סטייה מ-D10**: ה-RPC ‏`approve_request` שכתבת יוצר `match` פעיל (TIER 3) מיד עם אישור ההורה. לפי החלטת המוצר D10 ומודל ה-TIER, אישור = TIER 2 (היכרות) בלבד, וה-match נוצר בפעולת הורה נפרדת אחרי ההיכרות ("התחלנו לעבוד יחד"). זה נרשם כ-**finding נפרד (H4)** ב-ARCHITECTURE_REVIEW — אל תטפל בו במסגרת C4; נתאם אותו אחרי שהפרצה סגורה, כי הוא משפיע גם על מסכי Cursor שכבר נבנו.
