// Generate PWA / favicon assets from a single square source image.
// Usage: node scripts/gen-icons.mjs
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const SRC = resolve(root, 'src/assets/app-icon-source.png')
const OUT = resolve(root, 'public')

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon-32.png', size: 32 },
]

async function main() {
  // Crop the source to a centered square first, in case it is not 1:1.
  const meta = await sharp(SRC).metadata()
  const side = Math.min(meta.width ?? 0, meta.height ?? 0)
  const left = Math.round(((meta.width ?? side) - side) / 2)
  const top = Math.round(((meta.height ?? side) - side) / 2)

  const base = sharp(SRC).extract({ left, top, width: side, height: side })
  const squareBuffer = await base.png().toBuffer()

  for (const t of targets) {
    await sharp(squareBuffer)
      .resize(t.size, t.size, { fit: 'cover' })
      .png()
      .toFile(resolve(OUT, t.file))
    console.log(`generated public/${t.file} (${t.size}x${t.size})`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
