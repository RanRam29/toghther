# 🚦 Together — לוח תיאום וסטטוס סוכנים

> **⚠️ עדכון ארכיטקט (2026-07-07): תיעוד מלא נוסף — נקודת הכניסה לכל משימה היא `product/00-INDEX.md`.**
> - **`product/`** — תיק המוצר: החלטות סופיות (01), פרסונות (02), מסעות (03–04), **מפרט מסכים (05)**, קופי (06), מדדים (07), analytics ‏(08), **DoD ‏(09) — חובה לפני סימון משימה כגמורה**, אזור מנהל (10).
> - **`docs/WORK-ALLOCATION.md`** — חלוקת העבודה המרכזית (מי אחראי על מה, לפי WP/תחום/ארטיפקט + handoffs). **מקור אמת לבעלות.**
> - **`docs/work-orders/`** — תוכניות ביצוע מלאות (מאסטר `00-ROADMAP.md`: C4, WP1–WP7).
> - **`docs/`** — ‏ARCHITECTURE · DEV-PROCESS (כולל סדר עדיפויות תקף) · TESTING-STRATEGY · AUTH-SPEC · SECURITY-GUIDELINES.
> - **`docs/SECURITY-GUIDELINES.md` + `docs/AUTH-SPEC.md`** — פיתוח מונחה־אבטחה, אימות והרשאות, מטריצת הרשאות מלאה. **מחייבים לכל משימה שנוגעת בנתונים.**
> - **`ARCHITECTURE_REVIEW.md`** — תיקוני אבטחה קריטיים. ‏**✅ C4 (הסלמת אדמין) נסגר 2026-07-07** — מיגרציה + 7/7 pgTAP ירוקות מקומית. C1/C2/C3 נסגרו ב-`security_overhaul`.
> - **חדש (D23): אזור מנהל מלא ב-MVP** — route group ‏`(admin)` ב-web; תור האימות (Admin-1) משתלב באבן דרך 3. מפרט: `product/10-ADMIN-SPEC.md`.
> בנושאי אבטחה/ארכיטקטורה — ARCHITECTURE_REVIEW גובר; בנושאי מוצר/UX — תיק המוצר גובר על DEVELOPMENT_PLAN.md.
>
> **✅ C4 — נסגר מקומית; ענן = צעד אחד (2026-07-07):**
> 1. Code review + `supabase db reset --local` — 12 מיגרציות כולל `20260707120000_c4_protect_profile_role`.
> 2. `supabase test db --local` — **PASS** (C4: 7/7 pgTAP + RLS privacy).
> 3. Types + `tsc --noEmit` — נקי (`is_admin`, RPCs מוקשחים).
> 4. סקריפטים: `scripts/verify-c4.ps1` (אימות מקומי) · **`scripts/deploy-c4-cloud.ps1`** (push + test בענן).
> **⏳ ענן:** Cursor חסום ל-Supabase Cloud (`TransportError`). הרץ **`.\scripts\deploy-c4-cloud.ps1`** מהטרמינal שלך — זה סוגר את C4 לגמרי.
> **🟠 finding חדש H4 (ARCHITECTURE_REVIEW):** `approve_request` יוצר match פעיל מיד — סטייה מ-D10. **לטיפול דו-צדדי אחרי C4** (משפיע על מסכי Cursor שכבר נבנו). אל תתקנו לבד — נתאם.
>
> **📮 שאלות לארכיטקט** (סוכן שנתקל בשאלה מוצרית פתוחה — רושם כאן וממשיך במשימה אחרת):
> - (אין כרגע)

> **הנחיה לסוכנים (Antigravity & Cursor):**
> 1. **קראו** את הקובץ הזה בתחילת כל סבב עבודה כדי להבין מה הסוכן השני עושה.
> 2. **עדכנו** את הסטטוס שלכם ואת לוח המשימות בקובץ זה וב-`coordination_state.json` בסוף כל סבב עבודה.
> 3. **אל תגעו** במשימות המשויכות לסוכן השני ללא תיאום.

---

## 🤖 סטטוס סוכנים נוכחי

### 🟢 Antigravity (Backend & DB & Stitch)
- **משימה נוכחית**: סיום תשתית DB ו-Seed בענן. מתחיל Stitch Design System.
- **הצעד הבא**: Stitch Design System + 6 מסכי ליבה.
- **חסימות**: אין.

### 🟡 Cursor (Mobile App Shell & UI)
- **משימה נוכחית**: ✅ הכנת פרודקשן (internal-only):
  - `apps/mobile/BUILD.md` — מדריך מלא בעברית לצעדים: `eas login` → `eas init --id` → `eas secret:create` → `eas build --profile preview --platform android|ios`.
  - `eas.json` הוגדר עם env vars propagation ל-`EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` בכל ה-profiles + `preview-simulator` ל-iOS Simulator.
  - `app.json` — הוספת `assetBundlePatterns`, `versionCode`/`buildNumber`, `permissions` ל-Android, `infoPlist` ל-iOS (Photo/Camera/Location), הכנת placeholder ל-`extra.eas.projectId` ו-`owner`.
  - Cast זמני על ה-RPCs הוסר לחלוטין — אנטיגרביטי הוסיף types ידניים ל-`approve_request`/`reject_request`/`respond_to_request`/`children_tier0`. הקוד נקי לחלוטין.
- **הצעד הבא (המשתמש/DevOps)**: להריץ `eas login` + `eas init --id` + `eas secret:create ...` + `eas build --profile preview --platform android` (~15 דק' בענן) → קישור ל-APK להתקנה על בודקים.
- **חסימות**: אין. `supabase gen types typescript --linked` עדיין נכשל ב-`TransportError` ממכונת Windows, אבל אנטיגרביטי כבר הוסיף את ה-types ידנית — אין השפעה.

---

## 📋 לוח משימות MVP

### 🗄️ תשתית ו-DB (אחריות: Antigravity)
- [x] הגדרת סכמה ראשונית (`001_initial_schema.sql`)
- [x] הגדרת מדיניות אבטחה (`002_rls_policies.sql`)
- [x] כתיבת פונקציות מנוע התאמה ו-check-in (`003_functions.sql`)
- [x] יצירת נתוני Seed לבדיקות (`seed.sql`)
- [x] הרצת מיגרציות ו-Seed בפרויקט Supabase בענן (`flrflktlltmqbiamljlm`)
- [x] כתיבת בדיקות RLS אוטומטיות

### 🎨 עיצוב וחווית משתמש (אחריות: Antigravity)
- [x] יצירת Design System ב-Stitch
- [x] עיצוב 6 מסכי ליבה ב-Stitch וייצוא קוד

### 📱 אפליקציית מובייל (אחריות: Cursor)
- [x] אתחול פרויקט Expo SDK 53 ב-`apps/mobile`
- [x] הגדרת NativeWind (+ design tokens מהמפרט)
- [x] הגדרת Expo Router (כולל role-based routing ל-parent ו-professional)
- [x] הגדרת i18n (עברית ואנגלית עם תמיכת RTL)
- [x] חיבור Supabase JS Client והפקת Types (`@toghther/shared`)
- [x] מסכי Onboarding ורישום (הורה / משלבת) + Auth OTP
- [x] Onboarding מפוצל לפי תפקיד: משלבת → `professionals`, הורה → `children` + `child_details`
- [x] שומרי ניווט (route guards) עם הפרדת תפקידים (parent ↔ professional)
- [x] פרופיל ילד (CRUD) + בורר ילדים
- [x] מסכי בית הורה (התאמות מ-RPC `get_matches_for_child`)
- [x] זרימת שליחת בקשה (TIER 1) + מסך בקשות
- [x] מסכי בית משלבת: בקשות נכנסות + תגובה (interested/rejected)
- [x] Browse TIER 0 (ילדים מפורסמים) + הבעת עניין
- [x] פרופיל משלבת (עריכת התמחויות, מסגרות, ניסיון, bio)
- [x] Active match dashboard (EVV check-in card, AI insights, logs list)
- [x] Daily log form (mood + pedagogical metrics + notes)

---

## 🔄 נקודות סנכרון ואינטגרציה (תלויות דו-צדדיות)
1. **הפקת Types**: Cursor צריך להריץ `npm run types:generate` רק לאחר ש-Antigravity מריץ בהצלחה את ה-migrations בענן.
2. **חיבור מנוע התאמה**: ה-API של האפליקציה למנוע ההתאמה תלוי בפונקציה `get_matches_for_child` שכתב Antigravity.
