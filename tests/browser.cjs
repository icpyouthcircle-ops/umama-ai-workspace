/* Optional browser suite: install Playwright locally, then `node tests/browser.cjs`.
   Start the demo server separately with `node scripts/serve.cjs`. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../test-results');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});const ctx=await browser.newContext({viewport:{width:1440,height:1080},acceptDownloads:true});const page=await ctx.newPage();const errors=[];page.on('pageerror',x=>errors.push(x.message));
 const click=async action=>{await page.locator(`[data-action="${action}"]`).first().click();await page.waitForSelector('.busy-bar',{state:'detached'});};
 await page.goto('http://127.0.0.1:4173');await click('enter-demo');await page.getByRole('heading',{name:'A little clarity. A lot of progress.'}).waitFor();
 await page.screenshot({path:path.join(out,'dashboard-desktop.png'),fullPage:true});
 await click('new');await page.locator('#name').fill('Presentation Test');await click('sample');await page.locator('[name="consent"]').check();await page.getByRole('button',{name:'Create client'}).click();await page.waitForSelector('.busy-bar',{state:'detached'});await click('extract');
 assert.equal(await page.locator('.fact').count(),8);
 await page.locator('[data-action="fact"]').first().click();await page.locator('#fact-value').fill('This cancelled change must not save');await page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('.fact').first().textContent().then(t=>t.includes('cancelled change')),false);
 for(let i=0;i<8;i++){
  await page.locator('[data-action="fact"]').nth(i).click();await page.locator('#fact-status').selectOption('verified');await page.locator('#evidence').fill('Fictional demonstration; checked against sample intake.');await page.getByRole('button',{name:'Save review'}).click();await page.waitForSelector('dialog[open]',{state:'detached'});await page.waitForSelector('.busy-bar',{state:'detached'});
 }
 await page.locator('[data-tab="studio"]').click();
 for(const key of ['audit','headline','about','experience','positioning','pillars']){
  await page.locator(`[data-module="${key}"]`).click();await click('generate');assert((await page.locator('#editor').inputValue()).length>20);
  if(key==='headline'){
   const original=await page.locator('#editor').inputValue();await page.locator('#editor').fill(original+'\nAn extra reviewed option');await click('save-module');
  }
  await click('approve');await page.locator('[name="attested"]').check();await page.getByRole('button',{name:'Approve this version'}).click();await page.waitForSelector('dialog[open]',{state:'detached'});await page.waitForSelector('.busy-bar',{state:'detached'});
 }
 await page.screenshot({path:path.join(out,'studio-desktop.png'),fullPage:true});
 await page.locator('[role="tab"][data-tab="report"]').click();assert.equal(await page.locator('[data-final="true"]').isDisabled(),false);
 const downloading=page.waitForEvent('download');await page.locator('[data-final="true"]').click();const download=await downloading;await download.saveAs(path.join(out,'test-final-report.html'));assert(fs.readFileSync(path.join(out,'test-final-report.html'),'utf8').includes('FINAL — REVIEWED &amp; APPROVED')===false);assert(fs.readFileSync(path.join(out,'test-final-report.html'),'utf8').includes('FINAL — REVIEWED & APPROVED'));
 await page.reload();await page.getByRole('heading',{name:'A little clarity. A lot of progress.'}).waitFor();await page.getByRole('button',{name:'Presentation Test',exact:true}).click();await page.locator('[data-tab="history"]').click();await page.waitForSelector('.busy-bar',{state:'detached'});assert((await page.locator('.history-item').count())>=20);
 // Race from a second tab: stale edits must fail and remain available for copying.
 await page.locator('[data-tab="studio"]').click();await page.locator('[data-module="about"]').click();
 const second=await ctx.newPage();await second.goto('http://127.0.0.1:4173');await second.getByRole('button',{name:'Open presentation demo'}).click();await second.waitForSelector('.busy-bar',{state:'detached'});await second.getByRole('button',{name:'Presentation Test',exact:true}).click();await second.locator('[data-tab="studio"]').click();await second.locator('[data-module="about"]').click();await second.locator('#editor').fill('Newer draft saved from another tab.');await second.locator('[data-action="save-module"]').click();await second.waitForSelector('.busy-bar',{state:'detached'});
 await page.locator('#editor').fill('Stale draft must not overwrite.');await click('save-module');assert((await page.locator('#toast').textContent()).includes('newer version'));assert.equal(await page.locator('#editor').inputValue(),'Stale draft must not overwrite.');
 page.on('dialog',d=>d.accept());await page.locator('[data-action="nav"][data-page="settings"]').first().click();await click('reset');await page.locator('[data-action="nav"][data-page="dashboard"]').click();
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'dashboard-mobile.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('button',{name:'Ayesha Khan',exact:true}).click();await page.locator('[data-tab="studio"]').click();await page.screenshot({path:path.join(out,'studio-mobile.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewportSize({width:1440,height:1080});await page.locator('[data-action="nav"][data-page="dashboard"]').click();await page.screenshot({path:path.join(out,'dashboard-desktop.png'),fullPage:true});
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: browser intake, extraction, 8 fact reviews, 6 generations, edit/save/approve, report download, persistence, history, cross-tab conflict, reset, desktop/mobile and no JS errors.');
})().catch(err=>{console.error(err);process.exit(1);});
