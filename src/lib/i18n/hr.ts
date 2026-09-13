import type { Messages } from './en';

/** What every notification says (en.ts). */
export const notificationText = 'Nova obavijest iz vrtića';

export const hr = {
	languageName: 'Hrvatski',
	ogLocale: 'hr_HR',
	title: 'Malo bliže njihovom danu',
	description:
		'BubbleBoard je besplatna aplikacija otvorenog koda koja povezuje odgojitelje i obitelji u vrtiću. Obavijesti, fotografije dana i privatne poruke na jednom mjestu, uz privatnost ugrađenu od početka.',
	skip: 'Preskoči na sadržaj',
	home: 'BubbleBoard početna',
	language: 'Jezik',
	nav: {
		label: 'Glavna',
		sections: {
			features: 'Mogućnosti',
			how: 'Kako radi',
			privacy: 'Privatnost',
			security: 'Sigurnost',
			teachers: 'Za odgojitelje',
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
			copy: 'Jedna obiteljska kartica radi na svim mobitelima, tabletima i računalima u kući.'
		}
	},
	how: {
		title: 'Jedna kartica. Vaša skupina.',
		copy: 'Roditelji i odgojitelji pridružuju se na isti način. Vrtić dijeli QR kartice: jednu obiteljsku za sve uređaje vaše obitelji i odgojiteljsku za svakog odgojitelja. To je sve što trebate.',
		photoAlt: 'Odgojiteljica sjedi na podu i razgovara sa skupinom djece',
		steps: [
			{
				title: 'Dodajte ga na početni zaslon',
				copy: 'BubbleBoard se instalira iz preglednika, bez trgovine aplikacija.'
			},
			{ title: 'Uključite obavijesti', copy: 'Saznajte kada vas čeka nešto novo.' },
			{
				title: 'Skenirajte svoju karticu',
				copy: 'Otvorite aplikaciju i skenirajte karticu koju ste dobili u vrtiću. Bez pamćenja korisničkog imena i lozinke.'
			}
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
			copy: 'Poslužitelj pohranjuje sadržaj bez ključeva potrebnih za njegovo čitanje. Curenje pohranjenog sadržaja, bez ključeva s vaših uređaja, ne otkriva fotografije, imena ni poruke.'
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
			copy: 'Dajte zamjeni privremeni pristup ili zamijenite izgubljenu karticu u nekoliko koraka.'
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
		credits: 'Izvori i licence'
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
			copy: 'Otvorite početnu stranicu BubbleBoarda i upotrijebite svoju karticu.',
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
			copy: 'Obiteljska kartica otvara početnu stranicu, gdje će se pojavljivati obavijesti i fotografije.'
		},
		connect: {
			title: 'Povežite ovaj uređaj',
			copy: 'Upotrijebite QR karticu koju ste dobili u vrtiću. Možete i usmjeriti kameru mobitela prema kartici.',
			scan: 'Skeniraj karticu',
			enter: 'Upiši kod',
			camera: 'Usmjerite kameru prema QR kodu na kartici.',
			cameraStarting: 'Otvaramo kameru…',
			cameraBlocked:
				'BubbleBoard nema dopuštenje za kameru. Dopustite ga u postavkama preglednika ili odaberite fotografiju kartice.',
			noCamera: 'Ovdje nema kamere koju BubbleBoard može koristiti. Odaberite fotografiju kartice.',
			photo: 'Odaberi fotografiju',
			code: 'Kod kartice',
			codeHint: '28 slova i brojeva otisnutih na kartici.',
			submit: 'Poveži',
			scanning: 'Čitamo karticu…',
			connecting: 'Povezujemo…',
			replaceTitle: 'Upotrijebiti drugu karticu?',
			replaceStaff: (name: string) =>
				`Ovaj je uređaj povezan kao ${name}. Za ponovno povezivanje na taj način trebat će vam ta kartica.`,
			replaceOther:
				'Ovaj je uređaj već povezan drugom karticom. Za ponovno povezivanje na taj način trebat će vam ta kartica.',
			replaceConfirm: 'Upotrijebi novu karticu',
			keep: 'Zadrži dosadašnju'
		},
		setup: {
			title: 'Postavite BubbleBoard',
			copy: 'Dobit ćete dvije kartice: svoju i karticu za oporavak koju čuvate na sigurnom. Obje daju pristup svemu.',
			name: 'Vaše ime',
			nameHint: 'Vidjet će ga drugi odgojitelji, na primjer „Ana Horvat”.',
			token: 'Kod za postavljanje',
			tokenHint:
				'Nalazi se u poveznici za postavljanje. Pitajte osobu koja je instalirala BubbleBoard.',
			submit: 'Izradi kartice',
			creating: 'Izrađujemo vaše kartice…',
			connectedTitle: 'Ovaj je uređaj već povezan',
			connectedCopy: 'BubbleBoard je postavljen i spreman za korištenje.',
			open: 'Otvori BubbleBoard',
			connect: 'Poveži se svojom karticom'
		},
		card: {
			title: (value: number) =>
				value === 1 ? 'Ispišite ili spremite ovu karticu' : 'Ispišite ili spremite ove kartice',
			copy: 'Kod je vidljiv samo sada. Ako odete prije ispisa, napravite novu karticu gumbom „Zamijeni karticu”.',
			setupCopy:
				'Kodovi su vidljivi samo sada. Prije nastavka ispišite obje kartice ili ih spremite kao PDF.',
			print: 'Ispiši',
			confirm: 'Obje su kartice ispisane ili spremljene',
			continue: 'Nastavi',
			leaveFirst: 'Najprije ispišite ili spremite obje kartice, a zatim označite kvadratić.',
			kinds: {
				admin: 'Administratorska kartica',
				teacher: 'Kartica odgojitelja',
				recovery: 'Kartica za oporavak',
				family: 'Obiteljska kartica'
			},
			scan: (address: string) =>
				`Usmjerite kameru mobitela prema QR kodu ili otvorite ${address} i upišite:`,
			about: 'Obavijesti i fotografije iz vrtića.',
			private: 'Ne dijelite ovu karticu. Ako je izgubite, vrtić će vam dati novu.',
			recovery:
				'Upotrijebite je samo ako se izgube sve administratorske kartice. Čuvajte je pod ključem, odvojeno od svoje kartice.',
			qr: (name: string) => `QR kod: ${name}`,
			replace: 'Zamijeni karticu',
			replaceTitle: (name: string) => `Zamijeniti karticu „${name}”?`,
			replaceCopy:
				'Stara kartica prestaje raditi, a svi uređaji koji su je koristili bit će odjavljeni.'
		},
		home: {
			title: 'Početna'
		},
		manage: {
			title: 'Administracija',
			admin: 'Evo vašeg vrtića.',
			teacher: 'Evo vaših skupina.',
			classrooms: 'Skupine',
			addClassroom: 'Dodaj skupinu',
			classroomName: 'Naziv skupine',
			teachers: 'Odgojitelji',
			teachersDetail: 'Imena, skupine i kartice',
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
			noCards: 'Još nema obiteljske kartice',
			replaceCards: 'Zamijeni kartice',
			replaceTitle: 'Zamjena obiteljskih kartica',
			replaceCopy: 'Odaberite kartice koje želite zamijeniti pa zajedno ispišite nove.',
			replaceSubmit: (value: number) => `Zamijeni ${count(value, 'karticu', 'kartice', 'kartica')}`,
			replaceConfirm: (value: number) =>
				`Zamijeniti ${count(value, 'karticu', 'kartice', 'kartica')}?`,
			replaceConfirmCopy:
				'Stare kartice prestaju raditi, a svi uređaji koji su ih koristili bit će odjavljeni.'
		},
		newChild: {
			title: 'Dodaj dijete',
			name: 'Ime djeteta',
			classroom: 'Skupina',
			cards: 'Obiteljska kartica',
			newCard: 'Nova obiteljska kartica',
			newCardHint: 'Ispisat ćete je za obitelj.',
			cardName: 'Tko dobiva karticu?',
			cardNameHint:
				'Na primjer „Ivana (mama)”. Roditelji koji ne žive zajedno kasnije mogu dobiti zasebne kartice.',
			sibling: 'Kartica brata ili sestre',
			siblingHint: 'Obitelj koristi karticu koju već ima.',
			siblingName: 'Brat ili sestra',
			submit: 'Dodaj dijete',
			added: (name: string) => `Dodano: ${name}.`,
			toPrint: (value: number) => `Za ispis: ${count(value, 'kartica', 'kartice', 'kartica')}`,
			toPrintCopy:
				'Dodajte još djece pa ispišite sve nove obiteljske kartice zajedno. Njihovi su kodovi vidljivi samo na ovoj stranici.',
			print: (value: number) =>
				value === 1 ? 'Ispiši karticu' : `Ispiši ${count(value, 'karticu', 'kartice', 'kartica')}`,
			leaveTitle: 'Otići bez ispisa?',
			leaveCopy:
				'Kodovi novih kartica vidljivi su samo na ovoj stranici. Za kasniji ispis zamijenite kartice u skupini.',
			leave: 'Otiđi',
			stay: 'Ostani'
		},
		child: {
			cards: 'Obiteljske kartice',
			noCards: 'Još nema obiteljske kartice. Dodajte je kako bi se obitelj mogla povezati.',
			also: (children: string[]) => `Vrijedi i za: ${list(children)}`,
			removeCardTitle: (name: string) => `Ukloniti karticu „${name}”?`,
			removeCardShared: (children: string[]) => `Kartica i dalje vrijedi za: ${list(children)}.`,
			removeCardLast:
				'Kartica prestaje raditi, a svi uređaji koji su je koristili bit će odjavljeni.',
			cardName: 'Ime na kartici',
			addFirstCard: 'Dodaj obiteljsku karticu',
			addCard: 'Dodaj još jednu obiteljsku karticu',
			addCardHint: 'Za roditelje koji ne žive zajedno: svaka kartica ima svoje privatne poruke.',
			move: 'Premjesti u drugu skupinu',
			moveSubmit: 'Premjesti',
			remove: 'Ukloni dijete',
			removeTitle: (name: string) => `Ukloniti dijete „${name}”?`,
			removeCopy: (cards: string[]) =>
				cards.length
					? `Obiteljske kartice koje će prestati raditi: ${list(cards)}.`
					: 'To se ne može poništiti.'
		},
		teachers: {
			title: 'Odgojitelji',
			add: 'Dodaj odgojitelja',
			admin: 'Administrator',
			you: 'vi',
			noClassrooms: 'Bez skupine',
			recoveryTitle: 'Za hitne slučajeve',
			recoveryDetail: 'Otvara sve ako se izgube sve administratorske kartice.'
		},
		teacher: {
			newTitle: 'Dodaj odgojitelja',
			name: 'Ime',
			classrooms: 'Skupine',
			noClassrooms: 'Još nema skupina.',
			admin: 'Administrator',
			adminHint: 'Može dodavati skupine, odgojitelje i djecu te otvoriti svaku skupinu.',
			selfAdmin: 'Ovo može promijeniti drugi administrator.',
			create: 'Izradi karticu',
			remove: 'Ukloni odgojitelja',
			removeTitle: () => 'Ukloniti odgojitelja?',
			removeCopy: (name: string) =>
				`${name} više neće moći otvoriti BubbleBoard, a uređaji s tom karticom bit će odjavljeni.`,
			self: 'Ovo ste vi. Ukloniti vas može drugi administrator.',
			recovery:
				'Kartica za oporavak može sve što i administrator. Čuvajte je pod ključem i zamijenite je ako ju je netko drugi možda vidio.'
		},
		options: {
			title: 'Opcije',
			staff: (name: string) => `Povezani ste kao ${name}`,
			family: 'Povezani ste obiteljskom karticom',
			signOut: 'Odjavi ovaj uređaj',
			signOutTitle: 'Odjaviti ovaj uređaj?',
			signOutCopy: 'Za ponovno korištenje BubbleBoarda ovdje trebat će vam kartica.',
			about: 'O BubbleBoardu'
		},
		notices: {
			title: 'Obavijesti',
			new: 'Nova obavijest',
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
			paper: 'Papir',
			papers: {
				white: 'Bijeli',
				yellow: 'Žuti',
				peach: 'Narančasti',
				pink: 'Ružičasti',
				lilac: 'Ljubičasti',
				blue: 'Plavi',
				green: 'Zeleni'
			},
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
			addHint: 'Obitelji odgovaraju jednim dodirom. Tko je što odabrao vide samo odgojitelji.',
			answers: 'Odgovori',
			answer: (number: number) => `${number}. odgovor`,
			removeAnswer: (number: number) => `Ukloni ${number}. odgovor`,
			addAnswer: 'Dodaj odgovor',
			removing: 'Spremanjem se anketa uklanja s obavijesti, zajedno s odgovorima.',
			title: 'Anketa',
			choose: 'Odaberite odgovor',
			private: 'Vaš odgovor vide samo odgojitelji. Možete ga promijeniti.',
			votes: (value: number) => count(value, 'glas', 'glasa', 'glasova'),
			noAnswer: (names: string[]) => `Još bez odgovora: ${list(names)}`
		},
		photos: {
			new: 'Fotografija ploče',
			title: 'Fotografije ploče',
			newTitle: 'Fotografija ploče',
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
			open: (classroom: string) => `Otvori fotografiju ploče skupine ${classroom}`,
			posted: (date: string) => `stavljeno ${date}`,
			loading: 'Otvaramo fotografiju…',
			unreadable: 'Fotografija se nije otvorila. Pokušajte ponovno kasnije.',
			zoom: 'Povećaj',
			fit: 'Prilagodi zaslonu',
			close: 'Zatvori',
			replace: 'Stavi novu fotografiju',
			remove: 'Skini',
			removeTitle: 'Skinuti ovu fotografiju?',
			removeCopy: 'Odmah nestaje sa svih početnih stranica.'
		},
		notifications: {
			test: 'Obavijesti su uključene. Ovakvu ćete dobiti kad stigne nova obavijest.',
			cardTitle: 'Saznajte kad stigne nova obavijest',
			cardCopy: 'Na zaslonu piše samo da je stiglo nešto novo. Sama obavijest ostaje u aplikaciji.',
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
			iosOpen: 'Otvorite BubbleBoard s početnog zaslona i ondje skenirajte karticu.',
			androidTitle: 'Instalirajte BubbleBoard',
			androidCopy: 'Kao aplikacija na mobitelu, BubbleBoard vam može javiti kad stigne nešto novo.',
			androidMenu: 'Otvorite izbornik preglednika.',
			androidAdd: 'Odaberite Instaliraj aplikaciju ili Dodaj na početni zaslon.',
			androidOpen: 'Otvorite BubbleBoard s početnog zaslona.',
			install: 'Instaliraj',
			installed: 'BubbleBoard je instaliran. Otvorite ga s početnog zaslona.',
			inAppTitle: 'Otvorite BubbleBoard u pregledniku',
			inAppCopy:
				'Preglednik unutar ove aplikacije ne može instalirati BubbleBoard. Otvorite stranicu u Safariju ili Chromeu, obično iz izbornika ···, pa ponovno skenirajte karticu.'
		},
		editor: {
			toolbar: 'Oblikovanje',
			loading: 'Otvaramo uređivač…',
			bold: 'Podebljano',
			italic: 'Kurziv',
			bulletList: 'Popis s oznakama',
			orderedList: 'Numerirani popis',
			link: 'Poveznica',
			linkAddress: 'Web-adresa ili e-adresa',
			addLink: 'Dodaj poveznicu',
			removeLink: 'Ukloni poveznicu',
			invalidLink: 'Upišite web-adresu koja počinje s https:// ili e-adresu.',
			colour: 'Boja teksta',
			colours: {
				ink: 'Crna',
				red: 'Crvena',
				orange: 'Narančasta',
				green: 'Zelena',
				blue: 'Plava',
				purple: 'Ljubičasta'
			},
			emoji: 'Emoji'
		},
		files: {
			title: 'Datoteke',
			attach: 'Priloži datoteke',
			hint: 'PDF-ovi, dokumenti i slike, najviše 10 MB po datoteci.',
			preparing: 'Pripremamo datoteke…',
			remove: (name: string) => `Ukloni ${name}`,
			save: (name: string) => `Spremi ${name}`
		},
		errors: {
			'empty-notice': 'Najprije napišite obavijest.',
			'notice-too-long': 'Obavijest je predugačka. Skratite je i pokušajte ponovno.',
			'no-classrooms': 'Odaberite barem jednu skupinu.',
			'poll-answers': 'Anketi dodajte barem dva odgovora.',
			'unusable-photo': 'Ta se fotografija ne može upotrijebiti. Pokušajte s drugom.',
			'file-type':
				'Takvu datoteku BubbleBoard ne može priložiti. Priložite PDF, dokument ili sliku.',
			'file-too-large': 'Ta je datoteka veća od 10 MB. Priložite manju.',
			'too-many-files': 'Obavijest može imati najviše 10 datoteka.',
			'unreadable-file':
				'Datoteka se nije otvorila na ovom uređaju. Zamolite vrtić da je ponovno priloži.',
			'storage-full':
				'Spremište BubbleBoarda je puno. Obrišite obavijesti s datotekama ili skinite fotografije koje više ne trebate, ili se obratite osobi koja je instalirala BubbleBoard.',
			'upload-limit':
				'BubbleBoard je dosegnuo ovomjesečno ograničenje za prijenose. Pokušajte ponovno sljedeći mjesec ili se obratite osobi koja je instalirala BubbleBoard.',
			'download-limit':
				'BubbleBoard je dosegnuo ovomjesečno ograničenje za otvaranje fotografija i datoteka. Ponovno će se otvarati sljedeći mjesec, a osoba koja je instalirala BubbleBoard može povećati ograničenje.',
			offline:
				'BubbleBoard trenutno nije dostupan. Provjerite internetsku vezu i pokušajte ponovno.',
			'signed-out': 'Ovaj je uređaj odjavljen. Za nastavak ponovno skenirajte karticu.',
			'unreadable-records':
				'Neki zapisi vašeg vrtića nisu se otvorili na ovom uređaju. Pokušajte ponovno, a ako se to ponavlja, javite administratoru.',
			'unknown-card': 'Ova kartica više ne radi. Zatražite novu u vrtiću.',
			'invalid-card': 'To nije kod BubbleBoard kartice. Provjerite ga i pokušajte ponovno.',
			mistyped: 'Jedan od znakova ne odgovara. Provjerite kod i pokušajte ponovno.',
			'other-installation': 'Ova kartica pripada drugom BubbleBoardu.',
			'no-code':
				'Na fotografiji nema čitljivog QR koda. Pokušajte ponovno tako da se vidi cijela kartica.',
			unreadable:
				'Ova kartica ne može otvoriti zapise BubbleBoarda. Zatražite novu karticu u vrtiću.',
			'too-many-attempts': 'Previše pokušaja. Pričekajte minutu pa pokušajte ponovno.',
			'wrong-setup-token':
				'Kod za postavljanje nije ispravan. Zatražite novu poveznicu od osobe koja je instalirala BubbleBoard.',
			'already-set-up': 'BubbleBoard je ovdje već postavljen. Povežite se svojom karticom.',
			'setup-unavailable':
				'Postavljanje na ovoj instalaciji još nije spremno. Obratite se osobi koja je instalirala BubbleBoard.',
			'last-admin':
				'BubbleBoardu treba barem jedan administrator. Najprije nekoga drugog postavite za administratora.',
			'not-empty': 'Najprije premjestite ili uklonite djecu iz ove skupine.',
			'empty-name': 'Ime ne može ostati prazno. Upišite ga i pokušajte ponovno.',
			stale:
				'Netko je upravo promijenio iste podatke. Sada vidite najnovije, pa pokušajte ponovno.',
			'not-found': 'Ovo više ne postoji.',
			forbidden: 'Nemate pristup ovome.',
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
