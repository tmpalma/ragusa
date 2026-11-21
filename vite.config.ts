import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: [path.resolve(rootDir, 'vitest.setup.ts')],
    // Agent worktrees live under .claude/worktrees; keep them out of this checkout's test run.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
})
