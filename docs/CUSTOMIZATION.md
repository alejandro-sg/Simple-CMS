# Customization Guide

How to adapt Simple-CMS for your own business.

---

## Rename the Go Module

If you publish your fork to GitHub, update the module path so imports resolve correctly.

1. In `api/go.mod`, change the `module` line:
   ```
   module github.com/YOUR_ORG/YOUR_REPO/api
   ```

2. Update all internal imports in one command:
   ```bash
   find api/ -name "*.go" | xargs sed -i 's|github.com/alejandro-sg/Simple-CMS/api|github.com/YOUR_ORG/YOUR_REPO/api|g'
   ```

3. Verify everything compiles:
   ```bash
   go build ./...
   ```

---

## Add a Field to the Item Model

Example: adding a `color` field.

**1. SQL migration** — create `api/internal/db/migrations/003_add_color.sql`:

```sql
ALTER TABLE items ADD COLUMN color TEXT NOT NULL DEFAULT '';
```

**2. Go model** — add to the `Item` struct in `api/internal/models/item.go`:

```go
Color string `json:"color"`
```

**3. Go store** — add `color` to the SELECT, INSERT, and UPDATE queries, and to the `Scan` call in `api/internal/store/items.go`.

**4. TypeScript type** — add to `admin/lib/types.ts`:

```typescript
color: string;
```

**5. Form** — add the input field to `admin/components/ItemForm.tsx`:

```tsx
<input
  type="text"
  value={form.color}
  onChange={(e) => setForm({ ...form, color: e.target.value })}
  placeholder="Color"
/>
```

---

## Change Item Categories

Edit the `CATEGORIES` constant in `admin/components/ItemForm.tsx`:

```tsx
// Customize these categories for your business
const CATEGORIES = ["Electronics", "Clothing", "Books", "Other"];
```

---

## Change Item Statuses

The status values (`In Stock`, `Reserved`, `Sold`) are enforced by the frontend form. To change them:

1. Update the union type in `admin/lib/types.ts`
2. Update the corresponding `<select>` options in `admin/components/ItemForm.tsx`

The database stores status as free text, so no migration is needed.

---

## Customize Site Content

The Site Content page in the Admin UI lets you edit all public-facing text (brand name, homepage copy, contact info, etc.) without touching code. Content is stored as JSON in the `settings` table and served at `/api/site-content`.

The schema is defined by the `SiteContent` type in `admin/lib/types.ts`. To add new fields:

1. Add the default value to `api/internal/handlers/site_content_defaults.go`
2. Add the field to the `SiteContent` type in `admin/lib/types.ts`
3. Add the corresponding input to `admin/app/site-content/page.tsx`

---

## Add Permissions

Permissions are plain strings. To add a new one:

1. Add a constant in `api/internal/models/user.go` and add it to the `AllGrantablePermissions` slice
2. Add it to the `ALL_PERMISSIONS` array in `admin/lib/types.ts` (include a `key` and `label`)
3. Protect the route in `api/main.go`:
   ```go
   r.With(middleware.RequirePermission("your:perm")).Get("/api/admin/your-route", handler)
   ```

### Built-in permissions

| Permission | What it gates |
|-----------|---------------|
| `items:read` | View items in the admin UI |
| `items:write` | Create and edit items |
| `items:delete` | Delete items |
| `items:import` | Bulk CSV import |
| `reviews:read` | View reviews |
| `reviews:moderate` | Approve / reject reviews |
| `reviews:delete` | Delete reviews |
| `uploads:write` | Upload images |
| `content:write` | Edit site content |
