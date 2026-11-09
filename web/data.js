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

  art: ['gen_bakery', 'gen_fruit', 'gen_cafe', 'gen_kitchen', 'gen_veggie', 'gen_sweets', 'joker'],

  chains: {
    bakery: { img: true, name: 'Bakery', gen: '🏠', genName: 'Bakery', unlock: 1,
      items: ['🌾', '🍞', '🥐', '🥖', '🥨', '🧇', '🍰', '🎂'],
      names: ['Wheat', 'Bread', 'Croissant', 'Baguette', 'Pretzel', 'Waffle', 'Cake Slice', 'Party Cake'] },
    fruit: { img: true, name: 'Fruit', gen: '🌳', genName: 'Orchard', unlock: 2,
      items: ['🍒', '🍓', '🍎', '🍐', '🍑', '🍍', '🍉', '🧺'],
      names: ['Cherry', 'Strawberry', 'Apple', 'Pear', 'Peach', 'Pineapple', 'Watermelon', 'Fruit Basket'] },
    cafe: { img: true, name: 'Drinks', gen: '☕', genName: 'Coffee Machine', unlock: 4,
      items: ['🥛', '☕', '🍵', '🥤', '🧋', '🍹', '🍨', '🍧'],
      names: ['Milk', 'Coffee', 'Tea', 'Soda', 'Bubble Tea', 'Smoothie', 'Sundae', 'Ice Pop'] },
    kitchen: { img: true, name: 'Kitchen', gen: '🍳', genName: 'Stove', unlock: 6,
      items: ['🥚', '🍳', '🥞', '🥪', '🌮', '🍔', '🍕', '🍱'],
      names: ['Egg', 'Fried Egg', 'Pancakes', 'Sandwich', 'Taco', 'Burger', 'Pizza', 'Bento Box'] },
    veggie: { img: true, name: 'Veggies', gen: '🚜', genName: 'Farm', unlock: 8,
      items: ['🥕', '🌽', '🥦', '🍅', '🥗', '🍲', '🥘', '🍛'],
      names: ['Carrot', 'Corn', 'Broccoli', 'Tomato', 'Salad', 'Soup', 'Paella', 'Curry'] },
    sweets: { img: true, name: 'Sweets', gen: '🍭', genName: 'Candy Cart', unlock: 11,
      items: ['🍬', '🍭', '🍫', '🍪', '🍩', '🧁', '🍮', '🎁'],
      names: ['Candy', 'Lollipop', 'Chocolate', 'Cookie', 'Donut', 'Cupcake', 'Pudding', 'Sweet Box'] }
  },

  customers: ['👩‍🌾', '🧙', '🧝', '👨‍🍳', '🧑‍🚀', '👵', '🧛', '🧚', '🧜', '🤴'],

  zones: [
    { name: 'Seaside Café', bonusGems: 20, tasks: [
      { name: 'Sweep the terrace', cost: 30 },
      { name: 'Fix the counter', cost: 60 },
      { name: 'Hang the awning', cost: 100 },
      { name: 'Polish the espresso bar', cost: 150 },
      { name: 'Set the bistro tables', cost: 220 },
      { name: 'Light the street lamps', cost: 300 }] },
    { name: 'Blossom Tea House', bonusGems: 30, tasks: [
      { name: 'Repair the paper doors', cost: 400 },
      { name: 'Lay the tatami mats', cost: 520 },
      { name: 'Hang the lanterns', cost: 650 },
      { name: 'Plant the cherry tree', cost: 800 },
      { name: 'Open the tea counter', cost: 1000 }] },
    { name: 'Harbor Diner', bonusGems: 50, tasks: [
      { name: 'Fix the neon sign', cost: 1300 },
      { name: 'Reupholster the booths', cost: 1600 },
      { name: 'Install the jukebox', cost: 2000 },
      { name: 'Open the rooftop bar', cost: 2500 }] },
    { name: 'Sunset Pizzeria', bonusGems: 60, tasks: [
      { name: 'Rebuild the stone oven', cost: 3000 },
      { name: 'Paint the walls', cost: 3400 },
      { name: 'Set up the terrace', cost: 3800 },
      { name: 'Hang the fairy lights', cost: 4300 },
      { name: 'Open the pizza window', cost: 4800 }] },
    { name: 'Coconut Beach Bar', bonusGems: 80, tasks: [
      { name: 'Clear the beach', cost: 5400 },
      { name: 'Build the bamboo bar', cost: 6000 },
      { name: 'Put up sun umbrellas', cost: 6700 },
      { name: 'Install the hammocks', cost: 7400 },
      { name: 'Start the beach party', cost: 8200 }] },
    { name: 'Lighthouse Restaurant', bonusGems: 100, tasks: [
      { name: 'Fix the spiral stairs', cost: 9000 },
      { name: 'Clean the big windows', cost: 10000 },
      { name: 'Build the panorama kitchen', cost: 11000 },
      { name: 'Set the candle tables', cost: 12500 },
      { name: 'Light the beacon', cost: 14000 }] }
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
