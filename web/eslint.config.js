import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      /**
       * `react-refresh/only-export-components` protects hot-module reload: a
       * module that exports both a component and something else cannot be
       * swapped in place, so an edit reloads the page and loses state.
       *
       * `allowConstantExport` covers the case that is worth keeping - a
       * component exported beside the constants it owns, like `Logomark` with
       * `LOGOMARK_PATH`, or `Button` with `buttonVariants`. Splitting those into
       * satellite files to satisfy a dev-server optimisation would scatter each
       * component's own vocabulary across two modules, which costs more in
       * readability than it buys in reload speed.
       *
       * Everything else the rule catches is still an error.
       */
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          /**
           * Named exports that are deliberately co-located with the component
           * that owns them. Listing them by name rather than switching the rule
           * off per file keeps it live for everything else in those files.
           *
           *   buttonVariants / badgeVariants  the shadcn/ui convention - the
           *                                   variant map beside its component
           *   WORDMARK_LETTERS, SKYLINE_VIEWBOX, LOGOMARK_*  a component's own
           *                                   geometry, meaningless elsewhere
           *   emptyX / toXDraft               draft factories that must stay in
           *                                   step with the form that consumes
           *                                   them; splitting them off is how
           *                                   they drift
           */
          allowExportNames: [
            'buttonVariants',
            'badgeVariants',
            'WORDMARK_LETTERS',
            'SKYLINE_VIEWBOX',
            'LOGOMARK_PATH',
            'LOGOMARK_ROTATIONS',
            'emptyPerson',
            'toPersonDraft',
            'emptyMedicine',
            'toDraft',
            'emptyRoutine',
            'toRoutineDraft',
          ],
        },
      ],
    },
  },
  {
    /**
     * Route modules and context modules genuinely cannot satisfy the rule.
     *
     * `router.tsx` is a table of `lazy()` component references - the rule reads
     * them as non-component exports; there is no arrangement of this file that
     * both defines the routes and passes.
     *
     * `PatientContext.tsx` and `AuthProvider.tsx` each export their context
     * alongside their provider, which is the file layout `docs/frontend.md` §1
     * specifies - `auth/AuthProvider.tsx` + `auth/useAuth.ts`, with no third
     * module for the context. Splitting them to satisfy HMR would put the app's
     * structure out of step with its own spec.
     */
    files: [
      'src/routes/router.tsx',
      'src/patients/PatientContext.tsx',
      'src/auth/AuthProvider.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
