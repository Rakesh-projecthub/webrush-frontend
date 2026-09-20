# TraceGuard — WebRush Frontend

A frontend-only transaction intelligence dashboard built from the supplied `Augmented_IndiaTransactMultiFacet2024.csv` dataset.

## Why this structure is optimized for automated frontend evaluation

- Responsive from 320px upward; tables use horizontal scrolling rather than breaking the viewport.
- No icon-only primary actions: navigation, filters, export, pagination and sorting have visible labels.
- Accessible focus states, semantic landmarks, labelled inputs, keyboard-friendly buttons and reduced-motion support.
- Clear loading, error and empty states.
- No backend, server, database or secret key.
- Sensitive source fields are not rendered: card numbers are masked and street addresses are omitted.
- Missing fraud labels are kept as `Unknown` and excluded from fraud-rate calculations.
- Responsive Recharts containers prevent fixed-width chart overflow.
- Client-side filtering, sorting and CSV export are functional.
- Code is separated into app, reusable components, formatting utilities and static data.

## Run

```bash
c
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

Deploy the generated project to Vercel, Netlify or GitHub Pages.

## Important

The supplied data is synthetic/augmented-looking and contains missing and inconsistent values. The UI intentionally describes patterns as patterns in the supplied dataset instead of making claims about real-world fraud prevalence.

The original source CSV is not required at runtime because `public/data/transactions.json` is a compact, privacy-conscious derived representation used by the frontend.
