# 👷 Together — מסמך חלוקת עבודה מרכזי

> נכתב: 2026-07-07 · ארכיטקט (Claude) · **מקור אמת יחיד לחלוקת האחריות בין הסוכנים.**
> סתירה מול DEVELOPMENT_PLAN.md חלק ה' — מסמך זה גובר. סטטוס עדכני נשמר ב-`COORDINATION_BOARD.md` + `coordination_state.json`.

---

## 1. הסוכנים ותחומי הליבה

| סוכן | תחום | לא נוגע ב־ |
|------|------|-----------|
| **Antigravity** | DB, migrations, RLS, RPC, Edge Functions, מנוע התאמה, בדיקות pgTAP, Stitch design | קוד UI ב-`apps/mobile/app` ו-`components` |
| **Cursor** | Expo app: מסכים, components, hooks, stores, ניווט, i18n, לקוח Supabase | migrations, RLS, Edge Functions, RPC internals |
| **Claude (ארכיטקט)** | תיעוד, הכרעות מוצר/ארכיטקטורה, ביקורת, הנחיות עבודה, סדר עדיפויות | לא מממש קוד (אלא אם התבקש מפורשות) |

**כלל גבול:** ה-**types** (`packages/shared`) הם החוזה בין השניים. Antigravity משנה סכמה → מריץ `types:generate` → מודיע בלוח → Cursor צורך. אף סוכן לא דורס קבצים של השני.

---

## 2. חלוקה לפי חבילת עבודה (WP)

מקרא בעלות: 🅰️ Antigravity · 🅲 Cursor · 🅰️🅲 שניהם (backend קודם)

| WP | תת-משימה | בעלים | סטטוס |
|----|----------|:-----:|:-----:|
| **C4** | טריגר הקפאת role + `is_admin()` + pgTAP | 🅰️ | 🔴 פתוח |
| **WP1** | פיצול `approve_request` / `create_match_from_request` + `decline_after_intro` + pgTAP | 🅰️ | פתוח |
| | מסכי S-PAR-05/06/07 + פירוק "אישור→match אטומרי" הקיים | 🅲 | פתוח |
| **WP2** | `push_tokens` + העדפות + Edge `send-push` + טריגרים | 🅰️ | פתוח |
| | `expo-notifications`, רישום token, handlers, מסך הגדרות | 🅲 | פתוח |
| **WP3** | RPC-י `admin_*` + signed URL + `admin_notes` + pgTAP | 🅰️ | פתוח |
| | S-PRO-02/03 (מסמכים, ממתינה) | 🅲 | פתוח |
| | shell `(admin)` web + S-ADM-02 תור אימות | 🅲 | פתוח |
| **WP4** | H3 filters (זמינות/שפה) + H2 מחיקת כפילות + M1 calculate-matches | 🅰️ | פתוח |
| **WP5** | `metric_catalog` + `set_match_metrics` + RPC checkin/log/review + pgTAP | 🅰️ | פתוח |
| | S-PRO-06/07 + S-PAR-07 (יומן/גרף) + S-SHARED-01 דירוג | 🅲 | חלקי |
| **WP6** | `analytics_events` + `system_config` + RPC-י admin + views דשבורד | 🅰️ | פתוח |
| | S-ADM-01/03/04/05/06/07 + `track()` בנקודות | 🅰️🅲 | פתוח |
| **WP7** | seed 50+ משלבות + CI + סקירת אבטחה + הקשחת אדמין | 🅰️ | פתוח |
| | EAS build + E2E ידני + onboarding על מכשיר | 🅲 | פתוח |

הפירוט המלא לכל WP: `docs/work-orders/`.

---

## 3. חלוקה לפי תחום (מבט-על)

### 🅰️ Antigravity — Backend & DB
- **סכמה ומיגרציות:** כל שינוי DB, קדימה בלבד, RLS מהרגע הראשון.
- **אבטחה:** RLS policies (לשני הכיוונים), RPC state machine, טריגרי הגנה (C1/C4), audit (C3), Storage policies.
- **מנוע התאמה:** `get_matches_for_child`, hard filters, soft scoring — מקור אמת יחיד ב-SQL.
- **Edge Functions:** `calculate-matches`, `process-daily-log`, `send-push` (חדש).
- **בדיקות:** pgTAP לכל policy ו-RPC; smoke ל-Edge.
- **עיצוב:** Stitch design system (הושלם).

### 🅲 Cursor — Mobile App
- **מסכים:** לפי `product/05-SCREENS.md` (הורה, משלבת, משותף, אדמין-web).
- **תשתית UI:** ניווט (Expo Router + guards), i18n (he/en, RTL), NativeWind מהטוקנים, providers.
- **State/data:** hooks + `lib/api` (TanStack Query), Zustand ל-client state, לקוח Supabase.
- **client-side:** push registration, הרשאות מכשיר (D22), analytics `track()`.

### 🅰️🅲 משותף (backend קודם ל-UI)
- אופרציה יומית (WP5), אזור מנהל שלב 2 (WP6), launch (WP7).

---

## 4. מטריצת בעלות לפי ארטיפקט

| ארטיפקט / נתיב | בעלים |
|----------------|:-----:|
| `supabase/migrations/**` | 🅰️ |
| `supabase/functions/**` | 🅰️ |
| `supabase/tests/**` (pgTAP) | 🅰️ |
| `packages/matching/**` | 🅰️ (מיועד למחיקה — WP4) |
| `packages/shared/**` (types) | 🅰️ מייצר · 🅲 צורך |
| `apps/mobile/app/**` (מסכים) | 🅲 |
| `apps/mobile/components/**` | 🅲 |
| `apps/mobile/hooks/**`, `lib/**`, `stores/**` | 🅲 |
| `apps/mobile/i18n/**` | 🅲 |
| `apps/mobile/app/(admin)/**` (web) | 🅲 |
| `product/**`, `docs/**`, `*_REVIEW.md`, `COORDINATION_BOARD.md` | 🧠 ארכיטקט (סוכנים מעדכנים סטטוס בלוח בלבד) |

---

## 5. נקודות תלות וסנכרון (Handoffs)

| # | תלות | ממתין (Cursor) | תנאי (Antigravity) |
|---|------|----------------|---------------------|
| 1 | הפקת Types | צריכת RPC/סכמה חדשה | הרצת migration בענן + `types:generate` |
| 2 | לולאת match (WP1) | S-PAR-06/07 | פיצול `approve`/`create_match` + חתימות |
| 3 | Push (WP2) | handlers + הגדרות | `send-push` + טריגרים |
| 4 | אימות (WP3) | תור אימות S-ADM-02 | RPC-י `admin_*` + signed URL |
| 5 | אופרציה (WP5) | S-PRO-07 שאלון | `metric_catalog` + `get_metrics_for_child` |
| 6 | Analytics (WP6) | `track()` בנקודות | טבלת `analytics_events` + RLS |

**כלל:** תלות פתוחה נרשמת בלוח כ-`blocked_by`. הצד החוסם מקדם אותה בעדיפות. שינוי חתימת RPC = הודעה מיידית בלוח.

---

## 6. תהליך עבודה מסוכם (לכל סבב)

1. קרא `COORDINATION_BOARD.md` (מה השני עושה) + WP הרלוונטי ב-`docs/work-orders/`.
2. ודא שאין `blocked_by` פתוח עליך; אם יש — טפל בו או בחר משימה אחרת.
3. מַמֵּש בתחום האחריות שלך בלבד.
4. עבור על `product/09-DEFINITION-OF-DONE.md` + Security-DoD (`docs/SECURITY-GUIDELINES.md` §10).
5. עדכן `COORDINATION_BOARD.md` + `coordination_state.json`; הודע על handoffs.
6. שאלה מוצרית פתוחה → סעיף "שאלות לארכיטקט" בלוח, המשך הלאה.

---

## 7. תפקיד הארכיטקט (Claude) בזרימה

- מכריע החלטות מוצר/ארכיטקטורה ומעדכן `product/01-DECISIONS.md`.
- כותב הנחיות עבודה (`docs/work-orders/`) ומעדכן סדר עדיפויות.
- עונה על "שאלות לארכיטקט" מהלוח.
- סוגר ממצאי ביקורת ב-`ARCHITECTURE_REVIEW.md` אחרי דיווח הסוכן.
- **לא** מממש קוד אלא בבקשה מפורשת של בעל המוצר.
