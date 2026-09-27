import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    // The template is a build artifact; tests that need it must run after
    // `npm run gen:template`. See README.
    globals: false,
  },
});
