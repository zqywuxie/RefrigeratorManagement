# Repository Guidelines

## Project Structure & Module Organization

This is a single-page React app for bio-refrigerator sample management, generated from a Figma design. No router — all interaction happens on one screen.

```
src/
  main.tsx                     # Entry point
  app/
    App.tsx                    # Root component, all state lives here
    types.ts                   # Shared types (Sample, Compartment, STATUS_CONFIG, etc.)
    components/
      FridgeUnit.tsx           # Fridge visual — upper (freezer) + lower (refrigerator) compartments
      SampleSlot.tsx           # Individual slot — wraps react-dnd drop target + SampleCard
      SampleCard.tsx           # Individual sample — react-dnd drag source
      DetailPanel.tsx          # Slide-in panel showing selected sample details
      AddSampleModal.tsx       # Modal form to add a new sample
      figma/
        ImageWithFallback.tsx  # Utility: img with error fallback
      ui/                      # shadcn/ui primitives (Radix UI + Tailwind CSS)
```

State is lifted entirely to `App.tsx` via `useState` / `useCallback`. No external state library.

The `ui/` directory contains shadcn/ui components (accordion, dialog, button, etc.) — these are Radix UI primitives styled with Tailwind. App-specific components live directly in `components/`.

## Build, Test, and Development Commands

```bash
pnpm install          # Install dependencies (pnpm is the expected package manager)
npm run dev           # Start Vite dev server
npm run build         # Production build (vite build)
```

No test framework is configured.

## Coding Style & Naming Conventions

- **TypeScript** — all components use `.tsx`. No `tsconfig.json` is present (Vite handles transpilation).
- **Tailwind CSS v4** with the Vite plugin (`@tailwindcss/vite`). Configuration is in CSS (`src/styles/tailwind.css`), not a JS config file.
- **Path alias**: `@/` resolves to `src/` (configured in `vite.config.ts`).
- **Figma asset imports**: The custom `figmaAssetResolver` Vite plugin lets you import assets with `figma:asset/filename.ext` — it resolves to `src/assets/filename.ext`. Use this for any Figma-exported assets.
- **CSS**: Global styles in `src/styles/`. Component styles use inline `style` props and Tailwind utility classes — no CSS modules or styled-components.
- **UI components** follow shadcn/ui patterns: each file under `ui/` exports a single component built on a Radix primitive with Tailwind styling. Use `class-variance-authority` (`cva`) for variant props where applicable.
- No linter or formatter is configured.
