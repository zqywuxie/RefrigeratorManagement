# Design: Light Theme, User Auth, Fridge Model Simplification

**Date:** 2026-05-12
**Status:** approved

## Overview

Three changes to the BioFridge sample management system:
1. Light color scheme (default light, dark/light toggle)
2. User login/authentication with per-user sample ownership
3. Rename fridge compartments from "冷冻层/冷藏层" to "上层/下层", keep temperature as reference info

## 1. Database Changes

### New table: `users`

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('root', 'user') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Seed root user

- username: `root`, password: `root123`
- Created on app startup if not exists

### Columns added to samples and sub_samples

```sql
ALTER TABLE samples ADD COLUMN created_by VARCHAR(50) NULL;
ALTER TABLE sub_samples ADD COLUMN created_by VARCHAR(50) NULL;
```

Existing rows have NULL `created_by` — treated as legacy data, only root can edit.

**Note:** `created_by` (auto-set by backend from JWT) is distinct from `uploader` (free-text field entered by user describing sample collector). Permission checks use `created_by`, never `uploader`.

## 2. Backend Changes

### New route: `server/auth.js`

- `POST /api/auth/login` — validates credentials, returns `{ token, user: { username, role } }`
- `POST /api/auth/register` — creates user (root-only, checked via JWT role)

JWT payload: `{ username, role }`, signed with `JWT_SECRET` env var, 7-day expiry.

### New middleware: `server/middleware/auth.js`

- `authenticate` — validates JWT from `Authorization: Bearer <token>` header, sets `req.user`, returns 401 if missing/invalid
- `requireOwner(table, idParam)` — loads record's `created_by`, compares with `req.user.username`; if not owner and not root, returns 403

### Route permissions

| Route group | GET | POST | PUT | DELETE |
|-------------|-----|------|-----|--------|
| Refrigerators | public | login | login | login |
| Samples | public | login | login + owner | login + owner |
| Sub-samples | public | login | login + owner | login + owner |
| Sample types | public | public | - | - |
| Auth | - | public | - | - |

### Schema migration additions

- Create `users` table
- Add `created_by` to `samples` and `sub_samples`
- Seed root user

### New env var

- `JWT_SECRET` (default: `biofridge-secret-key`) in `server/.env`

## 3. Frontend Changes

### New files

- `src/app/components/LoginPage.tsx` — full-screen centered login card (white bg, shadow, rounded), username + password fields, login button. Register sub-form (root-only).
- `src/app/AuthContext.tsx` — React context holding `{ user, token, login, logout, register, isRoot }`. Token persisted in `localStorage`.

### Modified: `src/app/api.ts`

All `fetchJSON` calls include `Authorization: Bearer <token>` header from AuthContext (or localStorage).

### Modified: `src/app/App.tsx`

- Wrap with `AuthProvider` and `ThemeProvider`
- Show `LoginPage` when no valid token
- Header: add theme toggle button (sun/moon icon), current username display, logout button
- `AddSampleModal`: auto-set `uploader` to current username; pass `created_by` to API

### Modified: `src/app/components/DetailPanel.tsx`

- If `currentUser !== item.data.createdBy` and not root: hide edit button, status change section, and delete button
- Show gray "仅查看 / Read Only" badge

### Modified: `src/app/types.ts`

- `Sample` and `SubSample` interfaces: add `createdBy?: string` field

### Modified: `src/app/components/FridgeUnit.tsx`

- All labels: "冷冻层 / Freezer" → "上层 / Upper", "冷藏层 / Refrigerator" → "下层 / Lower"
- Remove blue/green compartment color distinction — use unified styling
- Temperature still displayed as reference (e.g., "上层 · −20°C")

### Modified: `src/app/components/FridgeSelector.tsx`

- Temperature field labels: "冷冻层 °C" → "上层 °C", "冷藏层 °C" → "下层 °C"

### Modified: `src/styles/theme.css`

- `:root` (light mode): white backgrounds (`#ffffff`, `#f8fafc`), dark text, soft borders
- `.dark`: keep existing dark values, adjusted for consistency
- Ensure CSS variables drive all component colors (reduce hardcoded inline values)

### Theme toggle

- Use existing `next-themes` package
- `ThemeProvider` wraps app
- Toggle button in header switches between `light` and `dark`

## 4. Implementation Order

1. Database: migration script for users table, created_by columns, root seed
2. Backend: auth routes, middleware, wire into existing routes
3. Frontend: AuthContext, LoginPage, wire api.ts
4. Frontend: theme changes (theme.css light mode, CSS variable usage)
5. Frontend: fridge compartment rename + permission UI
6. Testing: verify login flow, permission enforcement, theme toggle
