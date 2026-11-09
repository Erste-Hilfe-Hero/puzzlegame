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
    bakery: { name: 'Bakery', gen: '🌾', genName: 'Wheat Field', unlock: 1,
      items: ['🌾', '🍞', '🥐', '🥖', '🥨', '🧇', '🍰', '🎂'],
      names: ['Wheat', 'Bread', 'Croissant', 'Baguette', 'Pretzel', 'Waffle', 'Cake Slice', 'Party Cake'] },
    fruit: { name: 'Fruit', gen: '🌳', genName: 'Orchard', unlock: 2,
      items: ['🍒', '🍓', '🍎', '🍐', '🍑', '🍍', '🍉', '🧺'],
      names: ['Cherry', 'Strawberry', 'Apple', 'Pear', 'Peach', 'Pineapple', 'Watermelon', 'Fruit Basket'] },
    cafe: { name: 'Drinks', gen: '☕', genName: 'Coffee Machine', unlock: 4,
      items: ['🥛', '☕', '🍵', '🥤', '🧋', '🍹', '🍨', '🍧'],
      names: ['Milk', 'Coffee', 'Tea', 'Soda', 'Bubble Tea', 'Smoothie', 'Ice Cream', 'Shaved Ice'] }
  },

  customers: ['👩‍🌾', '🧙', '🧝', '👨‍🍳', '🧑‍🚀', '👵', '🧛', '🧚', '🧜', '🤴'],

  zones: [
    { name: 'Paris Café', bonusGems: 20, tasks: [
      { name: 'Sweep the terrace', cost: 30 },
      { name: 'Fix the counter', cost: 60 },
      { name: 'Hang the awning', cost: 100 },
      { name: 'Polish the espresso bar', cost: 150 },
      { name: 'Set the bistro tables', cost: 220 },
      { name: 'Light the street lamps', cost: 300 }] },
    { name: 'Tokyo Tea House', bonusGems: 30, tasks: [
      { name: 'Repair the paper doors', cost: 400 },
      { name: 'Lay the tatami mats', cost: 520 },
      { name: 'Hang the lanterns', cost: 650 },
      { name: 'Plant the cherry tree', cost: 800 },
      { name: 'Open the tea counter', cost: 1000 }] },
    { name: 'New York Diner', bonusGems: 50, tasks: [
      { name: 'Fix the neon sign', cost: 1300 },
      { name: 'Reupholster the booths', cost: 1600 },
      { name: 'Install the jukebox', cost: 2000 },
      { name: 'Open the rooftop bar', cost: 2500 }] }
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
