// App Review recording only: drives the real game UI (daily reward, rolls, raid/festival picks, build, album, multiplier, shop) with visible tap marks.
// Injected through the simulator-only RH_DEMO_JS hook in GameViewController; compiled out of device builds.
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const dot = document.createElement('div');
  dot.style.cssText = 'position:fixed;z-index:99999;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid #fff;pointer-events:none;opacity:0;transition:opacity .25s';
  document.body.appendChild(dot);
  const tapEl = async el => {
    if (!el || el.disabled) return false;
    const r = el.getBoundingClientRect();
    dot.style.left = (r.left + r.width / 2) + 'px'; dot.style.top = (r.top + r.height / 2) + 'px'; dot.style.opacity = 1;
    await w(450); el.click(); await w(200); dot.style.opacity = 0; await w(500); return true;
  };
  const tap = sel => tapEl(document.querySelector(sel));
  const modalOpen = () => !document.getElementById('modal').classList.contains('hidden');
  const clearModal = async () => {
    for (let i = 0; i < 5 && modalOpen(); i++) {
      if (!(await tap('#claim')) && !(await tap('#sheet button.pick')) && !(await tap('#sheet .x'))) document.getElementById('modal').click();
      await w(900);
    }
  };
  const rollOnce = async () => {
    await clearModal();
    for (let i = 0; i < 30 && document.getElementById('rollBtn').disabled; i++) { await w(300); if (modalOpen()) await clearModal(); }
    await tap('#rollBtn');
    for (let i = 0; i < 30; i++) { await w(300); if (modalOpen()) { await w(800); await clearModal(); } if (!document.getElementById('rollBtn').disabled) break; }
    await w(700);
  };
  await w(3500);
  await clearModal(); await w(1200);
  for (let i = 0; i < 8; i++) await rollOnce();
  await tap('#buildBtn'); await w(1800);
  await tap('#sheet .buy:not([disabled])'); await w(1800);
  await tap('#sheet .x'); await w(1200);
  for (let i = 0; i < 4; i++) await rollOnce();
  await tap('#multBtn'); await w(1500);
  await tap('#sheet [data-m="2"]'); await w(1000);
  await clearModal(); await w(800);
  for (let i = 0; i < 3; i++) await rollOnce();
  await tap('#albumBtn'); await w(3000);
  await tap('#sheet .x'); await w(1200);
  await tap('#shopBtn'); await w(3500);
  const sh = document.getElementById('sheet');
  for (let i = 0; i < 6; i++) { sh.scrollTop += 140; await w(700); }
  await w(4000);
  await tap('#sheet .x'); await w(3000);
})();
