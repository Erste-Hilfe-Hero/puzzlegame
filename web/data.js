// Game data. Tuning values live here, not in game.js.
//
// Value anchor (D4): 1 Gem = 5 Energy = 20 Coins.
//   From: 100 Energy refill costs 20 Gems, and an order pays 4 coins per energy spent
//   (order coins 4 * 2^l, item cost 2^l energy). Check every gem price against this anchor.
//
// Place costs (B23, D7, D45): derived from target play time, not hand-picked.
//   Assumed F2P budget: ~400 energy per play day (regen 30/h over several sessions,
//   level-up refills, dailies) = ~1,600 coins per play day at 4 coins/energy.
//   Target per place: 1 = first session (~20 min), 2 = 1 day, 3 = 1.5 days,
//   4 = 2 days, 5 = 3 days, 6 = 4.5 days at today's 4 coins/energy
//   (about 3 days once orders get a level factor). Island total 20,000 coins (was 121,130).
//   Costs rise monotonically across all 36 tasks so there is no jump between places.
//
// Price and economy change log (D50):
//   2026-11-12 money gems_80: 80 -> 100 gems (D2, base rate 100 gems per euro).
//   2026-11-12 money tags: computed against 100 gems per euro, 'Best value' -> '+50%' (D3).
//   2026-11-12 gemShop lucky 80 -> 40 (D21, 10% chance is worth ~10% more items).
//   2026-11-12 gemShop joker 30 -> 20 (D22, saves at most 64 energy = 12.8 gems).
//   2026-11-12 bubbleCost 4 + 3l -> max(3, round(0.4 * 2^l)) (D23, 40% of energy value).
//   2026-11-12 sellCoins 1 + l -> 2^l (D30, 25% of the order value, selling never beats orders).
//   2026-11-12 dailyPool deliver 3: 60 -> 100 coins, spawn 40: 80 -> 100 coins (D37, ~5 gems each).
//   2026-11-12 zones bonusGems place 4/5/6: 60/80/100 -> 80/150/200 (D44).
//   2026-11-12 zones task costs rebuilt from target times, 6 tasks per place (B23, B30, F1).
const DATA = {
  cols: 7,
  rows: 8,
  energyStart: 100,
  energyMax: 100,
  energyRegenSec: 120,
  xpForLevel: lvl => 20 + 15 * lvl,
  levelUpGems: 5,
  dailyGems: 2,
  sellCoins: l => Math.pow(2, l),

  art: ['gen_bakery', 'gen_fruit', 'gen_cafe', 'gen_kitchen', 'gen_veggie', 'gen_sweets', 'joker', 'chest', 'place_0', 'place_1', 'place_2', 'place_3', 'place_4', 'place_5', 'res_0', 'res_1', 'res_2', 'res_3', 'res_4', 'res_5', 'cu_0', 'cu_1', 'cu_2', 'cu_3'],

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

  customers: ['cu_0', 'cu_1', 'cu_2', 'cu_3'],

  // New tasks are only appended, so saved tasksDone indices stay valid.
  zones: [
    { name: 'Seaside Café', bonusGems: 20, tasks: [
      { name: 'Sweep the terrace', cost: 10 },
      { name: 'Fix the counter', cost: 30 },
      { name: 'Hang the awning', cost: 60 },
      { name: 'Polish the espresso bar', cost: 100 },
      { name: 'Set the bistro tables', cost: 160 },
      { name: 'Light the street lamps', cost: 240 }] },
    { name: 'Blossom Tea House', bonusGems: 30, tasks: [
      { name: 'Repair the paper doors', cost: 240 },
      { name: 'Lay the tatami mats', cost: 250 },
      { name: 'Hang the lanterns', cost: 260 },
      { name: 'Plant the cherry tree', cost: 270 },
      { name: 'Open the tea counter', cost: 280 },
      { name: 'Hold the opening tea party', cost: 300 }] },
    { name: 'Harbor Diner', bonusGems: 50, tasks: [
      { name: 'Fix the neon sign', cost: 320 },
      { name: 'Reupholster the booths', cost: 360 },
      { name: 'Install the jukebox', cost: 390 },
      { name: 'Open the rooftop bar', cost: 420 },
      { name: 'Polish the milkshake bar', cost: 440 },
      { name: 'Throw a jukebox night', cost: 470 }] },
    { name: 'Sunset Pizzeria', bonusGems: 80, tasks: [
      { name: 'Rebuild the stone oven', cost: 490 },
      { name: 'Paint the walls', cost: 530 },
      { name: 'Set up the terrace', cost: 560 },
      { name: 'Hang the fairy lights', cost: 590 },
      { name: 'Open the pizza window', cost: 600 },
      { name: 'Bake the opening pizza', cost: 630 }] },
    { name: 'Coconut Beach Bar', bonusGems: 150, tasks: [
      { name: 'Clear the beach', cost: 660 },
      { name: 'Build the bamboo bar', cost: 720 },
      { name: 'Put up sun umbrellas', cost: 780 },
      { name: 'Install the hammocks', cost: 830 },
      { name: 'Start the beach party', cost: 880 },
      { name: 'Dance until sunrise', cost: 930 }] },
    { name: 'Lighthouse Restaurant', bonusGems: 200, tasks: [
      { name: 'Fix the spiral stairs', cost: 1000 },
      { name: 'Clean the big windows', cost: 1100 },
      { name: 'Build the panorama kitchen', cost: 1180 },
      { name: 'Set the candle tables', cost: 1250 },
      { name: 'Light the beacon', cost: 1310 },
      { name: 'Ring the welcome bell', cost: 1360 }] }
  ],

  // One resident per place. Arrives when you start the place, thanks you when it is restored, then orders too.
  // lines: short order lines for later orders (B16, F41). Not shown yet, game.js needs to read them.
  residents: [
    { name: 'Captain Finn', emoji: '👴', hi: 'Ahoy! This old café was my favourite spot. Can you bring it back to life?', thanks: 'Just like the old days! I will drop by for breakfast every morning.',
      lines: ['Morning! The usual, please.', 'Something warm for an old sailor?', 'Breakfast tastes better by the sea.'] },
    { name: 'Hana', emoji: '👩', hi: 'Welcome to my tea house. The storm broke everything... will you help me?', thanks: 'It is more beautiful than before! Come and have tea with me any time.',
      lines: ['A little something to go with my tea?', 'The cherry tree is blooming. Let us celebrate!', 'Quiet days need good snacks.'] },
    { name: 'Rosie', emoji: '👩‍🍳', hi: 'Hey! My diner needs some love. Burgers taste best under neon lights!', thanks: 'The jukebox is playing again! Best diner on the island, thanks to you.',
      lines: ['Order up! My booths are full tonight.', 'The jukebox wants a snack, too!', 'Neon lights, hungry guests. You know the drill!'] },
    { name: 'Luca', emoji: '👨', hi: 'Ciao! Without the stone oven there is no real pizza. Help me fix it?', thanks: 'Bellissimo! The first pizza from the new oven is for you and Amy.',
      lines: ['The oven is hot. Bring me something good!', 'A pizza needs friends on the table.', 'Sunset dinner for two, per favore!'] },
    { name: 'Kai', emoji: '🏄', hi: 'Yo! The beach is a mess. Let us make it the coolest bar in the sun!', thanks: 'Party time! Everyone is coming to the beach tonight.',
      lines: ['Surf is up and so is my hunger!', 'Something fresh for the beach crew?', 'Party snacks, please. Lots of them!'] },
    { name: 'Grandma Rosa', emoji: '👵', hi: 'Dear, I kept this lighthouse shining for fifty years. Let us cook up there once more.', thanks: 'The beacon shines again. You made an old lady very happy, sweetheart.',
      lines: ['Bring it up the stairs, dear. My knees will thank you.', 'In my day, we cooked by the light of the beacon.', 'A little treat for the keeper of the light?'] }
  ],
  mapPins: [[24, 76], [64, 66], [28, 50], [70, 42], [30, 25], [66, 16]],

  // Daily tasks: 3 per day from this pool. reward: gems | coins | chest
  dailyPool: [
    { k: 'merge', n: 15, reward: { gems: 5 } }, { k: 'merge', n: 30, reward: { chest: 1 } },
    { k: 'deliver', n: 3, reward: { coins: 100 } }, { k: 'deliver', n: 6, reward: { gems: 8 } },
    { k: 'spawn', n: 40, reward: { coins: 100 } }, { k: 'task', n: 1, reward: { chest: 1 } }
  ],
  dailyAllBonus: { gems: 10 },
  calendar: [{ gems: 3 }, { coins: 80 }, { chest: 1 }, { energy: 50 }, { gems: 8 }, { joker: 1 }, { gems: 20, chest: 1 }],
  chestItems: 3,
  bubbleChance: 0.06, bubbleSec: 60, bubbleCost: l => Math.max(3, Math.round(0.4 * Math.pow(2, l))),
  storeSlots: 4,
  albumGems: 25,

  // Real-money products. In the prototype they are test purchases.
  // Ids are store SKUs and must not change. Tags = bonus over the base rate of 100 gems per euro.
  money: [
    { id: 'gems_80', name: '100 Gems', price: '0,99 €', gems: 100 },
    { id: 'gems_500', name: '500 Gems', price: '4,99 €', gems: 500 },
    { id: 'gems_1200', name: '1,200 Gems', price: '9,99 €', gems: 1200, tag: '+20%' },
    { id: 'gems_2600', name: '2,600 Gems', price: '19,99 €', gems: 2600, tag: '+30%' },
    { id: 'gems_7000', name: '7,000 Gems', price: '49,99 €', gems: 7000, tag: '+40%' },
    { id: 'gems_15000', name: '15,000 Gems', price: '99,99 €', gems: 15000, tag: '+50%' }
  ],
  starter: { id: 'starter', name: 'Starter Pack', price: '2,99 €', gems: 300, energy: 200, perm: 'golden', desc: '300 Gems + Golden Touch + 200 Energy. Once only.' },
  pass: { id: 'pass', name: "Amy's Pass", price: '9,99 €', days: 30, dailyGems: 60, energyBonus: 50, desc: '30 days: 60 Gems now and on every day you play (up to 1,860) + 50 max Energy.' },

  // Gem items. perm = permanent, boost = timed, item = board item.
  gemShop: [
    { id: 'energy100', kind: 'energy', name: '100 Energy', cost: 20, icon: '⚡', desc: 'Refill right now.' },
    { id: 'joker', kind: 'item', name: 'Joker', cost: 20, icon: '🃏', desc: 'Drop it on any item to raise it one level.' },
    { id: 'lucky', kind: 'boost', name: 'Lucky Stars 1h', cost: 40, icon: '⭐', hours: 1, desc: 'Every new item has a 10% chance to be one level higher.' },
    { id: 'autoMerge', kind: 'boost', name: 'Auto-Merge 1h', cost: 120, icon: '🤖', hours: 1, desc: 'Equal items merge by themselves.' },
    { id: 'double', kind: 'boost', name: 'Double Spawn 1h', cost: 150, icon: '✌️', hours: 1, desc: 'Every tap makes two items for 1 energy.' },
    { id: 'bigBoard', kind: 'perm', name: 'Bigger Board', cost: 250, icon: '🧱', desc: '+1 row on the board. Forever.' },
    { id: 'orderSlot', kind: 'perm', name: '4th Order Slot', cost: 300, icon: '📜', desc: 'One more guest orders at a time. Forever.' },
    { id: 'golden', kind: 'perm', name: 'Golden Touch', cost: 400, icon: '✨', desc: 'All generators make level 2 items. Forever.' },
    { id: 'fountain', kind: 'perm', name: 'Energy Fountain', cost: 600, icon: '⛲', desc: '+50 max Energy and energy refills twice as fast. Forever.' }
  ]
};
