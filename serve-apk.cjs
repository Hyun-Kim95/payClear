const http = require('http')
const fs = require('fs')
const path = require('path')

const APK = path.join(
  __dirname,
  'apps/web/android/app/build/outputs/apk/debug/app-debug.apk',
)
const PORT = 8765

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url.startsWith('/payclear')) {
    const stat = fs.statSync(APK)
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="payclear.apk"',
    })
    fs.createReadStream(APK).pipe(res)
  } else {
    res.writeHead(404)
    res.end('not found')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`APK server on http://0.0.0.0:${PORT}/  (phone: http://192.168.219.103:${PORT}/)`)
})
