# Mossbrook Solitaire - 6. Spiel (Entscheidung 13.11.2026)

## Entscheidung
Wir bauen **Mossbrook Solitaire**: TriPeaks-Solitaire (Karte +1/-1 ablegen) mit Dorf-Aufbau.
Man loest Kartenlevel, verdient Sterne und baut damit das verfallene Flussdorf Mossbrook wieder auf.
Nur iOS. Nur In-App-Kaeufe, keine Werbung, keine Kauf-Popups. Name geprueft: kein App-Store-Treffer "Mossbrook".

## Chartdaten (13.11.2026, iTunes RSS Top 100 Umsatz Spiele)
| Titel | US | DE |
|---|---|---|
| Disney Solitaire (TriPeaks + Szenen) | 30 | 17 |
| Solitaire Grand Harvest (TriPeaks + Farm) | - | 51 |
| Solitaire Associations Journey | 45 | - |
| Domino Dreams (gleiches Prinzip mit Dominos) | - | 39 |
Disney Solitaire: 123,3 Mio $ Umsatz in Q1 2026, 142,4 Mio $ in Q2 (Playtika-Berichte), Rekordmonat Maerz 2026 34,1 Mio $ (AppMagic). Vom Start (2025) bis Platz 17 DE in gut einem Jahr.
Quellen: pocketgamer.biz (erstes Jahr 230,9 Mio $), mobilegamer.biz, appfigures.com.

## Warum
1. Kein Ueberlapp: Nyrathen ARPG, Chimora Sammler, Amy Merge-2, Shardcrown 4X, Rollhaven Wuerfel.
2. Starkes Wachstum, nur 3-4 grosse Konkurrenten (bei Match-3 sind es 10+ Riesen).
3. Aelteres, zahlungsstarkes Publikum (35+), Geld fast nur aus Kaeufen: "+5 Karten" nach knappem Verlust, Joker, Booster.
4. Einfach zu bauen: 2D-Karten, Level werden automatisch erzeugt, HTML5 wie Amy (WKWebView + StoreKit 2), freier Mac-Bauweg.
5. Kein Gluecksspiel-Label (kein Einsatz, keine Walzen).

## Spiel
- Level: 1-4 Kartenpyramiden, Ziehstapel, Ablage. Karte +1 oder -1 ablegen (K-A rundum). Serie = Bonusmuenzen.
- Spezialkarten (ab spaeteren Leveln): Schloss+Schluessel, Ranken (2 Treffer), Bienenstock-Joker, Frost.
- Sterne pro Level -> Dorfaufgaben (Bruecke, Muehle, Baeckerei, Gaerten ...), 6 Bezirke mit je 8 Aufgaben.
- Leben: 5 Herzen, 1 pro 20 Min.
- Booster vor dem Level: Joker-Karte, +3 Karten, Pyramide aufdecken.
- Nach Verlust: "+5 Karten" fuer Muenzen (steigend 300/600/900).
- Eigene Figuren: Wren (Fuchs-Baumeisterin) und Bramble (Dachs-Baecker).

## Shop (nur wenn Spieler ihn oeffnet)
Muenzpakete 0,99-99,99, Starterpaket 1,99, Unendlich-Leben 1h/3h, Dorfpass 6,99 pro Saison, Booster-Pakete.

## Plan (250 Punkte)
| Phase | Inhalt | Punkte |
|---|---|---|
| 1 Prototyp | TriPeaks-Kern, 40 erzeugte Level, Serie, Muenzen, Leben, +5 Karten, Joker, Dorf mit 8 Aufgaben, Speichern lokal | 30 |
| 2 Gefuehl | Animationen, Klaenge, Haptik, Tutorial, Figuren-Dialoge | 40 |
| 3 Inhalt | 500 Level, Spezialkarten, 6 Bezirke, Tagesbonus, Sammelalbum | 50 |
| 4 Shop | StoreKit 2 (von Amy), Preise, Wiederherstellen | 30 |
| 5 Store iOS | Icon, Screenshots, Texte EN/DE + Sprachen, Datenschutz, TestFlight, Review | 50 |
| 6 Events | Server-Turniere, Saisonpass, Rangliste | 50 |

## Technik
Repo puzzlegame, Ordner `mossbrook/`, Branch claude/project-thread-n4yo2b. Bundle-ID com.nyrathen.mossbrook.
