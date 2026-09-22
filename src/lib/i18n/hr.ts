import type { Messages } from './en';
import type { PushKind } from '../push';

/** What a notification says, by what happened (en.ts). */
export const notificationText: Record<PushKind, string> = {
	notice: 'Nova obavijest iz vrtića',
	message: 'Nova poruka',
	slots: 'Novi termini za razgovore',
	booking: 'Promjena termina razgovora',
	photos: 'Nove fotografije iz vrtića'
};

export const hr = {
	languageName: 'Hrvatski',
	ogLocale: 'hr_HR',
	title: 'Malo bliže njihovom danu',
	description:
		'BubbleBoard je besplatna aplikacija za vrtić. Odgojiteljice javljaju što ima novo, dijele fotografije i odgovaraju na pitanja roditelja. Sve je na jednom mjestu i vide ga samo oni kojima je namijenjeno.',
	skip: 'Preskoči na sadržaj',
	home: 'BubbleBoard početna',
	language: 'Jezik',
	nav: {
		label: 'Glavna',
		sections: {
			features: 'Što nudi',
			how: 'Kako početi',
			privacy: 'Privatnost',
			teachers: 'Za odgojiteljice',
			security: 'Sigurnost',
			kindergartens: 'Za vrtiće'
		}
	},
	hero: {
		heading: 'Malo bliže',
		headingAccent: 'njihovom danu.',
		copy: '„Što je bilo u vrtiću?“ „Ništa.“ Znamo taj odgovor. BubbleBoard vam pokaže sve ostalo: fotografije s izleta, obavijesti odgojiteljica i odgovore na vaša pitanja. Besplatno, na jednom mjestu i samo za oči vaše skupine.',
		cta: 'Za vaš vrtić',
		open: 'Otvori aplikaciju',
		quiet: 'Za obitelji. Nadahnuto skupinom Bubbles.',
		photoAlt: 'Djeca se smiju i puhaju balone od sapunice u sunčanom parku',
		notifications: [
			{ time: 'Upravo sada', message: 'Nove fotografije iz vrtića' },
			{ time: '8:30', message: 'Nova obavijest iz vrtića' }
		]
	},
	features: {
		title: 'Oglasna ploča iz vrtića, sada u vašem džepu.',
		copy: 'Nema više papirića koji se izgube u ruksaku ni poruka koje se zagube u grupnim razgovorima. Sve važno čeka vas na jednom mjestu.',
		notices: {
			title: 'Obavijesti iz skupine',
			copy: 'Sutra je izlet? Treba donijeti rezervnu odjeću? Odgojiteljice jave, a vi to vidite odmah.'
		},
		photos: {
			title: 'Fotografije dana',
			copy: 'Zavirite kako je bilo na priredbi ili izletu. Fotografije na kojima je vaše dijete posebno su označene. Lica druge djece prekriva vesela naljepnica, osim ako njihovi roditelji dopuste da ih se vidi.'
		},
		messages: {
			title: 'Pitajte odgojiteljice',
			copy: 'Imate pitanje samo za odgojiteljice? Napišite ga ovdje. Drugi roditelji ga ne vide, a svako pitanje ima svoj razgovor.'
		},
		documents: {
			title: 'Jelovnik i tjedni plan',
			copy: 'Što je danas za ručak? Jelovnici, tjedni planovi i obrasci uvijek su vam pri ruci.'
		},
		notifications: {
			title: 'Mobitel vam javi',
			copy: 'Kad stigne nešto novo, mobitel vam pokaže kratku najavu. Što točno piše vidite tek u aplikaciji, pa vam nitko ne čita preko ramena.'
		},
		devices: {
			title: 'Na maminom i tatinom mobitelu',
			copy: 'Jedan obiteljski kod radi na svim mobitelima, tabletima i računalima kod kuće.'
		}
	},
	how: {
		title: 'Jedan kod i unutra ste.',
		copy: 'Od vrtića dobijete QR kod, kvadratić sa šarom koji mobitel pročita kamerom. Jedan vrijedi za sve uređaje vaše obitelji, a svaka odgojiteljica ima svoj. Ništa drugo ne trebate.',
		photoAlt: 'Djeca leže u krugu na tepihu u vrtiću i smiju se, a neka drže noge u zraku',
		steps: [
			{
				title: 'Usmjerite kameru prema kodu',
				copy: 'Otvorite kameru na mobitelu i usmjerite je prema kodu iz vrtića. Nema korisničkog imena ni lozinke koju biste morali pamtiti.'
			},
			{
				title: 'Stavite aplikaciju na mobitel',
				copy: 'BubbleBoard vam korak po korak pokaže kako ga dodati među ostale aplikacije. Ništa ne morate tražiti u trgovini aplikacija.'
			},
			{
				title: 'Uključite obavijesti',
				copy: 'Tako vam mobitel javi čim stigne nešto novo.'
			}
		]
	},
	privacy: {
		title: 'Lice vašeg djeteta. Odluka vaše obitelji.',
		copy: 'Vi odlučujete smiju li druge obitelji vidjeti vaše dijete na fotografijama iz skupine. Dok to ne dopustite, njegovo lice drugima prekriva vesela naljepnica. Vi svoje dijete uvijek vidite bez naljepnice.',
		photoAlt: 'Djeca slikaju vodenim bojama za stolom, pogled odozgo',
		facts: [
			'Nema korisničkih imena ni lozinki',
			'Druge obitelji vide naljepnicu umjesto lica, dok vi ne odlučite drukčije',
			'Drage fotografije spremite ili podijelite prije nego što nestanu iz aplikacije'
		]
	},
	security: {
		title: 'Što je u skupini, ostaje u skupini.',
		copy: 'Fotografije, poruke i imena djece zaključaju se na vašem mobitelu prije nego što se pošalju. Otključati ih mogu samo obitelji i odgojiteljice vaše skupine.',
		group: {
			title: 'Samo vaša skupina',
			copy: 'Obavijesti i fotografije vide sve obitelji i odgojiteljice vaše skupine. Privatne razgovore vidite samo vi i vaše odgojiteljice.'
		},
		lock: {
			title: 'Zaključano već na mobitelu',
			copy: 'Sve se zaključa prije nego što krene s vašeg mobitela ili računala. Tko nema ključ, vidi samo nečitljivu zbrku.'
		},
		keys: {
			title: 'Ne možemo zaviriti ni mi',
			copy: 'Ključeve ima samo vaš vrtić. Nema ih nitko izvan njega, pa ni mi koji smo napravili aplikaciju. Aplikacija je otvorenog koda, pa svatko može provjeriti kako radi.'
		}
	},
	teachers: {
		title: 'Stvoreno i za odgojiteljice.',
		copy: 'Podijelite dan u minuti, s mobitela ili računala. Aplikacija pazi na sitnice, da vi ne morate.',
		// The link to the teachers' walk through the app.
		tour: 'Pogledajte kako aplikacija izgleda odgojiteljicama',
		preview: {
			title: 'Naljepnice se lijepe same',
			copy: 'Vaš mobitel sam pronađe lica na fotografijama i prekrije ih. Vi samo kažete tko je tko. Prije objave vidite galeriju točno onako kako će je vidjeti svaka obitelj.'
		},
		meetings: {
			title: 'Individualni razgovori',
			copy: 'Upišite kada ste slobodni, a roditelji sami odaberu termin za svoje dijete. Ne vide tko je uzeo ostale termine.'
		},
		retention: {
			title: 'Vi birate koliko dugo',
			copy: 'Fotografije same nestanu iz aplikacije nakon vremena koje odaberete, od jednog dana do tri mjeseca.'
		},
		seen: {
			title: 'Vidite tko je pročitao',
			copy: 'Roditelji jednim dodirom potvrde da su pročitali obavijest. Trebate brz odgovor od svih? Postavite anketu.'
		}
	},
	kindergartens: {
		title: 'Želite BubbleBoard u svojem vrtiću?',
		copy: 'Na BubbleBoard se ne pretplaćuje i nema registracije. Svaki vrtić dobije svoj BubbleBoard, odvojen od svih drugih, pa se fotografije i poruke vaših obitelji nikad ne miješaju s tuđima. Javite nam se i recite nešto o svojem vrtiću, a mi ćemo vam pomoći da krenete.',
		facts: [
			'Besplatno, bez reklama i bez praćenja',
			'Roditelji ništa ne kupuju i ništa ne traže u trgovini aplikacija',
			'Radi na mobitelima i računalima koje već imate'
		],
		hosting:
			'Aplikacija je besplatna. Jedini trošak je najam računala na internetu na kojem ona radi. Taj je trošak obično malen i svaki ga vrtić pokriva sam.',
		cta: 'Pišite nam',
		subject: 'BubbleBoard za naš vrtić',
		mission:
			'BubbleBoard je napravio Commit, mala skupina programera koja izrađuje besplatne aplikacije otvorenog koda koje rješavaju svakodnevne probleme. Otvoreni kod znači da svatko može vidjeti kako su napravljene.',
		itTeam: 'Imate nekoga vičnog računalima?',
		code: 'Sve što treba nalazi se na GitHubu.'
	},
	// Šetnja kroz aplikaciju (/explore/parents i /explore/teachers).
	explore: {
		title: 'Razgledajte aplikaciju',
		description:
			'Pogledajte kako BubbleBoard izgleda roditeljima, a kako odgojiteljicama. Pravi zasloni aplikacije, jedan po jedan, s izmišljenim vrtićem.',
		// Dio početne stranice koji vodi ovamo.
		teaser: {
			title: 'Pogledajte aplikaciju iznutra.',
			copy: 'Pokazat ćemo vam prave zaslone aplikacije, korak po korak. Ne trebate QR kod ni prijavu.',
			parents: 'Ja sam roditelj',
			teachers: 'Ja sam odgojiteljica'
		},
		heading: 'Pogledajte kako',
		headingAccent: 'aplikacija izgleda.',
		copy: 'Ovo su pravi zasloni aplikacije, s izmišljenim vrtićem. Odaberite jeste li roditelj ili odgojiteljica, pa idite korak po korak.',
		roleLabel: 'Tko gleda aplikaciju',
		roles: { parents: 'Roditelji', teachers: 'Odgojiteljice' },
		sample:
			'Vrtić, imena i poruke su izmišljeni. Na fotografijama su modeli, a ne djeca iz stvarnog vrtića.',
		stepsLabel: 'Koraci',
		step: (number: number, total: number) => `Korak ${number} od ${total}`,
		previous: 'Natrag',
		next: 'Dalje',
		other: { parents: 'Pogledajte kao odgojiteljica', teachers: 'Pogledajte kao roditelj' },
		parents: [
			{
				shot: 'parent-board',
				title: 'Sve novo čeka vas na jednom mjestu',
				copy: 'Otvorite aplikaciju i pred vama je oglasna ploča vaše skupine. Tu su obavijesti odgojiteljica, fotografije s događaja i termini razgovora. Najnovije je uvijek na vrhu, pa ništa ne morate tražiti.',
				screen:
					'Početni zaslon aplikacije: kartica koja vodi do termina razgovora, a ispod nje događaj „Dan mjehurića na Promenadi“ s fotografijom djevojčice koja puše balone od sapunice.'
			},
			{
				shot: 'parent-poll',
				title: 'Pročitali ste? Javite jednim dodirom',
				copy: 'Sutra je izlet u Tvrđu? Kad pročitate obavijest, dodirnite „Označi kao pročitano“ i odgojiteljice znaju da ste je vidjeli. Pitaju li ide li vaše dijete, odgovorite u anketi jednim dodirom.',
				screen:
					'Žuta obavijest o izletu u Tvrđu s anketom: „Da, dolazimo“ ima 5 glasova, a „Ne, ovaj put ne“ 1. Ispod piše da je obavijest pročitana.'
			},
			{
				shot: 'parent-gallery',
				title: 'Zavirite kako je bilo',
				copy: 'Fotografije na kojima je vaše dijete označene su srcem, pa ih odmah nađete. Lica neke djece prekriva vesela naljepnica, jer su tako odlučili njihovi roditelji. Drage fotografije spremite na mobitel, jer nakon nekog vremena nestanu iz aplikacije.',
				screen:
					'Galerija događaja s tri fotografije, od kojih su dvije označene srcem, i gumb za spremanje svih fotografija.'
			},
			{
				shot: 'parent-consent',
				title: 'Lice vašeg djeteta, vaša odluka',
				copy: 'Smiju li druge obitelji iz skupine vidjeti lice vašeg djeteta? To u Opcijama odlučujete vi. Dok ne dopustite, drugi vide naljepnicu. Predomislite se kad god želite. Vi svoje dijete uvijek vidite bez naljepnice.',
				screen:
					'Opcije s dva izbora za dijete Emu Novak: „Samo naša obitelj“ i „I druge obitelji naše skupine“, koji je odabran.'
			},
			{
				shot: 'parent-messages',
				title: 'Imate pitanje? Samo ga napišite',
				copy: 'Dijete u četvrtak ide ranije kući? Izgubila se jakna? Napišite to odgojiteljicama ovdje. Razgovor vidite samo vi i odgojiteljice, a drugi roditelji ne.',
				screen:
					'Razgovor „Raniji odlazak u četvrtak“: roditelj pita, odgojiteljica Ana Horvat odgovara, a roditelj zahvaljuje.'
			},
			{
				shot: 'parent-meetings',
				title: 'Sami odaberite termin razgovora',
				copy: 'Kad odgojiteljice ponude termine za individualni razgovor, odaberite onaj koji vam odgovara. Vidite koji su termini već zauzeti, ali ne i tko ih je uzeo.',
				screen:
					'Termini razgovora u utorak 29. rujna: neki slobodni, neki zauzeti, a jedan označen kao „Vaš razgovor“ za Emu Novak.'
			},
			{
				shot: 'parent-devices',
				title: 'I baka može vidjeti što ima novo',
				copy: 'Želite da obavijesti vide i baka, djed ili teta čuvalica? U Opcijama napravite QR kod za još jedan uređaj. Skenirajte ga tim uređajem ili ga pošaljite kao poveznicu. Svaki kod povezuje jedan uređaj i vrijedi 24 sata.',
				screen:
					'Opcije, dio „Dodaj uređaj“: okrugli QR kod, ispod njega isti kod ispisan slovima i brojkama te gumbi „Podijeli poveznicu“ i „Gotovo“.'
			}
		],
		teachers: [
			{
				shot: 'teacher-notice',
				title: 'Obavijest je gotova za minutu',
				copy: 'Napišite što treba javiti i odaberite boju papira, kao na pravoj oglasnoj ploči. Zatim odaberite koje skupine vide obavijest i koliko dana ostaje na ploči. Ako želite, dodajte datoteku ili anketu.',
				screen:
					'Obrazac nove obavijesti: ružičasta obavijest o roditeljskom sastanku s popisom, iznad nje izbor boja, a ispod „Dodaj anketu“.'
			},
			{
				shot: 'teacher-seen',
				title: 'Vidite tko je pročitao',
				copy: 'Ne morate više pitati na vratima je li obavijest stigla. Ispod svake vidite koje su je obitelji pročitale, a koje još nisu. Kod ankete vidite i koja je obitelj što odgovorila. To vidite samo vi odgojiteljice. Roditelji vide samo broj odgovora.',
				screen:
					'Obavijest o izletu kako je vidi odgojiteljica: uz svaki odgovor ankete obitelji koje su ga odabrale, dvije obitelji bez odgovora i „Pročitano: 6 od 8 obitelji“.'
			},
			{
				shot: 'teacher-faces',
				title: 'Naljepnice se lijepe same',
				copy: 'Dodajte fotografije s događaja, a mobitel sam pronađe lica i prekrije ih naljepnicama. Vi samo dodirnete lice i kažete čije je. Dok ih ne objavite, fotografije ostaju na vašem mobitelu.',
				screen:
					'Uređivanje fotografije: djeca leže na tepihu s naljepnicama preko šest lica, od kojih su tri imenovana, i popis imena djece za odabir.'
			},
			{
				shot: 'teacher-preview',
				title: 'Pogledajte očima roditelja',
				copy: 'Prije objave odaberite obitelj i vidite fotografije točno onako kako će ih ona vidjeti. Njihovo dijete je bez naljepnice. Djeca čiji roditelji ne žele da im se vidi lice ostaju prekrivena. Tako znate da je sve u redu prije nego što objavite.',
				screen:
					'Korak pregleda, kao obitelj Novak: ista fotografija na kojoj su naljepnicama prekrivena još samo dva lica.'
			},
			{
				shot: 'teacher-messages',
				title: 'Svako pitanje ima svoj razgovor',
				copy: 'Pitanja roditelja ne miješaju se u jednom dugom razgovoru. Svako je zasebno, a uz njega piše koja obitelj pita, za koje dijete i iz koje skupine. Vrtić odredi u koje sate roditelji mogu pisati i koliko upita mjesečno ima svaka obitelj, pa poruke ne stižu u svako doba.',
				screen:
					'Popis poruka s tri nepročitana upita: izgubljena plava jakna, napomena o alergiji za izlet i raniji odlazak u četvrtak.'
			},
			{
				shot: 'teacher-meetings',
				title: 'Roditelji sami biraju termin',
				copy: 'Upišite dan i sate kad ste slobodni, a aplikacija ih sama podijeli na termine. Roditelji sami odaberu termin, a vi vidite tko je uzeo koji. Nema popisa na vratima ni dogovaranja porukama.',
				screen:
					'Termini odgojiteljice u utorak 29. rujna: četiri zauzeta, svaki s imenom djeteta, i dva još slobodna.'
			},
			{
				shot: 'teacher-classroom',
				title: 'Svaka obitelj dobije svoj QR kod',
				copy: 'BubbleBoard administrator upiše djecu u skupinu i za svaku obitelj ispiše QR kod. S tim kodom obitelj ulazi u aplikaciju, bez korisničkog imena i lozinke. Izgubi li ga, dobije novi, a stari prestaje vrijediti.',
				screen:
					'Skupina Mjehurići s osmero djece, uz svako dijete ime obitelji, te gumbi za dodavanje djeteta i zamjenu QR kodova.'
			}
		],
		closing: {
			title: 'Želite isprobati?',
			copy: 'Vaš vrtić već koristi BubbleBoard? Otvorite aplikaciju i skenirajte QR kod koji ste dobili. Još ga ne koristi? Javite nam se i pomoći ćemo vam da krenete.'
		}
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
		updated: 'Ažurirano 21. rujna 2026.',
		points: [
			{
				title: 'Fotografije događaja',
				copy: 'Lica se traže i označavaju na uređaju odgojiteljice. Šalje se šifrirana prekrivena fotografija s odvojenim šifriranim isječcima, bez izvornika. Nedovršeni događaj ostaje samo na uređaju odgojiteljice dok ga ne objavi ili odbaci i briše se nakon 7 dana. Obitelji vide vlastitu djecu i lica za koja je dopušteno dijeljenje. Vrtić može unijeti ono što piše u vašoj izjavi o privoli, a vi to u aplikaciji možete promijeniti u svakom trenutku. Dopuštenja su šifrirana i promjene vrijede samo za buduće objave. Događaji i njihove fotografije dostupni su od 1 do 90 dana prema izboru odgojiteljice, zatim se brišu. Nema skrivene arhive za godišnji album.'
			},
			{
				title: 'Što se čuva',
				copy: 'Imena, naslovi upita i poruke, obavijesti, stranice s informacijama, ankete, fotografije i datoteke priložene bilo čemu od toga šifriraju se na uređaju prije slanja. Poslužitelj ih ne može pročitati, a čuva samo ono što mu treba za rad, bez imena, na primjer kad je obavijest objavljena. Termini individualnih razgovora, rezervacije te poveznice između identifikatora djece i obitelji služe organizaciji termina; imena djece ostaju šifrirana.'
			},
			{
				title: 'Gdje',
				copy: 'BubbleBoard radi na Cloudflareu, američkoj tvrtki, pa se podaci mogu obrađivati i izvan EU-a, uz zaštitne mjere koje propisuje pravo EU-a.'
			},
			{
				title: 'Koliko dugo',
				copy: 'Obavijesti ostaju onoliko dana koliko odabere odgojiteljica, od 1 do 90, fotografija oglasne ploče dok se ne zamijeni, stranice s informacijama dok ih vrtić ne promijeni ili obriše, imena dok ih vrtić ne ukloni, a prijava uređaja do 90 dana bez korištenja. Razgovori se, sa svojim datotekama, čuvaju dok je obitelj član skupine ili dok odgojiteljica ne obriše zatvoreni razgovor. Ponude individualnih razgovora i rezervacije brišu se 90 dana nakon posljednjeg termina u ponudi. Obrisani zapisi ostaju u povijesti baze podataka do 30 dana.'
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
				copy: 'Možete zatražiti kopiju svojih podataka i podataka svojeg djeteta te njihov ispravak ili brisanje. Pišite na adresu ispod ili pitajte odgojiteljice svojeg djeteta. Pritužbu možete podnijeti i Agenciji za zaštitu osobnih podataka (AZOP).'
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
			view: 'Prikaz fotografije',
			finalView: 'Konačna fotografija',
			originalView: 'Originalna fotografija',
			title: 'Događaj',
			new: 'Novi događaj',
			name: 'Naslov događaja',
			date: 'Datum događaja',
			description: 'Opis',
			days: 'Neka ostane',
			publish: 'Objavi događaj',
			published: 'Događaj je objavljen.',
			preparing: 'Pripremamo šifrirane fotografije',
			uploading: 'Šaljemo fotografije',
			previewAs: 'Pregled kao',
			base: 'Svi pokrovi',
			consentTitle: 'Vidljivost lica mog djeteta',
			consentHint:
				'Vrtić je ovo možda postavio prema vašoj izjavi o privoli, a vi to ovdje možete promijeniti u svakom trenutku. Odabir vrijedi za fotografije objavljene od tada i vlastito dijete uvijek vidite. Ako dijete ima više obiteljskih QR kodova, skupini to mora dopustiti svaka povezana obitelj.',
			private: 'Samo naša obitelj',
			privateHint:
				'Druge obitelji u skupini vide naljepnicu preko lica vašeg djeteta. Naljepnica prekriva lice, no tko dobro poznaje vaše dijete može ga prepoznati i po kosi ili odjeći.',
			group: 'I druge obitelji naše skupine',
			groupHint: 'Obitelji iz skupine vide lice vašeg djeteta na događajima skupine.',
			consentSaved: 'Spremljeno.',
			noChildren: 'Popis djece još nije pripremljen. Odgojiteljica treba otvoriti aplikaciju.',
			child: 'Dijete',
			download: 'Spremi fotografiju',
			downloadAll: 'Spremi sve fotografije',
			preparingPhoto: (n: number, total: number) => `Pripremamo fotografiju ${n} od ${total}…`,
			remove: 'Ukloni događaj',
			removeHint: 'Događaj i njegove fotografije više neće biti dostupni obiteljima.',
			edit: 'Uredi',
			edited: 'uređeno',
			editTitle: 'Uredi događaj',
			save: 'Spremi promjene',
			open: 'Otvori galeriju',
			back: 'Natrag na ploču',
			expired: 'Događaj nije dostupan ili je istekao.',
			stale:
				'Dopuštenja ili popis djece promijenili su se. Vrati se na uređivanje i ponovno pripremi pregled.',
			review: 'Pregled i objava',
			ready: 'Pregledaj pokrivenost svih lica i pogled odabrane obitelji prije objave.',
			failed: 'Fotografiju nije moguće otvoriti.',
			tooOld:
				'Softver ovog uređaja prestar je za prikaz fotografija s događaja. Ažurirajte ga ili otvorite BubbleBoard na novijem mobitelu ili računalu.',
			retry: 'Pokušaj ponovno',
			loading: 'Otvaramo fotografiju…',
			openingPhotos: (done: number, total: number) => `Otvaramo fotografije… ${done} od ${total}`,
			filter: 'Koje fotografije prikazati',
			allPhotos: 'Sve fotografije',
			withMyChild: 'S vašim djetetom',
			staysUntil: (date: string) =>
				`Fotografije ostaju ovdje do ${date}. Spremite one koje želite zadržati.`,
			untilShort: (date: string) => `Fotografije ostaju ovdje do ${date}.`,
			stickersExplained:
				'Naljepnica prekriva djecu čije obitelji njihove fotografije zadržavaju za sebe. Za svoje dijete to birate u postavkama.'
		},
		eventEditor: {
			steps: ['Događaj', 'Fotografije', 'Pregled'],
			local:
				'Fotografije ostaju na ovom uređaju i ništa se ne šalje dok ne objavite. Nedovršeni događaj ovdje čeka 7 dana.',
			classroom: 'Skupina',
			classroomLocked: 'Ukloni fotografije da bi događaj pripremio za drugu skupinu.',
			continue: 'Nastavi',
			backToDetails: 'Natrag na događaj',
			tools: 'Alati za fotografiju',
			add: 'Dodaj fotografije',
			addMore: 'Dodaj još',
			limit: (photos: number, mb: number) => `Odaberi do ${photos} fotografija, svaku do ${mb} MB.`,
			none: 'Dodaj fotografije događaja. Otvaraju se samo na ovom uređaju; ništa se još ne šalje.',
			loading: 'Pripremamo fotografije…',
			adding: (n: number, total: number) => `Pripremamo fotografiju ${n} od ${total}…`,
			photos: 'Fotografije',
			caption: 'Nekoliko riječi o ovoj fotografiji',
			captionPlaceholder: 'Nije obavezno',
			progress: (done: number, total: number) => `Pregledano ${done} od ${total} fotografija`,
			detecting: 'Tražim lica…',
			failed: 'Detekcija lica nije dostupna. Dodaj pokrove ručno i pregledaj cijelu fotografiju.',
			retry: 'Ponovi detekciju',
			manual: 'Nastavi ručno',
			noFaces: 'Nisu pronađena lica. Pregledaj cijelu fotografiju i sama prekrij svako lice.',
			noCovers: 'Još ništa nije prekriveno. Dodaj pokrov preko svakog lica.',
			photo: (n: number, total: number) => `Fotografija ${n} od ${total}`,
			face: (n: number) => `Lice ${n}`,
			remaining: (n: number) =>
				n === 1
					? 'Još 1 lice treba označiti ili ostaviti prekrivenim.'
					: `Još ${n} lica treba označiti ili ostaviti prekrivenima.`,
			addCover: 'Dodaj pokrov',
			who: 'Tko je na slici?',
			pick: 'Dodirni lice na fotografiji da bi rekao tko je to.',
			crop: 'Izrez originala — vidljiv samo tijekom uređivanja',
			search: 'Pronađi dijete',
			already: 'Već na slici',
			empty: 'Nema djece koja odgovaraju pretrazi.',
			covered: 'Ostavi prekriveno',
			coverRest: (n: number) => `Ostavi preostala lica prekrivenima (${n})`,
			coveredRest: (n: number) => `Prekriveno je još ${count(n, 'lice', 'lica', 'lica')}.`,
			removeCover: 'Ukloni pokrov',
			sticker: 'Naljepnica',
			stickerNames: {
				smile: 'Smješko',
				star: 'Zvijezda',
				heart: 'Srce',
				sun: 'Sunce',
				flower: 'Cvijet',
				cloud: 'Oblak',
				bubble: 'Mjehurić',
				cat: 'Maca',
				bear: 'Medo',
				bunny: 'Zeko',
				fox: 'Lisica',
				frog: 'Žabica',
				panda: 'Panda',
				chick: 'Pile',
				penguin: 'Pingvin',
				ladybug: 'Bubamara',
				moon: 'Mjesec',
				strawberry: 'Jagoda'
			},
			undo: 'Poništi',
			redo: 'Vrati poništeno',
			zoom: 'Povećanje',
			assigned: (name: string) => `Označeno: ${name}`,
			reviewed: 'Pregledano',
			review: 'Pregledano, sljedeća fotografija',
			nextPhoto: 'Sljedeća fotografija',
			reviewNeeded: 'Potreban pregled',
			overlap:
				'Neki se pokrovi preklapaju. Zajednički dio vidi samo obitelj koja smije vidjeti sva lica u tom dijelu. Provjeri rubove.',
			removePhoto: 'Ukloni fotografiju',
			removePhotoCopy: 'Ova fotografija i sve označeno na njoj nestaju iz nacrta.',
			back: 'Natrag na fotografije',
			backToGrid: 'Natrag na sve fotografije',
			previewFailed: 'Pregled nije moguće pripremiti. Vrati se na fotografije i pokušaj ponovno.',
			unusable: 'Fotografiju nije moguće otvoriti. Odaberi JPEG, PNG, WebP ili HEIC fotografiju.',
			leaveTitle: 'Napustiti događaj?',
			leaveCopy:
				'Ovaj uređaj još nije spremio fotografije ni ono što je na njima označeno, pa bi bili izgubljeni.',
			leave: 'Napusti i odbaci',
			stay: 'Ostani',
			allReviewed: 'Sve su fotografije pregledane.',
			tooManyFaces:
				'Na fotografiji je previše pokrova. Odaberi drugu fotografiju ili ukloni pogrešne detekcije.',
			rosterChanged: 'Popis djece u skupini se promijenio. Ponovno provjeri oznake.',
			draftFound: 'Nedovršeni događaj',
			draftFoundCopy: (n: number) =>
				`Na ovom uređaju čeka nedovršeni događaj s ${count(n, 'fotografijom', 'fotografije', 'fotografija')}.`,
			draftContinue: 'Nastavi',
			draftDiscard: 'Kreni ispočetka',
			localChange:
				'Nove fotografije ostaju na ovom uređaju dok ne spremite promjene. Promjena se ne čuva ovdje, pa je dovršite odjednom.',
			published: 'Fotografije koje su već objavljene',
			publishedHint:
				'Pokrovi na ovim fotografijama više se ne mogu mijenjati. Kad se fotografija objavi, zaključava se tako da svaka obitelj vidi samo ono što smije, a izvorna fotografija bez pokrova nigdje se ne čuva. Možete joj promijeniti opis ili je maknuti. Ako pokrov treba ispraviti, maknite fotografiju i dodajte je ponovno.',
			moveEarlier: 'Pomakni prije',
			moveLater: 'Pomakni poslije',
			orderHint:
				'Fotografije se prikazuju ovim redoslijedom, a prva je ona koju pokazuje kartica na ploči. Povucite fotografiju u nizu ili upotrijebite Pomakni prije i Pomakni poslije.',
			removePublished: 'Makni fotografiju',
			removePublishedCopy:
				'Obitelji više neće vidjeti ovu fotografiju. Tko ju je već spremio, zadržava svoju kopiju.',
			keepOne:
				'Događaj treba barem jednu fotografiju. Uklonite događaj da ga posve skinete s ploče.'
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
		headOnly: {
			title: 'Ovu stranicu može otvoriti samo BubbleBoard administrator',
			copy: 'Ako vam ovdje nešto treba, obratite se BubbleBoard administratoru u vrtiću.'
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
			teachers: (value: number) => count(value, 'odgojiteljica', 'odgojiteljice', 'odgojiteljica')
		},
		unreadable: {
			title: 'Neki se zapisi nisu otvorili',
			copy: 'BubbleBoard na ovom uređaju nije mogao otvoriti neke zapise vašeg vrtića. Pokušajte ponovno, a ako se to ponavlja, javite BubbleBoard administratoru.'
		},
		staffOnly: {
			title: 'Ova je stranica za odgojiteljice',
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
			nameHint: 'Vidjet će ga druge odgojiteljice, na primjer „Ana Horvat”.',
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
				head: 'QR kod BubbleBoard administratora',
				lead: 'QR kod voditeljice skupine',
				teacher: 'QR kod odgojiteljice',
				recovery: 'QR kod za oporavak',
				family: 'Obiteljski QR kod'
			},
			scan: (address: string) =>
				`Usmjerite kameru mobitela prema QR kodu ili otvorite ${address} i upišite:`,
			about: 'Obavijesti i fotografije iz vrtića.',
			private: 'Ne dijelite ovaj QR kod. Ako ga izgubite, vrtić će vam dati novi.',
			recovery:
				'Rezervni QR kod za slučaj da se izgube svi QR kodovi BubbleBoard administratora: tada se samo njime mogu zamijeniti izgubljeni QR kodovi i dodavati djeca, odgojiteljice i skupine. Tko ga ima, može sve što i BubbleBoard administrator, zato ga čuvajte pod ključem u vrtiću, odvojeno od svakodnevnih QR kodova.',
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
			title: 'Upravljanje',
			head: 'Evo vašeg vrtića.',
			teacher: 'Evo vaših skupina.',
			classrooms: 'Skupine',
			addClassroom: 'Dodaj skupinu',
			classroomName: 'Naziv skupine',
			teachers: 'Odgojiteljice',
			teachersDetail: 'Imena, skupine i QR kodovi',
			emptyHead: 'Započnite dodavanjem prve skupine.',
			emptyTeacher:
				'Još niste dodani ni u jednu skupinu. Može vas dodati BubbleBoard administrator.'
		},
		classroom: {
			children: 'Djeca',
			addChild: 'Dodaj dijete',
			empty: 'U ovoj skupini još nema djece.',
			teachers: (names: string[]) => `Odgojiteljice: ${list(names)}`,
			noTeachers: 'U ovoj skupini još nema odgojiteljica.',
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
		sharing: {
			title: 'Lice na fotografijama događaja',
			hint: 'Postavite prema obiteljskoj izjavi o privoli. Roditelji to mogu promijeniti sami u aplikaciji, a vrijedi za fotografije objavljene od tada.',
			covered: 'Prekriveno za druge obitelji',
			coveredHint:
				'Druge obitelji u skupini vide naljepnicu preko lica djeteta. Naljepnica prekriva lice, no tko dobro poznaje dijete može ga prepoznati i po kosi ili odjeći.',
			shared: 'Obitelji skupine smiju vidjeti lice',
			sharedHint:
				'Svi obiteljski QR kodovi ovog djeteta to dopuštaju, kako piše u izjavi o privoli.',
			saved: 'Spremljeno.'
		},
		child: {
			cards: 'Obiteljski QR kodovi',
			noCards: 'Još nema obiteljskog QR koda. Dodajte ga kako bi se obitelj mogla povezati.',
			also: (children: string[]) => `Vrijedi i za: ${list(children)}`,
			alsoElsewhere: 'Vrijedi i u drugoj skupini',
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
		// Što pojedina članica osoblja smije, na njezinu QR kodu, na popisu odgojiteljica i u njezinu obrascu.
		roles: {
			teacher: 'Odgojiteljica',
			lead: 'Voditeljica skupine',
			head: 'BubbleBoard administrator'
		},
		teachers: {
			title: 'Odgojiteljice',
			add: 'Dodaj odgojiteljicu',
			you: 'vi',
			noClassrooms: 'Bez skupine',
			recoveryTitle: 'Za hitne slučajeve',
			recoveryDetail: 'Otvara sve ako se izgube svi QR kodovi BubbleBoard administratora.'
		},
		teacher: {
			newTitle: 'Dodaj odgojiteljicu',
			name: 'Ime',
			classrooms: 'Skupine',
			noClassrooms: 'Još nema skupina.',
			role: 'Što smije',
			teacherHint: 'Objavljuje obavijesti i fotografije u svojim skupinama.',
			leadHint:
				'Sve što i odgojiteljica, a uz to u svojim skupinama upisuje djecu, izrađuje obiteljske QR kodove i uređuje postavke poruka roditelja.',
			headHint:
				'Sve što i voditeljica skupine, i to u svakoj skupini, a uz to dodaje skupine, odgojiteljice i stranice s informacijama.',
			selfRole: 'Ovo može promijeniti drugi BubbleBoard administrator.',
			create: 'Izradi QR kod',
			remove: 'Ukloni odgojiteljicu',
			removeTitle: () => 'Ukloniti odgojiteljicu?',
			removeCopy: (name: string) =>
				`${name} više neće moći otvoriti BubbleBoard, a uređaji s tim QR kodom bit će odjavljeni.`,
			self: 'Ovo ste vi. Ukloniti vas može drugi BubbleBoard administrator.',
			recovery:
				'Rezervni QR kod za slučaj da se izgube svi QR kodovi BubbleBoard administratora. Tada se samo njime mogu zamijeniti izgubljeni QR kodovi, a bez njega nitko ne bi mogao dodavati djecu, odgojiteljice ni skupine. Budući da može sve što i BubbleBoard administrator, čuvajte ga pod ključem u vrtiću, odvojeno od svakodnevnih QR kodova, i zamijenite ga ako ga je netko drugi možda vidio.'
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
			copy: 'Povežite još jedan mobitel, tablet ili računalo, na primjer za baku i djeda, bez ispisanog QR koda.',
			show: 'Dodaj uređaj',
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
		devices: {
			title: 'Povezani uređaji',
			copy: 'Svi mobiteli, tableti i računala povezani za vašu obitelj. Imena vidi samo vaša obitelj.',
			current: 'Ovaj uređaj',
			unnamed: 'Uređaj bez imena',
			nameLabel: 'Tko koristi ovaj uređaj?',
			namePlaceholder: 'Mama, djed Ivo…',
			nameHint: 'Ovo ime vidi samo vaša obitelj, na popisu povezanih uređaja.',
			addName: 'Dodaj ime',
			changeName: 'Promijeni ime',
			removeTitle: (name: string) => `Ukloniti ${name}?`,
			removeCopy:
				'Ovaj će uređaj biti odjavljen. Za ponovno korištenje BubbleBoarda na njemu trebat će vaš obiteljski QR kod.',
			about: 'O uklanjanju uređaja',
			aboutCopy:
				'Uklonjeni uređaj može se ponovno povezati vašim obiteljskim QR kodom. Ako vaš QR kod ima netko tko ga ne bi smio imati, zamolite vrtić da ga zamijeni. Zamjena odjavljuje sve uređaje vaše obitelji, a vi ih ponovno povezujete novim QR kodom.',
			cardCopy:
				'Upišite ime, na primjer Mama ili djed Ivo. Vaša ga obitelj vidi u Opcijama, pa znate koji su uređaji povezani. Vrtić ga ne vidi.',
			notNow: 'Ne sada'
		},
		about: 'O BubbleBoardu',
		info: {
			title: 'Info',
			empty:
				'Ovdje još nema ničega. Kad vrtić doda informacije za sve, na primjer radno vrijeme ili kontakte, pojavit će se ovdje.',
			emptyHead:
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
			hint: 'Ovu stranicu vide obitelji i odgojiteljice svih skupina dok je ne promijenite ili obrišete. Spremanje ne šalje obavijest.',
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
			noClassrooms:
				'Obavijesti možete objavljivati kad vas BubbleBoard administrator doda u skupinu.'
		},
		polls: {
			add: 'Dodaj anketu',
			addHint:
				'Pitanje i opis ankete napišite u tekstu obavijesti, a ovdje dodajte odgovore. Tko je što odabrao vide samo odgojiteljice.',
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
			private: 'Vaš odgovor vide samo odgojiteljice.',
			counted: 'Broj glasova vide sve obitelji, a tko je što odabrao samo odgojiteljice.',
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
			classrooms: 'Skupine o kojima želite čuti',
			classroomsHint:
				'Vodite sve skupine, pa odaberite o kojima želite čuti. Skupina dodana kasnije javlja vam se dok je ne isključite.',
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
			zoomOut: 'Smanji',
			close: 'Zatvori',
			save: 'Spremi',
			share: 'Podijeli',
			opening: 'Otvaramo fotografiju…',
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
			editMessage: 'Uredi',
			editing: 'Uređivanje poruke',
			saveEditing: 'Spremi promjene',
			cancelEditing: 'Odustani',
			editHint: 'Poruku možete promijeniti dok je odgojiteljica ne otvori.',
			edited: 'uređeno',
			removeMessage: 'Izbriši',
			removeMessageTitle: 'Izbrisati ovu poruku?',
			removeMessageCopy:
				'Tekst i priložene datoteke brišu se i kod obitelji, a na njihovu mjestu ostaje „Poruka je izbrisana”. Ovo se ne može poništiti.',
			deletedMessage: 'Poruka je izbrisana',
			empty: 'Nema upita koji odgovaraju odabiru.',
			emptyTitle: 'Još nema poruka',
			emptyCopy: 'Ovdje se vode privatni razgovori s odgojiteljicama vaše skupine.',
			emptyCopyStaff: 'Ovdje se vode privatni razgovori s obiteljima vaših skupina.',
			unread: 'Nepročitano',
			older: 'Ranije poruke',
			more: 'Više upita',
			refresh: 'Osvježi',
			loading: 'Učitavanje…',
			parent: 'Obitelj',
			teacher: 'Odgojiteljica',
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
				'Novi upit i svaka poruka poslana prije nego što odgojiteljica odgovori troše jedan upit. Odgovor na poruku odgojiteljice uvijek je besplatan, a limit se obnavlja prvog dana u mjesecu.',
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
			free: 'Odgovor na poruku odgojiteljice ne troši upit.',
			noQuota:
				'Iskoristili ste upite za ovaj mjesec. Kad se odgojiteljica javi, odgovor je opet besplatan.',
			quota: (remaining: number) =>
				`Preostalo ovaj mjesec: ${count(remaining, 'upit', 'upita', 'upita')}`,
			confirmTitle: 'Poslati ovu poruku?',
			confirmCopy: (left: number) =>
				`Odgojiteljica još nije odgovorila na vašu zadnju poruku, pa ova troši jedan upit. Ovaj mjesec ostat će vam ${count(left, 'upit', 'upita', 'upita')}.`
		},
		errors: {
			'meeting-day-changed':
				'Termini dana su promijenjeni. Popis je osvježen; zatvorite potvrdu i ponovno provjerite termine.',
			'meeting-overlap':
				'Termini se preklapaju s postojećom ponudom ove skupine ili odgojiteljice. Odaberite drugo vrijeme.',
			'meeting-changed':
				'Termin je promijenjen ili upravo rezerviran. Popis je osvježen; odaberite slobodan termin.',
			'meeting-already-booked': 'Za ovo dijete već postoji rezervacija u ovoj ponudi.',
			'unreadable-messages': 'Neki se upiti nisu mogli otvoriti na ovom uređaju.',
			'messages-disabled': 'Slanje poruka roditelja isključeno je za ovu skupinu.',
			'messages-hours': 'Slanje nije unutar termina skupine. Vaš je tekst sačuvan.',
			'messages-limit': 'Iskoristili ste upite za ovaj mjesec.',
			'message-seen': 'Odgojiteljica je već otvorila ovu poruku pa se više ne može promijeniti.',
			'message-answered': 'Na ovu je poruku već odgovoreno pa se više ne može promijeniti.',
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
				'Neki zapisi vašeg vrtića nisu se otvorili na ovom uređaju. Pokušajte ponovno, a ako se to ponavlja, javite BubbleBoard administratoru.',
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
			'last-head':
				'BubbleBoardu treba barem jedan BubbleBoard administrator. Najprije nekoga drugog postavite za administratora.',
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
