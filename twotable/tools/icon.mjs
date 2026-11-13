// Renders the 1024 app icon (green table, red and blue pieces face to face) to the path given.
import { createRequire } from 'module';
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1024, height: 1024 } });
await pg.setContent(`<style>body{margin:0}</style><canvas id=c width=1024 height=1024></canvas><script>
var x=document.getElementById('c').getContext('2d');
var g=x.createRadialGradient(512,512,80,512,512,720);g.addColorStop(0,'#348058');g.addColorStop(1,'#163a29');x.fillStyle=g;x.fillRect(0,0,1024,1024);
x.strokeStyle='rgba(255,255,255,0.35)';x.lineWidth=10;x.setLineDash([30,24]);x.beginPath();x.moveTo(512,90);x.lineTo(512,934);x.stroke();x.setLineDash([]);
function c(cx,cy,r,f){x.beginPath();x.arc(cx,cy,r,0,7);x.fillStyle=f;x.fill();}
x.fillStyle='rgba(0,0,0,0.25)';x.beginPath();x.arc(322,532,170,0,7);x.arc(722,532,170,0,7);x.fill();
c(310,512,170,'#a8341c');c(310,512,140,'#ef5b3c');c(310,512,70,'#a8341c');c(285,487,40,'rgba(255,255,255,0.35)');
c(714,512,170,'#1f5aa8');c(714,512,140,'#3c8cf0');c(714,512,70,'#1f5aa8');c(689,487,40,'rgba(255,255,255,0.35)');
</script>`);
await pg.screenshot({ path: process.argv[2] });
await b.close();
