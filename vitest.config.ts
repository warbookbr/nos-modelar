/* Config do Vitest: cobre os contratos da Mecanifica e os núcleos herdados em tools/**. */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tools/**/*.test.ts'],
    watch: false,
  },
});
