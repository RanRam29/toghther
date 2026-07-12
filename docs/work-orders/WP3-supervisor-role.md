# WP3b — תפקיד מפקח (supervisor) + שיוך תור אימות

> **בעלים:** Antigravity (backend) + Cursor (UI) · **תלוי ב:** WP3 admin verification · **החלטה:** D26
> **מטרה:** הפרדת אימות משלבות מתפקיד אדמין. מפקח = OTP בלבד, תור עם שיוך, טלפון רק אחרי צפייה במסמכים + הערת דחייה.

## שלב A — Backend (Antigravity)

### 1. Schema
```sql
-- הרחבת enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'supervisor';

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS assigned_supervisor_id uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_professionals_assigned_supervisor
  ON public.professionals(assigned_supervisor_id)
  WHERE verified = 'submitted';
```

### 2. Helpers
```sql
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.get_user_role() IN ('supervisor', 'admin')
    AND (
      public.get_user_role() = 'supervisor'
      OR public.is_admin()
    );
$$;
```
מפקח: role=supervisor בלבד. אדמין: עובר דרך `is_admin()`.

### 3. RPC-ים (כל אחד: `is_supervisor()` + audit `supervisor_*`)

| RPC | תיאור |
|-----|--------|
| `supervisor_claim_professional(p_pro_id uuid)` | שיוך אטומי IF `assigned_supervisor_id IS NULL` |
| `supervisor_log_document_view(p_doc_id uuid)` | audit צפייה; בודק שיוך |
| `supervisor_verify_professional(p_pro_id, p_checklist jsonb)` | כמו admin_verify; D15 |
| `supervisor_reject_document(p_doc_id, p_reason text)` | דוחה מסמך; **מחזיר** `jsonb` עם `phone` (E.164) רק אם נצפו 3 מסמכי חובה |
| `admin_release_supervisor_assignment(p_pro_id uuid)` | **אדמין בלבד** — מאפס שיוך |

### 4. RLS
- `professionals` SELECT למפקח: `verified='submitted' AND (assigned_supervisor_id IS NULL OR assigned_supervisor_id = auth.uid())`
- `profiles` join לתור: **בלי** `phone` למפקח (view או RPC)
- Storage documents: policy כמו אדמין ל-`is_supervisor()`
- שמור `admin_*` RPCs לפעולות אדמין-only (suspend, config…)

### 5. pgTAP
- מפקח נחסם מ-`admin_suspend_user`
- מפקח לא רואה `children`
- claim כפול נכשל
- reject בלי 3 document views → אין phone בתשובה
- אדמין יכול release assignment

### 6. Seed
```sql
-- טלפון בדיקה למפקח, ללא is_admin
UPDATE public.profiles SET role = 'supervisor', full_name = 'מפקח בדיקה'
FROM auth.users u WHERE profiles.id = u.id AND u.phone = '972522222222';
```

## שלב B — UI (Cursor) ✅ בתהליך
- Route `(staff)` — מפקח: תור פנוי + שלי; אדמין: אותו + עתיד WP6
- שער טלפון ב-UI + קריאות RPC לעיל
- Fallback ל-`admin_*` RPCs עד מיגרציה בענן

## Definition of Done
- [ ] מפקח מתחבר ב-web (OTP) → רואה תור פנוי, לוקח לטיפול, מאמת/דוחה
- [ ] טלפון לא מוצג עד דחייה ממוסקת
- [ ] אדמין עדיין יכול הכל + release שיוך
- [ ] pgTAP ירוק
