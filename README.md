# Azeroth Idle (demo 0.5)

Idle RPG w klimacie WoW Classic. Siedzi jako pasek nad paskiem zadań Windows i gra się sam: bohater chodzi po strefach, walczy, zbiera łup, robi zadania, awansuje i wędruje dalej trasą levelowania swojej frakcji. Gra liczy się też wtedy, gdy jest zamknięta.

Stack taki sam jak w Tallgrass: **Electron + Vite + React + TypeScript**, scena rysowana w `<canvas>` 2D.

## Uruchomienie

Wymagany Node.js 20+.

```bash
npm install
npm run dev        # wersja w przeglądarce: http://localhost:5173 (najszybsze testy)
npm run app        # build + aplikacja Electron (pasek nad taskbarem)
npm run app:dev    # Electron z hot-reloadem Vite
npm run dist       # przenośny .exe dla Windows -> folder release/ (albo dwuklik w zbuduj-exe.bat)
npm run balance    # symulacja 24 h gry (gracz zagląda do miasta co godzinę) dla wszystkich ras i klas
```

## Co jest w grze (0.2)

- **Tworzenie postaci w kolejności frakcja → rasa → klasa → imię.** Jest 8 ras i 9 klas z Classica z oryginalnymi ograniczeniami.
- **Mapy z podstrefami.** Każda mapa ma 5–6 podstref z Classica. Każda podstrefa kończy się minibossem, a ostatnią zamyka boss mapy, który blokuje przejście dalej (np. Hogger, Edwin VanCleef, Archmage Arugal). Najpierw zabijasz N mobów, żeby wywabić bossa, a boss atakuje dopiero od wymaganego poziomu (przycisk „Wyzwij” wymusza walkę). Postęp podstrefy i mapy widać na pasku oraz na mapie.
- **Swobodne podróże** między odblokowanymi podstrefami i mapami (mapa → „Idź”), a także wejście do miasta lub stolicy jednym przyciskiem.
- **Miasta.** W mieście mapy (Goldshire, Razor Hill...) bierzesz i oddajesz zadania (zabij, zbierz, boss) i masz trenera. W stolicy rasy jest trener i kupiec: sprzedaż przedmiotów i torby na sprzedaż (6–14 slotów).
- **Trener.** Umiejętności i ich kolejne rangi trzeba kupić u trenera. Bez treningu klasa słabnie.
- **Ekwipunek jak w Classicu:** 19 slotów (w tym szyja, płaszcz, pierścienie, błyskotki, druga ręka, broń dystansowa), plecak 16 slotów i 4 sloty na torby. Śmieci stackują się do 20. Kliknięcie zdejmuje lub zakłada przedmiot, a u kupca go sprzedaje. Gdy torby są pełne, łup przepada.
- **UI:** pasek akcji z ikonami i cooldownami, mikro-menu, sloty toreb, kilka okien naraz (postać i torby obok siebie), pergaminowy dziennik zadań i mapa świata z postępem.
- **Walka automatyczna** z rotacjami klas, pupilami i racials. Działa progres offline (do 8 h walki, potem Rested XP).

### Nowe w 0.3
- **Wybór umiejętności** w księdze (P): każdą umiejętność da się wyłączyć, np. szaman bez Lightning Bolt walczy czysto w zwarciu. Druid wybiera formę (Caster, Bear, Cat, Moonkin), warlock demona (Imp, Voidwalker, Succubus, Felhunter).
- **Drzewka talentów** (N): po 3 na klasę, z nazwami z Classica, 1 punkt na poziom od 10, progi co 5 punktów. Talenty-zwieńczenia dają umiejętności (Mortal Strike, Shadowform, Stormstrike...). Jest auto-rozdanie, a reset robisz u trenera.
- **Około 15–25 umiejętności na klasę** z Classica: AoE (Whirlwind, Blizzard, Consecration...), procki (trucizny, Windfury, Seal of Command, Lightning Shield), cooldowny (Evasion, Arcane Power, Bestial Wrath...).
- **Grupy mobów 1–3.** AoE trafia całą grupę.
- **Boss zawsze rusza do walki** po zabiciu N wrogów. Śmierć zeruje postęp podstrefy.
- **Statki i zeppeliny** jak w Classicu: Menethil–Auberdine, Menethil–Theramore, Rut'theran–Auberdine, Booty Bay–Ratchet, zeppeliny Orgrimmar–Undercity i Orgrimmar–Grom'gol.
- **Przedmioty:** porównanie z założonym w tooltipie (z różnicą statystyk), ręczna zmiana przez slot w oknie postaci, wyłączenie automatycznego zakładania, zdejmowanie i sprzedaż toreb.
- **Okna i pasek** można przeciągać (pasek za uchwyt ⠿, okna za tytuł). UI skaluje się bez pasków przewijania, a skalę i szerokość paska ustawisz w ustawieniach.

### Nowe w 0.4
- **Przeciąganie przedmiotów (drag & drop):** między torbami, do i z okna postaci, na pasek toreb (wkłada do danej torby), do kupca (sprzedaż). Torbę zdejmujesz, przeciągając ją z paska na wolne miejsce w innej torbie. Prawy przycisk zakłada przedmiot, zdejmuje go z okna postaci, zjada jedzenie z buffem, a u kupca sprzedaje.
- **Kupiec:** odkup 10 ostatnio sprzedanych przedmiotów, jedzenie i picie (nazwy z Classica), jedzenie z buffem (Well Fed, jeden naraz, 15 min). **Sortowanie toreb** przyciskiem w plecaku.
- **Odpoczynek wymaga jedzenia i picia** z toreb. Bez nich regeneracja jest dużo wolniejsza. Humanoidy czasem upuszczają jedzenie.
- **Zwarcie:** wróg najpierw podchodzi. Walczący wręcz biją dopiero w zwarciu (Charge i Feral Charge skracają dystans), a dystansowcy strzelają, zanim dojdzie.
- **Weapon Master** w stolicy uczy typów broni dozwolonych dla klasy (jak w Classicu, np. szaman: sztylety, pięściarze, topory i buławy 1H/2H, kije). Łupy to także broń innych typów (możesz jej nie umieć używać).
- **Umiejętności z WoW Forever + Classica** (zwykle 25–30 na klasę), m.in. Holy Strike, Seal of Fury, Summon Hawk, Lava Burst, Fire Nova (czar z cooldownem), Call of the Elements, Totemic Projection, Arcane Blast, Drain Hope, Mutilate, Venom, Penance, Prayer of Mending, Berserk. Przejrzane cooldowny (leczenia mają cooldown w idlerze, np. Healing Wave 10 s).
- **Grupy wyboru** w księdze (P): jedno nasycenie broni szamana, jedna pieczęć/aura/błogosławieństwo paladyna, aspekt łowcy, pancerz maga/warlocka, klątwa, tarcza żywiołu, po jednym totemie na żywioł.
- **Totemy widać na scenie.** Działają tylko przy postaci: po przejściu do kolejnego wroga zostają w tyle i znikają razem z buffem (chyba że Totemic Projection je przeniesie).
- **Pełniejsze drzewka talentów** (4 kolumny, 14–20 talentów na drzewko) według WoW Forever. Szamański Elemental jest odwzorowany 1:1 z bety, a w pozostałych drzewach nowe i zmienione talenty Forever (niebieska kropka) wstawiono w układ z 1.12. Przy aktualizacji punkty talentów wracają do rozdania.
- **Okno postaci:** tooltip przy każdym atrybucie (co daje, ile redukcji obrażeń daje pancerz na twoim poziomie i +3).
- **Zadania „zbierz”** to prawdziwe przedmioty w torbach. Po porzuceniu i ponownym wzięciu zadania zebrane już przedmioty się liczą.

### Nowe w 0.5
- **Szoki szamana do wyboru** (jeden naraz, jak wspólny cooldown w grze): Earth Shock (najmocniejszy cios), Flame Shock (obrażenia + podpalenie, wzmacnia Lava Burst), Frost Shock (spowalnia podchodzącego wroga). Fire Nova ma animację fali ognia z totemu.
- **Totemy:** na pasku akcji widać, ile jeszcze stoi totem; stawianie ma 1 s globalnego cooldownu jak w Classicu.
- **Podróże trwają** (np. 50 s–5 min, statek/zeppelin 60 s), przed każdą jest okno z trasą i czasem, a na scenie pasek postępu z odliczaniem. Szaman (Ghost Wolf) i druid (Travel Form) podróżują sami w formie podróżnej szybciej; Improved Ghost Wolf przyspiesza ją dalej.
- **Wolne podróże:** każda mapa jest dostępna od razu, także wyższego poziomu (ostrzeżenie w oknie podróży). Podstrefy w mapie otwierają się po kolei.
- **Walka:** wrogowie podchodzą wolniej (dystansowcy mają czas na czary), pasek auto-ataku, nazwa i poziom każdego moba nad paskiem życia, pasek rzucania nad postacią. Ciosy cofają pasek rzucania i skracają kanały, humanoidy potrafią przerwać czar. Talenty typu Eye of the Storm, Healing Focus, Burning Soul zmniejszają ten efekt.
- **Talenty przeanalizowane symulacją** (każdy talent osobno, 2×40 min walki): poprawione talenty bez efektu i słabe zwieńczenia (m.in. Mortal Strike, Bloodthirst, Shield Slam, Aimed Shot, Bestial Wrath, Pyroblast, Shadowform, Holy Shield, Mutilate). Klasy z leczeniem leczą się po walce, więc talenty leczenia skracają odpoczynek.
- **Usunięte:** automatyczne zakładanie łupu, skróty klawiszy na pasku akcji, oznaczenia „Forever” w talentach.
- **Torby** stoją przy prawej krawędzi; każdą przesuwasz osobno (pozycje się zapisują, dwuklik w tytuł przywraca).
- **Wybór monitora** w ustawieniach (i w menu ikony w zasobniku).
- **Tryb testowy:** zmiana prędkości gry tylko po wpisaniu hasła administratora w ustawieniach.

Wszystkie grafiki (ikony, ramki, sceneria) są rysowane w kodzie, w stylu Classica, bez plików Blizzarda.

## Struktura

```
src/data/      rasy, klasy+umiejętności, strefy+trasy, podstrefy+bossowie  <- zawartość gry
src/game/      czysta logika (bez DOM): sim.ts, world.ts, quests.ts, town.ts, inventory.ts, items.ts, save.ts
src/render/    scene.ts (scena + miasta), icons.ts (ikony przedmiotów i umiejętności)
src/ui/        React: tworzenie postaci, pasek, panele, mapa, dnd.tsx (przeciąganie), itemActions.ts
electron/      main.cjs (okno-nakładka, tray, autostart), preload.cjs
scripts/       balance.ts
```

Najważniejsza zasada: `src/game` nie wie nic o DOM-ie. Funkcja `advance(state, sekundy)` napędza grę na żywo, progres offline i test balansu.

## Uwaga o prawach

Nazwy ras, klas, stref i mobów należą do Blizzard Entertainment. Projekt jest prywatny i fanowski, tak jak Tallgrass. Grafika jest w całości proceduralna i nie używa żadnych assetów Blizzarda. Przed publicznym wydaniem wystarczy podmienić nazwy w `src/data/`.
