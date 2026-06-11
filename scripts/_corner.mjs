import { chromium } from 'playwright';
const b = await chromium.launch({ args:['--ignore-certificate-errors','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] });
const ctx = await b.newContext({ viewport:{width:1440,height:1000}, ignoreHTTPSErrors:true });
const p = await ctx.newPage(); const css='/tmp/tw.css';
await p.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await p.addStyleTag({path:css}); await p.waitForTimeout(900);
await p.getByText('Cargar ejemplo',{exact:false}).first().click().catch(()=>{});
await p.waitForTimeout(800);
await p.getByRole('button',{name:/Vista 3D/i}).first().click();
await p.waitForTimeout(2400);
const cvs = await p.locator('canvas').first().boundingBox();
const cx=cvs.x+cvs.width/2, cy=cvs.y+cvs.height/2;
// orbitar para mirar una esquina baja + zoom fuerte
await p.mouse.move(cx,cy); await p.mouse.down(); await p.mouse.move(cx+160,cy+90,{steps:12}); await p.mouse.up();
for(let i=0;i<12;i++){ await p.mouse.wheel(0,-130); await p.waitForTimeout(60); }
await p.waitForTimeout(700); await p.addStyleTag({path:css}); await p.waitForTimeout(200);
await p.screenshot({path:'/tmp/corner.png', clip:{x:cvs.x+cvs.width*0.2, y:cvs.y+cvs.height*0.15, width:cvs.width*0.6, height:cvs.height*0.7}});
console.log('ok'); await b.close();
