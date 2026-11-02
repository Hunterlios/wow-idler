# Azeroth Idle (demo 0.9.1)

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

### Nowe w 0.6
- **Podróż jest prawdziwa:** w trakcie drogi nie da się wybrać innego celu ani wejść do miasta. Mapa odkrywa się dopiero po dotarciu.
- **Inny kontynent tylko z portu:** na mapie są porty i trasy (⚓ statki, 🎈 zeppeliny). W porcie wsiadasz przyciskiem „Wsiądź”, a dalej idziesz pieszo. Automatyczne przejście po bossie samo idzie do portu.
- **Stolica:** wchodzisz pieszo, jeśli jesteś na jej mapie. Z innych map działa tylko Hearthstone (cooldown 30 min), który przenosi cię na mapę stolicy.
- **Mniejsze miasta mają kupca** (sprzedaż, jedzenie, torby, odkup). Trener i Weapon Master są tylko w stolicy.
- **Pasek buffów** przy ramce postaci: nasycenia broni, pieczęcie, aury, buffy z cooldownów, totemy, Well Fed. Na pasku akcji zostają tylko umiejętności rzucane.
- **Styl walki hybryd** (szaman, paladyn) w księdze (P): Mieszany (czary z dystansu, w zwarciu ciosy wręcz i tylko natychmiastowe czary), Wręcz (od razu biegnie do wroga), Czarami. Postać bez czarów z dystansu biegnie do wroga sama.
- **Torby:** przycisk „Złącz” przywraca wszystkie torby na miejsce.

### Nowe w 0.7
- **Leczenie działa:** klasy z czarami leczącymi (Holy Light, Healing Wave, Heal, Healing Touch...) po walce leczą się czarem (widać rzucanie), a jedzą dopiero, gdy brakuje many. W walce leczą się poniżej 50% zdrowia.
- **Tooltipy umiejętności** pokazują widełki obrażeń / leczenia, efekty buffów i czym się skalują (broń, siła ataku, moc czarów, ranga).
- **Dziennik zadań:** przycisk „Idź” prowadzi na miejsce zadania (z oknem podróży).
- **Trasy:** marsz idzie przez sąsiednie mapy (odkrywają się po drodze), dłuższe czasy dalekich podróży. Podpowiedź portu wybiera najszybszą drogę (np. z Mulgore do Tirisfal przez zeppelin w Durotar).
- **Wszystkie transporty z Classica:** statki Menethil–Auberdine, Menethil–Theramore, Rut'theran–Auberdine, Booty Bay–Ratchet; zeppeliny Orgrimmar–Undercity, Orgrimmar–Grom'gol, Undercity–Grom'gol; Deeprun Tram Stormwind–Ironforge.
- **Stolice frakcji:** do każdej stolicy swojej frakcji wejdziesz pieszo z jej mapy. Hearthstone przypiszesz w dowolnej z nich (nie w stolicy przeciwnej frakcji).
- **Okna nie uciekają z ekranu:** po przeciągnięciu, zmianie rozdzielczości albo monitora wracają na ekran.
- **Aplikacja:** gra jest widoczna na pasku zadań, a pasek przeciągnięty na inny monitor przenosi tam grę. Menu ikony w zasobniku ma „Przywróć pasek i okna na ekran”.

### Nowe w 0.8
- **Skalowanie jak w Classicu:** Strength i Agility dają siłę ataku według klasy, Intellect daje manę i krytyki czarów (nie moc). Czary skalują się rangą i mocą czarów z przedmiotów („of Sorcery”, „of Healing”, „of ... Wrath”) według współczynnika czaru.
- **Umiejętność broni:** każdy typ broni ma poziom (limit = poziom × 5), który rośnie od walki. Od różnicy z obroną wroga zależą pudła, uniki, parowania i ciosy ześlizgujące się. Nowa broń od Weapon Mastera zaczyna od 1. Specjalizacje rasowe dają +5.
- **Śmierć:** duch wraca do zwłok (postęp zostaje) albo wskrzesza się od razu u Ducha Uzdrowiciela (−25% wytrzymałości, postęp podstrefy od nowa). Podróż lub wejście do miasta jako duch też oznacza Ducha Uzdrowiciela. Boss, który cię pokonał, wraca po kilku minutach.
- **Wytrzymałość ekwipunku:** przedmiot z wytrzymałością 0 nie daje bonusów. Naprawa u kupca albo zestawem naprawczym (Light / Medium / Heavy / Thorium Repair Kit): postać sama naprawia nim zepsute przedmioty przy odpoczynku, tak jak je i pije.
- **Rasowe zdolności działają w walce** i są widoczne w pasku buffów oraz w księdze (Blood Fury, Berserking, Stoneform, War Stomp, Shadowmeld, Escape Artist, Perception, Will of the Forsaken). Pasywki bez mechaniki dostały odpowiedniki (np. Cultivation: szybsze podróże).
- **Walka:** komunikaty pudła / uniku / parowania, DoT-y i osłabienia widoczne na wrogu, Moonfire z obrażeniami od razu i bez odnawiania w trakcie, pasek ataku także u castera bijącego wręcz, druid wygląda jak niedźwiedź / kot / moonkin.
- Deeprun Tram tylko z Dun Morogh (Ironforge), nie z Coldridge Valley. Wybór ekranu tylko w ustawieniach gry.

### Nowe w 0.9
- **Gra po angielsku** (interfejs, opisy umiejętności, talentów, ras, zadania, komunikaty).
- **Hearthstone** trzeba najpierw przypisać w stolicy, do której postać dojdzie pieszo (nowa postać nie teleportuje się od razu).
- **Łowca:** wybór stylu walki (dystans z pupilem trzymającym wroga / wręcz). Bez pupila przy wrogu w zwarciu przechodzi na broń do walki wręcz. Postać trzyma w ręce broń, której naprawdę używa.
- **Pasek:** grubszy pasek rzucania i auto ataku z czasem („Auto Shot (ranged)” / „Auto Attack (melee)”), liczniki odnowienia na przyciskach umiejętności.
- **Debuffy na wrogu** (DoT-y, klątwy, ogłuszenie, spowolnienie) jako ikony z licznikiem pod paskiem zdrowia wroga.
- **Zestawy naprawcze** używane także między walkami, gdy założony przedmiot jest zepsuty.
- **Okno Skills (K):** umiejętności broni (w przyszłości profesje).
- Nowe, czytelniejsze ikony menu. Wszystkie torby tej samej szerokości, wyrównane do prawej.

### Nowe w 0.9.1
- **Grafiki gracza z folderu `assets/`** (nie trafiają do repozytorium ani paczki): ikony umiejętności, przedmiotów, menu, ras i klas (`assets/icons`) oraz mapy kontynentów (`assets/graphics`). Brakujące pliki zastępują rysowane ikony.
  - Aplikacja (exe) czyta `assets` obok `Azeroth Idle.exe` albo w folderze projektu.
  - Wersja przeglądarkowa: po dodaniu plików uruchom `node scripts/assets-manifest.mjs`.
- **Mapa świata na grafikach kontynentów** (zakładki Eastern Kingdoms / Kalimdor), mapy rozmieszczone według prawdziwych granic.

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
