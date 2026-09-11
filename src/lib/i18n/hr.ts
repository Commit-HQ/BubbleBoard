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
	app: { open: 'Otvori aplikaciju', soon: 'Uskoro' },
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
		quiet: 'Za obitelji. Nadahnuto skupinom Bubbles.',
		photoAlt: 'Djeca se smiju i puhaju balone od sapunice u sunčanom parku',
		mockTeacher: 'Odgojiteljica Ana',
		mockTime: 'Upravo sada',
		mockMessage: 'Luka je danas sagradio najviši toranj!'
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
			copy: 'Trenuci iz skupine, podijeljeni s pažnjom, koji nakon nekog vremena nestaju.'
		},
		messages: {
			title: 'Izravno s odgojiteljima',
			copy: 'Privatni razgovori između vaše obitelji i odgojitelja.'
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
		copy: 'Roditelji i odgojitelji pridružuju se na isti način. Vrtić vam daje osobnu QR karticu i to je sve što trebate.',
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
			'Fotografije se nakon nekog vremena same brišu'
		]
	},
	security: {
		title: 'Zaključano prije nego što napusti vaš mobitel.',
		copy: 'Fotografije, poruke i imena djece šifriraju se na vašem uređaju prije slanja. Ključeve za njihovo otvaranje imaju samo obitelji i odgojitelji vaše skupine.',
		device: {
			title: 'Šifrirano na vašem uređaju',
			copy: 'Sve se zaključava na mobitelu ili računalu s kojeg dolazi, prije nego što se pošalje.'
		},
		server: {
			title: 'Nečitljivo i ako procuri',
			copy: 'Poslužitelj čuva samo zaključane podatke. Iz baze koja procuri ne mogu se iščitati fotografije, imena ni poruke.'
		},
		host: {
			title: 'Ne možemo vidjeti ni mi',
			copy: 'Tko god poslužuje BubbleBoard, uključujući nas, nema ključeve vaše skupine. Kod je javan pa svatko može provjeriti.'
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
			copy: 'Uklonite objavu istog trena ako nešto promakne.'
		},
		retention: {
			title: 'Ništa ne ostaje zauvijek',
			copy: 'Odaberite koliko dugo fotografije ostaju, od jednog dana do tri mjeseca.'
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
		madeBy: 'S ljubavlju izradio tim [Commit]',
		license: 'Licenca (AGPL-3.0)',
		credits: 'Izvori fotografija',
		build: 'Verzija'
	}
} satisfies Messages;
