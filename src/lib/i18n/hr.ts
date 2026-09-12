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
		status: 'Aplikacija stiže uskoro',
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
		notConnected: {
			title: 'Ovaj uređaj još nije povezan',
			copy: 'Obitelji i odgojitelji povezuju se QR karticom koju dobiju u vrtiću. Povezivanje karticom još nije dostupno.'
		}
	}
} satisfies Messages;
