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

// ---------- content round 2 (plan-500 B15 B18 B24-B28 B31-B33 B36 B37 B40 B46-B48), read by x-content.js ----------

// Island 1 residents: favourite dish (B36), passive bonus once their place is restored (B48),
// one new line per friendship step (B15). Bonus kinds: spawnUp (generator c makes level 2 with chance p),
// orderPct (+n % coins per order), orderEnergy (+n energy per order), chestItem (+n items per chest).
[
  { fav: { c: 'bakery', l: 2 }, bonus: { k: 'spawnUp', c: 'bakery', p: 0.05 },
    friend: ['You remember how I take my bread. That means a lot to an old sailor.', 'Sit with me, Amy. This café feels like home again.', 'Here, my old compass. It always points to good friends.'] },
  { fav: { c: 'cafe', l: 2 }, bonus: { k: 'spawnUp', c: 'cafe', p: 0.05 },
    friend: ['You pour tea like my grandmother did. Gently.', 'I planted a second cherry tree. It is for you.', 'Friends who share tea share everything. Welcome, Amy.'] },
  { fav: { c: 'kitchen', l: 5 }, bonus: { k: 'orderPct', n: 5 },
    friend: ['You are fast! Want a job at the grill?', 'I put your name on the jukebox. Track number one!', 'Best partner a diner ever had. Burgers on me, forever.'] },
  { fav: { c: 'kitchen', l: 6 }, bonus: { k: 'spawnUp', c: 'kitchen', p: 0.05 },
    friend: ['You have good hands for dough, amica.', 'My nonna would have loved you. Here, her secret basil.', 'The oven sings when you are here. Grazie, Amy.'] },
  { fav: { c: 'fruit', l: 5 }, bonus: { k: 'orderEnergy', n: 1 },
    friend: ['You are part of the beach crew now!', 'I taught the gulls to wave at you. Look!', 'Sunrise surf tomorrow? You and me, partner.'] },
  { fav: { c: 'sweets', l: 6 }, bonus: { k: 'chestItem', n: 1 },
    friend: ['You climb those stairs like I did at your age.', 'I wrote down my old recipes. They are yours now.', 'The light shines for you too, sweetheart. Always.'] }
].forEach((x, k) => Object.assign(DATA.residents[k], x));

// B40: storm story, one scene per restored place of island 1, ending at Grandma Rosa's beacon.
[
  'Behind the counter Amy finds a torn sail with a lighthouse stitched on it. Who lost it in the storm?',
  'Under the tatami mats lies a soaked logbook. Last entry: "The beacon went dark. The ships could not find the harbor."',
  'The jukebox spits out an old photo: young Grandma Rosa, waving from the top of the lighthouse.',
  'In the cold stone oven Amy finds an iron key with a tag: "Lamp room".',
  'Washed up on the beach: the great lighthouse lens, still in one piece. Kai helps carry it home.',
  'Amy turns the key, Kai sets the lens and Grandma Rosa lights the beacon. The storm is over - every ship finds the island again.'
].forEach((s, k) => { DATA.zones[k].story = s; });

// B15: friendship steps (deliveries to one resident) and their rewards.
DATA.friendSteps = [{ n: 5, r: { chest: 1 } }, { n: 15, r: { joker: 1 } }, { n: 40, r: { gems: 10 } }];

// B18: by device hour a resident takes over a resident order (p = share of resident orders in the window).
// island/res = index; prefer = exact item when the player level allows it.
// B26/B27: share of orders on islands 2 and 3 that switch to one of the island's focus chains.
DATA.focusShare = 0.5;

DATA.timeGuests = [
  { island: 0, res: 0, from: 6, to: 11, p: 0.6, chains: ['bakery', 'cafe'] },
  { island: 0, res: 3, from: 17, to: 22, p: 0.6, chains: ['kitchen'], prefer: { c: 'kitchen', l: 6 } }
];

// B37: coins the first time any chain reaches item level 4 and 6 (l is 0-based).
DATA.albumStepCoins = { 3: 20, 5: 20 };

// B32: cosmetic variants for restored places, no gameplay effect. Variant 0 is the original look.
DATA.deco = [
  { id: 'classic', filter: '', coins: 0 },
  { id: 'lagoon', filter: 'hue-rotate(170deg) saturate(1.1)', coins: 800 },
  { id: 'rose', filter: 'hue-rotate(300deg) saturate(1.2)', coins: 1500 },
  { id: 'gold', filter: 'sepia(.6) saturate(1.8) brightness(1.05)', coins: 2500 }
];

// B46: rare beach finds, 1 % per generator tap, collected on their own album page.
DATA.findChance = 0.01;
DATA.finds = [
  { id: 'shell', emoji: '🐚', name: 'Spiral Shell' },
  { id: 'bottle', emoji: '📜', name: 'Message in a Bottle' },
  { id: 'glass', emoji: '🔹', name: 'Sea Glass' },
  { id: 'coral', emoji: '🪸', name: 'Pink Coral' },
  { id: 'pearl', emoji: '🦪', name: 'Lucky Pearl' },
  { id: 'compass', emoji: '🧭', name: 'Storm Compass' }
];

// B47: once a day a message in a bottle asks for 3 items of different chains within 24 hours.
DATA.bottle = { minLevel: 4, hours: 24, items: 3, reward: { chest: 1, joker: 1 } };

// B33: time-limited event chains. Local dates, end exclusive. Items use emoji, so no new art is needed.
// tiers: reward the first time an item level l (0-based) of the event chain is reached.
// unlock stays 999 so the normal level unlock never places the generator; x-content.js does that while it runs.
DATA.events = [
  { id: 'lantern27', start: '2027-01-15', end: '2027-01-22', minLevel: 5,
    chain: { img: false, name: 'Lantern Night', gen: '🎐', genName: 'Lantern Stall', unlock: 999,
      items: ['🕯️', '🏮', '🍢', '🍡', '🥮', '🍥', '🎑', '🎆'],
      names: ['Candle', 'Paper Lantern', 'Grill Skewer', 'Rice Dumplings', 'Moon Cake', 'Swirl Cake', 'Moon Viewing Tray', 'Lantern Fireworks'] },
    tiers: [{ l: 3, r: { coins: 100 } }, { l: 5, r: { chest: 1 } }, { l: 6, r: { gems: 10 } }, { l: 7, r: { gems: 25, joker: 1 } }] }
];

// B24-B28: islands. Island 1 uses DATA.zones / residents / mapPins; x-content.js swaps these three
// to the current island, so game.js keeps reading DATA.zones. Each island keeps its own board (S.boards).
// focus: chains that orders on this island prefer (sea/ice/herb/cheese/grill chains need art, B2-B8).
// Costs continue island 1 monotonically: island 2 1,400..2,800 (75,600 total), island 3 2,900..4,650 (135,900).
// Places on islands 2 and 3 have no pictures yet; map and windows show their emoji.
{
const T = (names, c0, step, k) => names.map((name, i) => ({ name, cost: c0 + step * (k * 6 + i) }));
DATA.islands = [
  { id: 'sunmelon', name: 'Sunmelon Island', places: DATA.zones, residents: DATA.residents, pins: DATA.mapPins },
  { id: 'coral', name: 'Coral Atoll', focus: ['fruit', 'cafe', 'sweets'],
    pins: [[24, 76], [52, 84], [76, 66], [76, 34], [50, 18], [24, 40]],
    svg: `<svg viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true">
  <path d="M50 8 C82 8 96 40 94 66 C92 98 74 124 50 124 C24 124 6 100 6 66 C6 36 20 8 50 8 Z" fill="#f6dc9c" stroke="#fff6d8" stroke-width="2.5"/>
  <path d="M50 14 C78 14 88 42 88 66 C88 94 72 118 50 118 C26 118 12 96 12 66 C12 40 24 14 50 14 Z" fill="#8fd16a"/>
  <path d="M50 30 C70 30 76 50 76 66 C76 86 66 102 50 102 C32 102 24 86 24 66 C24 48 32 30 50 30 Z" fill="#7fe3ff" stroke="#fff6d8" stroke-width="2"/>
  <path d="M50 40 C64 40 68 54 68 66 C68 80 62 92 50 92 C38 92 32 80 32 66 C32 52 38 40 50 40 Z" fill="#a8f0ff"/>
  <path d="M24 98 Q52 112 76 86 T76 44 T50 22 T22 48" fill="none" stroke="#fff8" stroke-width="1.6" stroke-dasharray="2 2.5"/>
</svg>`,
    places: [
      { name: 'Shell Stand', emoji: '🐚', bonusGems: 60, tasks: T(['Sort the shells', 'Mend the fishing nets', 'Paint the price boards', 'Build a shell counter', 'Hang shell wind chimes', 'Open the stand'], 1400, 40, 0) },
      { name: 'Stilt House Grill', emoji: '🛖', bonusGems: 80, tasks: T(['Fix the stilts', 'Lay new planks', 'Build the grill pit', 'Hang the rope ladder', 'Set the sea-view tables', 'Light the first fire'], 1400, 40, 1) },
      { name: 'Pearl Diver Bar', emoji: '🦪', bonusGems: 100, tasks: T(['Raise the diving flag', 'Polish the pearl bar', 'Hang the old diving helmets', 'Fill the aquarium', 'Mix the lagoon punch', 'Host a pearl night'], 1400, 40, 2) },
      { name: 'Reef Bistro', emoji: '🐠', bonusGems: 120, tasks: T(['Scrub the coral tiles', 'Install the glass floor', 'Build the open kitchen', 'Set the reef tables', 'Write the menu', 'Serve the first dinner'], 1400, 40, 3) },
      { name: 'Lagoon Gelato', emoji: '🍨', bonusGems: 150, tasks: T(['Repair the freezer', 'Paint pastel stripes', 'Build the waffle corner', 'Put up the parasols', 'Stock the toppings', 'Scoop the first cone'], 1400, 40, 4) },
      { name: 'Atoll Festival Hall', emoji: '🎪', bonusGems: 200, tasks: T(['Clear the hall', 'Raise the palm roof', 'Build the stage', 'Hang the shell garlands', 'Set the long table', 'Open the atoll feast'], 1400, 40, 5) }
    ],
    residents: [
      { name: 'Mira', emoji: '👧', hi: 'Hi! I collect shells, but the storm buried my little stand. Dig it out with me?', thanks: 'My stand is back! Every guest gets a shell for luck.',
        lines: ['A snack for the shell hunter?', 'The tide is low. Time for lunch!', 'I found a pink one today. Let us celebrate!'], fav: { c: 'fruit', l: 3 }, bonus: { k: 'spawnUp', c: 'fruit', p: 0.05 } },
      { name: 'Old Tomas', emoji: '🧔', hi: 'My grill stands on stilts above the water. Well, it did, before the storm.', thanks: 'Steady as a rock again. The first fire is lit for you.',
        lines: ['The coals are glowing. Bring me something!', 'Fishermen come home hungry.', 'Nothing beats dinner above the waves.'], fav: { c: 'kitchen', l: 4 }, bonus: { k: 'orderPct', n: 3 } },
      { name: 'Nalu', emoji: '🤿', hi: 'I dive for pearls all day. At night I want a bar to come home to!', thanks: 'Look at the aquarium glow! Divers from every reef will come.',
        lines: ['Deep dive, big appetite!', 'Something cold for after the dive?', 'Found a pearl. Treats for everyone!'], fav: { c: 'cafe', l: 5 }, bonus: { k: 'orderEnergy', n: 1 } },
      { name: 'Chef Odile', emoji: '🧑‍🍳', hi: 'A bistro with a glass floor over the reef. Fish watch you eat! Help me build it?', thanks: 'The reef sparkles under every table. Merci, Amy!',
        lines: ['My guests want something fresh.', 'The reef is pretty, but plates are prettier!', 'Bring me your best, the critics are here.'], fav: { c: 'veggie', l: 5 }, bonus: { k: 'spawnUp', c: 'veggie', p: 0.05 } },
      { name: 'Pippa', emoji: '👱‍♀️', hi: 'Ice cream by the lagoon! Only the freezer is full of sand...', thanks: 'Pastel stripes and cold scoops. The lagoon has never looked sweeter!',
        lines: ['Sweet tooth alert!', 'Toppings, toppings, toppings!', 'A cone for every kid on the atoll!'], fav: { c: 'sweets', l: 4 }, bonus: { k: 'spawnUp', c: 'sweets', p: 0.05 } },
      { name: 'Mayor Bo', emoji: '🤵', hi: 'Every year the atoll holds a feast. This year the hall has no roof!', thanks: 'The feast is back! Amy, you are the guest of honor.',
        lines: ['The council is hungry. Very hungry.', 'A feast needs a long table, full of food!', 'Speeches are better with snacks.'], fav: { c: 'fruit', l: 7 }, bonus: { k: 'chestItem', n: 1 } }
    ] },
  { id: 'ember', name: 'Emberpeak', focus: ['veggie', 'kitchen', 'bakery'],
    pins: [[24, 82], [70, 76], [28, 60], [72, 52], [32, 36], [58, 16]],
    svg: `<svg viewBox="0 0 100 130" preserveAspectRatio="none" aria-hidden="true">
  <path d="M10 116 C2 100 10 84 20 76 C28 50 38 22 50 14 C62 22 72 50 80 76 C90 84 98 100 90 116 C70 128 30 128 10 116 Z" fill="#f6dc9c" stroke="#fff6d8" stroke-width="2.5"/>
  <path d="M16 110 C10 98 18 86 26 80 C32 58 40 34 50 26 C60 34 68 58 74 80 C82 86 90 98 84 110 C66 120 34 120 16 110 Z" fill="#8fd16a"/>
  <path d="M30 76 C36 56 42 36 50 26 C58 36 64 56 70 76 C58 82 42 82 30 76 Z" fill="#b38b6d"/>
  <path d="M40 30 C44 22 56 22 60 30 C56 34 44 34 40 30 Z" fill="#ff8a3d" stroke="#ffd84d" stroke-width="1.5"/>
  <path d="M24 106 Q56 100 70 92 T30 74 T72 62 T34 44 T58 22" fill="none" stroke="#fff8" stroke-width="1.6" stroke-dasharray="2 2.5"/>
</svg>`,
    places: [
      { name: 'Mountain Bakery', emoji: '🏔️', bonusGems: 80, tasks: T(['Dig out the oven', 'Fix the flour mill', 'Stack the firewood', 'Build the bread shelf', 'Carve the sign', 'Bake the summit loaf'], 2900, 50, 0) },
      { name: 'Hot Spring Tea Room', emoji: '♨️', bonusGems: 100, tasks: T(['Clean the spring', 'Lay the stone path', 'Build the tea benches', 'Hang steam curtains', 'Brew the first pot', 'Hold a tea ceremony'], 2900, 50, 1) },
      { name: 'Lava Stone Grill', emoji: '🌋', bonusGems: 120, tasks: T(['Cool the lava stones', 'Build the stone grill', 'Set the bench rows', 'Hang the iron lamps', 'Sharpen the skewers', 'Fire up grill night'], 2900, 50, 2) },
      { name: 'Herb Hut', emoji: '🌿', bonusGems: 150, tasks: T(['Weed the beds', 'Fix the drying rack', 'Plant the mint wall', 'Fill the spice jars', 'Steep the herb oil', 'Open the herb market'], 2900, 50, 3) },
      { name: 'Summit Dairy', emoji: '🧀', bonusGems: 180, tasks: T(['Clean the cellar', 'Fix the butter churn', 'Build the cheese racks', 'Bring up the goats', 'Turn the first wheel', 'Hold the tasting'], 2900, 50, 4) },
      { name: 'Crater Feast Hall', emoji: '🏮', bonusGems: 250, tasks: T(['Clear the crater path', 'Raise the great tent', 'Build the fire ring', 'Hang the ember lanterns', 'Set the feast table', 'Light the crater fire'], 2900, 50, 5) }
    ],
    residents: [
      { name: 'Baker Greta', emoji: '👩‍🦳', hi: 'Bread bakes best in the mountain air. But ash covered my oven!', thanks: 'The summit loaf rises again. Warm bread for every climber!',
        lines: ['Fresh from the mountain, please!', 'Climbers need crusty bread.', 'The oven is hot, the bowls are empty!'], fav: { c: 'bakery', l: 6 }, bonus: { k: 'spawnUp', c: 'bakery', p: 0.05 } },
      { name: 'Master Ren', emoji: '🧘', hi: 'The hot spring still bubbles. Only the tea room around it is gone.', thanks: 'Warm water, warm tea, calm heart. Thank you, Amy.',
        lines: ['A quiet snack for a quiet mind.', 'Tea alone is lonely. Bring a friend.', 'The steam says: lunch time.'], fav: { c: 'cafe', l: 6 }, bonus: { k: 'spawnUp', c: 'cafe', p: 0.05 } },
      { name: 'Big Jorge', emoji: '🧔‍♂️', hi: 'I grill on stones straight from the volcano. Hot stuff! Help me set up?', thanks: 'Grill night is back! The whole mountain smells delicious.',
        lines: ['Stones are hot. Hungry crowd!', 'More for the grill, amigo!', 'Nothing tastes like lava-stone cooking.'], fav: { c: 'kitchen', l: 5 }, bonus: { k: 'orderPct', n: 4 } },
      { name: 'Wren', emoji: '👩‍🌾', hi: 'My herbs love the warm volcanic soil. Weeds love it too...', thanks: 'Mint, basil, thyme - the whole hut smells like summer!',
        lines: ['Something green and fresh?', 'My herbs want a tasty partner.', 'Market day! Bring the good stuff.'], fav: { c: 'veggie', l: 4 }, bonus: { k: 'spawnUp', c: 'veggie', p: 0.05 } },
      { name: 'Old Hilde', emoji: '🧓', hi: 'Up here the goats give the best milk. My dairy just needs a little love.', thanks: 'The first wheel is turned. In a year it will be the best cheese on the sea!',
        lines: ['A little bite for the cheese maker?', 'Goats are fed. Now feed me!', 'Tasting day! Bring something to go with it.'], fav: { c: 'kitchen', l: 3 }, bonus: { k: 'spawnUp', c: 'kitchen', p: 0.05 } },
      { name: 'Chief Tavi', emoji: '👨‍🦰', hi: 'Once a year we feast inside the old crater. Will you help us light the fire again?', thanks: 'The crater fire burns! All three islands are invited.',
        lines: ['The feast hall waits for you!', 'Big fire, big table, big hunger.', 'Bring the best dish of the mountain!'], fav: { c: 'veggie', l: 7 }, bonus: { k: 'orderEnergy', n: 1 } }
    ] }
];
}
