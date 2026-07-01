/**
 * FCM env 해석 후 vite build + cap sync
 */
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const webRoot = path.join(__dirname, '..')

await import('./resolve-fcm-env.mjs')

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: webRoot, shell: true, env: process.env })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

run('npx', ['tsc', '-b'])
run('npx', ['vite', 'build'])
run('npx', ['cap', 'sync', 'android'])
