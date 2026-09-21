import { chromium, firefox } from 'playwright';
for (const [name, type] of [['chromium', chromium], ['firefox', firefox]]) {
    const b = await type.launch();
    const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
    p.on('pageerror', (e) => console.log(name, 'PAGEERROR', e.message));
    const path = () => new URL(p.url()).pathname + new URL(p.url()).search;
    await p.goto('http://localhost:4322/covid/resistance?locationName=Basel&meanProportionLower=0.3');
    const modeSelect = p.locator('select', { has: p.locator('option', { hasText: 'Variant Explorer' }) });
    await modeSelect.waitFor({ timeout: 30000 });
    // edit the panel, but do not press "Apply filters"
    await p.getByLabel('Week').check();
    await p.locator('#excludeEmpty').uncheck();
    console.log(name, 'url before switching (nothing applied):', path());
    await modeSelect.selectOption({ label: 'Untracked Mutations' });
    await p.waitForURL(/\/covid\/untracked/);
    console.log(name, 'after switching:', path());
    await b.close();
}
