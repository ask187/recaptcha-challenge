import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'backend',
          environment: 'node',
          // node:sqlite is behind a flag on Node 22.5–22.12
          poolOptions: { forks: { execArgv: ['--experimental-sqlite', '--no-warnings=ExperimentalWarning'] } },
          include: ['tests/unit/backend/**/*.test.ts', 'tests/integration/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'frontend',
          environment: 'jsdom',
          include: ['tests/unit/frontend/**/*.test.{ts,tsx}'],
          setupFiles: ['tests/unit/frontend/setup.ts'],
        },
      },
    ],
  },
});
