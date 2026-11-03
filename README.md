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

### Nowe w 0.9.2
- Przycisk „Character Info” i okno postaci mają ikonę rasy.
- Ikony jedzenia, picia, zestawów naprawczych i śmieci dobrane ręcznie po nazwie (chleb to chleb, śmieci z humanoidów to szmaty, świeczki, zębatki, a nie monety).
- Ikona XP przy nagrodach w dzienniku zadań i na tablicy zadań.
- Najechanie na wroga pokazuje tooltip: poziom, typ, zdrowie, buffy (Elite / Boss) i debuffy z opisem i czasem.
- Ikony talentów jak w Classicu (gdy plik jest w assets/icons); „Improved X” bez własnej ikony bierze ikonę zdolności X. Lista brakujących plików: docs/brakujace-ikony.txt.
- Ramka ikon z assets/icons/default.png na pasku akcji, w torbach, slotach postaci, księdze i talentach.
- Kursor gry z assets/graphics/cursor.png (wycinana rękawica 32×32), aktywny, gdy okno gry ma fokus.
- Pasywki rasowe mają własne ikony. Taurenowe Cultivation (Herbalism) zastąpione pasywką Plainsrunning: +10% szybsze podróże.
- Ostatnie polskie opisy zdolności przetłumaczone.

### Nowe w 0.9.3
- Nowe pikselowe sprite'y bohatera (styl chibi wzorowany na grafice referencyjnej): 8 ras × 9 klas, generowane w kodzie (src/render/sprites.ts) z konturem i cieniowaniem.
- Animacje: idle 8, chód 8, atak 8, strzał z łuku/broni palnej 8, rzucanie czaru 8, trafienie 4, śmierć 8 klatek, odpoczynek 2.
- Cechy ras (rogi i pysk taurena, kły orków i trolli, irokez trolla, broda krasnoluda, gogle gnoma, uszy i świecące oczy nocnych elfów, szczęka nieumarłych) i stroje klas (płyta wojownika, złota zbroja paladyna, kołczan łowcy, kaptury łotrzyka i czarnoksiężnika, szaty kapłana i maga, poroże druida).
- Broń w ręce według ekwipunku, tarcza na drugiej ręce; przy śmierci broń wypada na ziemię.
- Formy druida (niedźwiedź, kot, moonkin, gepard w podróży) i duch wilka szamana jako pikselowe sprite'y z animacją.

### Nowe w 0.9.4
- Cała scena w jednym pikselowym stylu: moby, NPC, pupile, totemy, tła, miasta, statek i zeppelin używają tych samych części ciała, konturu i skali pikseli co bohater.
- Moby (src/render/mobsprites.ts): wygląd z typu i nazwy — m.in. Defias w chustach, gnolle, quilboary z kolcami, kobold ze świeczką, gobliny w kaskach, trolle, orkowie, satyry, centaury, furbolgi, worgeny, harpie, gargulce, naga, murloki, szkielety, ghule, ogry, golemy, abominacje; wilki, niedźwiedzie, koty (pręgi / cętki), dziki, krokoliski, bazyliszki, żółwie, raptory, pająki, skorpidy, sępy, nietoperze, sowy, plainstridery, pisklęta smoków, żywiołaki ognia, ziemi, powietrza, szlamy, lashery i drzewce.
- Animacje mobów: postój, podchodzenie, atak, trafienie, śmierć (dwunogi padają na plecy, zwierzęta przewracają się łapami do góry, żywiołaki się rozpadają). Grupy mobów stoją jeden za drugim.
- Tła (src/render/backdrop.ts): niebo w pasach z ditheringiem, gwiazdy nocą, pikselowe słońce / księżyc i chmury, trzy warstwy wzgórz z paralaksą, rekwizyty każdego z 13 biomów (drzewa, akacje, sosny, kaktusy, nagrobki, palmy, namorzyny, wulkaniczne iglice...), ziemia z teksturą i trawa na pierwszym planie.
- Miasta: domy Przymierza z niebieskimi dachami, namioty Hordy z kośćmi i sztandarami, krypty Undercity z zieloną poświatą; NPC (zleceniodawca / trener klasy, kupiec, strażnik) w tym samym stylu.
- Debuffy wroga wiszą nad tabliczką z imieniem, jak w grze.

### Nowe w 0.9.5
- Ikony: gra korzysta z pełnego zestawu ~13 tys. ikon z assets/icons — wszystkie zdolności, talenty, pasywki rasowe, przedmioty (jedzenie, picie, śmieci, zestawy), menu, plecak, ikony umiejętności broni, stany wroga (ogłuszenie, spowolnienie, obezwładnienie, elita, boss) i Well Fed mają ikony jak w Classicu. Losowe ikony ekwipunku wybierane są spośród klasycznych numerów (np. inv_sword_04), a nie z nowszych dodatków.
- Dźwięki (src/audio): system dźwięku z kanałami efekty / głosy / interfejs / muzyka / ambient i ustawieniami głośności w oknie Settings. Pliki czytane z assets/sound, mapa zdarzeń wygenerowana z listy plików (scripts/gen-soundmap.py → src/audio/soundmap.ts):
  - walka: zamach i trafienie zależne od broni bohatera i materiału celu (ciało, kolczuga, płyta, kamień, drewno), krytyki, pudła, parowania, bloki, łuk i strzelba, pazury bestii;
  - okrzyki i jęki bohatera jego rasy (atak, rana, krytyk, śmierć, okrzyk przy Blood Fury / Berserking), głosowe komunikaty błędów (pełne torby, brak pieniędzy);
  - ~250 zdolności z własnym dźwiękiem (Fireball, Frostbolt, Charge, Execute, Moonfire, Renew...), pozostałe czary dźwięk szkoły magii;
  - moby: agresja, atak, rana i śmierć dla 56 rodzajów stworów (wilki, kobold, murloki, gnolle, ogry, pająki, żywiołaki...);
  - interfejs: otwieranie i zamykanie okien, przyciski, podnoszenie i odkładanie przedmiotów wg materiału, łup, monety, zadania (przyjęcie, postęp, ukończenie), awans, odkrycie strefy, powitania NPC w mieście, Hearthstone, naprawa, trener, talenty, jedzenie i picie;
  - muzyka strefy wg biomu, muzyka stolic i karczm w miastach, muzyka ducha po śmierci; ambient strefy, morze w rejsie, wiatr w zeppelinie.
- Okna menu zawsze nad paskiem gry; kliknięte / przeciągane okno wychodzi na wierzch.
- scripts/assets-manifest.mjs tworzy też assets/lista-plikow.txt; scripts/assets-used.mjs kopiuje również używane dźwięki.
- Poprawka: okno postaci mogło zawiesić grę (pierwsza klatka podglądu z ujemnym czasem).

### Nowe w 0.9.6
- Suwaki głośności w Settings mieszczą się w oknie.
- Kursor gry: w exe działa zawsze nad elementami gry (nie tylko, gdy okno ma fokus) i odświeża się po powrocie myszy z pulpitu (wcześniej np. nad torbami zostawał kursor systemowy).

### Nowe w 0.9.7
- Buffy i debuffy na mobach są nad imieniem, a nie na nim.

### Nowe w 0.9.8
- **Kontrola tłumu działa i ją widać.** Każda umiejętność ma swój efekt:
  - ogłuszenie: wróg nie atakuje i nie podchodzi;
  - unieruchomienie (Entangling Roots, Frost Nova): wróg nie podchodzi, a postać dystansowa odskakuje ze zwarcia;
  - strach: wróg ucieka i nie atakuje;
  - spowolnienie (Concussive Shot, Wing Clip, Piercing Howl);
  - obezwładnienie jednego z grupy (Polymorph, Freezing Trap, Blind). Na pojedynczym wrogu działa krótko, jak ogłuszenie.
  - Na wrogu widać efekt w pikselach: gwiazdki, korzenie, lód, owcę, „Zzz”, czaszkę strachu, kurz oślepienia. W tooltipie jest nazwa umiejętności.
  - Ogłuszony wróg nie podchodzi. Wcześniej ogłuszenie z dystansu nie upływało.
- **Nowe efekty czarów i ataków** (`src/render/vfx.ts`):
  - kula ognia, lodowy grot, cień, pociski arkanów;
  - strzały, kule z broni palnej, bronie miotane;
  - błyskawice, promienie z nieba (Smite, Moonfire, Starfire);
  - czary obszarowe, cięcia bronią, iskry trafień, leczenie, buffy i iskry w dłoni przy rzucaniu.
  - Liczba obrażeń pojawia się w chwili trafienia pocisku.
- **Duch po śmierci:** po animacji śmierci zwłoki zostają, a półprzezroczysty duch biegnie z powrotem. Pod koniec drogi ciało pojawia się z prawej strony.
- **Różnica poziomów jak w Classicu:**
  - wyższy wróg częściej trafia krytycznie (×2);
  - od +3 poziomów zadaje miażdżące ciosy (×1,5);
  - rzadziej pudłuje, a postać rzadziej unika i paruje;
  - trafienie czarem: 96/95/94% na +0..+2, potem 83/72/61% na +3..+5;
  - obrażenia wroga rosną szybciej z różnicą poziomów.
  - Skutek dla druida na poziomie 15: na +5 pojedynczy wróg to bliska walka, a grupa praktycznie zawsze wygrywa. Od +6 farmienie jest niemożliwe. Test: `npx tsx scripts/overlevel.ts nightelf/druid 15`.
- **Łowca bez broni dystansowej walczy wręcz**, niezależnie od stylu w umiejętnościach, i nie używa strzał. Mag, kapłan i czarnoksiężnik z różdżką strzelają nią z dystansu (Shoot).
- **Topory** mają ostrze skierowane do przodu, w stronę wroga.
- **Kupiec:** większe odstępy między przyciskami, także w zakładkach i innych oknach. Sprzedaż prawym kliknięciem działa tylko przy otwartej zakładce Vendor, więc w mieście można spokojnie zmieniać ekwipunek. W stolicy okno otwiera się na zakładce trenera.
- Założenie przedmiotu z torby otwiera okno postaci.
- **Okna nie zmniejszają się**, gdy otwartych jest kilka. Zachowują rozmiar i w razie braku miejsca nachodzą na siebie. Na wierzchu jest ostatnio kliknięte albo otwarte.
- **Deeprun Tram ma własną scenę:** tunel z łukami i lampami, okna na głębię z rybami, bąbelkami i cieniem lewiatana, tory z podkładami, otwarte wagoniki z iskrami spod kół.
- Szerokość paska nie ma wpływu na walkę. Czas podchodzenia wroga liczy się w sekundach w symulacji, a szerokość paska zmienia tylko to, jak daleko na ekranie widać wroga.

### Nowe w 0.9.9
- **Pupile** (bestia łowcy, Voidwalker):
  - mają własne zdrowie;
  - płynnie biegną do wroga i zatrzymują go: wrogowie biją najpierw pupila, a po jego śmierci idą do postaci;
  - martwy pupil wraca po 60 s;
  - przy portrecie jest ikona pupila z paskiem zdrowia i odliczaniem;
  - po walce pupil się regeneruje, a postać odpoczywa, gdy pupil ma mało zdrowia.
- **Wrogowie dystansowi** (łucznicy, magowie, szamani, Defias Trapper…) zatrzymują się w oddali i strzelają lub rzucają czary. Postać walcząca wręcz sama do nich biegnie.
- **Postać walcząca wręcz wybiega naprzeciw wroga**, spotykają się w połowie drogi. Czas do zwarcia się nie zmienił.
- **Ustawienia leczenia** (Spellbook): próg zdrowia dla czarów leczących w walce, leczenie czarem albo jedzenie po walce i próg odpoczynku.
- **Concussive Shot** łowca rzuca na podchodzącego wroga, a umiejętności kontroli z własnymi warunkami nie czekają już na 50% zdrowia.
- **Zadania w stolicach:** list gończy za bossem i nagroda za moby na mapach w Twoim przedziale poziomu; oddajesz je w dowolnej stolicy frakcji.
- Przyciski **Complete all / Accept all** u tablicy zadań oraz **Train all / Reset talents** u trenera są na górze listy.
- **Zawracanie z podróży pieszej:** powrót tą samą drogą (trwa tyle, ile dotychczasowa droga) albo zostanie na mapie, przez którą akurat idziesz.
- **Grupy wrogów:** pierwszy pada ten z przodu, a reszta podchodzi. Przy zabiciu całej grupy jednym ciosem padają wszyscy.
- **Śmierć:** upadek, krótkie zaciemnienie, potem duch bez ciała na scenie. Okno z przyciskiem wskrzeszenia jest na środku paska.
- **Okno postaci** pokazuje prawdziwy ekwipunek (np. strzelbę zamiast łuku) i pupila w całości.
- **Okna menu** mają stałe miejsca i nachodzą na siebie. Otwarcie kolejnego nie przesuwa innych ani gry, a strona nigdy się nie przewija.
- **Pasek gry** jest zawsze przycinany do ekranu przy zmianie skali UI i szerokości paska.
- Naprawione znikanie gry po kliknięciu Alterac Mountains na mapie: brakowało podstref tej mapy. Błąd w jednym oknie nie wyłącza już całej gry.
- Wróciła ikona zębatki (ustawienia) i minus (schowaj do zasobnika).
- Opisy talentów i umiejętności zawsze zaczynają się wielką literą.
- Usunięte automatyczne rozdawanie talentów. Wróciło automatyczne zakładanie lepszego ekwipunku (ustawienie, domyślnie włączone).
- Tryb testowy: ręczne ustawianie poziomu postaci.

### Nowe w 0.9.10
- **Ekwipunek ma znaczenie:**
  - przedmioty dają ok. 1,8× więcej statystyk i mocy czarów (stare przedmioty w zapisie są przeskalowane);
  - walka bez broni to pięści;
  - czary i pupile słabną, gdy postać nie ma ekwipunku na swój poziom (`gearScore`);
  - wrogowie są mocniejsi (+15% zdrowia, +35% obrażeń), bo zakładają postać w ekwipunku.

  Postać bez ekwipunku ma teraz trudno, a w ekwipunku rozwija się prawie tak szybko jak wcześniej. Test: `npx tsx scripts/gearcheck.ts 4`.
- **Charge i Feral Charge** naprawdę doskakują do wroga (szybki doskok ze smugą), a ogłuszenie działa dopiero przy kontakcie.
- **Efekty umiejętności dystansowych przejrzane dla wszystkich klas:**
  - Judgement: młot światła spadający z nieba;
  - Hammer of Justice i Hammer of Wrath: rzucany młot;
  - novy wokół postaci (Frost Nova, Hellfire, Holy Nova, Arcane Explosion, Blast Wave);
  - kanały (Drain Life/Soul, Mind Flay, Siphon Life) i stożek Cone of Cold;
  - deszcz strzał Volley, Multi-Shot w każdego z grupy, kolorowe strzały (Arcane Shot, stingi);
  - okrzyki (Intimidating Shout, Psychic Scream), rój Insect Swarm, czaszka Fear / Death Coil;
  - pułapki, Polymorph, większe kule Pyroblast / Soul Fire / Lava Burst;
  - efekty DoT-ów i klątw przy rzuceniu.
- **Pupile:** Imp rzuca kule ognia, Succubus ma własny model (lawendowa skóra, rogi, skrzydła, ogon, kopyta, bicz) i smaga wroga, a Felhunter ma własny model demona-ogara.
- **Niszczenie przedmiotów:** przeciągnij przedmiot z torby lub z ekwipunku poza okna albo kliknij go Shift + prawym przyciskiem; potem potwierdź.

### Nowe w 0.9.11
- **Talenty:** tooltip pokazuje dokładny efekt, liczony z tego, co talent naprawdę robi: „każdy rang”, „teraz”, „następny rang” i wartość przy maksimum. Przykład: Redoubt daje +1% uniku na rang, czyli +5% przy 5/5.
  - Audyt wszystkich drzewek: każdy klucz efektu jest używany przez grę, a talenty z wieloma rangami skalują się z każdym punktem.
  - Poprawki: talenty obniżające koszt działają też na wściekłość i energię, a talenty wzmacniające buffy (np. Elemental Weapons dla Rockbiter) wzmacniają też sam buff.
- **Broń na postaci:** wygląd broni zależy od przedmiotu. Kolor metalu zależy od poziomu przedmiotu, poświata od jakości (zielona, niebieska, fioletowa), a druga broń w ręce pokazuje swój typ. Zmiana broni jest widoczna w oknie postaci i na pasku.
- **Pasek gry ma stałą szerokość, najwyżej 1200 px.** Ustawienie szerokości zostało usunięte, a pasek nadal można przesuwać.
- **Płynny ruch:**
  - po walce postać nie cofa się na lewo, tylko idzie dalej, a obraz ją doganiał;
  - kolejna walka zaczyna się tam, gdzie postać stoi, więc wróg nie „dobiega” do pustego miejsca;
  - wróg dystansowy najpierw wchodzi w pole widzenia, a postać walcząca wręcz biegnie do niego.
- **Tryb testowy:** dodawanie złota (+1 / +10 / +100 / +1000 g).

### Nowe w 0.9.12
- **Pupile i przywołańce w walce:**
  - pupil wręcz (Succubus, Felhunter, bestia łowcy) biegnie do wroga, a gdy wróg dalej idzie w stronę postaci, pupil płynnie się cofa twarzą do niego, w jego tempie (animacja cofania), zamiast być przepychanym;
  - pupil-tank cofa się tylko do chwili, aż zatrzyma wroga, i tam zostaje.
- **Animacje śmierci mobów przejrzane dla wszystkich 211 mobów** (arkusz z ostatnią klatką śmierci):
  - centaury (Magram, Gelkis, Galak, Kolkar), raptory i strusie (Plainstrider) już nie przewracają się na głowę i nie wiszą w powietrzu, tylko nogi się uginają i ciało osuwa się na ziemię;
  - humanoidy i duże dwunożne (ogry, yeti, golemy, Harvest Watcher) nie mają już ręki sterczącej do góry po upadku.

### Nowe w 0.9.13
- **Pupile:**
  - pupile DPS walczące wręcz (Succubus, Felhunter) wchodzą za grupę wrogów i gonią ją od tyłu;
  - pupile zawsze patrzą w stronę, w którą idą, a po powrocie do postaci znów patrzą przed siebie;
  - tank stoi przed wrogiem i patrzy na niego.
- **Charge / Feral Charge:** postać czeka ok. 1 s, aż wróg wejdzie w pole widzenia, i dopiero wtedy szarżuje.
- **Shadowmeld** działa też wtedy, gdy jeden cios zbiłby zdrowie z ponad 10% do zera (zostaje 1 HP).
- **Bez broni** postać walczy gołymi rękami i tak też wygląda, także caster. Rzucanie czarów bez broni jest możliwe jak w grze, ale słabsze przez karę za brak ekwipunku.
- **Paladyn** walczy wręcz: Judgement i inne natychmiastowe czary rzuca po drodze albo w zwarciu (styl „Caster” zostawia go z daleka).
- **Kontrola tłumu u postaci dystansowych:**
  - Frost Nova, Entangling Roots i strach są rzucane, gdy wróg dojdzie do zwarcia; potem postać płynnie odbiega (odwrócona, biegiem) i rzuca dalej;
  - Escape Artist (gnom) też daje płynne odbiegnięcie zamiast teleportu.
- **Zamrożenie i ogłuszenie przerywają wszystkie akcje wroga,** także strzały i czary wrogów dystansowych.
- **Wrogowie dystansowi** (np. Witherbark Axe Thrower), którzy stanęli i strzelają, mają animację postoju i ataku, a nie chodzenia.
- **Boss:** po porażce wraca zawsze po 5 minutach. Po trzech porażkach z rzędu postać czeka z nim do następnego poziomu (albo przycisk „⚔ Challenge now” na pasku).
- **Punkty kombinacji** są pokazywane przy pasku zdrowia celu i znikają po walce.
- **Okno postaci:**
  - postać stoi spokojnie (idle) i nie powtarza akcji z walki;
  - nowa linia Hit: szansa trafienia bronią i czarami, z opisem w tooltipie.
- **Odpoczynek:** postać trzyma w ręce jedzenie albo picie, a po wstaniu znowu broń.
- **Torby:** przycisk „Combine” łączy wszystkie torby w jedno duże okno, a „Split” je rozdziela.
- **Ikony:** złote koło zębate z gry jako ikona ustawień (`trade_engineering`), minus „schowaj do zasobnika” na środku.
- **Spellbook:** opisy mają do dwóch linii, a pełny opis jest w tooltipie (także dla umiejętności rasowych).

## Struktura

```
src/data/      rasy, klasy+umiejętności, strefy+trasy, podstrefy+bossowie  <- zawartość gry
src/game/      czysta logika (bez DOM): sim.ts, world.ts, quests.ts, town.ts, inventory.ts, items.ts, save.ts
src/render/    scene.ts (scena + miasta), icons.ts (ikony przedmiotów i umiejętności)
src/ui/        React: tworzenie postaci, pasek, panele, mapa, dnd.tsx (przeciąganie), itemActions.ts
electron/      main.cjs (okno-nakładka, tray, autostart), preload.cjs
scripts/       balance.ts, overlevel.ts (walka w strefach wyższych o kilka poziomów), gearcheck.ts (z ekwipunkiem i bez)
```

Najważniejsza zasada: `src/game` nie wie nic o DOM-ie. Funkcja `advance(state, sekundy)` napędza grę na żywo, progres offline i test balansu.

## Uwaga o prawach

Nazwy ras, klas, stref i mobów należą do Blizzard Entertainment. Projekt jest prywatny i fanowski, tak jak Tallgrass. Grafika jest w całości proceduralna i nie używa żadnych assetów Blizzarda. Przed publicznym wydaniem wystarczy podmienić nazwy w `src/data/`.

### Nowe w 0.9.14
- **Kontrola tłumu:**
  - po zamrożeniu / ogłuszeniu wroga i odskoku postaci wróg stoi w miejscu, a po zejściu efektu podchodzi do postaci, zamiast bić z miejsca, gdzie go zamrożono;
  - opisy umiejętności (Frost Nova, Entangling Roots, Fear, Polymorph, Hammer of Justice, Wing Clip...) mówią dokładnie, co się dzieje: czy wróg może się ruszać, atakować, rzucać czary, ile to trwa i co dzieje się potem.
- **Czary kanałowane** (Rain of Fire, Blizzard, Hurricane, Hellfire, Volley, Drain Life, Arcane Missiles, Mind Flay, Tranquility, Evocation) działają co sekundę, a nie dopiero po końcu kanału.
- **Rogue:**
  - zaczyna z bronią miotaną (Small Throwing Knife), jak w Classicu;
  - z bronią miotaną / łukiem / strzelbą otwiera walkę rzutem (Throw / Shoot), czeka, aż wróg podejdzie, i walczy wręcz (wojownik tak samo).
- **Wymagana broń:** bez broni nieaktywne są ciosy z dopiskiem „Requires Melee Weapon” w Classicu (Sinister Strike, Eviscerate, Heroic Strike, Raptor Strike...), Backstab i Ambush wymagają sztyletu, a nasycenia broni szamana wymagają broni. W księdze widać czerwony dopisek.
- **Nie da się wejść do miasta ani stolicy w trakcie walki.**
- **Znane ścieżki:** każda wyczyszczona podstrefa skraca marsz przez tę mapę (do −60% przy całej mapie), także po drodze do celu.
- **Muł kupiecki (Pack Mule, 50 g)** u nowego NPC **Stable** w stolicy:
  - w oknie postaci zakładka **Mounts & Pets**: wybór towarzysza i jakości przedmiotów do sprzedania;
  - gdy torby są pełne, muł zanosi przedmioty do kupca i po ok. 2 min wraca z pieniędzmi;
  - chodzi obok postaci (nie walczy), a gdy jest w drodze, go nie widać.
- **Księga: zakładka Rotation** — własna kolejność umiejętności (jak makro), z przyciskami ▲/▼ i powrotem do automatu.
- **Pasek akcji** mieści wszystkie umiejętności (z talentami) i nie wchodzi pod menu: przyciski zmniejszają się, a przy bardzo wielu idą w dwa rzędy.
- **Okno postaci:** przycisk **Equip best gear** zamiast opcji automatycznego zakładania; portret bez paska rzucania.
