# ProductSpecsSection Component

## 📍 Location
`bb/frontend/src/components/ProductSpecsSection.tsx`

## 📍 Integration
Added to `bb/frontend/src/pages/Conditions.tsx` after `ProductPromoBlock`

## 📦 JSON Data Structure

The component stores data in PostgreSQL `section_content` table with `section_type = 'product_specs'`:

```json
{
  "title": "CARACTÉRISTIQUES TECHNIQUES",
  "specs": [
    {
      "label": "Matériau",
      "value": "Acier inoxydable"
    },
    {
      "label": "Dimensions",
      "value": "50 x 30 x 20 cm"
    },
    {
      "label": "Poids",
      "value": "2.5 kg"
    },
    {
      "label": "Garantie",
      "value": "2 ans"
    }
  ],
  "extraTitle": "INFORMATIONS TECHNIQUES",
  "extraDescription": "Ce produit est conforme aux normes européennes. Fabrication française avec garantie constructeur."
}
```

## 🎨 UI Features

- White card with rounded corners (`rounded-xl`)
- Light shadow (`shadow-md`)
- Uppercase titles
- Zebra-striped rows (alternating backgrounds)
- Fully responsive (mobile-first)
- No HTML tables, only divs

## 🔐 Admin Features

- Only admin users can edit
- Add/remove specifications dynamically
- Edit main title
- Edit secondary section title and description
- Data saved to database via `updateSectionContent`

## 👤 User Display

- Regular users only see content if data exists
- If no data, component doesn't render (hidden)
- Admin always sees edit panel + preview

