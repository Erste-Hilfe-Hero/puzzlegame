// Renders the app icon (original artwork: button-combo chips, no game logos). Usage: node cheats/tools/icon.mjs
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const html = `<body style="margin:0"><div style="width:1024px;height:1024px;background:radial-gradient(120% 120% at 20% 0%,#5b1f86 0%,#1a0f33 55%,#0e0a1a 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:56px;font-family:Arial Black,Arial,sans-serif">
<div style="display:flex;gap:28px">${['↑', '↓', '✕', '◯'].map((k, i) => `<div style="width:170px;height:170px;border-radius:44px;background:#2a2148;border:8px solid #3a3066;display:flex;align-items:center;justify-content:center;font-size:96px;font-weight:900;color:${['#fff', '#fff', '#7fb2ff', '#ff6b6b'][i]}">${k}</div>`).join('')}</div>
<div style="font-size:150px;font-weight:900;letter-spacing:6px;background:linear-gradient(90deg,#ff3d8b,#ffc94d);-webkit-background-clip:text;color:transparent">CHEATS</div></div></body>`;
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1024, height: 1024 } });
await pg.setContent(html);
await pg.screenshot({ path: 'cheats/ios/App/Assets.xcassets/AppIcon.appiconset/icon-1024.png' });
await pg.setViewportSize({ width: 1024, height: 1024 });
await pg.evaluate(() => { document.body.style.zoom = 192 / 1024; });
await pg.setViewportSize({ width: 192, height: 192 });
await pg.screenshot({ path: 'cheats/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png' });
await b.close();
