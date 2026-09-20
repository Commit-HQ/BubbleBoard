# Editor fotografija događaja

Status: prvi lokalni editor implementiran, 2026-09-20. Nadovezuje se na [plan Događaja](events-plan.md). Automatski prelazak nakon dodjele, slobodan odabir redoslijeda i ručno dodavanje propuštenih lica potvrđeni su s korisnikom. Opis cjelovitog toka ispod ostaje cilj za iduće faze.

Implementirani rez: `/app/event/new` za osoblje, odabir skupine i do 20 fotografija, lokalna MediaPipe detekcija, ručno dodavanje, dodjela djeteta, pomicanje, promjena veličine, povećanje/pomicanje fotografije, prikaz originala i lokalnog izreza, undo/redo, obavezan pregled i stvarni spljošteni raster sa svim označenim licima prekrivenima. Nema mrežnog prijenosa fotografija. Roditeljska dopuštenja, personalizirani isječci i objavljivanje još nisu povezani. Nacrti ostaju u otvorenoj sesiji.

## Osnovni tok

Tri koraka: **Događaj → Fotografije → Pregled i objava**. Unutar fotografija radi se na jednoj slici. Nema posebnog čarobnjaka za svako lice: teta dodirne sticker, odabere dijete i nastavlja. Osnovni prikaz ostaje jednostavan, a pomicanje i veličina pojavljuju se za odabrani sticker.

Na prvom koraku teta upisuje naslov, opis, datum, publiku i trajanje kao kod obavijesti. Fotografije može dodavati i uklanjati do završne objave. Originali se otvaraju lokalno; „Dodaj fotografije” ne znači da su već poslani.

## Raspored editora

Na mobitelu fotografija zauzima glavninu ekrana, iznad nje je „Fotografija 2 od 8”, a ispod nje status i donji panel za odabrano lice. Panel ne smije prekriti aktivno lice: slika se prilagodi raspoloživom prostoru. Desktop ima istu fotografiju i panel desno. Ne uvoditi zaseban složen desktop alat.

Traka sličica omogućuje odlazak na bilo koju sliku bez gubitka rada. Svaka sličica nosi broj i tekstualni status; velika galerija ima i pregled mreže. Zamjena fotografije novom datotekom poništava njezine oznake i potvrdu pregleda.

Osnovne radnje: **Dodaj pokrov**, **Prikaži original**, **Poništi**, **Gotovo, sljedeća fotografija**. Vraćanje poništene radnje je uz Poništi. Uređivanje opisnih podataka ostaje izvan prostora fotografije.

## Odabir i označavanje lica

Detekcija postavi neprozirne stickere s brojevima. Početno je odabrano prvo neriješeno lice. Uz odabir se u panelu prikazuje mali izvorni izrez tog lica, lokalno, da ga teta prepozna bez stalnog skrivanja svih stickera. Originalni izrez služi samo uređivanju na uređaju tete.

Panel pita **„Tko je na slici?”** i nudi djecu skupine. Za dulji popis postoji pretraživanje po imenu. Djeca već označena na fotografiji imaju oznaku „Već na slici”, ali nisu zabranjena: dijete može biti vidljivo i u ogledalu. Ne predlažemo identitet na temelju lica niti ga automatski prenosimo sa susjedne fotografije.

Odabir imena odmah sprema vezu u nacrt i vodi na sljedeće neriješeno lice. Kratki status potvrđuje „Označeno: Ana”, a Poništi vraća i dodjelu i prethodni odabir. Nakon posljednjeg lica vraća se cijela fotografija na pregled, bez automatskog prelaska na sljedeću fotografiju.

Teta uvijek može dodirnuti bilo koji sticker i promijeniti ime. Uz ime prikazuje se informacija o vidljivosti: „Obitelji skupine” ili „Samo povezane obitelji”. To nije prekidač: dopuštenje roditelja ne mijenja se u editoru.

Alternativne odluke za detektirani okvir:

- **Ostavi prekriveno:** lice ostaje zaštićeno svima, bez vezivanja na dijete.
- **Ukloni pokrov** (ikona kantice): uklanja pogrešnu detekciju; dostupno kao sporedna radnja uz mogućnost poništavanja. Ne označavati je nejasnim „Obriši”.

Neriješena lica blokiraju završetak fotografije. Ne nuditi automatsku dodjelu djeteta ni automatsko odobravanje prema pouzdanosti detektora.

## Pomicanje, veličina i original

Prvi dodir bira sticker. Povlačenje već odabranog stickera pomiče ga; kutne ručke mijenjaju veličinu. Oblik ostaje isti, s minimalnom veličinom i jasnim okvirom pokrivenog područja. Automatski i ručni pokrovi mogu se smanjiti do 4 piksela po osi izvorne radne slike. Samo označavanje djeteta ne mijenja veličinu.

Fotografija zauzima punu širinu editora. Dodavanje pokrova, original, ikone poništi/vrati i zumiranje stoje iznad, a dodjela djeteta odmah ispod fotografije. Nema zasebnih klizača veličine ni gumba pomaka. Strelice tipkovnice pomiču pokrov; Alt + strelice mijenjaju veličinu. Zeleni obrub označava dodijeljeno dijete, crveni trajno prekrivanje, a bijeli neriješen pokrov. Rotaciju i slobodno crtanje maski ne uključivati u prvi rez.

Pomicanje fotografije radi se izvan odabranog stickera; dva prsta zumiraju sliku, nikad sticker. Kad se pokrene gesta s dva prsta, prekinuti aktivno pomicanje stickera. Promjena prikaza i zuma ne mijenja koordinate zaštite u slici.

**Prikaži original** privremeno skriva pokrove samo u prikazu tete. Gumb se mijenja u **Vrati pokrove**, bez dodatnog natpisa koji bi pomicao fotografiju. Povratak pokrova obavezan je pri promjeni fotografije, odlasku iz editora, gubitku fokusa aplikacije i otvaranju pregleda. Tipka mora raditi i dodirom i tipkovnicom; držanje gumba nije jedini način pristupa. Nikad ne mijenja pravila izvoza.

**Dodaj pokrov** postavi dovoljno velik početni sticker u središte trenutačnog pogleda i odmah ga odabere za pomicanje i dodjelu. Zumiranje na propušteno lice prije dodavanja olakšava rad. Gost ili odrasla osoba mogu ostati prekriveni.

Preklapanje pokrova prikazuje upozorenje na samim označenim područjima. Ako export ne može sigurno odvojiti isječke, fotografija nije spremna: teta korigira pokrove ili izričito prihvati trajno prekrivanje spornog područja. Editor ne obećava da će svako vlastito lice biti potpuno otkriveno pri preklopu.

## Pregled fotografije

Kad su sva detektirana i ručno dodana lica riješena, prikazuje se cijela slika uz **„Provjeri jesu li sva lica pokrivena”**. Prikaz označenih lica nije dokaz da detektor nije neko preskočio. Teta završava fotografiju radnjom **„Pregledano, sljedeća”**.

Ako detektor ne pronađe ništa, status glasi „Nisu pronađena lica — pregledaj fotografiju”. I dalje se mora ručno potvrditi pregled ili dodati pokrov. Ako detektor ne radi, nudi se ponavljanje i ručno označavanje; nema automatskog statusa „Spremno”.

Svaka promjena djeteta, položaja, veličine, dodavanje ili uklanjanje pokrova poništava potvrdu pregleda te fotografije. Ponovljena detekcija ne smije tiho zamijeniti ručni rad: njezine prijedloge treba zasebno prihvatiti.

## Završni pregled događaja

Pregled koristi stvarno pripremljeni raster i isječke, isti postupak kao roditeljski prikaz. Zadani pogled je **„Bez obiteljskih otkrivanja”**: vide se samo lica dopuštena svim obiteljima publike. Dodatno se može odabrati **„Kao obitelj…”** ili **„Sva lica prekrivena”** za provjeru baze. Odabrani pogled vrijedi kroz galeriju.

Objava ne zahtijeva ručno pregledavanje svake moguće obitelji. Zahtijeva potvrđene fotografije, valjana pravila i završni pregled galerije. Teta iz pregleda može izravno otvoriti sliku za popravak; ta slika ponovno traži potvrdu.

Završni gumb glasi **„Objavi događaj”**, uz publiku i datum isteka. Tijekom prijenosa prikazuje se stvaran napredak i jasno stanje; objava se pojavljuje tek kad je cijela spremna. Ako su se roditeljske postavke promijenile, zadržati ručne oznake, ponovno pripremiti dozvole i zatražiti novi pregled izmijenjenog rezultata. Ne vraćati tetu na početak.

## Stanja i oporavak

| Stanje fotografije | Što teta vidi                                             | Sljedeća radnja                          |
| ------------------ | --------------------------------------------------------- | ---------------------------------------- |
| Priprema           | „Pripremam fotografiju…”                                  | Obrada drugih spremnih slika             |
| Detekcija          | „Tražim lica…”                                            | Čekanje, otkazivanje ili ručni rad       |
| Potrebne oznake    | „Još 3 lica”                                              | Dodjela djeteta ili Ostavi prekriveno    |
| Potreban pregled   | „Provjeri cijelu fotografiju”                             | Ručna provjera                           |
| Pregledano         | „Pregledano”                                              | Sljedeća fotografija ili završni pregled |
| Problem            | Konkretna poruka, npr. „Fotografiju nije moguće otvoriti” | Ponovi, zamijeni ili ukloni sliku        |

Prebacivanje između fotografija i koraka čuva nacrt tijekom otvorene sesije. Prva verzija ne obećava nastavak nakon zatvaranja ili sistemskog gašenja aplikacije; to mora jasno pisati prije dulje obrade, a izlazak kroz aplikaciju upozorava na gubitak rada. To je rizik za pilot koji treba izmjeriti na telefonima. Ako prekidi često uzrokuju gubitak rada, trajni šifrirani nacrt postaje uvjet izlaska iz pilota.

Undo/redo povijest po fotografiji pokriva oznake i geometriju, ne roditeljska dopuštenja. Ručna obrada jedne fotografije ne smije čekati detekciju preostalih slika. Pozadinsku obradu ograničiti zbog memorije telefona.

## Opseg prvog editora i provjera s tetama

Uključiti detekciju, dodjelu imena, privatni izrez za identifikaciju, dodavanje/pomicanje/veličinu pokrova, prikaz originala, undo/redo, pregled galerije i prikaz kao obitelj. Za početak koristiti jedan zadani sticker; izbor ukrasa nije obavezan korak. Kasniji paket ne mijenja sigurnosnu masku.

Odgađamo filtere, slobodne tekstove po slici, rotaciju stickera, prepoznavanje identiteta, kopiranje položaja lica između slika i masovnu potvrdu nepregledanih slika.

U pilotu mjeriti vrijeme označavanja galerije, pogrešne dodjele, broj vraćanja na prethodno lice, slučajna pomicanja pri zumu, potrebu za originalom i gubitak nacrta. Prvo provjeriti pomaže li automatski prelazak na sljedeće lice ili stvara zabunu. Interaktivni prikaz u razgovoru demonstrira samo dodjelu i razliku publike, ne detekciju, sigurnosnu obradu ili gotov editor.
