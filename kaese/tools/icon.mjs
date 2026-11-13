// Renders the 1024 app icon (cheese wedge with a heart-shaped hole on warm yellow) to the path given.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1024, height: 1024 } });
await pg.setContent(`<style>body{margin:0}</style><svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8573e"/><stop offset="1" stop-color="#b8331f"/></linearGradient>
<linearGradient id="ch" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd85e"/><stop offset="1" stop-color="#f5a623"/></linearGradient></defs>
<rect width="1024" height="1024" fill="url(#bg)"/>
<circle cx="170" cy="190" r="60" fill="#ffffff" opacity=".12"/><circle cx="880" cy="860" r="90" fill="#ffffff" opacity=".1"/>
<path d="M150 720 L560 250 L880 440 L880 720 Z" fill="#c97d0e"/>
<path d="M150 720 L880 720 L880 830 L150 830 Z" fill="url(#ch)"/>
<path d="M150 720 L560 250 L880 440 L880 720 Z" fill="url(#ch)" transform="translate(0,-20)"/>
<path d="M150 700 L880 700 L880 720 L150 720 Z" fill="#e89a1a"/>
<path d="M600 610 c-40 -30 -90 -60 -90 -110 a50 50 0 0 1 90 -30 a50 50 0 0 1 90 30 c0 50 -50 80 -90 110z" fill="#e8573e"/>
<circle cx="360" cy="600" r="42" fill="#e89a1a"/><circle cx="740" cy="520" r="30" fill="#e89a1a"/><circle cx="470" cy="770" r="28" fill="#c97d0e"/><circle cx="760" cy="780" r="36" fill="#c97d0e"/>
</svg>`);
await pg.screenshot({ path: process.argv[2] });
await b.close();
