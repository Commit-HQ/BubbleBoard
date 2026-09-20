import type { Messages } from './en';
import type { PushKind } from '../push';

/** What a notification says, by what happened (en.ts). */
export const notificationText: Record<PushKind, string> = {
	notice: 'Nova obavijest iz vrtića',
	message: 'Nova poruka',
	slots: 'Novi termini za razgovore',
	booking: 'Promjena termina razgovora'
};

export const hr = {
	languageName: 'Hrvatski',
	ogLocale: 'hr_HR',
	title: 'Malo bliže njihovom danu',
	description:
		'BubbleBoard je besplatna aplikacija otvorenog koda koja povezuje odgojitelje i obitelji u vrtiću. Obavijesti, fotografije dana i privatne poruke na jednom mjestu, uz privatnost ugrađenu od početka.',
	skip: 'Preskoči na sadržaj',
	home: 'BubbleBoard početna',
	language: 'Jezik',
	soon: 'Uskoro',
	nav: {
		label: 'Glavna',
		sections: {
			features: 'Mogućnosti',
			how: 'Kako radi',
			privacy: 'Privatnost',
			teachers: 'Za odgojitelje',
			security: 'Sigurnost',
			kindergartens: 'Za vrtiće'
		}
	},
	hero: {
		heading: 'Malo bliže',
		headingAccent: 'njihovom danu.',
		cta: 'Za vaš vrtić',
		open: 'Otvori aplikaciju',
		quiet: 'Za obitelji. Nadahnuto skupinom Bubbles.',
		photoAlt: 'Djeca se smiju i puhaju balone od sapunice u sunčanom parku',
		notifications: [
			{ time: 'Upravo sada', message: 'Nove fotografije dana' },
			{ time: '8:30', message: 'Nova obavijest iz vrtića' }
		]
	},
	features: {
		title: 'Sve iz vrtića, na jednom mirnom mjestu.',
		copy: 'Bez raštrkanih grupnih razgovora, papirića i propuštenih poruka. BubbleBoard sve važno drži na okupu.',
		notices: {
			title: 'Obavijesti iz skupine',
			copy: 'Podsjetnici i novosti iz skupine, sve na jednom mjestu.'
		},
		photos: {
			title: 'Fotografije dana',
			copy: 'Trenuci iz skupine, podijeljeni s pažnjom, koji se nakon zadanog vremena uklanjaju iz aplikacije.'
		},
		messages: {
			title: 'Izravno s odgojiteljima',
			copy: 'Privatni razgovori između vaše obitelji i odgojitelja vašeg djeteta.'
		},
		documents: {
			title: 'Zajednički dokumenti',
			copy: 'Tjedni planovi, jelovnici i obrasci, odmah uz sve ostalo.'
		},
		notifications: {
			title: 'Nenametljive obavijesti',
			copy: 'Kratka najava kad stigne nešto novo, bez detalja na zaključanom zaslonu.'
		},
		devices: {
			title: 'Na svim obiteljskim uređajima',
			copy: 'Jedan obiteljski QR kod radi na svim mobitelima, tabletima i računalima u kući.'
		}
	},
	how: {
		title: 'Jedan QR kod. Vaša skupina.',
		copy: 'Roditelji i odgojitelji pridružuju se na isti način. Vrtić dijeli QR kodove: jedan za sve uređaje vaše obitelji i po jedan za svakog odgojitelja. To je sve što trebate.',
		photoAlt: 'Djeca leže u krugu na tepihu u vrtiću i smiju se, a neka drže noge u zraku',
		steps: [
			{
				title: 'Skenirajte svoj QR kod',
				copy: 'Usmjerite kameru mobitela prema QR kodu koji ste dobili u vrtiću. Bez pamćenja korisničkog imena i lozinke.'
			},
			{
				title: 'Instalirajte aplikaciju',
				copy: 'BubbleBoard će vam pokazati kako ga dodati na početni zaslon, izravno iz preglednika i bez trgovine aplikacija.'
			},
			{ title: 'Uključite obavijesti', copy: 'Saznajte kada vas čeka nešto novo.' }
		]
	},
	privacy: {
		title: 'Lice vašeg djeteta. Odluka vaše obitelji.',
		copy: 'Roditelji odlučuju smiju li druge obitelji vidjeti njihovo dijete na fotografijama skupine. Svoje dijete uvijek vidite jasno.',
		photoAlt: 'Djeca slikaju vodenim bojama za stolom, pogled odozgo',
		facts: [
			'Bez korisničkih imena i lozinki',
			'Lica zamućena za druge obitelji, ako tako želite',
			'Fotografije se uklanjaju iz aplikacije nakon zadanog vremena'
		]
	},
	security: {
		title: 'Zaključano prije nego što napusti vaš mobitel.',
		copy: 'Fotografije, poruke i imena djece šifriraju se prije nego što napuste uređaj. Obavijesti i fotografije skupine mogu otvoriti samo obitelji vaše skupine i odgojitelji vašeg vrtića, a privatne razgovore samo vaša obitelj i odgojitelji vrtića.',
		device: {
			title: 'Šifrirano na vašem uređaju',
			copy: 'Sadržaj se šifrira na vašem mobitelu ili računalu prije slanja.'
		},
		server: {
			title: 'Nečitljivo i ako procuri',
			copy: 'Poslužitelj nema ključeve za čitanje sadržaja, pa curenje ne otkriva fotografije, imena ni poruke.'
		},
		host: {
			title: 'Ključevi ostaju u vašem vrtiću',
			copy: 'Nema ih nitko tko poslužuje BubbleBoard, uključujući nas. Kod je javan, pa svatko može vidjeti kako radi.'
		},
		note: 'Šifriranje štiti ono što je pohranjeno na poslužitelju. Ne može vratiti fotografiju koju je netko već spremio na svoj mobitel.'
	},
	teachers: {
		title: 'Stvoreno i za odgojitelje.',
		copy: 'Podijelite dan s mobitela ili računala u minuti, uz razumne zadane postavke.',
		preview: {
			title: 'Pregled prije objave',
			copy: 'Vidite točno ono što će vidjeti druge obitelji prije nego što objavite fotografiju.'
		},
		remove: {
			title: 'Brisanje odmah',
			copy: 'Uklonite objavu iz aplikacije istog trena ako nešto promakne.'
		},
		retention: {
			title: 'Vi birate koliko dugo',
			copy: 'Fotografije se uklanjaju iz aplikacije nakon vremena koje odaberete, od jednog dana do tri mjeseca.'
		},
		access: {
			title: 'Pristup pod vašom kontrolom',
			copy: 'Dajte zamjeni privremeni pristup ili zamijenite izgubljeni QR kod u nekoliko koraka.'
		}
	},
	kindergartens: {
		title: 'Želite BubbleBoard u svojem vrtiću?',
		copy: 'BubbleBoard nije usluga na koju se pretplaćujete. Svaki vrtić dobiva vlastitu instalaciju pa se sadržaj njegovih obitelji nikad ne miješa s tuđim. Recite nam nešto o svojem vrtiću i pomoći ćemo vam da započnete.',
		facts: [
			'Besplatno i otvorenog koda, bez oglasa i praćenja',
			'Roditelji ništa ne kupuju niti preuzimaju iz trgovine aplikacija',
			'Radi na mobitelima i računalima koje već imate'
		],
		hosting:
			'Softver je besplatan. Svaki vrtić sam pokriva troškove poslužitelja, koji su obično mali.',
		cta: 'Pišite nam',
		subject: 'BubbleBoard za naš vrtić',
		mission:
			'BubbleBoard izrađuje Commit, mala skupina programera koja stvara besplatne aplikacije otvorenog koda za svakodnevne probleme.',
		itTeam: 'Imate vlastiti IT tim?',
		code: 'Kod je na GitHubu.'
	},
	footer: {
		tagline: 'Mala zajednica. Puno pažnje.',
		explore: 'Istražite',
		project: 'Projekt',
		github: 'GitHub',
		madeBy: 'S ljubavlju izradio tim',
		license: 'Licenca (AGPL-3.0)',
		credits: 'Izvori i licence',
		privacy: 'Politika privatnosti'
	},
	privacyPolicy: {
		title: 'Politika privatnosti',
		description: 'Što BubbleBoard čuva o obiteljima i djeci, gdje i koliko dugo.',
		updated: 'Ažurirano 20. rujna 2026.',
		points: [
			{
				title: 'Fotografije događaja',
				copy: 'Lica se traže i označavaju na uređaju odgojitelja. Šalje se šifrirana prekrivena fotografija s odvojenim šifriranim isječcima, bez izvornika. Obitelji vide vlastitu djecu i lica za koja je dopušteno dijeljenje. Dopuštenja su šifrirana i promjene vrijede samo za buduće objave. Događaji i njihove fotografije dostupni su od 1 do 90 dana prema izboru odgojitelja, zatim se brišu. Nema skrivene arhive za godišnji album.'
			},
			{
				title: 'Što se čuva',
				copy: 'Imena, naslovi upita i poruke, obavijesti, stranice s informacijama, ankete, fotografije i datoteke šifriraju se na uređaju prije slanja. Poslužitelj ih ne može pročitati, a čuva samo ono što mu treba za rad, bez imena, na primjer kad je obavijest objavljena. Termini individualnih razgovora, rezervacije te poveznice između identifikatora djece i obitelji služe organizaciji termina; imena djece ostaju šifrirana.'
			},
			{
				title: 'Gdje',
				copy: 'BubbleBoard radi na Cloudflareu, američkoj tvrtki, pa se podaci mogu obrađivati i izvan EU-a, uz zaštitne mjere koje propisuje pravo EU-a.'
			},
			{
				title: 'Koliko dugo',
				copy: 'Obavijesti ostaju onoliko dana koliko odabere odgojitelj, od 1 do 90, fotografija oglasne ploče dok se ne zamijeni, stranice s informacijama dok ih administrator ne promijeni ili obriše, imena dok ih administrator ne ukloni, a prijava uređaja do 90 dana bez korištenja. Razgovori se čuvaju dok je obitelj član skupine. Ponude individualnih razgovora i rezervacije brišu se 90 dana nakon posljednjeg termina u ponudi. Obrisani zapisi ostaju u povijesti baze podataka do 30 dana.'
			},
			{
				title: 'Obavijesti na uređaju',
				copy: 'Ako ih uključite, usluga za obavijesti vašeg preglednika, na primjer Appleova ili Googleova, dobiva samo adresu vašeg uređaja, nikad sadržaj.'
			},
			{
				title: 'Kolačići',
				copy: 'Samo jedan, koji vaš uređaj drži prijavljenim. Bez njega BubbleBoard ne radi, pa ne traži pristanak. Nema oglasa, analitike ni praćenja.'
			},
			{
				title: 'Vaša prava',
				copy: 'Možete zatražiti kopiju svojih podataka i podataka svojeg djeteta te njihov ispravak ili brisanje. Pišite na adresu ispod ili pitajte odgojitelje svojeg djeteta. Pritužbu možete podnijeti i Agenciji za zaštitu osobnih podataka (AZOP).'
			}
		]
	},
	build: {
		label: 'Verzija',
		modified: 'izmijenjena',
		unknown: 'Nepoznata verzija'
	},
	error: {
		missingTitle: 'Ups! Ovaj je baloncić puknuo.',
		missingCopy:
			'Na ovoj adresi nema ničega. Možda je premještena ili je poveznica pogrešno upisana.',
		title: 'Ups! Nešto je puklo.',
		copy: 'Nešto nije u redu kod nas. Pokušajte ponovno za trenutak.',
		home: 'Na početnu stranicu',
		app: 'Otvori BubbleBoard'
	},
	app: {
		events: {
			before: 'Original · samo za osoblje',
			after: 'Odabrani prikaz',
			finalView: 'Konačna fotografija',
			compareView: 'Usporedi s originalom',
			title: 'Događaj',
			new: 'Novi događaj',
			name: 'Naslov događaja',
			date: 'Datum događaja',
			description: 'Opis',
			days: 'Neka ostane',
			publish: 'Objavi događaj',
			published: 'Događaj je objavljen.',
			preparing: 'Pripremam šifrirane fotografije',
			uploading: 'Šaljem fotografije',
			previewAs: 'Pregled kao',
			base: 'Svi pokrovi',
			consentTitle: 'Vidljivost lica mog djeteta',
			consentHint:
				'Odabir vrijedi za fotografije objavljene od sada. Vlastito dijete uvijek vidite. Ako dijete ima više obiteljskih QR kodova, skupini to mora dopustiti svaka povezana obitelj.',
			private: 'Samo naša obitelj',
			privateHint: 'Druge obitelji u skupini vide naljepnicu preko lica vašeg djeteta.',
			group: 'I druge obitelji naše skupine',
			groupHint: 'Obitelji iz skupine vide lice vašeg djeteta na događajima skupine.',
			consentSaved: 'Spremljeno.',
			noChildren: 'Popis djece još nije pripremljen. Odgojitelj treba otvoriti aplikaciju.',
			child: 'Dijete',
			download: 'Spremi fotografiju',
			remove: 'Ukloni događaj',
			removeHint: 'Događaj i njegove fotografije više neće biti dostupni obiteljima.',
			open: 'Otvori galeriju',
			back: 'Natrag na ploču',
			expired: 'Događaj nije dostupan ili je istekao.',
			stale:
				'Dopuštenja ili popis djece promijenili su se. Vrati se na uređivanje i ponovno pripremi pregled.',
			review: 'Pregled i objava',
			ready: 'Pregledaj pokrivenost svih lica i pogled odabrane obitelji prije objave.',
			failed: 'Fotografiju nije moguće otvoriti.',
			retry: 'Pokušaj ponovno',
			loading: 'Otvaram fotografiju…'
		},
		eventEditor: {
			steps: ['Događaj', 'Fotografije', 'Pregled'],
			local:
				'Nacrt ostaje na ovoj stranici. Zatvaranjem ili ponovnim učitavanjem aplikacije gubi se.',
			classroom: 'Skupina',
			classroomLocked: 'Ukloni fotografije da bi događaj pripremio za drugu skupinu.',
			continue: 'Nastavi',
			backToDetails: 'Natrag na događaj',
			tools: 'Alati za fotografiju',
			add: 'Dodaj fotografije',
			addMore: 'Dodaj još',
			limit: 'Odaberi do 20 fotografija, svaku do 50 MB.',
			none: 'Dodaj fotografije događaja. Otvaraju se samo na ovom uređaju; ništa se još ne šalje.',
			loading: 'Pripremam fotografije…',
			adding: (n: number, total: number) => `Pripremam fotografiju ${n} od ${total}…`,
			photos: 'Fotografije',
			caption: 'Nekoliko riječi o ovoj fotografiji',
			captionPlaceholder: 'Nije obavezno',
			captionHint: 'Svatko tko otvori događaj čita ih ispod fotografije.',
			progress: (done: number, total: number) => `Pregledano ${done} od ${total} fotografija`,
			detecting: 'Tražim lica…',
			failed: 'Detekcija lica nije dostupna. Dodaj pokrove ručno i pregledaj cijelu fotografiju.',
			retry: 'Ponovi detekciju',
			manual: 'Nastavi ručno',
			noFaces: 'Nisu pronađena lica. Pregledaj cijelu fotografiju i sam prekrij svako lice.',
			noCovers: 'Još ništa nije prekriveno. Dodaj pokrov preko svakog lica.',
			photo: (n: number, total: number) => `Fotografija ${n} od ${total}`,
			face: (n: number) => `Lice ${n}`,
			remaining: (n: number) =>
				n === 1
					? 'Još 1 lice treba označiti ili ostaviti prekrivenim.'
					: `Još ${n} lica treba označiti ili ostaviti prekrivenima.`,
			addCover: 'Dodaj pokrov',
			original: 'Prikaži original',
			covers: 'Vrati pokrove',
			who: 'Tko je na slici?',
			pick: 'Dodirni lice na fotografiji da bi rekao tko je to.',
			crop: 'Izrez originala — vidljiv samo tijekom uređivanja',
			search: 'Pronađi dijete',
			already: 'Već na slici',
			empty: 'Nema djece koja odgovaraju pretrazi.',
			covered: 'Ostavi prekriveno',
			removeCover: 'Ukloni pokrov',
			sticker: 'Naljepnica',
			stickerNames: { smile: 'Smješko', star: 'Zvijezda', heart: 'Srce' },
			undo: 'Poništi',
			redo: 'Vrati poništeno',
			zoom: 'Povećanje',
			assigned: (name: string) => `Označeno: ${name}`,
			coveredDone: 'Ovo lice ostaje prekriveno.',
			reviewed: 'Pregledano',
			review: 'Pregledano, sljedeća fotografija',
			nextPhoto: 'Sljedeća fotografija',
			reviewNeeded: 'Potreban pregled',
			checkHint:
				'Pregledaj cijelu fotografiju, uključujući lica koja detekcija možda nije pronašla.',
			gesture:
				'Dodirni pokrov da ga odabereš, zatim povuci njega ili njegov kut. Za detalje povećaj i povuci fotografiju.',
			overlap:
				'Neki se pokrovi preklapaju. Zajednički dio vidi samo obitelj koja smije vidjeti sva lica u tom dijelu. Provjeri rubove.',
			removePhoto: 'Ukloni fotografiju',
			removePhotoCopy: 'Ova fotografija i sve označeno na njoj nestaju iz nacrta.',
			preview: 'Pregledaj prekrivene fotografije',
			back: 'Natrag na fotografije',
			previewFailed: 'Pregled nije moguće pripremiti. Vrati se na fotografije i pokušaj ponovno.',
			compare: 'Prije / poslije',
			unusable: 'Fotografiju nije moguće otvoriti. Odaberi JPEG, PNG, WebP ili HEIC fotografiju.',
			leave: 'Napustiti stranicu i odbaciti nacrt događaja?',
			allReviewed: 'Sve su fotografije pregledane.',
			tooManyFaces:
				'Na fotografiji je previše pokrova. Odaberi drugu fotografiju ili ukloni pogrešne detekcije.',
			rosterChanged: 'Popis djece u skupini se promijenio. Ponovno provjeri oznake.'
		},

		meetings: {
			removeDay: 'Ukloni sve termine za ovaj dan',
			dayRemoved: 'Termini dana su uklonjeni.',
			removeDayCopy: (count: number, booked: number) =>
				`Uklonit će se svi vaši nadolazeći termini za ovu skupinu tog dana (${count}). Broj rezervacija koje će biti otkazane: ${booked}. Roditelji s rezervacijom dobit će obavijest ako su je uključili.`,

			title: 'Individualni razgovori',
			offer: 'Ponudi termine',
			open: 'Otvori razgovore',
			choose: 'Odaberi termin',
			emptyStaff: 'Još nemate ponuđenih termina.',
			emptyFamily: 'Trenutačno nema ponuđenih termina.',
			hint: 'Ponudite dan za razgovore s roditeljima.',
			date: 'Datum',
			start: 'Od',
			end: 'Do',
			duration: 'Trajanje razgovora',
			minutes: 'minuta',
			classroom: 'Skupina',
			preview: 'Ponuđeni termini',
			previewHint: 'Isključite termine koje želite ostaviti za pauzu.',
			publish: 'Objavi termine',
			publishing: 'Objavljivanje…',
			cancel: 'Odustani',
			free: 'Slobodno',
			booked: 'Zauzeto',
			mine: 'Vaš razgovor',
			reserve: 'Rezerviraj',
			reservation: 'Potvrdi rezervaciju',
			confirmCopy: 'Želite li rezervirati ovaj termin za svoje dijete?',
			cancelBooking: 'Otkaži razgovor',
			cancelCopy: 'Želite li otkazati razgovor? Termin će ponovno biti slobodan.',
			remove: 'Ukloni termin',
			removeCopy: 'Želite li ukloniti ovaj slobodan termin iz ponude?',
			past: 'Prošli razgovori',
			child: 'Dijete',
			loading: 'Učitavanje termina…',
			noChildren: 'U ovu skupinu još nisu dodana djeca.',
			invalidRange: 'Odaberite budući datum i raspon u koji stane barem jedan cijeli razgovor.',
			success: 'Termini su objavljeni.',
			reserved: 'Vaš razgovor je rezerviran.',
			cancelled: 'Razgovor je otkazan.',
			removed: 'Termin je uklonjen.',
			onePerChild:
				'Za svako dijete možete rezervirati po jedan termin. Za promjenu najprije otkažite postojeću rezervaciju.',
			already: 'Za ovo dijete već je rezerviran termin u ovoj ponudi.',
			noInvite: 'Za vaše dijete nema pozivnice u ovoj ponudi. Javite se odgojiteljici.',
			refresh: 'Osvježi',
			closed: 'Prošlo',
			summary: 'Pogledajte slobodne termine i svoje rezervacije.',
			staffSummary: 'Ponudite termine i pratite prijave roditelja.',
			freeCount: 'slobodno',
			bookedCount: 'rezervirano',
			remaining: 'Preostale minute na kraju raspona neće biti ponuđene.',
			cancelForm: 'Zatvori obrazac'
		},
		date: (day: string, month: string, year: number) => `${day}.${month}.${year}`,
		dateTime: (day: string, month: string, year: number, time: string) =>
			`${day}.${month}.${year} u ${time}`,
		loading: 'Otvaramo BubbleBoard…',
		noscript:
			'BubbleBoardu treba JavaScript da bi otvorio vašu skupinu. Uključite ga u postavkama preglednika ili otvorite BubbleBoard u drugom pregledniku.',
		unsupported: {
			title: 'Ovaj preglednik ne može otvoriti BubbleBoard',
			copy: 'BubbleBoard mora sigurno čuvati ključeve vaše skupine na ovom uređaju, a ovaj preglednik to ne dopušta. Ažurirajte preglednik ili otvorite BubbleBoard u novijoj verziji Safarija, Chromea, Firefoxa ili Edgea.'
		},
		offline: {
			title: 'BubbleBoard trenutno nije dostupan',
			copy: 'Provjerite internetsku vezu pa pokušajte ponovno.',
			retry: 'Pokušaj ponovno'
		},
		connectFirst: {
			title: 'Najprije povežite ovaj uređaj',
			copy: 'Otvorite početnu stranicu BubbleBoarda i skenirajte svoj QR kod.',
			action: 'Idi na BubbleBoard'
		},
		adminOnly: {
			title: 'Ovu stranicu mogu otvoriti samo administratori',
			copy: 'Ako vam ovdje nešto treba, obratite se administratoru u vrtiću.'
		},
		notFound: {
			title: 'Nije pronađeno',
			copy: 'Možda je premješteno ili uklonjeno. Vratite se i pokušajte ponovno.'
		},
		actions: {
			add: 'Dodaj',
			back: 'Natrag',
			cancel: 'Odustani',
			save: 'Spremi',
			saved: 'Spremljeno',
			done: 'Gotovo',
			rename: 'Preimenuj',
			remove: 'Ukloni',
			selectAll: 'Odaberi sve',
			working: 'Samo trenutak…'
		},
		counts: {
			children: (value: number) => count(value, 'dijete', 'djeteta', 'djece'),
			teachers: (value: number) => count(value, 'odgojitelj', 'odgojitelja', 'odgojitelja')
		},
		unreadable: {
			title: 'Neki se zapisi nisu otvorili',
			copy: 'BubbleBoard na ovom uređaju nije mogao otvoriti neke zapise vašeg vrtića. Pokušajte ponovno, a ako se to ponavlja, javite administratoru.'
		},
		staffOnly: {
			title: 'Ova je stranica za odgojitelje',
			copy: 'Obiteljski QR kod otvara početnu stranicu, gdje će se pojavljivati obavijesti i fotografije.'
		},
		connect: {
			title: 'Povežite ovaj uređaj',
			copy: 'Skenirajte QR kod koji ste dobili u vrtiću. Umjesto skeniranja možete upisati kod otisnut ispod njega ili odabrati njegovu fotografiju iz galerije.',
			scan: 'Skeniraj QR kod',
			enter: 'Upiši kod',
			camera: 'Usmjerite kameru prema QR kodu.',
			cameraStarting: 'Otvaramo kameru…',
			cameraBlocked:
				'BubbleBoard nema dopuštenje za kameru. Dopustite ga u postavkama preglednika ili odaberite fotografiju QR koda.',
			noCamera: 'Ovdje nema kamere koju BubbleBoard može koristiti. Odaberite fotografiju QR koda.',
			photo: 'Odaberi fotografiju',
			code: 'Kod',
			codeHint: '28 slova i brojeva otisnutih ispod QR koda.',
			submit: 'Poveži',
			scanning: 'Čitamo QR kod…',
			connecting: 'Povezujemo…',
			replaceTitle: 'Upotrijebiti drugi QR kod?',
			replaceStaff: (name: string) =>
				`Ovaj je uređaj povezan kao ${name}. Za ponovno povezivanje na taj način trebat će vam taj QR kod.`,
			replaceOther:
				'Ovaj je uređaj već povezan drugim QR kodom. Za ponovno povezivanje na taj način trebat će vam taj QR kod.',
			replaceConfirm: 'Upotrijebi novi QR kod',
			keep: 'Zadrži dosadašnji'
		},
		setup: {
			title: 'Postavite BubbleBoard',
			copy: 'Dobit ćete dva QR koda: svoj i QR kod za oporavak koji čuvate na sigurnom. Oba daju pristup svemu.',
			name: 'Vaše ime',
			nameHint: 'Vidjet će ga drugi odgojitelji, na primjer „Ana Horvat”.',
			token: 'Kod za postavljanje',
			tokenHint:
				'Nalazi se u poveznici za postavljanje. Pitajte osobu koja je instalirala BubbleBoard.',
			submit: 'Izradi QR kodove',
			creating: 'Izrađujemo vaše QR kodove…',
			connectedTitle: 'Ovaj je uređaj već povezan',
			connectedCopy: 'BubbleBoard je postavljen i spreman za korištenje.',
			open: 'Otvori BubbleBoard',
			connect: 'Poveži se svojim QR kodom'
		},
		card: {
			title: (value: number) =>
				value === 1 ? 'Ispišite ili spremite ovaj QR kod' : 'Ispišite ili spremite ove QR kodove',
			copy: 'Kod je vidljiv samo sada. Ako odete prije ispisa, napravite novi gumbom „Zamijeni QR kod”.',
			setupCopy:
				'Kodovi su vidljivi samo sada. Prije nastavka ispišite oba QR koda ili ih spremite kao PDF.',
			print: 'Ispiši',
			confirm: 'Oba su QR koda ispisana ili spremljena',
			continue: 'Nastavi',
			leaveFirst: 'Najprije ispišite ili spremite oba QR koda, a zatim označite kvadratić.',
			kinds: {
				admin: 'Administratorski QR kod',
				teacher: 'QR kod odgojitelja',
				recovery: 'QR kod za oporavak',
				family: 'Obiteljski QR kod'
			},
			scan: (address: string) =>
				`Usmjerite kameru mobitela prema QR kodu ili otvorite ${address} i upišite:`,
			about: 'Obavijesti i fotografije iz vrtića.',
			private: 'Ne dijelite ovaj QR kod. Ako ga izgubite, vrtić će vam dati novi.',
			recovery:
				'Rezervni QR kod za slučaj da se izgube svi administratorski QR kodovi: tada se samo njime mogu zamijeniti izgubljeni QR kodovi i dodavati djeca, odgojitelji i skupine. Tko ga ima, može sve što i administrator, zato ga čuvajte pod ključem u vrtiću, odvojeno od svakodnevnih QR kodova.',
			qr: (name: string) => `QR kod: ${name}`,
			replace: 'Zamijeni QR kod',
			replaceTitle: (name: string) => `Zamijeniti QR kod „${name}”?`,
			replaceCopy:
				'Stari QR kod prestaje raditi, a svi uređaji koji su ga koristili bit će odjavljeni.'
		},
		home: {
			title: 'Početna',
			greeting: (hour: number, name: string) => {
				const words =
					hour < 5
						? 'Dobra večer'
						: hour < 10
							? 'Dobro jutro'
							: hour < 18
								? 'Dobar dan'
								: 'Dobra večer';
				return `${words}, ${name}`;
			}
		},
		manage: {
			title: 'Administracija',
			admin: 'Evo vašeg vrtića.',
			teacher: 'Evo vaših skupina.',
			classrooms: 'Skupine',
			addClassroom: 'Dodaj skupinu',
			classroomName: 'Naziv skupine',
			teachers: 'Odgojitelji',
			teachersDetail: 'Imena, skupine i QR kodovi',
			emptyAdmin: 'Započnite dodavanjem prve skupine.',
			emptyTeacher: 'Još niste dodani ni u jednu skupinu. Može vas dodati administrator.'
		},
		classroom: {
			children: 'Djeca',
			addChild: 'Dodaj dijete',
			empty: 'U ovoj skupini još nema djece.',
			teachers: (names: string[]) => `Odgojitelji: ${list(names)}`,
			noTeachers: 'U ovoj skupini još nema odgojitelja.',
			delete: 'Obriši skupinu',
			deleteTitle: (name: string) => `Obrisati skupinu „${name}”?`,
			deleteCopy: 'To se ne može poništiti.',
			noCards: 'Još nema obiteljskog QR koda',
			replaceCards: 'Zamijeni QR kodove',
			replaceTitle: 'Zamjena obiteljskih QR kodova',
			replaceCopy: 'Odaberite QR kodove koje želite zamijeniti pa zajedno ispišite nove.',
			replaceSubmit: (value: number) =>
				`Zamijeni ${count(value, 'QR kod', 'QR koda', 'QR kodova')}`,
			replaceConfirm: (value: number) =>
				`Zamijeniti ${count(value, 'QR kod', 'QR koda', 'QR kodova')}?`,
			replaceConfirmCopy:
				'Stari QR kodovi prestaju raditi, a svi uređaji koji su ih koristili bit će odjavljeni.'
		},
		newChild: {
			title: 'Dodaj dijete',
			name: 'Ime djeteta',
			cards: 'Obiteljski QR kod',
			newCard: 'Novi obiteljski QR kod',
			newCardHint: 'Ispisat ćete ga za obitelj.',
			cardName: 'Tko dobiva QR kod?',
			cardNameHint:
				'Na primjer „Obitelj Horvat”. Roditelji koji ne žive zajedno kasnije mogu dobiti zasebne QR kodove.',
			sibling: 'QR kod brata ili sestre',
			siblingHint: 'Obitelj koristi QR kod koji već ima.',
			siblingName: 'Brat ili sestra',
			submit: 'Dodaj dijete',
			added: (name: string) => `Dodano: ${name}.`,
			toPrint: (value: number) => `Za ispis: ${count(value, 'QR kod', 'QR koda', 'QR kodova')}`,
			toPrintCopy:
				'Dodajte još djece pa ispišite sve nove obiteljske QR kodove zajedno. Vidljivi su samo na ovoj stranici.',
			print: (value: number) =>
				value === 1 ? 'Ispiši QR kod' : `Ispiši ${count(value, 'QR kod', 'QR koda', 'QR kodova')}`,
			leaveTitle: 'Otići bez ispisa?',
			leaveCopy:
				'Novi QR kodovi vidljivi su samo na ovoj stranici. Za kasniji ispis zamijenite ih u skupini.',
			leave: 'Otiđi',
			stay: 'Ostani'
		},
		child: {
			cards: 'Obiteljski QR kodovi',
			noCards: 'Još nema obiteljskog QR koda. Dodajte ga kako bi se obitelj mogla povezati.',
			also: (children: string[]) => `Vrijedi i za: ${list(children)}`,
			removeCardTitle: (name: string) => `Ukloniti QR kod „${name}”?`,
			removeCardShared: (children: string[]) => `QR kod i dalje vrijedi za: ${list(children)}.`,
			removeCardLast:
				'QR kod prestaje raditi, a svi uređaji koji su ga koristili bit će odjavljeni.',
			cardName: 'Ime uz QR kod',
			addFirstCard: 'Dodaj obiteljski QR kod',
			addCard: 'Dodaj još jedan obiteljski QR kod',
			addCardHint: 'Za roditelje koji ne žive zajedno: svaki QR kod ima svoje privatne poruke.',
			move: 'Premjesti u drugu skupinu',
			classroom: 'Skupina',
			moveSubmit: 'Premjesti',
			remove: 'Ukloni dijete',
			removeTitle: (name: string) => `Ukloniti dijete „${name}”?`,
			removeCopy: (cards: string[]) =>
				cards.length
					? `Obiteljski QR kodovi koji će prestati raditi: ${list(cards)}.`
					: 'To se ne može poništiti.'
		},
		teachers: {
			title: 'Odgojitelji',
			add: 'Dodaj odgojitelja',
			admin: 'Administrator',
			you: 'vi',
			noClassrooms: 'Bez skupine',
			recoveryTitle: 'Za hitne slučajeve',
			recoveryDetail: 'Otvara sve ako se izgube svi administratorski QR kodovi.'
		},
		teacher: {
			newTitle: 'Dodaj odgojitelja',
			name: 'Ime',
			classrooms: 'Skupine',
			noClassrooms: 'Još nema skupina.',
			admin: 'Administrator',
			adminHint: 'Može dodavati skupine, odgojitelje i djecu te otvoriti svaku skupinu.',
			selfAdmin: 'Ovo može promijeniti drugi administrator.',
			create: 'Izradi QR kod',
			remove: 'Ukloni odgojitelja',
			removeTitle: () => 'Ukloniti odgojitelja?',
			removeCopy: (name: string) =>
				`${name} više neće moći otvoriti BubbleBoard, a uređaji s tim QR kodom bit će odjavljeni.`,
			self: 'Ovo ste vi. Ukloniti vas može drugi administrator.',
			recovery:
				'Rezervni QR kod za slučaj da se izgube svi administratorski QR kodovi. Tada se samo njime mogu zamijeniti izgubljeni QR kodovi, a bez njega nitko ne bi mogao dodavati djecu, odgojitelje ni skupine. Budući da može sve što i administrator, čuvajte ga pod ključem u vrtiću, odvojeno od svakodnevnih QR kodova, i zamijenite ga ako ga je netko drugi možda vidio.'
		},
		options: {
			title: 'Opcije',
			staff: (name: string) => `Povezani ste kao ${name}`,
			family: 'Povezani ste obiteljskim QR kodom',
			lostCode: 'Izgubili ste QR kod? Vrtić vam može dati novi.',
			signOut: 'Odjavi ovaj uređaj',
			signOutTitle: 'Odjaviti ovaj uređaj?',
			signOutCopy: 'Za ponovno korištenje BubbleBoarda ovdje trebat će vam QR kod.'
		},
		addDevice: {
			title: 'Dodaj uređaj',
			copy: 'Povežite još jedan mobitel, tablet ili računalo, na primjer za baku i djeda, bez ispisanog QR koda.',
			show: 'Prikaži QR kod',
			scan: (until: string) =>
				`Skenirajte ga drugim uređajem ili ga pošaljite kao poveznicu. Povezuje jedan uređaj, do ${until}.`,
			qr: 'QR kod za drugi uređaj',
			share: 'Podijeli poveznicu',
			copyLink: 'Kopiraj poveznicu',
			copied: 'Poveznica je kopirana.',
			shareText: 'Priključite se BubbleBoardu našeg vrtića. Poveznica vrijedi 24 sata.',
			connectAgain:
				'Ovaj je uređaj povezan prije nego što je mogao dodavati druge. Da biste s njega dodavali uređaje, odjavite ga pa ga ponovno povežite obiteljskim QR kodom.'
		},
		about: 'O BubbleBoardu',
		info: {
			title: 'Info',
			empty:
				'Ovdje još nema ničega. Kad vrtić doda informacije za sve, na primjer radno vrijeme ili kontakte, pojavit će se ovdje.',
			emptyAdmin:
				'Ovdje još nema ničega. Dodajte stranicu za svaku temu koju svi u vrtiću trebaju znati, na primjer radno vrijeme, kontakte ili prehranu, po želji s datotekama.',
			add: 'Dodaj stranicu',
			newTitle: 'Nova stranica',
			editTitle: 'Uredi stranicu',
			edit: 'Uredi',
			delete: 'Obriši',
			deleteTitle: 'Obrisati ovu stranicu?',
			deleteCopy: 'Odmah nestaje, zajedno s datotekama.',
			moveUp: 'Pomakni gore',
			moveDown: 'Pomakni dolje',
			text: 'Tekst',
			hint: 'Ovu stranicu vide obitelji i odgojitelji svih skupina dok je ne promijenite ili obrišete. Spremanje ne šalje obavijest.',
			save: 'Spremi promjene',
			updated: (when: string) => `Ažurirano ${when}`,
			unreadable: 'Neke se stranice nisu otvorile na ovom uređaju.'
		},
		notices: {
			title: 'Obavijesti',
			new: 'Dodaj obavijest',
			empty: 'Još nema obavijesti. Kad vrtić objavi obavijest, pojavit će se ovdje.',
			emptyStaff: 'Još nema obavijesti.',
			emptyClassroom: 'Za ovu skupinu još nema obavijesti.',
			show: 'Prikaži obavijesti za',
			all: 'Sve skupine',
			unreadable: 'Neke se obavijesti nisu otvorile na ovom uređaju.',
			edited: 'uređeno',
			edit: 'Uredi',
			delete: 'Obriši',
			deleteTitle: 'Obrisati ovu obavijest?',
			deleteCopy: 'Odmah nestaje sa svih ploča.',
			markSeen: 'Označi kao pročitano',
			seen: 'Pročitano',
			seenBy: (seen: number, families: number) => `Pročitano: ${seen} od ${families} obitelji`,
			seenNames: (names: string[]) => `Pročitano: ${list(names)}`,
			notSeenNames: (names: string[]) => `Još nije pročitano: ${list(names)}`,
			newTitle: 'Nova obavijest',
			editTitle: 'Uredi obavijest',
			text: 'Obavijest',
			classrooms: 'Skupine',
			days: 'Neka ostane',
			dayCount: (value: number) => count(value, 'dan', 'dana', 'dana'),
			dayUnit: (value: number) => form(value, 'dan', 'dana', 'dana'),
			until: (date: string) => `Ostaje na ploči do ${date}.`,
			announce: 'Ponovno obavijesti sve',
			announceHint: 'Za promjenu koju svi trebaju vidjeti. Obavijest se vraća na vrh ploče.',
			post: 'Objavi obavijest',
			save: 'Spremi promjene',
			noClassrooms: 'Obavijesti možete objavljivati kad vas administrator doda u skupinu.'
		},
		polls: {
			add: 'Dodaj anketu',
			addHint:
				'Pitanje i opis ankete napišite u tekstu obavijesti, a ovdje dodajte odgovore. Tko je što odabrao vide samo odgojitelji.',
			answers: 'Odgovori',
			answer: (number: number) => `${number}. odgovor`,
			removeAnswer: (number: number) => `Ukloni ${number}. odgovor`,
			addAnswer: 'Dodaj odgovor',
			counts: 'Obitelji vide broj glasova',
			countsHint: 'Uz svaki odgovor vide koliko ga je obitelji odabralo, ali ne i koje.',
			countsChanging: 'Spremanjem se brišu dosadašnji odgovori, pa obitelji odgovaraju ponovno.',
			removing: 'Spremanjem se anketa uklanja s obavijesti, zajedno s odgovorima.',
			title: 'Anketa',
			countsShown: 'Obitelji vide koliko je glasova dobio svaki odgovor.',
			choose: 'Odaberite odgovor',
			confirm: 'Potvrdi odgovor',
			yours: (answer: string) => `Vaš odgovor: ${answer}`,
			change: 'Izmijeni odgovor',
			private: 'Vaš odgovor vide samo odgojitelji.',
			counted: 'Broj glasova vide sve obitelji, a tko je što odabrao samo odgojitelji.',
			votes: (value: number) => count(value, 'glas', 'glasa', 'glasova'),
			noAnswer: (names: string[]) => `Još bez odgovora: ${list(names)}`
		},
		photos: {
			new: 'Objavi ploču',
			title: 'Fotografije oglasne ploče',
			photo: 'Fotografija oglasne ploče',
			newCopy:
				'Fotografirajte oglasnu ploču skupine, bez djece na fotografiji. Obitelji je vide na početnoj stranici dok ne stavite novu.',
			classroom: 'Skupina',
			chooseClassroom: 'Najprije odaberite skupinu.',
			take: 'Fotografiraj',
			retake: 'Fotografiraj ponovno',
			choose: 'Odaberi fotografiju',
			preparing: 'Pripremamo fotografiju…',
			preview: 'Fotografija kakvu će vidjeti obitelji',
			putUp: 'Stavi na ploču',
			replaces: 'Zamijenit će fotografiju koja je sada na ploči.',
			open: (classroom: string) => `Otvori fotografiju oglasne ploče skupine ${classroom}`,
			loading: 'Otvaramo fotografiju…',
			replace: 'Stavi novu fotografiju',
			remove: 'Skini',
			removeTitle: 'Skinuti ovu fotografiju?',
			removeCopy: 'Odmah nestaje sa svih početnih stranica.'
		},
		notifications: {
			test: 'Obavijesti su uključene',
			cardTitle: 'Uključite obavijesti',
			cardCopy: 'Saznajte kad vrtić objavi nešto novo.',
			turnOn: 'Uključi',
			turnOff: 'Isključi',
			notNow: 'Ne sada',
			blocked:
				'Obavijesti za BubbleBoard su blokirane. Dopustite ih u postavkama uređaja, pa ih ovdje uključite.',
			title: 'Obavijesti',
			on: 'Uključene: ovaj uređaj javlja nove obavijesti.',
			off: 'Isključene na ovom uređaju.',
			unsupported: 'Ovaj preglednik ne može prikazivati obavijesti BubbleBoarda.'
		},
		install: {
			iosTitle: 'Dodajte BubbleBoard na početni zaslon',
			iosCopy:
				'Na iPhoneu i iPadu obavijesti iz vrtića stižu samo u BubbleBoard na početnom zaslonu.',
			iosShare: 'Dodirnite Dijeli. U Safariju je možda u izborniku ···.',
			iosAdd: 'Odaberite Dodaj na početni zaslon, zatim Dodaj.',
			iosOpen: 'Otvorite BubbleBoard s početnog zaslona.',
			androidTitle: 'Instalirajte BubbleBoard',
			androidCopy: 'Kao aplikacija na mobitelu, BubbleBoard vam može javiti kad stigne nešto novo.',
			androidMenu: 'Otvorite izbornik preglednika.',
			androidAdd: 'Odaberite Instaliraj aplikaciju ili Dodaj na početni zaslon.',
			androidOpen: 'Otvorite BubbleBoard s početnog zaslona.',
			install: 'Instaliraj',
			installed: 'BubbleBoard je instaliran. Otvorite ga s početnog zaslona.',
			inAppTitle: 'Otvorite BubbleBoard u pregledniku',
			inAppCopy:
				'Preglednik unutar ove aplikacije ne može instalirati BubbleBoard. Otvorite stranicu u Safariju ili Chromeu, obično iz izbornika ···, pa ponovno skenirajte QR kod.'
		},
		editor: {
			toolbar: 'Oblikovanje',
			loading: 'Otvaramo uređivač…',
			bold: 'Podebljano',
			bulletList: 'Popis s oznakama',
			orderedList: 'Numerirani popis',
			link: 'Poveznica',
			linkAddress: 'Web-adresa ili e-adresa',
			addLink: 'Dodaj poveznicu',
			removeLink: 'Ukloni poveznicu',
			invalidLink: 'Upišite web-adresu koja počinje s https:// ili e-adresu.',
			paper: 'Boja pozadine',
			papers: {
				white: 'Bijela',
				yellow: 'Žuta',
				peach: 'Narančasta',
				pink: 'Ružičasta',
				lilac: 'Ljubičasta',
				blue: 'Plava',
				green: 'Zelena'
			}
		},
		files: {
			title: 'Datoteke',
			attach: 'Priloži datoteke',
			hint: 'PDF-ovi, dokumenti i slike, najviše 10 MB po datoteci.',
			preparing: 'Pripremamo datoteke…',
			remove: (name: string) => `Ukloni ${name}`,
			save: (name: string) => `Spremi ${name}`,
			pictures: 'Slike',
			open: (name: string) => `Otvori ${name}`
		},
		viewer: {
			zoom: 'Povećaj',
			fit: 'Prilagodi zaslonu',
			close: 'Zatvori',
			save: 'Spremi',
			opening: 'Otvaram fotografiju…',
			previous: 'Prethodna fotografija',
			next: 'Sljedeća fotografija'
		},
		messaging: {
			title: 'Poruke',
			new: 'Novi upit',
			subject: 'Naslov',
			body: 'Poruka',
			write: 'Napišite poruku…',
			send: 'Pošalji',
			sendInquiry: 'Pošalji upit',
			family: 'Obitelj',
			classroom: 'Skupina',
			choose: 'Odaberite…',
			search: 'Pretraži naslove',
			all: 'Svi',
			open: 'Otvoreni',
			closed: 'Završeni',
			closedStatus: 'Završen',
			close: 'Završi upit',
			closeTitle: 'Završiti ovaj upit?',
			closeCopy: 'Razgovor ostaje dostupan za čitanje. Za novu temu otvorite novi upit.',
			closedCopy: 'Ovaj je upit završen i ostaje dostupan za čitanje.',
			remove: 'Obriši upit',
			removeTitle: 'Obrisati ovaj upit?',
			removeCopy: 'Razgovor se briše i kod obitelji. Ovo se ne može poništiti.',
			empty: 'Nema upita koji odgovaraju odabiru.',
			emptyTitle: 'Još nema poruka',
			emptyCopy: 'Ovdje se vode privatni razgovori s tetama vaše skupine.',
			emptyCopyStaff: 'Ovdje se vode privatni razgovori s obiteljima vaših skupina.',
			unread: 'Nepročitano',
			older: 'Ranije poruke',
			more: 'Više upita',
			refresh: 'Osvježi',
			loading: 'Učitavanje…',
			parent: 'Obitelj',
			teacher: 'Teta',
			children: (names: string[]) =>
				`${form(names.length, 'Dijete', 'Djeca', 'Djeca')}: ${list(names)}`,
			today: 'Danas',
			yesterday: 'Jučer',
			retention: 'Razgovori se čuvaju dok je obitelj član ove skupine.',
			settings: 'Poruke roditelja',
			settingsOn: 'Uključeno',
			settingsOff: 'Isključeno',
			edit: 'Uredi',
			done: 'Zatvori',
			noDays: 'Nijedan dan nije odabran.',
			quotaEach: (limit: number) =>
				`${count(limit, 'upit', 'upita', 'upita')} po obitelji mjesečno`,
			enabled: 'Omogući roditeljima slanje poruka',
			limit: 'Upiti po obitelji mjesečno',
			limitHint:
				'Novi upit i svaka poruka poslana prije nego što teta odgovori troše jedan upit. Odgovor na tetinu poruku uvijek je besplatan, a limit se obnavlja prvog dana u mjesecu.',
			fromTime: 'Od',
			toTime: 'Do',
			days: ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak'],
			daysShort: ['Pon', 'Uto', 'Sri', 'Čet', 'Pet'],
			save: 'Spremi postavke',
			saved: 'Postavke su spremljene.',
			schedule: 'Termini slanja',
			offDay: 'Zatvoreno',
			disabled: 'Slanje poruka roditelja isključeno je za ovu skupinu.',
			outside: 'Slanje je moguće u terminima skupine.',
			holiday: 'Na blagdane i druge neradne dane odgovor može kasniti.',
			closingSoon: (minutes: number) =>
				`Termin za slanje zatvara se za ${count(minutes, 'minutu', 'minute', 'minuta')}.`,
			charged: 'Ova poruka troši jedan upit.',
			free: 'Odgovor na tetinu poruku ne troši upit.',
			noQuota: 'Iskoristili ste upite za ovaj mjesec. Kad se teta javi, odgovor je opet besplatan.',
			quota: (remaining: number) =>
				`Preostalo ovaj mjesec: ${count(remaining, 'upit', 'upita', 'upita')}`,
			confirmTitle: 'Poslati ovu poruku?',
			confirmCopy: (left: number) =>
				`Teta još nije odgovorila na vašu zadnju poruku, pa ova troši jedan upit. Ovaj mjesec ostat će vam ${count(left, 'upit', 'upita', 'upita')}.`
		},
		errors: {
			'meeting-day-changed':
				'Termini dana su promijenjeni. Popis je osvježen; zatvorite potvrdu i ponovno provjerite termine.',
			'meeting-overlap':
				'Termini se preklapaju s postojećom ponudom ove skupine ili odgojitelja. Odaberite drugo vrijeme.',
			'meeting-changed':
				'Termin je promijenjen ili upravo rezerviran. Popis je osvježen; odaberite slobodan termin.',
			'meeting-already-booked': 'Za ovo dijete već postoji rezervacija u ovoj ponudi.',
			'unreadable-messages': 'Neki se upiti nisu mogli otvoriti na ovom uređaju.',
			'messages-disabled': 'Slanje poruka roditelja isključeno je za ovu skupinu.',
			'messages-hours': 'Slanje nije unutar termina skupine. Vaš je tekst sačuvan.',
			'messages-limit': 'Iskoristili ste upite za ovaj mjesec.',
			'messages-schedule': 'Vrijeme „Do” mora biti nakon vremena „Od”.',
			'messages-closed': 'Ovaj je upit završen. Osvježite popis za trenutačno stanje.',
			'not-found': 'Ovo više ne postoji.',
			forbidden: 'Nemate pristup ovome.',
			'empty-notice': 'Najprije napišite obavijest.',
			'notice-too-long': 'Obavijest je predugačka. Skratite je i pokušajte ponovno.',
			'event-too-long': 'Tekst je predugačak. Skratite ga i pokušajte ponovno.',
			'info-too-long': 'Stranica je predugačka. Skratite je i pokušajte ponovno.',
			'empty-page': 'Najprije napišite stranicu.',
			'too-many-pages': 'Stranica može biti najviše 20. Najprije obrišite onu koja više ne treba.',
			'no-classrooms': 'Odaberite barem jednu skupinu.',
			'poll-answers': 'Anketi dodajte barem dva odgovora.',
			'unusable-photo': 'Ta se fotografija ne može upotrijebiti. Pokušajte s drugom.',
			'file-type':
				'Takvu datoteku BubbleBoard ne može priložiti. Priložite PDF, dokument ili sliku.',
			'file-too-large': 'Ta je datoteka veća od 10 MB. Priložite manju.',
			'too-many-files': 'Možete priložiti najviše 10 datoteka.',
			'unreadable-file':
				'Datoteka se nije otvorila na ovom uređaju. Zamolite vrtić da je ponovno priloži.',
			'unreadable-photo':
				'Fotografija se nije otvorila na ovom uređaju. Zamolite vrtić da je ponovno stavi.',
			'storage-full':
				'Spremište BubbleBoarda je puno. Obrišite obavijesti s datotekama ili skinite fotografije koje više ne trebate, ili se obratite osobi koja je instalirala BubbleBoard.',
			'upload-limit':
				'BubbleBoard je dosegnuo ovomjesečno ograničenje za prijenose. Pokušajte ponovno sljedeći mjesec ili se obratite osobi koja je instalirala BubbleBoard.',
			'download-limit':
				'BubbleBoard je dosegnuo ovomjesečno ograničenje za otvaranje fotografija i datoteka. Ponovno će se otvarati sljedeći mjesec, a osoba koja je instalirala BubbleBoard može povećati ograničenje.',
			offline:
				'BubbleBoard trenutno nije dostupan. Provjerite internetsku vezu i pokušajte ponovno.',
			'signed-out': 'Ovaj je uređaj odjavljen. Za nastavak ponovno skenirajte QR kod.',
			'unreadable-records':
				'Neki zapisi vašeg vrtića nisu se otvorili na ovom uređaju. Pokušajte ponovno, a ako se to ponavlja, javite administratoru.',
			'unknown-card': 'Ovaj QR kod više ne radi. Zatražite novi u vrtiću.',
			'ended-card':
				'Ovaj je QR kod već iskorišten ili mu je prošao rok. Zatražite novi od osobe koja vam ga je dala.',
			'invalid-card': 'To nije BubbleBoard kod. Provjerite ga i pokušajte ponovno.',
			mistyped: 'Jedan od znakova ne odgovara. Provjerite kod i pokušajte ponovno.',
			'other-installation': 'Ovaj QR kod pripada drugom BubbleBoardu.',
			'no-code':
				'Na fotografiji nema čitljivog QR koda. Pokušajte ponovno tako da se vidi cijeli QR kod.',
			unreadable: 'Ovaj QR kod ne može otvoriti zapise BubbleBoarda. Zatražite novi u vrtiću.',
			'too-many-attempts': 'Previše pokušaja. Pričekajte minutu pa pokušajte ponovno.',
			'wrong-setup-token':
				'Kod za postavljanje nije ispravan. Zatražite novu poveznicu od osobe koja je instalirala BubbleBoard.',
			'already-set-up': 'BubbleBoard je ovdje već postavljen. Povežite se svojim QR kodom.',
			'setup-unavailable':
				'Postavljanje na ovoj instalaciji još nije spremno. Obratite se osobi koja je instalirala BubbleBoard.',
			'last-admin':
				'BubbleBoardu treba barem jedan administrator. Najprije nekoga drugog postavite za administratora.',
			'not-empty': 'Najprije premjestite ili uklonite djecu iz ove skupine.',
			'empty-name': 'Ime ne može ostati prazno. Upišite ga i pokušajte ponovno.',
			stale:
				'Netko je upravo promijenio iste podatke. Sada vidite najnovije, pa pokušajte ponovno.',
			'push-unavailable':
				'Ovaj preglednik nije mogao uključiti obavijesti jer mu se usluga za obavijesti nije javila. Pokušajte kasnije ili u drugom pregledniku.',
			'push-brave':
				'Brave treba jednu postavku da bi primao obavijesti s web-stranica. U adresnu traku upišite brave://settings/privacy, uključite „Use Google services for push messaging” (Googleove usluge za push poruke), ponovno pokrenite Brave pa pokušajte opet.',
			unexpected: 'Nešto nije u redu. Pokušajte ponovno.'
		}
	}
} satisfies Messages;

const pluralRules = new Intl.PluralRules('hr');

/** The Croatian form of a word for a number: dijete, djeteta, or djece. */
function form(value: number, one: string, few: string, other: string) {
	const forms: Partial<Record<Intl.LDMLPluralRule, string>> = { one, few };
	return forms[pluralRules.select(value)] ?? other;
}

/** A number with its Croatian form: 1 dijete, 2 djeteta, 5 djece. */
function count(value: number, one: string, few: string, other: string) {
	return `${value} ${form(value, one, few, other)}`;
}

/** Names in a sentence, such as „Bubamare i Leptirići”. */
function list(names: string[]) {
	return new Intl.ListFormat('hr', { type: 'conjunction' }).format(names);
}
