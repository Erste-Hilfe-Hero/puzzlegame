// Game data. Tuning values live here, not in game.js.
const DATA = {
  cols: 7,
  rows: 8,
  energyStart: 100,
  energyMax: 100,
  energyRegenSec: 120,
  xpForLevel: lvl => 20 + 15 * lvl,
  levelUpGems: 5,
  dailyGems: 2,
  sellCoins: l => 1 + l,

  chains: {
    herb: { name: 'Herbs', gen: '🪴', genName: 'Herb Bed', unlock: 1,
      items: ['🌱', '🌿', '🍀', '🌾', '🌸', '🌻', '🌳', '🌺'],
      names: ['Sprout', 'Herb', 'Clover', 'Wheat Bundle', 'Blossom', 'Sunflower', 'Elder Tree', 'Moonflower'] },
    crystal: { name: 'Crystals', gen: '⛲', genName: 'Spring', unlock: 2,
      items: ['💧', '❄️', '🧊', '💠', '🔹', '💎', '🔮', '🌈'],
      names: ['Drop', 'Frost', 'Ice Shard', 'Prism', 'Gemlet', 'Crystal', 'Orb', 'Rainbow Core'] },
    potion: { name: 'Potions', gen: '🫕', genName: 'Cauldron', unlock: 4,
      items: ['🧪', '⚗️', '🍶', '🍯', '🏺', '🧉', '🏆', '👑'],
      names: ['Vial', 'Flask', 'Tonic', 'Honey Draught', 'Amphora', 'Elixir', 'Grand Cup', 'Crown Potion'] }
  },

  customers: ['👩‍🌾', '🧙', '🧝', '👨‍🍳', '🧑‍🚀', '👵', '🧛', '🧚', '🧜', '🤴'],

  zones: [
    { name: 'Workshop', bonusGems: 20, tasks: [
      { name: 'Clear the rubble', cost: 30 },
      { name: 'Fix the counter', cost: 60 },
      { name: 'Light the lamps', cost: 100 },
      { name: 'Repair the shelves', cost: 150 },
      { name: 'Paint the door', cost: 220 },
      { name: 'Plant the herb garden', cost: 300 }] },
    { name: 'Harbor', bonusGems: 30, tasks: [
      { name: 'Patch the pier', cost: 400 },
      { name: 'Raise the sail', cost: 520 },
      { name: 'Hang the nets', cost: 650 },
      { name: 'Build a fish stall', cost: 800 },
      { name: 'Light the lighthouse', cost: 1000 }] },
    { name: 'Sky Market', bonusGems: 50, tasks: [
      { name: 'Set up the stalls', cost: 1300 },
      { name: 'Hang the banners', cost: 1600 },
      { name: 'Open the tea house', cost: 2000 },
      { name: 'Ring the market bell', cost: 2500 }] }
  ],

  // Real-money products. In the prototype they are test purchases.
  money: [
    { id: 'gems_80', name: '80 Gems', price: '0,99 €', gems: 80 },
    { id: 'gems_500', name: '500 Gems', price: '4,99 €', gems: 500 },
    { id: 'gems_1200', name: '1.200 Gems', price: '9,99 €', gems: 1200, tag: '+20%' },
    { id: 'gems_2600', name: '2.600 Gems', price: '19,99 €', gems: 2600, tag: '+30%' },
    { id: 'gems_7000', name: '7.000 Gems', price: '49,99 €', gems: 7000, tag: '+40%' },
    { id: 'gems_15000', name: '15.000 Gems', price: '99,99 €', gems: 15000, tag: 'Best value' }
  ],
  starter: { id: 'starter', name: 'Starter Pack', price: '2,99 €', gems: 300, energy: 200, perm: 'golden', desc: '300 Gems + Golden Touch + 200 Energy. Once only.' },
  pass: { id: 'pass', name: "Amy's Pass", price: '9,99 €', days: 30, dailyGems: 60, energyBonus: 50, desc: '30 days: 60 Gems every day + 50 max Energy.' },

  // Gem items. perm = permanent, boost = timed, item = board item.
  gemShop: [
    { id: 'energy100', kind: 'energy', name: '100 Energy', cost: 20, icon: '⚡', desc: 'Refill now.' },
    { id: 'joker', kind: 'item', name: 'Joker', cost: 30, icon: '🃏', desc: 'Drop on any item to raise it one level.' },
    { id: 'lucky', kind: 'boost', name: 'Lucky Stars 1h', cost: 80, icon: '⭐', hours: 1, desc: '10% chance every spawn is one level higher.' },
    { id: 'autoMerge', kind: 'boost', name: 'Auto-Merge 1h', cost: 120, icon: '🤖', hours: 1, desc: 'Equal items merge by themselves.' },
    { id: 'double', kind: 'boost', name: 'Double Spawn 1h', cost: 150, icon: '✌️', hours: 1, desc: 'Every tap makes two items.' },
    { id: 'bigBoard', kind: 'perm', name: 'Bigger Board', cost: 250, icon: '🧱', desc: '+1 row on the board. Forever.' },
    { id: 'orderSlot', kind: 'perm', name: '4th Order Slot', cost: 300, icon: '📜', desc: 'One more customer at a time. Forever.' },
    { id: 'golden', kind: 'perm', name: 'Golden Touch', cost: 400, icon: '✨', desc: 'All generators make level 2 items. Forever.' },
    { id: 'fountain', kind: 'perm', name: 'Energy Fountain', cost: 600, icon: '⛲', desc: '+50 max Energy and twice as fast refill. Forever.' }
  ]
};
