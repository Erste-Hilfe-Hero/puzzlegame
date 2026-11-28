# Samsung TV (Tizen) builds

`python3 tv/build.py <game>` turns a game's web folder into a Samsung TV web app:
copies the game, adds `tv-nav.js` (remote: arrows move focus, OK clicks, Back closes/exits),
`tv.css` (focus ring, zoom, hidden shop), `config.xml` (profile tv-samsung, Tizen 5.5+) and a 512x423 icon.
Output: `tv/dist/<game>/` and `tv/dist/<game>-unsigned.wgt`. Per-game settings: `tv/apps/<game>.json`.

Sign + install on the laptop with Tizen Studio (Samsung certificate profile):

    tizen package -t wgt -s <profile> -- tv\dist\<game>
    sdb connect 192.168.178.64
    tizen install -n <Name>.wgt -t <tv-serial>

The TV edition has no shop: a Public Seller in Samsung Seller Office cannot use Samsung Checkout.
