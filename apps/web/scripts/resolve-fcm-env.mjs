/**
 * google-services.json 존재 시 VITE_FCM_ENABLED=true 를 process.env 에 주입한다.
 * cap:sync / build:android 에서 vite build 전에 호출한다.
 */
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const gsPath = path.join(__dirname, '..', 'android', 'app', 'google-services.json')

if (existsSync(gsPath)) {
  process.env.VITE_FCM_ENABLED = 'true'
  console.log('[build] google-services.json found → VITE_FCM_ENABLED=true')
} else {
  console.log('[build] google-services.json not found → VITE_FCM_ENABLED unset (push gate off)')
}
