export const en = {
	languageName: 'English',
	ogLocale: 'en_US',
	title: 'A little closer to their day',
	description:
		'BubbleBoard is a free, open-source app that connects kindergarten teachers and families. Notices, photos from the day, and private messages, all in one place and private by design.',
	skip: 'Skip to content',
	home: 'BubbleBoard home',
	language: 'Language',
	nav: {
		label: 'Main',
		sections: {
			features: 'Features',
			how: 'How it works',
			privacy: 'Privacy',
			security: 'Security',
			teachers: 'For teachers',
			kindergartens: 'For kindergartens'
		}
	},
	hero: {
		heading: 'A little closer',
		headingAccent: 'to their day.',
		cta: 'For your kindergarten',
		status: 'App coming soon',
		quiet: 'Made for families. Inspired by the Bubbles.',
		photoAlt: 'Children laughing and blowing soap bubbles in a sunny park',
		// Lock-screen notifications, newest first. They stay this generic; the details wait in the app.
		notifications: [
			{ time: 'Just now', message: 'New photos from today' },
			{ time: '8:30', message: 'New notice from your kindergarten' }
		]
	},
	features: {
		title: 'Everything from kindergarten, in one calm place.',
		copy: 'No more scattered group chats, paper notes, and missed messages. BubbleBoard keeps the essentials together.',
		notices: {
			title: 'Classroom notices',
			copy: 'Reminders and news from the classroom, all in one feed.'
		},
		photos: {
			title: 'Photos from the day',
			copy: 'Moments from the classroom, shared with care and removed from the app after a set time.'
		},
		messages: {
			title: 'A direct line to teachers',
			copy: 'Private conversations between your family and your child’s teachers.'
		},
		documents: {
			title: 'Shared documents',
			copy: 'Weekly plans, menus, and forms, right next to everything else.'
		},
		notifications: {
			title: 'Gentle notifications',
			copy: 'A quick heads-up when something new arrives, with no details on your lock screen.'
		},
		devices: {
			title: 'On every family device',
			copy: 'One family card works on every phone, tablet, and computer at home.'
		}
	},
	how: {
		title: 'One card. Your classroom.',
		copy: 'Parents and teachers join the same way. Your kindergarten hands out QR cards: one family card for all your family’s devices, and a teacher card for each teacher. That’s all you need.',
		photoAlt: 'A kindergarten teacher sitting on the floor talking with a group of children',
		steps: [
			{
				title: 'Add it to your home screen',
				copy: 'BubbleBoard installs from your browser. No app store needed.'
			},
			{ title: 'Turn on notifications', copy: 'Hear when there’s something new to see.' },
			{
				title: 'Scan your card',
				copy: 'Open the app and scan the card from your kindergarten. No username or password to remember.'
			}
		]
	},
	privacy: {
		title: 'Your child’s face. Your family’s choice.',
		copy: 'Parents decide whether other families can see their child in classroom photos. You always see your own child clearly.',
		photoAlt: 'Children painting with watercolours around a table, seen from above',
		facts: [
			'No usernames or passwords',
			'Faces blurred for other families, if you prefer',
			'Photos removed from the app after a set time'
		]
	},
	security: {
		title: 'Locked before it leaves your phone.',
		copy: 'Photos, messages, and children’s names are encrypted before they leave the device. Classroom notices and photos open only for families in your classroom and teachers at your kindergarten, and private conversations only for your family and those teachers.',
		device: {
			title: 'Encrypted on your device',
			copy: 'Content is encrypted on your phone or computer before it’s uploaded.'
		},
		server: {
			title: 'Unreadable if it leaks',
			copy: 'The server stores content without the keys needed to read it. A leak of stored content, without the keys on your devices, reveals no photos, names, or messages.'
		},
		host: {
			title: 'Keys stay in your kindergarten',
			copy: 'Whoever runs the server, us included, doesn’t have them. The code is public, so anyone can see how it works.'
		},
		note: 'Encryption protects what’s stored on the server. It can’t take back a photo someone has already saved to their own phone.'
	},
	teachers: {
		title: 'Made for teachers, too.',
		copy: 'Share the day from a phone or a computer in a minute, with sensible defaults built in.',
		preview: {
			title: 'Preview before posting',
			copy: 'See exactly what other families will see before a photo goes out.'
		},
		remove: {
			title: 'Delete right away',
			copy: 'Remove a post from the app instantly if something slips through.'
		},
		retention: {
			title: 'You choose how long',
			copy: 'Photos are removed from the app after the time you choose, from one day to three months.'
		},
		access: {
			title: 'Access you control',
			copy: 'Give a substitute temporary access or replace a lost card in a few taps.'
		}
	},
	kindergartens: {
		title: 'Want BubbleBoard for your kindergarten?',
		copy: 'BubbleBoard isn’t a service you sign up for. Each kindergarten gets its own installation, so its families’ content is never mixed with anyone else’s. Tell us about your kindergarten and we’ll help you get started.',
		facts: [
			'Free and open source, with no ads and no tracking',
			'Nothing for parents to buy or download from an app store',
			'Works on the phones and computers you already have'
		],
		hosting:
			'The software is free. Each kindergarten covers its own hosting, which is usually a small cost.',
		cta: 'Write to us',
		subject: 'BubbleBoard for our kindergarten',
		mission:
			'BubbleBoard is made by Commit, a small group of developers who build free, open-source apps for everyday problems.',
		itTeam: 'Have your own IT team?',
		code: 'The code is on GitHub.'
	},
	footer: {
		tagline: 'A little community. A lot of care.',
		explore: 'Explore',
		project: 'Project',
		github: 'GitHub',
		// Followed by a link to Commit.
		madeBy: 'Made with love by the people at',
		license: 'License (AGPL-3.0)',
		credits: 'Credits and licenses'
	},
	build: {
		label: 'Build',
		// The build had uncommitted changes, so its commit doesn't fully describe it.
		modified: 'modified',
		// Built without Git, for example from a source ZIP.
		unknown: 'Unknown build'
	},
	app: {
		about: 'About BubbleBoard',
		loading: 'Opening BubbleBoard…',
		noscript:
			'BubbleBoard needs JavaScript to open your classroom. Turn it on in your browser settings, or open BubbleBoard in another browser.',
		unsupported: {
			title: 'This browser can’t open BubbleBoard',
			copy: 'BubbleBoard needs to keep your classroom’s keys safely on this device, and this browser doesn’t allow it. Update your browser, or open BubbleBoard in a current version of Safari, Chrome, Firefox, or Edge.'
		},
		offline: {
			title: 'BubbleBoard can’t be reached',
			copy: 'Check your internet connection, then try again.',
			retry: 'Try again'
		},
		connectFirst: {
			title: 'Connect this device first',
			copy: 'Open BubbleBoard’s home page and use your card.',
			action: 'Go to BubbleBoard'
		},
		adminOnly: {
			title: 'Only admins can open this page',
			copy: 'If you need something here, ask an admin at your kindergarten.'
		},
		notFound: {
			title: 'Not found',
			copy: 'It may have been moved or removed. Go back and try again.'
		},
		actions: {
			cancel: 'Cancel',
			save: 'Save',
			saved: 'Saved',
			done: 'Done',
			rename: 'Rename',
			remove: 'Remove',
			working: 'Just a moment…'
		},
		counts: {
			children: (count: number) => (count === 1 ? '1 child' : `${count} children`),
			teachers: (count: number) => (count === 1 ? '1 teacher' : `${count} teachers`)
		},
		unreadable: {
			title: 'Some records didn’t open',
			copy: 'BubbleBoard couldn’t open some of your kindergarten’s records on this device. Try again, and if it keeps happening, tell an admin.'
		},
		staffOnly: {
			title: 'This page is for teachers',
			copy: 'A family card opens the home page, where notices and photos will appear.'
		},
		connect: {
			title: 'Connect this device',
			copy: 'Use the QR card from your kindergarten. You can also point your phone’s camera at the card.',
			scan: 'Scan card',
			enter: 'Enter code',
			camera: 'Point the camera at the QR code on the card.',
			cameraStarting: 'Opening the camera…',
			cameraBlocked:
				'BubbleBoard isn’t allowed to use the camera. Allow it in your browser’s settings, or choose a photo of the card.',
			noCamera: 'There’s no camera BubbleBoard can use here. Choose a photo of the card instead.',
			photo: 'Choose a photo',
			code: 'Card code',
			codeHint: 'The 28 letters and numbers printed on the card.',
			submit: 'Connect',
			scanning: 'Reading the card…',
			connecting: 'Connecting…',
			replaceTitle: 'Use a different card?',
			replaceStaff: (name: string) =>
				`This device is connected as ${name}. To connect it that way again later, you’ll need that card.`,
			replaceOther:
				'This device is already connected with another card. To connect it that way again later, you’ll need that card.',
			replaceConfirm: 'Use the new card',
			keep: 'Keep the current card'
		},
		setup: {
			title: 'Set up BubbleBoard',
			copy: 'You’ll get two cards: your own, and a recovery card to keep somewhere safe. Both can manage everything.',
			name: 'Your name',
			nameHint: 'Other teachers will see it, for example “Ana Horvat”.',
			token: 'Setup code',
			tokenHint: 'It’s in the setup link. Ask whoever installed BubbleBoard.',
			submit: 'Create cards',
			creating: 'Creating your cards…',
			connectedTitle: 'This device is already connected',
			connectedCopy: 'BubbleBoard is set up and ready to use.',
			open: 'Open BubbleBoard',
			connect: 'Connect with your card'
		},
		card: {
			title: (count: number): string =>
				count === 1 ? 'Print or save this card' : 'Print or save these cards',
			copy: 'The code is shown only now. If you leave before printing, use Replace card to make a new one.',
			setupCopy:
				'The codes are shown only now. Print both cards, or save them as a PDF, before you continue.',
			print: 'Print',
			confirm: 'I’ve printed or saved both cards',
			continue: 'Continue',
			leaveFirst: 'Print or save both cards first, then tick the box.',
			kinds: {
				admin: 'Admin card',
				teacher: 'Teacher card',
				recovery: 'Recovery card',
				family: 'Family card'
			},
			scan: (address: string) =>
				`Point your phone’s camera at the QR code, or go to ${address} and enter:`,
			about: 'Notices and photos from your kindergarten.',
			private: 'Don’t share this card. If it’s lost, your kindergarten can give you a new one.',
			recovery:
				'Use it only if every admin card is lost. Keep it locked away, apart from your own card.',
			qr: (name: string) => `QR code for ${name}`,
			replace: 'Replace card',
			replaceTitle: (name: string) => `Replace the card for ${name}?`,
			replaceCopy: 'The old card stops working, and every device that used it is signed out.'
		},
		home: {
			title: 'Home',
			greeting: (name: string) => `Hello, ${name}`,
			admin: 'Here’s your kindergarten.',
			teacher: 'Here are your classrooms.',
			addClassroom: 'Add classroom',
			classroomName: 'Classroom name',
			classroomExample: 'For example, Bubbles',
			teachers: 'Teachers',
			device: 'This device',
			emptyAdmin: 'Start by adding your first classroom.',
			emptyTeacher: 'You haven’t been added to a classroom yet. An admin can add you.'
		},
		classroom: {
			children: 'Children',
			addChild: 'Add child',
			empty: 'No children in this classroom yet.',
			teachers: (names: string[]) => `Teachers: ${list(names)}`,
			noTeachers: 'No teachers in this classroom yet.',
			delete: 'Delete classroom',
			deleteTitle: (name: string) => `Delete ${name}?`,
			deleteCopy: 'This can’t be undone.',
			noCards: 'No family card yet',
			replaceCards: 'Replace cards',
			replaceTitle: 'Replace family cards',
			replaceCopy: 'Choose the cards to replace, then print the new ones together.',
			selectAll: 'Select all',
			replaceSubmit: (count: number) => (count === 1 ? 'Replace 1 card' : `Replace ${count} cards`),
			replaceConfirm: (count: number) =>
				count === 1 ? 'Replace 1 card?' : `Replace ${count} cards?`,
			replaceConfirmCopy:
				'The old cards stop working, and every device that used them is signed out.'
		},
		newChild: {
			title: 'Add child',
			name: 'Child’s name',
			classroom: 'Classroom',
			cards: 'Family card',
			newCard: 'A new family card',
			cardName: 'Who gets the card?',
			cardNameHint:
				'For example “Ivana (mum)”. Parents who live apart can each get their own card later.',
			sibling: 'The card a brother or sister already has',
			siblingName: 'Brother or sister',
			submit: 'Add child',
			added: (name: string) => `Added ${name}.`,
			toPrint: (count: number) => (count === 1 ? '1 card to print' : `${count} cards to print`),
			toPrintCopy:
				'Add more children, then print all the new family cards together. Their codes are shown only on this page.',
			print: (count: number) => (count === 1 ? 'Print the card' : `Print ${count} cards`),
			leaveTitle: 'Leave without printing?',
			leaveCopy:
				'The new cards’ codes are shown only on this page. To print them later, replace the cards from the classroom.',
			leave: 'Leave',
			stay: 'Stay'
		},
		child: {
			cards: 'Family cards',
			noCards: 'No family card yet. Add one so the family can connect.',
			also: (children: string[]) => `Also for ${list(children)}`,
			removeCardTitle: (name: string) => `Remove the card for ${name}?`,
			removeCardShared: (children: string[]) => `The card keeps working for ${list(children)}.`,
			removeCardLast: 'The card stops working, and every device that used it is signed out.',
			cardName: 'Name on the card',
			addFirstCard: 'Add a family card',
			addCard: 'Add another family card',
			addCardHint: 'For parents who live apart: each card gets its own private messages.',
			move: 'Move to another classroom',
			moveSubmit: 'Move',
			rename: 'Rename child',
			remove: 'Remove child',
			removeTitle: (name: string) => `Remove ${name}?`,
			removeCopy: (cards: string[]) =>
				cards.length
					? `Family cards that will stop working: ${list(cards)}.`
					: 'This can’t be undone.'
		},
		teachers: {
			title: 'Teachers',
			add: 'Add teacher',
			admin: 'Admin',
			you: 'you',
			noClassrooms: 'No classrooms'
		},
		teacher: {
			newTitle: 'Add teacher',
			name: 'Name',
			classrooms: 'Classrooms',
			noClassrooms: 'There are no classrooms yet.',
			admin: 'Admin',
			adminHint: 'Can add classrooms, teachers, and children, and open every classroom.',
			selfAdmin: 'Another admin can change this.',
			create: 'Create card',
			remove: 'Remove teacher',
			removeTitle: (name: string) => `Remove ${name}?`,
			removeCopy: (name: string) =>
				`${name} won’t be able to open BubbleBoard anymore, and devices using their card will be signed out.`,
			self: 'This is you. Another admin can remove you.',
			recovery:
				'The recovery card can do everything an admin can. Keep it locked away, and replace it if someone else may have seen it.'
		},
		device: {
			title: 'This device',
			staff: (name: string) => `Connected as ${name}`,
			family: 'Connected with a family card',
			signOut: 'Sign out of this device',
			signOutTitle: 'Sign out of this device?',
			signOutCopy: 'To use BubbleBoard here again, you’ll need your card.'
		},
		family: {
			joined: (classrooms: string[]) =>
				classrooms.length ? `You’ve joined ${list(classrooms)}` : 'You’re connected',
			copy: 'Notices and photos from your kindergarten will appear here. To come back, scan your card again or bookmark this page.'
		},
		errors: {
			offline: 'BubbleBoard can’t be reached. Check your internet connection and try again.',
			'signed-out': 'This device was signed out. Scan your card again to continue.',
			'unreadable-records':
				'Some of your kindergarten’s records didn’t open on this device. Try again, and if it keeps happening, tell an admin.',
			'unknown-card': 'This card doesn’t work anymore. Ask your kindergarten for a new one.',
			'invalid-card': 'That isn’t a BubbleBoard card code. Check it and try again.',
			mistyped: 'One of the characters doesn’t match. Check the code and try again.',
			'other-installation': 'This card is for a different BubbleBoard.',
			'no-code':
				'There’s no readable QR code in that photo. Try again with the whole card in view.',
			unreadable:
				'This card couldn’t open BubbleBoard’s records. Ask your kindergarten for a new card.',
			'too-many-attempts': 'Too many attempts. Wait a minute, then try again.',
			'wrong-setup-token':
				'This setup code isn’t right. Ask whoever installed BubbleBoard for a new setup link.',
			'already-set-up': 'BubbleBoard is already set up here. Connect with your card instead.',
			'setup-unavailable':
				'Setup isn’t ready on this installation. Ask whoever installed BubbleBoard.',
			'last-admin': 'BubbleBoard needs at least one admin. Make someone else an admin first.',
			'not-empty': 'Move or remove this classroom’s children first.',
			'empty-name': 'A name can’t be left blank. Type one and try again.',
			stale:
				'Someone else changed this at the same time. It’s up to date now, so please try again.',
			'not-found': 'This doesn’t exist anymore.',
			forbidden: 'You don’t have access to this.',
			unexpected: 'Something went wrong. Please try again.'
		}
	}
};

/** Names in a sentence, such as “Bubbles and Ladybirds”. */
function list(names: string[]) {
	return new Intl.ListFormat('en', { type: 'conjunction' }).format(names);
}

export type Messages = typeof en;
