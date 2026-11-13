# Rollhaven - naechstes Spiel (Entscheidung 13.11.2026)

## Entscheidung

Wir bauen **Rollhaven**: ein Wuerfel-Brettspiel ("Coin-Looter"), eigene Welt, nur In-App-Kaeufe, keine Werbung.
Man wuerfelt auf einem Rundbrett um eine Hafenstadt, sammelt Muenzen, baut Wahrzeichen, pluendert andere Haefen und sammelt Kartenalben.
Name gepruefft: kein Spiel "Rollhaven" in App Store / Web gefunden.

## Chartdaten (heute live gezogen, Top 100 Spiele nach Umsatz)

Quellen: Apple-Charts (iTunes RSS, US + DE, Umsatz + Gratis) und Google Play (US + DE, Umsatz + Gratis), 13.11.2026. Dazu AppMagic Oktober 2026.

| Genre | Plaetze in US iOS Top 100 Umsatz | Beispiele (Platz) | Haben wir schon? |
|---|---|---|---|
| 4X / Survival-Strategie | ca. 17 | Kingshot 8, Whiteout 9, Last War 19 | ja, Shardcrown |
| Neue Sortier-/Farb-Puzzles | ca. 20 | Colony Flow 22, Block Out 24, Pixel Flow 27 | nein, aber Geld meist ueber Werbung, jeden Monat neue Klone |
| Merge mit Story | ca. 11 | Gossip Harbor 2, Tasty Travels 21 | ja, Amy's Tasty Island |
| Match-3 mit Deko | ca. 9 | Royal Match 4, Candy Crush 5 | nein, braucht tausende Level, Riesen-Konkurrenz |
| Casino-Slots | ca. 10 | Lightning Link 31 | nein, rechtlich heikel |
| **Wuerfel-Brett / Coin-Looter** | 4 (Android US: 7) | **MONOPOLY GO! Platz 1 (iOS US + Android US)**, Coin Master 26 (Android DE Platz 2), Dice Dreams 51 | **nein** |

AppMagic Oktober 2026 weltweit: MONOPOLY GO! 72,3 Mio. $ Monatsumsatz (Platz 4 weltweit).

## Warum genau das

1. **Meister Umsatz pro Spiel:** Platz 1 in den USA auf beiden Stores, Platz 2-3 in Deutschland. Nur ca. 5 grosse Konkurrenten, nicht 20 wie bei Sortier-Puzzles.
2. **Passt zu Alis Regel:** Geld kommt fast nur aus Kaeufen (Wuerfel-Pakete, Multiplikator), stark pay2win, keine Werbung noetig.
3. **Fuer uns einfach zu bauen:** 2D, ein Brett, eine Kernschleife. Wir nehmen die Technik von Amy's Tasty Island (HTML5 + Android/iOS-Huelle mit Play Billing / StoreKit 2), die schon im Store ist. Kostenloser Bauweg (freier Mac im oeffentlichen Repo, Signieren auf Contabo).
4. **Neues Genre fuer uns:** kein Ueberlapp mit Nyrathen, Chimora, Amy, Shardcrown.
5. **Server haben wir:** Pluendern anderer Spieler, Ranglisten, Events laufen auf dem Contabo-Node-Server.

Risiko ehrlich: Das Genre lebt von taeglichen Events und vielen Spielern. Ohne Werbebudget waechst es langsam. Darum zuerst Kern + Events, dann messen.

## Spielidee (eigen, keine Kopie)

- **Welt:** Rollhaven, ein Archipel aus Laternen-Haefen. Jeder Hafen = ein Brett mit 24 Feldern rund um die Bucht.
- **Wuerfeln:** 2 Wuerfel, Felder: Muenzen, Schatztruhe, Ueberfall (fremden Hafen pluendern), Schild (schuetzt vor Ueberfall), Sturm (Muenzverlust ohne Schild), Laternenfest (Bonus), Zoll (Muenzen von Nachbarn), Leuchtturm (Wuerfel-Bonus).
- **Multiplikator x1 bis x100:** mehr Wuerfel pro Wurf, mehr Ertrag. Das ist der Haupt-Kaufgrund.
- **Bauen:** pro Hafen 5 Wahrzeichen in je 4 Stufen. Alle fertig = naechster Hafen (anderes Thema: Fischer, Gewuerz, Eis, Vulkan, Himmel ...).
- **Kartenalbum:** Sets aus 9 Karten pro Thema, Tausch mit Freunden, fertige Sets geben Wuerfel.
- **Wuerfel laden nach:** 1 Wuerfel alle 3 Min, max. 50.
- **Kein Spielautomat, keine Walzen:** Wuerfel statt Slot, damit kein "Gluecksspiel"-Label.

## Shop (keine Werbung, keine Kauf-Popups)

- Wuerfel-Pakete 0,99 / 4,99 / 9,99 / 19,99 / 49,99 / 99,99 EUR
- Starterpaket 1,99 EUR (einmalig)
- Hafenpass 7,99 EUR pro Saison (Extra-Belohnungen)
- Gold-Kartenpakete 2,99 EUR
- Shop nur, wenn der Spieler ihn selbst oeffnet.

## Plan (300 Punkte)

| Phase | Inhalt | Punkte |
|---|---|---|
| 1. Prototyp | Brett, Wuerfel, Multiplikator, Muenzen, 5 Wahrzeichen, 3 Haefen, Bot-Ueberfaelle, Speichern lokal | 30 |
| 2. Spielgefuehl | Wuerfel-Animation, Figur laeuft, Muenzregen, Klaenge, Haptik, Tutorial | 40 |
| 3. Inhalt | 20 Haefen mit eigenem Thema, Kartenalbum 20 Sets, Tagesbelohnung | 50 |
| 4. Server | Konto, Speichern auf Server, echte Ueberfaelle, Freunde, Rangliste | 50 |
| 5. Events | Turniere, Laternenfest-Woche, Partner-Event, Saisonpass | 50 |
| 6. Shop | Play Billing + StoreKit 2 (von Amy), Preise, Kaufwiederherstellung | 30 |
| 7. Store | Icon, Screenshots, Texte EN/DE + 12 Sprachen, Datenschutz, Android + iOS als Paar | 50 |

Reihenfolge: Phase 1 heute, dann 2 und 3, dann Store-Testversion (Android intern + iOS TestFlight), dann 4-6.

## Technik

- Code: Repo puzzlegame, Ordner `rollhaven/` (Branch claude/project-thread-l5qogd), bis ein eigenes Repo da ist.
- HTML5/JS, Android-WebView + iOS-WKWebView wie Amy's, Paket com.nyrathen.rollhaven.
- Web-Version spaeter unter play.nyrathen.com/rollhaven/.
