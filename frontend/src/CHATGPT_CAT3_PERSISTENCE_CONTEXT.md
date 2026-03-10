# Cat3 Persistence – Technical Context for Backend/DB Implementation

This document collects all required technical details so a persistence solution for Cat3 items can be implemented correctly (saved to backend/DB and visible to all users). Use exact paths, code snippets, and names from this project.

---

## 1) ROUTES & PAGES

### Cat3 route (from `src/App.tsx`)

```tsx
{/* :slug can be a Cat3 slug or EauEtAdditif cardId (e.g. /cat3/123) */}
<Route path="/cat3/:slug" element={<Cat3Page />} />
```

- **Route path:** `/cat3/:slug`
- **Param name:** `slug` (used as Cat3 page identifier; when numeric it is the EauEtAdditif cardId, e.g. `/cat3/123`)
- **Component:** `Cat3Page`
- **Component file:** `src/pages/Cat3Page.tsx`

### Acha2 route (Cat3 items can open Acha2 product page)

```tsx
<Route path="/acha2/:slug" element={<Acha2 />} />
```

- **Route path:** `/acha2/:slug`
- **Param:** `slug` = product slug (e.g. from category product or derived for Cat3)
- **Component:** `Acha2`, file `src/pages/acha2.tsx`
- **Query params when opened from Cat3:** `source=cat3`, `cat3Id=<cat3PageId>`, `itemId=<cat3ItemId>` (see acha2.tsx: `const cat3IdParam = queryParams.get("cat3Id")`, `itemIdParam`, `isCat3Source = (queryParams.get("source") || "") === "cat3" && Boolean(cat3IdParam) && Boolean(itemIdParam)`)

---

## 2) CAT3 DATA MODEL (REAL)

Types live in **`src/api/database.ts`**.

### Page model: `Cat3PageData`

```ts
export interface Cat3PageData {
  id: number;
  slug: string;
  title: string;
  subtitle?: string;
  heroImage?: string;
  items: Cat3Item[];
  /** EauEtAdditif card id when this page is tied to an eau_additif card */
  cardId?: string;
}
```

### Item model: `Cat3Item`

```ts
export interface Cat3Item {
  id: number;
  title: string;
  reference?: string;
  stock?: number | null;
  alertThreshold?: number | null;   // seuil d'alerte
  image?: string;
  // Tarif (same keys as cat/category_products)
  prix_achat_brut?: number | null;
  remise_achat_percent?: number | null;
  net_achat_htva?: number | null;
  tva_percent?: number | null;
  net_achat_ttc?: number | null;
  marge_percent?: number | null;
  prix_neveux?: number | null;
  // Acha2-persisted fields (Cat3-origin only)
  custom_content2?: string | null;
  references_constructeur2?: string | null;
  avis_clients?: Cat3ItemAvisClients | null;
  price2?: string | number | null;
}
```

### In `Cat3Page.tsx`: derived state (no local state for the list itself)

- **Data source:** `useQuery` returns `page` (type `Cat3PageData | null`).
- **Safe derivation:**
  - `title = (page?.title && String(page.title).trim()) ?? (slug ? decodeURIComponent(slug) : "Cat3");`
  - `items = Array.isArray(page?.items) ? page.items : [];`
- **Initial / missing page:** If the query returns `null`, the page uses the fallback title and `items = []` so the UI never assumes `page` or `page.items` exists.

---

## 3) CURRENT DATA SOURCE (READ)

### Functions used to load Cat3 content

All from **`@/api/database`** (i.e. `src/api/database.ts`).

**`getSectionContent(sectionType: string, modelId?: string | number): Promise<SectionContentData | null>`**

- Generic reader for any section. Used by `getCat3Pages` internally.
- URL: `GET ${getApiBaseUrl()}/sectionContent?sectionType=${sectionType}`
- Returns: `{ sectionType, title?, content?: unknown }` or null on error; on 404/error it returns a default structure (e.g. `content: {}` or `{ items: [] }` for some types).

**`getCat3Pages(): Promise<Cat3PageData[]>`**

```ts
export const getCat3Pages = async (): Promise<Cat3PageData[]> => {
  try {
    const section = await getSectionContent('cat3_pages');
    if (section && section.content !== undefined && section.content !== null) {
      const content = typeof section.content === 'string'
        ? JSON.parse(section.content)
        : section.content;
      if (Array.isArray(content)) {
        return content
          .filter((p): p is Record<string, unknown> => p && typeof p === 'object')
          .map(normalizeCat3Page);
      }
    }
    return [];
  } catch (error) {
    console.error('❌ Error fetching cat3_pages:', error);
    return [];
  }
};
```

- **Section key:** `"cat3_pages"`.
- **Returned shape:** Array of normalized `Cat3PageData` (each has `id`, `slug`, `title`, `items: Cat3Item[]`, optional `cardId`).

**`getCat3PageById(cat3Id: string | number): Promise<Cat3PageData | undefined>`**

- Calls `getCat3Pages()` then finds the page where `p.cardId === String(cat3Id)` or `p.id === idNum` or `p.slug === cat3Id`.
- Used by Acha2 when loading a Cat3 item.

### React Query in `Cat3Page.tsx`

```ts
const {
  data: page,
  isLoading,
  isSuccess,
} = useQuery({
  queryKey: ["cat3_page", slug],
  queryFn: async () => {
    if (!slug) return null;
    const cardId = slug;
    const pages = await getCat3Pages();
    let p = pages.find((x) => x.cardId === String(cardId));
    if (!p && /^\d+$/.test(cardId)) {
      const cards = await getEauAdditifCards();
      const card = cards.find(
        (c) => c.id === Number(cardId) || String(c.id) === cardId
      );
      const currentCardTitle = card?.title ?? "Sans titre";
      await ensureCat3PageForCard(cardId, currentCardTitle);
      const updatedPages = await getCat3Pages();
      p = updatedPages.find((x) => x.cardId === String(cardId)) ?? null;
    }
    return p ?? null;
  },
  enabled: !!slug,
  staleTime: 0,
});
```

- **queryKey:** `["cat3_page", slug]`
- **queryFn:** Uses `getCat3Pages()` (which uses `getSectionContent('cat3_pages')`). For numeric `slug` (EauEtAdditif cardId), if no page exists it calls `ensureCat3PageForCard` then refetches. Returns the single page or `null`.

---

## 4) CURRENT SAVE PATH (WRITE)

Cat3 **does** persist via `updateSectionContent`. The flow is:

1. **`saveCat3Pages(pages: Cat3PageData[]): Promise<void>`** in `src/api/database.ts`:

```ts
export const saveCat3Pages = async (pages: Cat3PageData[]): Promise<void> => {
  await updateSectionContent('cat3_pages', {
    sectionType: 'cat3_pages',
    title: 'CAT3_PAGES',
    content: pages,
  });
};
```

2. **`updateSectionContent`** (in `src/api/database.ts`): cleans `data.content` with `cleanForJSON`, stringifies it to JSON, then:

```ts
const payload = {
  sectionType: sectionType,
  title: data.title || null,
  content: contentString   // JSON string
};
const response = await fetch(`${getApiBaseUrl()}/sectionContent`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

3. **Who calls `saveCat3Pages` / `updateSectionContent` for Cat3:**

- **`upsertCat3Page(cat3Id, patch)`** – fetches all Cat3 pages, finds or creates the page for `cat3Id`, applies `patch` (e.g. `title`, `items`), cleans items (no NaN), then calls `saveCat3Pages(updatedPages)`.
- **`addCat3Item(cat3PageId, item)`** – builds `newItem` with next id, appends to current page items, calls `upsertCat3Page(cat3PageId, { title, items: updatedItems })`.
- **`updateCat3Item(cat3PageId, cat3ItemId, patch)`** – merges `patch` into the item, then `upsertCat3Page(cat3PageId, { title: page.title, items: updatedItems })`.
- **`deleteCat3Item(cat3PageId, cat3ItemId)`** – filters out the item, then `upsertCat3Page(cat3PageId, { title: page.title, items: remaining })`.

So: **add, edit, and delete all go through `upsertCat3Page` → `saveCat3Pages` → `updateSectionContent('cat3_pages', …)`.** If items still disappear after refresh, the problem is likely backend (not storing or not returning `cat3_pages`), or the frontend not refetching (e.g. cache). The frontend is written to persist.

---

## 5) BACKEND / DB PERSISTENCE PATTERN (REFERENCE)

### Promotions (working example)

**File:** `src/components/PromotionsSection.tsx`

- **Read:** `useQuery({ queryKey: ["promotions"], queryFn: getPromotions })`.
- **Write:** `await updateSectionContent("promotions", { sectionType: "promotions", title: "PROMOTIONS", content: cleanedPromotions });`
- **Section key:** `"promotions"`.

**In `src/api/database.ts`:**

- **getPromotions():**
  - `const section = await getSectionContent('promotions');`
  - Parses `section.content` (string or object) and returns array of promotions.
- **updateSectionContent(sectionType, data):**
  - Cleans `data.content` with `cleanForJSON`, stringifies to JSON.
  - `POST ${getApiBaseUrl()}/sectionContent` with body `{ sectionType, title, content: contentString }`.
  - Backend is expected to store/update by `sectionType`.

**getSectionContent(sectionType):**

- `GET ${getApiBaseUrl()}/sectionContent?sectionType=${sectionType}`
- Returns `result.data` (contains `sectionType`, `title`, `content`).

---

## 6) SECTION CONTENT KEYS

All section keys used in the project (from codebase search):

| Key | Used in |
|-----|--------|
| `"promotions"` | database.ts, PromotionsSection.tsx |
| `"eau_additif"` | database.ts (getEauAdditifCards, saveEauAdditifCards) |
| `"cat3_pages"` | database.ts (getCat3Pages, saveCat3Pages, upsertCat3Page) |
| `"famille_categories"` | database.ts (defaults), FamilleSection.tsx, useFamilles.ts |
| `"huile_cards"` | huile.tsx |
| `"huile_eau_additif"` | database.ts (HUILE_EAU_ADDITIF_SECTION) |
| `"filtres"` | FiltresPage.tsx |
| `"product_specs"` | ProductSpecsSection.tsx |
| `"cat2_cards_<parentId>"` (dynamic) | acha2.tsx, Cat2.tsx |
| Category/section keys from CategoryPage | getSectionContent(sectionKey), updateSectionContent(sectionKey) |

**Intended key for Cat3 pages/items:** **`"cat3_pages"`** (exact string). Used everywhere for Cat3 in `src/api/database.ts` and `src/pages/Cat3Page.tsx`.

---

## 7) WHERE CAT3 ITEMS SHOULD BE STORED

- **Storage:** Same backend mechanism as promotions: **sectionContent** table (or equivalent) keyed by `sectionType`.
- **Section key:** **`"cat3_pages"`**.
- **Expected JSON shape:** An **array** of page objects. Each page can have `cardId` (string) for EauEtAdditif-backed pages:

```json
[
  {
    "id": 1,
    "slug": "card-1",
    "title": "Ma page",
    "cardId": "1",
    "items": [
      {
        "id": 1,
        "title": "Produit A",
        "reference": "REF-001",
        "stock": 10,
        "alertThreshold": 2,
        "image": "/uploads/...",
        "prix_achat_brut": 100,
        "remise_achat_percent": 0,
        "net_achat_htva": 100,
        "tva_percent": 19,
        "net_achat_ttc": 119,
        "marge_percent": 0,
        "prix_neveux": 119
      }
    ]
  }
]
```

- **Existing content:** The app already reads/writes `cat3_pages` via `getSectionContent('cat3_pages')` and `updateSectionContent('cat3_pages', …)`. If the backend stores by `sectionType`, there may already be a row for `cat3_pages`. Ensure the backend returns this content on GET and overwrites/updates it on POST as with promotions.

---

## 8) THE BUG SYMPTOM

**Reproduction:**

1. Log in as admin.
2. Open a Cat3 page (e.g. `/cat3/1` from an EauEtAdditif card).
3. Click “Ajouter un élément”, fill the modal, submit.
4. Item appears in the grid.
5. Refresh the page (F5 or reload).
6. **Bug:** The added item disappears.

**Expected:** Item is stored in DB and still visible after refresh and to other users.

**Checks:**

- In DevTools Network tab, after “Enregistrer”, confirm a **POST** to `.../sectionContent` with body containing `sectionType: "cat3_pages"` and `content` as a JSON string of the pages array (including the new item). If this request is missing or fails, fix the frontend or backend so the write succeeds.
- After refresh, confirm a **GET** to `.../sectionContent?sectionType=cat3_pages` and that the response `data.content` (or parsed content) is an array that includes the page and its items. If GET returns empty or old data, the backend is not persisting or not returning `cat3_pages` correctly.
- **Console:** Note any errors (e.g. 404/500 on sectionContent, or “Cannot read properties of undefined (reading 'title')”). The UI is written to use `page?.title` and `page?.items ?? []` so the latter should not occur if the query returns `null` or a valid page.

---

## 9) OUTPUT FORMAT REQUIREMENTS

- Use this markdown as the single source of truth: exact file paths (`src/pages/Cat3Page.tsx`, `src/api/database.ts`, etc.) and exact function names (`getCat3Pages`, `updateSectionContent`, `upsertCat3Page`, etc.).
- No placeholders: real keys (`"cat3_pages"`), real param names (`slug`), real types (`Cat3PageData`, `Cat3Item`).
- Do not change business logic; only implement or fix persistence so that:
  - Add/edit/delete go through `updateSectionContent('cat3_pages', …)` (via `saveCat3Pages` / `upsertCat3Page`).
  - Read goes through `getSectionContent('cat3_pages')` (via `getCat3Pages`).
  - All users see the same data after refresh; only admin sees add/edit/delete buttons.
