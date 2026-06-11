// QA visual: levanta el dist y captura pestañas (Tailwind se inyecta local porque el CDN está bloqueado).
import { chromium } from 'playwright';
const TW = process.env.TW || '/tmp/tw.css';
const URL = process.env.URL || 'http://localhost:4173/';
const browser = await chromium.launch({ args: ['--ignore-certificate-errors','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, ignoreHTTPSErrors: true });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: 'networkidle' });
await page.addStyleTag({ path: TW });
await page.waitForTimeout(1200);
try { await page.getByText('Cargar ejemplo', { exact:false }).first().click({ timeout: 4000 }); } catch(e){}
await page.waitForTimeout(1000);
export async function tab(name, file, wait=1800, clip=null){
  try { await page.getByRole('button', { name: new RegExp(name,'i') }).first().click({ timeout: 4000 }); } catch(e){}
  await page.waitForTimeout(wait); await page.addStyleTag({ path: TW }); await page.waitForTimeout(300);
  await page.screenshot({ path: file, clip });
  console.log('shot', file);
}
export { page, browser };
