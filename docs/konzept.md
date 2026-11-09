# Amy's Tasty Island - Konzept (Merge-2, nur Ingame-Kaeufe)

Stand 09.11.2026. Name "Amy's Tasty Island" (Store: "Amy's Tasty Island: Merge & Cook") (Hauptsprache Englisch, Deutsch als 2. Sprache).

## Idee (eigene Welt, keine Kopie)

Die junge Koechin Amy kommt auf eine verlassene Urlaubsinsel und bringt deren heruntergekommene Cafes und Restaurants wieder zum Laufen: Seaside Cafe, Blossom Tea House, Harbor Diner, spaeter weitere Inseln. Sie zieht Zutaten zusammen (Merge-2: Weizen -> Brot -> Croissant ..., Kirsche -> ... -> Obstkorb, Milch -> Kaffee -> ... -> Eis), bedient Gaeste mit Bestellungen und renoviert mit dem Gold jeden Ort.

Gleiches Genre und gleiche Mechanik wie Tasty Travels (Merge-2, Kochen, Orte renovieren). Bewusst NICHT uebernommen: Name, Figuren, Grafik, Orte-Reihenfolge, Texte und UI-Look. Grund: Store-Ablehnung wegen Verwechslung/Nachahmung und Markenrecht.

## Kern-Schleife

1. Erzeuger antippen (Weizenfeld, Obstgarten, Kaffeemaschine) -> kostet 1 Energie -> neues Teil auf dem Brett.
2. Zwei gleiche Teile zusammenziehen -> naechste Stufe (8 Stufen pro Kette).
3. Bewohner bestellen bestimmte Teile -> liefern -> Gold + Erfahrung.
4. Gold -> Renovier-Aufgaben (z. B. "Theke reparieren") -> naechster Ort.
5. Level-Aufstieg -> Gratis-Edelsteine + Energie aufgefuellt.

## Waehrungen

| Waehrung | Woher (gratis) | Wofuer |
|---|---|---|
| Energie (max 100, +1 alle 2 Min.) | Zeit, Level-Up, Auftraege | Erzeuger antippen |
| Gold | Auftraege | Insel aufbauen |
| Edelsteine | Level-Up (5), Tagesbonus (2), Erfolge | Shop (alles) |

## Shop (maximal pay2win, aber free spielbar)

Regel: **Keine Pop-ups, keine Werbung, keine Kauf-Erinnerungen, kein roter Punkt am Shop.** Kaufen nur, wenn der Spieler selbst in den Shop geht. Gratis-Spieler kommen ueberall hin, nur langsamer.

| Gruppe | Artikel | Preis | Wirkung |
|---|---|---|---|
| Edelsteine | 80 / 500 / 1.200 / 2.600 / 7.000 / 15.000 | 0,99 / 4,99 / 9,99 / 19,99 / 49,99 / 99,99 EUR | Premium-Waehrung |
| Starterpaket (einmalig) | 300 Edelsteine + Goldene Kueche + 200 Energie | 2,99 EUR | starker Einstieg |
| Monatspass (Amy's Pass) | 30 Tage: 60 Edelsteine/Tag + Energie-Max 150 | 9,99 EUR | Dauer-Vorteil |
| Energie | 100 Energie | 20 Edelsteine | sofort weiter |
| Pay2win dauerhaft | Goldene Kueche (Erzeuger startet auf Stufe 2) | 400 Edelsteine | doppelter Fortschritt |
| | Grosses Brett (+1 Reihe) | 250 Edelsteine | mehr Platz |
| | Energie-Brunnen (+50 Max-Energie, schnellere Ladung) | 600 Edelsteine | mehr spielen |
| | Vierter Auftrags-Platz | 300 Edelsteine | mehr Gold |
| Pay2win zeitlich | Auto-Merge 1 Std. (gleiche Teile verschmelzen selbst) | 120 Edelsteine | Zeitersparnis |
| | Doppel-Ertrag 1 Std. (jedes Antippen = 2 Teile) | 150 Edelsteine | Zeitersparnis |
| | Glueckssterne 1 Std. (10 % Chance auf Stufe +1) | 80 Edelsteine | Zeitersparnis |
| Einzelteile | Joker (wird zu jedem Teil, das man draufzieht) | 30 Edelsteine | Luecken fuellen |

Geld-Logik: Wale kaufen dauerhafte Vorteile (Kessel, Brunnen, Brett) und Zeit-Boosts; Gratis-Spieler bekommen ca. 10-15 Edelsteine pro Tag und koennen sich nach 2-3 Wochen selbst einen dauerhaften Vorteil leisten.

## Technik

- HTML5/JavaScript (Canvas), laeuft im Browser, auf Android und iOS als App-Huelle (Capacitor). Grund: Godot/Unity sind in der Bau-Umgebung nicht installiert, Web kann sofort getestet werden, Downloads bleiben unter 10 MB.
- Spielstand zuerst auf dem Geraet, spaeter auf dem Contabo-Server (online, wie Nyrathen).
- Kaeufe: im Prototyp Test-Kaeufe; in den Stores Google Play Billing / Apple IAP (Pflicht fuer digitale Waren), im Browser Stripe.
- Grafik: Prototyp mit Emojis, danach eigene Grafik.

## Meilensteine

| # | Inhalt | Dauer |
|---|---|---|
| 1 | Spielbarer Prototyp: Brett, 3 Ketten, Auftraege, Energie, Level, Shop mit Test-Kaeufen, 1 Zone | 1-2 Tage |
| 2 | Echte Grafik, Sound, 4 Zonen, 6 Ketten, Tutorial, Englisch/Deutsch | 1-2 Wochen |
| 3 | Server-Spielstand, echte Kaeufe (Play/Apple/Stripe), Android-Build | 1 Woche |
| 4 | Testphase 7 Tage (Ziel D1 >= 35 %, D7 >= 10 %), dann Release + Events | laufend |
