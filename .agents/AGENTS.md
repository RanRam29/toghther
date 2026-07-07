# 📜 Together Project Rules & Guidelines

This file defines the project-scoped rules for all AI agents (Antigravity & Cursor) collaborating on the Together repository.

## 🧪 Testing Policy (חוק בדיקות קבוע)
- **RLS & Database Policies**: Any new database table, view, or RLS policy must be accompanied by database tests. We use `supabase test db` or verification scripts to test security filters under different simulated user roles (Parent, Professional, Admin).
- **Core Business Logic**: Complex functions, such as the scoring and filtering logic in `packages/matching`, must have Jest unit tests verifying correct score calculation and boundaries.
- **Continuous Verification**: Do not complete a task without validating that existing tests still pass.

## 🔄 Version Control & Syncing (חוקי Git)
- **Commit Cleanliness**: Always stage and commit files at the end of your turn.
- **Git Push Verification**: Check that all local commits are successfully pushed to the remote GitHub repository (`https://github.com/RanRam29/toghther`) at the end of your task.
- **No Embedded Git**: Never leave nested `.git` folders in monorepo packages (e.g. `apps/mobile`). Delete them immediately to keep tracking at the root.

## 🎨 Design and UI (חוקי עיצוב)
- **RTL Support**: All user interface elements must support RTL layout (Right-to-Left) by default to accommodate Hebrew, with English as the secondary (LTR) language managed via i18n translation files.
- **Design Tokens**: Adhere strictly to the Together design system colors: Purple (`#534AB7`) for primary actions, Teal (`#0F6E56`) for secondary elements, Amber (`#BA7517`) for alerts, and Pearl/Sand (`#FBFAF7`) for light mode background surfaces.
