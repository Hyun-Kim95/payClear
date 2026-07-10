/**
 * Release AAB: apps/web/android → bundleRelease
 * Requires keystore.properties for Play-ready signing (see docs/release/android-aab.md).
 */
import { spawnSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const androidRoot = path.join(__dirname, '..', 'android')
const isWin = process.platform === 'win32'
const gradlew = isWin ? 'gradlew.bat' : './gradlew'

const r = spawnSync(gradlew, ['bundleRelease'], {
  cwd: androidRoot,
  stdio: 'inherit',
  shell: isWin,
})
process.exit(r.status ?? 1)
