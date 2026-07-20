# 🔒 WP-D55 — תיקון דליפת `reporting_consistency` (backend)

> **בעלים:** Antigravity (backend) · **מזמין:** ארכיטקט · **תאריך:** 2026-07-19 · **חומרה:** 🔴 הפרת פרטיות D55
> **מקור:** התגלה במהלך גל G1 (re-skin/gap-fill של S-PAR-02). ‏UI כבר תוקן ע"י הארכיטקט; **שכבת הנתונים עדיין דולפת.**

---

## 1. הבעיה (מאומתת מול הקוד)

`professional_stats_view` (הגדרה אחרונה: `supabase/migrations/20260715150000_security_review_fixes.sql:183`) הוא:
- `WITH (security_invoker = true)`
- `REVOKE ALL ... FROM PUBLIC, anon;` + **`GRANT SELECT ... TO authenticated;`**
- כולל את העמודה `reporting_consistency_90d` (מחושבת פר-משלבת).

**המשמעות:** כל משתמש מאומת — **כולל הורה** — יכול לקרוא `reporting_consistency_90d` של כל משלבת דרך ה-API (`.from("professional_stats_view")`), גם אחרי שהוסרה מה-UI.

**זה סותר D55 במפורש:** "חודשי פעילות וליוויים שהושלמו — פומביים; **עקביות דיווח (%) מוצגת למשלבת עצמה ולאדמין בלבד, לא פומבית**." אחוז פומבי מייצר בדיוק את הדירוג-המשווה ש-D3/D4 נלחמות בו.

**הקורא בצד הלקוח:** `apps/mobile/hooks/useProfessionalTools.ts` → `useProfessionalStats(proId)` קורא `.from("professional_stats_view")`. משמש ב-2 הקשרים:
- **הורה** (S-PAR-02 `match-detail`) — צריך רק ציבורי.
- **משלבת עצמה** (כלי משלבת/פרופיל) — צריכה גם `reporting_consistency_90d`.

---

## 2. התיקון הנדרש (פיצול view — לא להסיר עמודה בלבד!)

> ⚠️ **אל תסירו את `reporting_consistency_90d` מה-view הקיים בלי לספק נתיב חלופי** — מסך המשלבת עצמה תלוי בו ויישבר.

**צעד 1 — view ציבורי (לכולם):**
```sql
-- months_active + completed_matches + active_matches בלבד. ללא reporting_consistency.
CREATE OR REPLACE VIEW public.professional_public_stats_view
WITH (security_invoker = true) AS
  SELECT p.id AS professional_id,
         <months_active>, <completed_matches>, <active_matches>
  FROM public.professionals p
  LEFT JOIN match_stats ms ON ms.professional_id = p.id;
REVOKE ALL ON public.professional_public_stats_view FROM PUBLIC, anon;
GRANT SELECT ON public.professional_public_stats_view TO authenticated;
```

**צעד 2 — נתיב מוגן ל-`reporting_consistency_90d` (owner + admin בלבד).** מומלץ RPC על view (לא GRANT רחב):
```sql
CREATE OR REPLACE FUNCTION public.get_professional_reporting_consistency(p_professional_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_owner uuid; v_val integer;
BEGIN
  SELECT user_id INTO v_owner FROM public.professionals WHERE id = p_professional_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  -- הרשאה: המשלבת עצמה או אדמין בלבד (D55)
  IF NOT (v_owner = auth.uid() OR public.is_admin()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT reporting_consistency_90d INTO v_val
    FROM <recent-stats-cte-or-view> WHERE professional_id = p_professional_id;
  RETURN COALESCE(v_val, 0);
END; $$;
REVOKE ALL ON FUNCTION public.get_professional_reporting_consistency(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_professional_reporting_consistency(uuid) TO authenticated;
```

**צעד 3 — לצמצם/להסיר את ה-view הישן:** או להסיר את `reporting_consistency_90d` מ-`professional_stats_view` (ואז הוא זהה ל-public), או ל-DROP אותו ולכוון את כל הקוראים ל-public/RPC. **בדקו dependents לפני DROP** (`security_invoker` — אין CASCADE מפתיע, אבל ודאו).

---

## 3. שינוי צד-לקוח (מי מעדכן?)
- `apps/mobile/hooks/useProfessionalTools.ts`: לפצל ל-`useProfessionalPublicStats` (קורא `professional_public_stats_view`) ו-`useMyReportingConsistency` (קורא ה-RPC). **הארכיטקט/Cursor** יעדכן את הצרכנים (S-PAR-02 כבר לא מציג את ה-%; מסך המשלבת יעבור ל-RPC). תאמו בלוח.

---

## 4. בדיקות pgTAP (חובה, שני הכיוונים — D55)
1. הורה (או משלבת אחרת) קורא `professional_public_stats_view` → **אין** עמודת `reporting_consistency_90d`.
2. הורה קורא `get_professional_reporting_consistency(<pro אחר>)` → **חריגה `forbidden`**.
3. המשלבת עצמה קוראת `get_professional_reporting_consistency(<self>)` → מחזיר ערך.
4. אדמין → מחזיר ערך לכל משלבת.

## 5. שער סיום
`supabase test db --local` ירוק (כולל 4 הבדיקות החדשות) → פריסה לענן → אימות מול הענן (לא רק מקומי — לקח חוזר בפרויקט). עדכון `COORDINATION_BOARD.md` + סימון D55 כאכוף גם ב-DB.
