// App Review recording only: drives the real game UI (launch, level, duel, shop, settings) with visible tap marks.
// Injected by tools/review-video.sh through the simulator-only MB_DEMO_JS hook; never part of the shipped app flow. (v0.3.2 check, server route back)
(async () => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  const dot = document.createElement('div');
  dot.style.cssText = 'position:fixed;z-index:99999;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid #fff;pointer-events:none;opacity:0;transition:opacity .25s';
  document.body.appendChild(dot);
  const tapEl = async el => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    dot.style.left = (r.left + r.width / 2) + 'px'; dot.style.top = (r.top + r.height / 2) + 'px'; dot.style.opacity = 1;
    await w(450); el.click(); await w(200); dot.style.opacity = 0; await w(500); return true;
  };
  const tap = sel => tapEl(document.querySelector(sel));
  const cardEl = c => c.el || null;
  const shown = id => { const e = document.getElementById(id); return e && !e.classList.contains('hidden'); };
  const toVillage = async () => {
    for (let i = 0; i < 8; i++) {
      if (shown('village') && !shown('modal')) return;
      if (!(await tap('#mVil')) && !(await tap('#mGive')) && !(await tap('#mLeave')) && !(await tap('#mX')) && !shown('modal')) await tap('#btnHome');
      await w(1500);
    }
  };
  const move = async () => {
    const G = __mb.G(); if (!G || G.over) return false;
    const pl = __mb.playable();
    if (pl.length) { pl.sort((a, b) => b.row - a.row); const el = cardEl(pl[0]); if (el) await tapEl(el); else { __mb.tapCard(pl[0]); await w(700); } }
    else if (G.stock.length) { if (!(await tapEl(G.stockEl))) { __mb.drawCard(false); await w(700); } }
    else return false;
    return true;
  };
  await w(3500);
  await tap('#mOk'); await w(1500);
  await tap('#btnPlay'); await w(1800);
  for (let i = 0; i < 40 && (await move()); i++) await w(250);
  await w(4000);
  await toVillage(); await w(2500);
  await tap('#btnDuel'); await w(2500);
  await tap('[data-stake="100"]');
  for (let i = 0; i < 60 && !(__mb.G() && __mb.G().duel); i++) await w(500);
  await w(1200);
  for (let i = 0; i < 22 && (await move()); i++) await w(300);
  await w(1500);
  await toVillage(); await w(2000);
  await tap('#btnShopTop'); await w(3000);
  const shop = document.querySelector('.modal .scroll, .modal');
  if (shop) for (let i = 0; i < 6; i++) { shop.scrollTop += 120; await w(500); }
  await w(2000);
  await tap('#mX'); await w(4000);
})();
