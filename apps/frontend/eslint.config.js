import { reactConfig } from '@anvara/eslint-config';

export default [
  ...reactConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        // Next.js statically inlines process.env.NEXT_PUBLIC_* at build time;
        // declaring process as readonly lets ESLint resolve the identifier without
        // switching to the Node globals preset (which would pull in non-browser globals).
        process: 'readonly',
      },
    },
    rules: {
      // Frontend-specific rules
    },
  },
];
