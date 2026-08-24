// DialKit setup smoke test. Proves the panel mounted and is interactive,
// without depending on any app-specific component -- it drives DialKit's own UI.
//
//   npm i -D playwright            # uses system Chrome via channel, no browser download
//   URL=http://localhost:5173/ OUT=./dialkit.png node smoke.mjs
//
// Exit 0 = panel rendered + a slider reacts to a drag. Non-zero = setup is broken.
import { chromium } from 'playwright'

const URL = process.env.URL || 'http://localhost:5173/'
const OUT = process.env.OUT || './dialkit.png'
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1 }

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1100, height: 700 } })
await page.goto(URL, { waitUntil: 'networkidle' })

// 1. DialRoot mounted + styles.css loaded?
await page.waitForSelector('.dialkit-panel', { timeout: 5000 })
const counts = await page.evaluate(() => ({
  sliders: document.querySelectorAll('.dialkit-slider').length,
  toggles: document.querySelectorAll('.dialkit-segmented').length,
  colors: document.querySelectorAll('.dialkit-color-control').length,
  folders: document.querySelectorAll('.dialkit-folder').length,
}))
console.log('controls:', JSON.stringify(counts))
if (!counts.sliders) fail('no sliders rendered (DialRoot not mounted, or no useDialKit call?)')

// 2. A slider reacts to input -> its displayed value changes.
const slider = page.locator('.dialkit-slider').first()
const valueOf = () => slider.locator('.dialkit-slider-value').innerText()
const before = await valueOf()
const box = await slider.boundingBox()
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2)
await page.mouse.down()
await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2, { steps: 8 })
await page.mouse.up()
await page.waitForTimeout(150)
const after = await valueOf()
console.log(`slider value before=${before} after=${after}`)
if (before === after) fail('slider drag changed nothing (styles.css loaded? handle interactive?)')

await page.screenshot({ path: OUT })
console.log(process.exitCode ? 'SMOKE FAILED' : `SMOKE PASS -> ${OUT}`)
await browser.close()
