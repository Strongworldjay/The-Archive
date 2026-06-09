# The Remarkable Tome

Responsive React/Vite spellbook interface with:

- Two-page desktop tome: spell rules on the left, illustration on the right.
- Condensed mobile tome with Spell / Illustration page switching.
- Device-driven light and dark palettes inspired by the supplied owl artwork.
- LocalStorage favorites saved as a personal spellbook.
- A searchable and sortable spell index for adding spells.
- An efficient list view for scanning saved spells.
- Spell-image lookup by compact spell name, with school-image fallbacks.

## Run

```bash
npm install
npm run dev
```

## Add spell data

Paste spell objects into the arrays in `src/data/cantrips.js`, `src/data/level1.js`, through `src/data/level9.js`.

The expected spell illustration naming scheme is compact lowercase with punctuation, spaces, and hyphens removed:

- `Binding Ice` → `public/assets/spells/bindingice.png`
- `Arctic Breath` → `public/assets/spells/arcticbreath.png`

When a spell-specific image is missing, the interface automatically attempts a school fallback:

- `Evocation` → `public/assets/spells/evocation.png`
- `Conjuration` → `public/assets/spells/conjuration.png`

You may also place `generic.png` in the same folder if you want a universal final fallback.
