\# Project Specificatie: Zeilcursus Simulator



\## 1. Doel

Een educatieve browser-game om de basisprincipes van het zeilen te leren, specifiek gericht op koersen en schootvoering (stand van de zeilen). De speler moet ervaren wat er gebeurt bij goede en foute handelingen.



\## 2. Kernmechanieken

\* \*\*Scenario:\*\* De speler vaart rond een cirkelvormig eiland. De windrichting is vast (bovenin scherm, vanuit het Noorden). Hierdoor moet de speler verplicht alle koersen varen (Aan de wind, Halve wind, Ruime wind, Voor de wind).

\* \*\*Besturing (Toetsenbord):\*\*

&nbsp;   \* Sturen: Pijltjes Links/Rechts.

&nbsp;   \* Grootzeil: Pijltjes Omhoog (Aantrekken) / Omlaag (Vieren).

&nbsp;   \* Fok: W (Aantrekken) / S (Vieren).

\* \*\*Fysica \& Feedback:\*\*

&nbsp;   \* \*\*Snelheid:\*\* Afhankelijk van de juiste zeilstand t.o.v. de windhoek.

&nbsp;   \* \*\*Killen (Te los):\*\* Als het zeil te ver uit staat t.o.v. de wind -> Zeil wappert visueel, snelheid daalt.

&nbsp;   \* \*\*Hellen (Te strak):\*\* Als het zeil te strak staat t.o.v. de wind -> Boot kleurt rood of kantelt visueel, snelheid daalt, drift (verlijeren) neemt toe.

&nbsp;   \* \*\*Overstag/Gijpen:\*\* De fok springt niet automatisch over. De speler moet de fokkenschoot vieren naar 0% (los). De wind blaast hem dan naar de andere kant. Dan moet de speler hem weer aantrekken. Als de speler dit niet doet, staat de fok 'bak' en remt de boot af/draait hij weg.



\## 3. UI \& Informatie

\* \*\*HUD:\*\*

&nbsp;   \* Huidige Koersnaam (bijv. "Halve Wind", "In de wind").

&nbsp;   \* Windpijl (vast in beeld).

&nbsp;   \* Spanningsmeters voor Grootzeil en Fok (0-100%).

\* \*\*Visueel:\*\* Top-down view van een bootje, water, en een eiland in het midden.



\## 4. Tech Stack

\* HTML5 Canvas (geen zware game engines, puur JavaScript).

\* Geen server-side nodig, alles draait in de browser.

