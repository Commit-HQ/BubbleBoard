import type { Messages } from './en';

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
	app: {
		about: 'O BubbleBoardu',
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
			cancel: 'Odustani',
			save: 'Spremi',
			saved: 'Spremljeno',
			done: 'Gotovo',
			rename: 'Preimenuj',
			remove: 'Ukloni',
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
			title: 'Početna',
			greeting: (name: string) => `Bok, ${name}`,
			admin: 'Evo vašeg vrtića.',
			teacher: 'Evo vaših skupina.',
			addClassroom: 'Dodaj skupinu',
			classroomName: 'Naziv skupine',
			classroomExample: 'Na primjer Bubamare',
			teachers: 'Odgojitelji',
			device: 'Ovaj uređaj',
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
			selectAll: 'Odaberi sve',
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
			cardName: 'Tko dobiva karticu?',
			cardNameHint:
				'Na primjer „Ivana (mama)”. Roditelji koji ne žive zajedno kasnije mogu dobiti zasebne kartice.',
			sibling: 'Kartica koju već ima brat ili sestra',
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
			rename: 'Preimenuj dijete',
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
			noClassrooms: 'Bez skupine'
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
		device: {
			title: 'Ovaj uređaj',
			staff: (name: string) => `Povezani ste kao ${name}`,
			family: 'Povezani ste obiteljskom karticom',
			signOut: 'Odjavi ovaj uređaj',
			signOutTitle: 'Odjaviti ovaj uređaj?',
			signOutCopy: 'Za ponovno korištenje BubbleBoarda ovdje trebat će vam kartica.'
		},
		notices: {
			title: 'Obavijesti',
			new: 'Nova obavijest',
			empty: 'Još nema obavijesti. Kad vrtić objavi obavijest, pojavit će se ovdje.',
			emptyStaff: 'Još nema obavijesti.',
			unreadable: 'Neke se obavijesti nisu otvorile na ovom uređaju.',
			byline: (author: string, time: string) => `${author} · ${time}`,
			edited: 'uređeno',
			edit: 'Uredi',
			delete: 'Obriši',
			deleteTitle: 'Obrisati ovu obavijest?',
			deleteCopy: 'Odmah nestaje sa svih ploča.',
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
			announce: 'Vrati je na vrh',
			announceHint: 'Za promjenu koju svi trebaju vidjeti.',
			post: 'Objavi obavijest',
			save: 'Spremi promjene',
			noClassrooms: 'Obavijesti možete objavljivati kad vas administrator doda u skupinu.'
		},
		errors: {
			'empty-notice': 'Najprije napišite obavijest.',
			'no-classrooms': 'Odaberite barem jednu skupinu.',
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
			unexpected: 'Nešto nije u redu. Pokušajte ponovno.'
		}
	}
} satisfies Messages;

const pluralRules = new Intl.PluralRules('hr');

/** A number with its Croatian form: 1 dijete, 2 djeteta, 5 djece. */
function count(value: number, one: string, few: string, other: string) {
	const forms: Partial<Record<Intl.LDMLPluralRule, string>> = { one, few };
	return `${value} ${forms[pluralRules.select(value)] ?? other}`;
}

/** Names in a sentence, such as „Bubamare i Leptirići”. */
function list(names: string[]) {
	return new Intl.ListFormat('hr', { type: 'conjunction' }).format(names);
}
