import type { Messages } from './en';

export const hr = {
	languageName: 'Hrvatski',
	title: 'Malo bliže njihovom danu',
	description:
		'Jednostavno mjesto za vrtićke obavijesti, fotografije i razgovore. BubbleBoard je trenutačno u razvoju.',
	skip: 'Preskoči na sadržaj',
	home: 'BubbleBoard početna',
	language: 'Jezik',
	nav: {
		label: 'Glavna',
		sections: {
			features: 'Mogućnosti',
			how: 'Kako radi',
			privacy: 'Privatnost',
			teachers: 'Za odgojitelje'
		}
	},
	hero: {
		heading: 'Malo bliže',
		headingAccent: 'njihovom danu.',
		lead: 'Novosti, otkrića i sitnice koje su im izmamile osmijeh. Mjesto na kojem s vama dijelimo njihov dan u vrtiću.',
		cta: 'Pogledajte kako radi',
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
		copy: 'Kad BubbleBoard bude spreman, odgojitelji će vam dati obiteljsku QR karticu za pristup.',
		photoAlt: 'Odgojiteljica sjedi na podu i razgovara sa skupinom djece',
		steps: [
			{
				title: 'Dodajte ga na početni zaslon',
				copy: 'BubbleBoard se instalira iz preglednika, bez trgovine aplikacija.'
			},
			{ title: 'Uključite obavijesti', copy: 'Saznajte kada vas čeka nešto novo.' },
			{
				title: 'Skenirajte obiteljsku karticu',
				copy: 'Otvorite aplikaciju i skenirajte. Bez pamćenja korisničkog imena i lozinke.'
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
			'Fotografije se nakon nekog vremena same brišu',
			'Izrađeno tako da poslužitelj ne može čitati sadržaj vaše obitelji'
		]
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
	open: {
		title: 'Gradimo ga javno.',
		copy: 'BubbleBoard je otvorenog koda pa svatko može provjeriti kako se postupa sa sadržajem obitelji. Bez oglasa, praćenja i skripti trećih strana.',
		cta: 'Pratite razvoj na GitHubu',
		noticeTitle: 'Tek smo na početku.',
		noticeCopy:
			'Ovo je pregled dizajna. Pristup skupini, obavijesti, poruke i dijeljenje fotografija još nisu dostupni. Molimo vas da ne unosite osobne podatke.'
	},
	footer: {
		tagline: 'Mala zajednica. Puno pažnje.',
		product: 'Proizvod',
		project: 'Projekt',
		source: 'Izvorni kod',
		license: 'Licenca (AGPL-3.0)',
		architecture: 'Arhitektura',
		credits: 'Izvori fotografija',
		status: 'Rani pregled',
		build: 'Verzija'
	}
} satisfies Messages;
