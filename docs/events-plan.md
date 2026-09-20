# Događaji i privatnost fotografija — prijedlog plana

Datum: 2026-09-19. Status: plan u razradi. Potvrđeno: promjene dopuštenja vrijede samo za buduće objave; trajanje događaja bira teta kao kod obavijesti; godišnji album i ponovno objavljivanje fotografija ostaju za kasnije. Ostali prijedlozi nisu time automatski potvrđeni.

Polazište su [izvorna specifikacija](product-spec.md), [postojeća arhitektura](architecture.md) i [format pristupa](access-format.md). Ovaj dokument opisuje novu želju proizvoda; ne mijenja postojeće implementacijske odluke bez dogovora.

## 1. Ishod

Teta jednom pripremi galeriju fotografija. Svaka obitelj vidi svoje dijete i djecu za koju je dopušteno dijeljenje unutar publike događaja. Ostala lica ostaju prekrivena. Poslužitelj pohranjuje samo šifrirani sadržaj i ne sastavlja personalizirane fotografije.

Događaj je zasebna vrsta objave: naslov, datum događaja, opis i poredana galerija. Datum događaja odvojen je od vremena objave. Na zajedničkoj ploči ima karticu; otvara se detalj s galerijom. Nije obavijest s običnim privicima.

Za prvu verziju predlaže se jedna skupina po događaju. Tako dopuštenje „obitelji naše skupine” ima jednoznačno značenje. Objave za više skupina dolaze nakon odluke vrijedi li dopuštenje i za roditelje druge skupine.

## 2. Tok za tetu

Detaljnija razrada interakcija i stanja nalazi se u [prijedlogu editora](events-editor.md).

Potvrđeno 2026-09-19: nakon dodjele djeteta automatski se odabire sljedeće neriješeno lice; teta uvijek može ručno birati redoslijed. Ručno dodavanje pokrova preko propuštenih lica obavezan je dio prve verzije. Prvi lokalni editor implementiran je 2026-09-20; objavljivanje i roditeljska dopuštenja ostaju sljedeće faze.

1. Odabere „Novi događaj”, skupinu, datum, naslov i opis.
2. Odabere više fotografija. Datoteke se prvo otvaraju lokalno; mrežni prijenos slijedi tek nakon obrade i enkripcije.
3. Aplikacija normalizira orijentaciju, pripremi radnu rezoluciju i lokalno potraži lica. Svako pronađeno lice dobije sticker s dovoljno velikim neprozirnim područjem.
4. Galerija pokazuje koje slike čekaju pregled. Teta otvara jednu po jednu, dodirne sticker i odabere dijete iz svoje skupine.
5. Može pomicati i povećavati sticker, dodati propušteno lice, poništiti pogrešan potez ili označiti da detekcija nije lice. Može privremeno sakriti stickere da prepozna djecu; to nikada ne mijenja pravila objave.
6. Svaki označeni dio mora biti pridružen djetetu ili izričito označen „Ostavi prekriveno”. Neidentificirano dijete, gost i odrasla osoba mogu ostati prekriveni bez dodavanja u katalog.
7. Potvrdi pregled cijele fotografije, uključujući lica koja detektor nije pronašao. Detekcija nije jamstvo da su sva lica označena.
8. Pregleda stvarni rezultat: osnovu sa svima prekrivenima, pogled obitelji bez vlastitog djeteta na slici i pogled odabrane obitelji. Pregled koristi isti renderer i iste pripremljene podatke kao roditeljski prikaz.
9. Objavi cijeli događaj. Prijenos pokazuje napredak; prekid omogućuje ponavljanje bez duplih objava. Roditelji ne vide djelomično pripremljen događaj.

Na mobitelu: velika fotografija, traka sličica, popis djece u donjem panelu, veliki dodirni ciljevi. Dodir odabire, povlačenje pomiče, ručke mijenjaju veličinu; zumiranje fotografije ne smije slučajno pomaknuti sticker. Uz svaki sticker postoji tekstualni status, ne samo boja.

Predloženi početni limit je 20 fotografija po događaju, uz konačan limit nakon mjerenja memorije i vremena na telefonima. Slike obrađivati redom, ne držati sve originale kao dekodirane bitmape.

## 3. Roditeljske postavke

Za svako vlastito dijete prikazati „Tko smije vidjeti lice mog djeteta?”:

- Samo naše obitelji povezane s djetetom.
- I druge obitelji naše skupine.

Zadano je samo vlastita obitelj. Nepostojeća, nečitljiva ili nedovoljno potvrđena postavka nikada ne proširuje vidljivost. Postavka vrijedi za dijete, ne za cijelu obitelj: braća i sestre mogu imati različite postavke.

Pristup u postojećoj aplikaciji pripada obitelji, ne pojedinom roditelju. Uređaji iste obitelji uređuju istu postavku uz provjeru revizije. Za dijete povezano s više odvojenih obitelji predlaže se restriktivno pravilo: šire dijeljenje vrijedi samo ako su sve povezane obitelji izričito dopustile; svaka i dalje vidi vlastito dijete. To pravilo treba potvrditi.

Roditelj mora moći sam spremiti promjenu bez čekanja da je teta odobri. Poslužitelj sprema šifriranu postavku i povećava reviziju. Teta je čita i primjenjuje pri pripremi objave. Ne treba niti smije dati roditelju Staff Key.

Postojeći roditeljski podaci nemaju vlastiti popis djece: imena i veze dijete–obitelj trenutačno su u zapisima šifriranima Staff Keyem. Zato ova faza uključuje projekciju vlastite djece šifriranu Family Keyem. Prijedlog je obiteljski zapis postavki s unutarnjim ID-ovima djece; poslužitelj dopušta uređivanje samo vlastitog obiteljskog zapisa, a klijent tete prihvaća stavke samo za djecu stvarno povezana s tom obitelji prema katalogu. Proizvoljno upisan ID drugog djeteta ne smije imati učinka. Revizija kataloga pokriva i promjene tih veza.

Neposredno prije objave ponovno dohvatiti postavke. Završna objava atomski provjerava reviziju postavki i kataloga koje je priprema koristila; promjena u međuvremenu vraća pripremu dopuštenja na ponavljanje. Vrijednosti ostaju šifrirane; provjera revizije ne zahtijeva da server zna izbor.

## 4. Sastavljanje fotografije i ključevi

Predlaže se baza u kojoj su sva označena lica nepovratno zamijenjena neprozirnim pokrovom. Sticker može biti zapečen u tu bazu. Nije dovoljno sakriti original HTML/SVG slojem, zamutiti ga CSS-om ili poslati sva lica pod zajedničkim ključem pa ih uvjetno prikazivati.

Za svaku fotografiju pripremiti:

- **Sigurnu bazu:** raster bez izvornih piksela unutar pokrivenih područja, dostupan publici događaja kroz enkripciju.
- **Isječke:** svaki s vlastitim slučajnim ključem; pripadaju samo točno određenom području. Nisu nužno zasebni R2 objekti; mogu biti zapakirani zajedno.
- **Zajednički paket dozvola:** šifrirane omotnice s ključevima isječaka i podacima za sastavljanje. Isti paket dohvaćaju svi; nema putanja koje otkrivaju kojoj obitelji pripada skriveno lice.
- **Podatke za osoblje:** oznake djece, geometriju i pristup ključevima isječaka, zaštićene Staff Keyem. Izvorna fotografija ne ide na poslužitelj.

Event Key otvara opis, manifest galerije i osnovne slike; omotan je za Group Key odabrane skupine. Smije otvarati i isječke djece kojima je dopušteno dijeljenje s cijelom publikom. Ključevi privatnih isječaka postoje samo u omotnicama za povezane Family Keyeve i za osoblje. Roditelj koji pročita sve mrežne odgovore ne dobiva ključ nedopuštenog lica.

Ako dijete pripada dvjema obiteljima, isječak se šifrira jednom, a njegov ključ omota za obje obitelji. Ne generiraju se pune slike za svaku kombinaciju roditelja. Trošak raste s brojem lica i njihovih primatelja, ne s brojem svih mogućih kombinacija.

Koristiti postojeće AES-GCM primitive, svjež nonce i autentificirani kontekst: namjena, događaj, fotografija, isječak i verzija pripreme. Različite namjene dobivaju različite oznake. Premještanje isječka ili omotnice u drugi događaj mora završiti pogreškom. Konačan format zahtijeva posebnu kratku specifikaciju i testove prije implementacije UI-ja.

Roditeljski renderer otvara bazu, otvara samo dostupne ključeve i nacrta dopuštene isječke. Nedostajući ili oštećen isječak ostavlja sticker. Preuzimanje koristi taj isti konačni raster. Minijature također moraju poštovati ista pravila; nijedan thumbnail ne smije nastati iz nezaštićenog originala za zajedničku isporuku.

### Geometrija je dio zaštite

Dekoracija stickera i zaštitna maska nisu ista stvar. Sticker sa šupljinama, prozirnim rubovima ili uskim oblikom mora imati neprozirnu podlogu preko cijelog zaštitnog područja. Prvo napraviti siguran raster, tek zatim smanjivati i komprimirati, da filtriranje ne prenosi izvorne piksele preko granice.

Isječak koji otkriva dijete A ne smije sadržavati piksele lica djeteta B, ni u rubu, ni u nevidljivim RGB kanalima prozirnih piksela. To vrijedi i kad roditelj sam dekodira isječak, bez našeg renderera. Preklapanja maski treba detektirati; u prvoj verziji sporna područja ostaju trajno prekrivena ili teta popravi maske. Nije dovoljno samo nacrtati drugi sticker preko već procurjelog isječka.

Pomicanje maske nakon objave može zahtijevati ponovno odabrati original: uklonjene piksele ne možemo izmisliti. Pogrešno označenu objavu prvo povući, a ispravljenu verziju pripremiti s novim ključevima i pregledom.

## 5. Promjena dopuštenja — potvrđena odluka

**Dogovoreno:** promjena postavke vrijedi samo za buduće objave. Primjenjuje se stanje provjereno pri završnoj objavi, uključujući nacrte započete prije promjene. Postojeći događaji čuvaju primijenjenu verziju pravila i ne mijenjaju vidljivost retroaktivno. Teta može odmah ukloniti fotografiju ili događaj. Tekst uz roditeljsku postavku to mora jasno reći.

Kasnija mogućnost: teta odabere postojeće fotografije i ponovno ih objavi prema tadašnjim dopuštenjima, uz novi pregled i novu kriptografsku pripremu. To je nova objava, ne tiha promjena stare. Ponašanje prema staroj objavi definirati pri razradi te mogućnosti; ranije preuzete kopije ne mogu se povući. Nije dio prve verzije.

Dok fotografija postoji, šifrirane oznake, geometrija i podaci za osoblje trebaju omogućiti ponovnu pripremu bez ponovnog označavanja gdje sačuvani pikseli to dopuštaju. Time se ne produljuje rok čuvanja niti pohranjuje original; promjena maske može zahtijevati ponovno odabrati original.

## 6. Detekcija i editor

Prvi kandidat za lokalnu detekciju je MediaPipe Face Detector. Vraća položaje lica; ne prepoznaje identitet djeteta. Identitet bira teta. Ne uvoditi embeddinge, bazu biometrijskih uzoraka ili vanjski servis za prepoznavanje.

Prema [službenim uputama](https://developers.google.com/edge/mediapipe/solutions/vision/face_detector/web_js), detekcija ima JavaScript API i sinkroni pozivi mogu blokirati UI, pa planirati Web Worker. Model i WASM posluživati s vlastitog origina, učitavati tek u editoru i fiksirati verzije. Prije konačnog izbora provjeriti licencu modela i runtimea, CSP, veličinu preuzimanja i rad na stvarnim iOS/Android PWA uređajima.

Za editor prvo ispitati sliku s SVG/HTML kontrolama i canvas izvozom: treba nam mali broj jasno određenih radnji. Fabric.js je alternativa ako vlastite kontrole postanu složene; već ima [odabir, pomicanje i skaliranje objekata](https://www.fabricjs.com/docs/core-concepts/). Stara specifikacija ga predlaže, ali postojeća aplikacija ga nema. Biblioteku odabrati nakon kratke provjere dodira, zuma, memorije i pristupačnosti.

Detektor ispitati na licima izdaleka, profilu, djelomično pokrivenim licima, grupnim fotografijama, različitom osvjetljenju i orijentaciji. Ne obećavati postotak uspješnosti bez mjerenja. Ako detektor zakaže ili ne pronađe ništa, ponuditi ručno označavanje i obavezan pregled, bez automatske objave.

Za početak napraviti nekoliko lokalnih SVG stickera; kasniji paket mijenja dekoraciju, ne format zaštite. Proizvoljan upload SVG-a nije dio prve verzije.

## 7. Uklapanje u postojeću aplikaciju

- Novi modul `events` uz notices i messages, sa zasebnim tipom objave i API rutama. Ne preopteretiti `photos.ts`, koji trenutačno služi fotografijama oglasne ploče.
- Ponovno koristiti postojeće otvaranje JPEG/PNG/HEIC fotografija i pretvorbu u raster, kriptografske primitive, ovlasti, ograničenja pohrane i galerijski pregled gdje odgovaraju.
- D1 čuva ID događaja, skupinu, autora, datume, stanje, reviziju, istek, veze na objekte i šifrirane manifeste. Imena djece, oznake lica i vrijednosti dopuštenja ostaju šifrirani.
- Sve R2 objekte uključiti u postojeći `named_objects`, brojanje pohrane i čišćenje. Autorizirati upload, dohvat, objavu i brisanje. Nikakvi javni URL-ovi za medije.
- Priprema i upload imaju staging stanje. Tek završna provjera svih objekata, verzija i prava objavljuje događaj. Ponovljena završna radnja ne smije slati duple push obavijesti.
- Brisanje i istek odmah zaustavljaju dohvat; fizičko čišćenje slijedi postojeći pouzdani mehanizam. Nema posluživanja fotografija iz javnog cachea. Postojeći service worker ništa ne cacheira.
- Push ne nosi opis, fotografiju ili identitet djece. Hrvatski i engleski tekstovi nastaju zajedno.
- Online rad i priprema u otvorenom editoru dovoljni su za prvi rez. Trajni nacrti s nastavkom nakon zatvaranja aplikacije zahtijevaju zaseban dizajn šifrirane lokalne pohrane; ne uvoditi ga prešutno.

Prije pilota zatvoriti već zabilježenu granicu iz `access-format.md`: teta trenutačno može zamjenom QR-a obitelji iz svoje skupine otvoriti i druge skupine te obitelji. Predlaže se zamjenu obiteljske kartice ograničiti na administratore. Širi model zajedničkog Staff Keya ostaje postojeći, dokumentirani kompromis koji treba ponovno provjeriti za dječje fotografije.

## 8. Godišnji album i čuvanje

**Dogovoreno:** teta bira trajanje događaja kao kod obavijesti: 1, 3, 7, 14, 30, 60 ili 90 dana, zadano 30. Istek uklanja pristup događaju i pokreće brisanje pripadajućih fotografija, isječaka i podataka za ponovnu pripremu kroz postojeći mehanizam čišćenja.

Godišnji album odgađa se. Kasnije se može dodati izričita opcija „Sačuvaj za godišnji album”, s odvojenim rokom čuvanja, jasnim datumom brisanja i provjerom kapaciteta. Ne čuvati skrivenu arhivu nakon obećanog brisanja. Fotografije obrisane prije uvođenja albuma neće biti dostupne za njega.

U model događaja već sada uključiti datum, redoslijed fotografija, opis i verziju formata, kako bi budući album mogao koristiti isti personalizirani renderer. Ti se podaci čuvaju samo tijekom životnog vijeka događaja. Izvoz albuma, izbor uspomena i dizajn stranica nisu dio prve verzije.

## 9. Redoslijed izvedbe i kriteriji završetka

1. **Dogovor pravila i provjera pristupa.** Potvrditi doseg publike, više povezanih obitelji i ovlasti zamjene QR-a. Učinak promjene dopuštenja i čuvanje potvrđeni su u §5 i §8. Zapisati kriptografski format i model prijetnji.
2. **Vertikalni dokaz jedne fotografije.** Ručno označiti dva ili tri lica, napraviti sigurnu bazu i šifrirane isječke, otvoriti je kao različite obitelji i izvesti finalnu sliku. Testirati nedopuštene ključeve, preklapanje maski i neispravne pakete. Bez produkcijske objave.
3. **Roditeljske postavke.** Projekcija vlastite djece, šifrirane postavke, restriktivna pravila, revizije i test da upis tuđeg ID-a ništa ne mijenja.
4. **Događaj od početka do kraja.** Galerija, ručne maske, označavanje, stvarni pregledi, staging upload, atomska objava, ploča, roditeljski prikaz i download, push, brisanje i istek.
5. **Detekcija i poliranje rada tete.** Lokalni detektor, automatski stickeri, ručna korekcija, navigacija među slikama i mjerenje na telefonima. Ovo pripada prvoj verziji proizvoda, premda dolazi nakon provjere temelja.
6. **Pilot.** Provjeriti vrijeme obrade stvarne galerije, pogrešna označavanja, prekid mreže, promjenu postavke tijekom objave, prijenos HEIC-a, memoriju, ovlasti i sve varijante pregleda. Ažurirati opis privatnosti i implementacijsku dokumentaciju.

Obavezni scenariji: samo vlastito dijete, dijete vidljivo skupini, brat/sestra s drukčijom postavkom, dijete s dvije obitelji, nepoznato lice, nula detektiranih lica, preklop maski, oštećen isječak, opozvana sesija, pristup druge skupine, istodobna promjena dopuštenja, djelomičan upload i brisanje tijekom pregledavanja. Za sigurnost isječaka testirati dekodirane piksele, ne samo izgled sučelja.

Prva verzija završena je kad teta pripremi događaj jednom, svaka obitelj dobije ispravan pogled i download, a neovlašteno lice nije moguće izvući iz podataka koje ta obitelj prima. Detektor smanjuje ručni rad; ljudski pregled ostaje dio objave.
