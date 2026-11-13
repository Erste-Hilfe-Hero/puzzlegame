// Renders the 1024 app icon (green book cover with the lantern Wick) to the path given.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2];
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1024, height: 1024 } });
await pg.setContent(`<style>body{margin:0}</style><canvas id=c width=1024 height=1024></canvas><script>
var x=document.getElementById('c').getContext('2d');
var g=x.createLinearGradient(0,0,1024,1024);g.addColorStop(0,'#2f6b4f');g.addColorStop(1,'#1b4231');x.fillStyle=g;x.fillRect(0,0,1024,1024);
x.strokeStyle='#e3c27a';x.lineWidth=18;x.strokeRect(70,70,884,884);
var r=x.createRadialGradient(512,560,20,512,560,420);r.addColorStop(0,'rgba(255,214,120,0.75)');r.addColorStop(1,'rgba(255,214,120,0)');x.fillStyle=r;x.fillRect(0,0,1024,1024);
x.strokeStyle='#3a2410';x.lineWidth=26;x.beginPath();x.arc(512,330,70,Math.PI,0);x.stroke();
x.fillStyle='#3a2410';x.fillRect(392,330,240,50);x.fillRect(392,760,240,50);
x.beginPath();x.ellipse(512,560,175,200,0,0,7);x.fillStyle='#ffd36e';x.fill();x.lineWidth=26;x.stroke();
x.fillStyle='#ff9a3c';x.beginPath();x.ellipse(512,610,60,95,0,0,7);x.fill();
x.fillStyle='#3a2410';x.beginPath();x.arc(450,500,24,0,7);x.arc(574,500,24,0,7);x.fill();
</script>`);
await pg.screenshot({ path: out });
await b.close();
