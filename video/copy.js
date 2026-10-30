// Every word the reel shows, in English and Croatian. Where the app already says something, the reel says
// it the same way (src/lib/i18n), and the made-up kindergarten is the one in the app's screens
// (src/lib/assets/explore): the Bubbles, their teacher Ana Horvat, and Ema Novak's family.

/** Croatian plurals: one form for 1, 21, 31…, one for 2–4, 22–24…, and one for the rest. */
function plural(n, one, few, many) {
	const ten = n % 10;
	const hundred = n % 100;
	if (ten === 1 && hundred !== 11) return one;
	if (ten >= 2 && ten <= 4 && (hundred < 12 || hundred > 14)) return few;
	return many;
}

export const copy = {
	en: {
		open: {
			question: 'What did you do today?',
			answer: 'Nothing.',
			aside: 'We know that answer.'
		},
		logo: { tagline: 'A little closer', accent: 'to their day.' },
		board: {
			title: ['The kindergarten notice board,', 'now in your pocket.'],
			classroom: 'Bubbles',
			author: 'Ana Horvat',
			notes: [
				{
					paper: 'yellow',
					title: 'Trip to Tvrđa on Thursday',
					body: 'Please pack a water bottle and a hat.'
				},
				{
					paper: 'pink',
					title: 'This week’s menu',
					body: 'What’s for lunch? The whole week is attached.'
				},
				{
					paper: 'blue',
					title: 'Parents’ evening on 30 September',
					body: 'We meet at 17:30 in the Bubbles room.'
				},
				{
					paper: 'green',
					title: 'Spare clothes, please',
					body: 'A labelled bag with one change of clothes.'
				}
			],
			question: 'Is your child coming with us?',
			options: [
				{ label: 'Yes, we’re coming', votes: 5 },
				{ label: 'No, not this time', votes: 1 }
			],
			count: (n) => `${n} ${n === 1 ? 'vote' : 'votes'}`,
			seen: 'Seen by 6 of 8 families'
		},
		qr: {
			title: 'One code and you’re in.',
			sub: 'No usernames. No passwords.',
			card: 'Novak family',
			connected: 'Connected'
		},
		photos: {
			title: ['Your child’s face.', 'Your family’s choice.'],
			stickers: 'Stickers stick themselves.',
			own: 'You always see your own child.',
			yours: 'Your child',
			found: 'Faces found on the teacher’s phone'
		},
		messages: {
			title: 'Ask the teachers.',
			sub: 'Other parents don’t see it.',
			teacher: 'Ana Horvat',
			thread: [
				{ from: 'parent', text: 'Can grandma pick Ema up at 13:00 on Thursday?' },
				{ from: 'teacher', text: 'Of course. We’re back from Tvrđa by 12:00.' },
				{ from: 'parent', text: 'Perfect, thank you!' }
			],
			private: 'Only you and the teachers',
			placeholder: 'Write a message…'
		},
		meetings: {
			title: 'Pick your own meeting time.',
			day: 'Tuesday, September 29',
			slots: [
				{ time: '4:00 PM–4:20 PM', state: 'free' },
				{ time: '4:20 PM–4:40 PM', state: 'taken' },
				{ time: '4:40 PM–5:00 PM', state: 'pick' },
				{ time: '5:00 PM–5:20 PM', state: 'taken' },
				{ time: '5:20 PM–5:40 PM', state: 'free' }
			],
			free: 'Available',
			taken: 'Booked',
			reserve: 'Reserve',
			yours: 'Your meeting · Ema Novak',
			note: 'You see which times are taken, not who took them.'
		},
		notify: {
			title: 'Your phone lets you know.',
			sub: 'What it says stays inside the app.',
			clock: ['8', '29', '30'],
			date: 'Thursday, October 1',
			now: 'now',
			items: [
				'New photos from your kindergarten',
				'New notice from your kindergarten',
				'New message'
			]
		},
		locked: {
			title: 'Locked on your phone first.',
			message: 'Ema has a dentist appointment on Thursday.',
			server: 'Server',
			peek: 'Even we can’t peek.',
			keys: 'Only your kindergarten has the keys.'
		},
		languages: {
			lines: ['Malo bliže njihovom danu.', 'A little closer to their day.'],
			label: 'Croatian and English'
		},
		values: {
			no: ['No sign-ups.', 'No ads.', 'No tracking.'],
			free: ['Free.', 'Open source.'],
			stack: [
				'Svelte 5',
				'SvelteKit',
				'TypeScript',
				'Tailwind CSS',
				'Web Crypto',
				'Cloudflare Workers',
				'D1',
				'R2'
			],
			small: 'Built small on purpose.'
		},
		finale: {
			title: 'Everything in one place.',
			url: 'bubbleboard.fyi',
			foot: ['Free', 'Open source', 'Made by Commit']
		}
	},
	hr: {
		open: {
			question: 'Što je bilo u vrtiću?',
			answer: 'Ništa.',
			aside: 'Znamo taj odgovor.'
		},
		logo: { tagline: 'Malo bliže', accent: 'njihovom danu.' },
		board: {
			title: ['Oglasna ploča iz vrtića,', 'sada u vašem džepu.'],
			classroom: 'Mjehurići',
			author: 'Ana Horvat',
			notes: [
				{
					paper: 'yellow',
					title: 'Izlet u Tvrđu u četvrtak',
					body: 'Djeci spremite bočicu vode i kapu.'
				},
				{
					paper: 'pink',
					title: 'Jelovnik za ovaj tjedan',
					body: 'Što je za ručak? Cijeli tjedan je u privitku.'
				},
				{
					paper: 'blue',
					title: 'Roditeljski sastanak 30. rujna',
					body: 'Vidimo se u 17:30 u sobi Mjehurića.'
				},
				{
					paper: 'green',
					title: 'Rezervna odjeća',
					body: 'Označena vrećica s jednom presvlakom.'
				}
			],
			question: 'Ide li vaše dijete s nama?',
			options: [
				{ label: 'Da, dolazimo', votes: 5 },
				{ label: 'Ne, ovaj put ne', votes: 1 }
			],
			count: (n) => `${n} ${plural(n, 'glas', 'glasa', 'glasova')}`,
			seen: 'Pročitano: 6 od 8 obitelji'
		},
		qr: {
			title: 'Jedan kod i unutra ste.',
			sub: 'Bez korisničkog imena. Bez lozinke.',
			card: 'Obitelj Novak',
			connected: 'Povezano'
		},
		photos: {
			title: ['Lice vašeg djeteta.', 'Odluka vaše obitelji.'],
			stickers: 'Naljepnice se lijepe same.',
			own: 'Svoje dijete uvijek vidite.',
			yours: 'Vaše dijete',
			found: 'Lica pronađena na mobitelu odgojiteljice'
		},
		messages: {
			title: 'Pitajte odgojiteljice.',
			sub: 'Drugi roditelji to ne vide.',
			teacher: 'Ana Horvat',
			thread: [
				{ from: 'parent', text: 'Može li baka doći po Emu u četvrtak u 13:00?' },
				{ from: 'teacher', text: 'Naravno. Iz Tvrđe se vraćamo do 12:00.' },
				{ from: 'parent', text: 'Super, hvala vam!' }
			],
			private: 'Samo vi i odgojiteljice',
			placeholder: 'Napišite poruku…'
		},
		meetings: {
			title: 'Sami odaberite termin razgovora.',
			day: 'utorak, 29. rujna',
			slots: [
				{ time: '16:00–16:20', state: 'free' },
				{ time: '16:20–16:40', state: 'taken' },
				{ time: '16:40–17:00', state: 'pick' },
				{ time: '17:00–17:20', state: 'taken' },
				{ time: '17:20–17:40', state: 'free' }
			],
			free: 'Slobodno',
			taken: 'Zauzeto',
			reserve: 'Rezerviraj',
			yours: 'Vaš razgovor · Ema Novak',
			note: 'Vidite koji su termini zauzeti, ali ne i tko ih je uzeo.'
		},
		notify: {
			title: 'Mobitel vam javi.',
			sub: 'Što točno piše, vidite tek u aplikaciji.',
			clock: ['8', '29', '30'],
			date: 'četvrtak, 1. listopada',
			now: 'sada',
			items: ['Nove fotografije iz vrtića', 'Nova obavijest iz vrtića', 'Nova poruka']
		},
		locked: {
			title: 'Zaključano već na mobitelu.',
			message: 'Ema u četvrtak ima zubara.',
			server: 'Poslužitelj',
			peek: 'Ne možemo zaviriti ni mi.',
			keys: 'Ključeve ima samo vaš vrtić.'
		},
		languages: {
			lines: ['A little closer to their day.', 'Malo bliže njihovom danu.'],
			label: 'Hrvatski i engleski'
		},
		values: {
			no: ['Bez registracije.', 'Bez reklama.', 'Bez praćenja.'],
			free: ['Besplatno.', 'Otvorenog koda.'],
			stack: [
				'Svelte 5',
				'SvelteKit',
				'TypeScript',
				'Tailwind CSS',
				'Web Crypto',
				'Cloudflare Workers',
				'D1',
				'R2'
			],
			small: 'Namjerno malen i jednostavan.'
		},
		finale: {
			title: 'Sve na jednom mjestu.',
			url: 'bubbleboard.fyi',
			foot: ['Besplatno', 'Otvoreni kod', 'Izradio Commit']
		}
	}
};
