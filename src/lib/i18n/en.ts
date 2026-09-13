/** What every notification says. The service worker shows it without the rest of the messages. */
export const notificationText = 'New notice from your kindergarten';

export const en = {
	languageName: 'English',
	ogLocale: 'en_US',
	title: 'A little closer to their day',
	description:
		'BubbleBoard is a free, open-source app that connects kindergarten teachers and families. Notices, photos from the day, and private messages, all in one place and private by design.',
	skip: 'Skip to content',
	home: 'BubbleBoard home',
	language: 'Language',
	// The tag after the title of something on the landing page that BubbleBoard can't do yet.
	soon: 'Coming soon',
	nav: {
		label: 'Main',
		sections: {
			features: 'Features',
			how: 'How it works',
			privacy: 'Privacy',
			teachers: 'For teachers',
			security: 'Security',
			kindergartens: 'For kindergartens'
		}
	},
	hero: {
		heading: 'A little closer',
		headingAccent: 'to their day.',
		cta: 'For your kindergarten',
		open: 'Open the app',
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
			copy: 'One family QR code works on every phone, tablet, and computer at home.'
		}
	},
	how: {
		title: 'One QR code. Your classroom.',
		copy: 'Parents and teachers join the same way. Your kindergarten hands out QR codes: one for all your family’s devices, and one for each teacher. That’s all you need.',
		photoAlt:
			'Children lying in a circle on a kindergarten rug, laughing, some with their legs in the air',
		// In the order a family goes through them: the QR code's link opens BubbleBoard, which then asks to be
		// installed, and the installed app asks to turn on notifications.
		steps: [
			{
				title: 'Scan your QR code',
				copy: 'Point your phone’s camera at the QR code from your kindergarten. No username or password to remember.'
			},
			{
				title: 'Install the app',
				copy: 'BubbleBoard shows you how to add it to your home screen, right from your browser. No app store needed.'
			},
			{ title: 'Turn on notifications', copy: 'Hear when there’s something new to see.' }
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
			copy: 'The server has no keys to read what it stores, so a leak reveals no photos, names, or messages.'
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
			copy: 'Give a substitute temporary access or replace a lost QR code in a few taps.'
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
		credits: 'Credits and licenses',
		// In the footer of the landing pages.
		privacy: 'Privacy policy'
	},
	// The privacy policy (/privacy), in short points. It describes what the code does, so change it with anything
	// that changes what BubbleBoard stores, where it goes, or for how long.
	privacyPolicy: {
		title: 'Privacy policy',
		description: 'What BubbleBoard stores about families and children, where, and for how long.',
		updated: 'Updated on 13 September 2026',
		// Followed by the project's contact address, which the last point calls the address below.
		points: [
			{
				title: 'What’s stored',
				copy: 'Names, notices, polls, photos, and files are encrypted on the device before they’re sent. The server can’t read them, and keeps only what it needs to work, without names, such as when a notice was posted.'
			},
			{
				title: 'Where',
				copy: 'BubbleBoard runs on Cloudflare, a US company, so data may also be handled outside the EU, under the safeguards EU law requires.'
			},
			{
				title: 'How long',
				copy: 'Notices stay up for the 1 to 90 days a teacher chooses, a notice board photo until it’s replaced, names until an admin removes them, and a device’s login until it goes unused for 90 days. Deleted records stay in the database’s backup history for up to 30 days.'
			},
			{
				title: 'Notifications',
				copy: 'If you turn them on, your browser’s push service, such as Apple’s or Google’s, gets only an address for your device, never what’s new.'
			},
			{
				title: 'Cookies',
				copy: 'Just one, which keeps your device logged in. BubbleBoard can’t work without it, so it doesn’t ask for consent. No ads, analytics, or tracking.'
			},
			{
				title: 'Your rights',
				copy: 'You can ask for a copy of your and your child’s data, and for it to be corrected or deleted. Write to the address below, or ask your child’s teachers. You can also complain to the Croatian Personal Data Protection Agency (AZOP).'
			}
		]
	},
	build: {
		label: 'Build',
		// The build had uncommitted changes, so its commit doesn't fully describe it.
		modified: 'modified',
		// Built without Git, for example from a source ZIP.
		unknown: 'Unknown build'
	},
	// A page that doesn't exist, or an error no page handles, shown with a popped bubble.
	error: {
		missingTitle: 'Oops! This bubble popped.',
		missingCopy: 'There’s nothing at this address. It may have moved, or the link was mistyped.',
		title: 'Oops! Something popped.',
		copy: 'Something went wrong on our side. Try again in a moment.',
		home: 'Go to the home page',
		app: 'Open BubbleBoard'
	},
	// In the app, what cards are and do is called a QR code: parents found "card" confusing (2026-09-13).
	app: {
		// When a notice or board photo went up (formatDateTime).
		dateTime: (day: string, month: string, year: number, time: string) =>
			`${day}/${month}/${year} at ${time}`,
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
			copy: 'Open BubbleBoard’s home page and scan your QR code.',
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
			add: 'Add',
			// The way back from a page, in its top corner.
			back: 'Back',
			cancel: 'Cancel',
			save: 'Save',
			saved: 'Saved',
			done: 'Done',
			rename: 'Rename',
			remove: 'Remove',
			selectAll: 'Select all',
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
			copy: 'A family QR code opens the home page, where notices and photos will appear.'
		},
		connect: {
			title: 'Connect this device',
			copy: 'Scan the QR code from your kindergarten. Instead of scanning, you can type the code printed under it, or choose a photo of it.',
			scan: 'Scan QR code',
			enter: 'Enter code',
			camera: 'Point the camera at the QR code.',
			cameraStarting: 'Opening the camera…',
			cameraBlocked:
				'BubbleBoard isn’t allowed to use the camera. Allow it in your browser’s settings, or choose a photo of the QR code.',
			noCamera:
				'There’s no camera BubbleBoard can use here. Choose a photo of the QR code instead.',
			photo: 'Choose a photo',
			code: 'Code',
			codeHint: 'The 28 letters and numbers printed under the QR code.',
			submit: 'Connect',
			scanning: 'Reading the QR code…',
			connecting: 'Connecting…',
			replaceTitle: 'Use a different QR code?',
			replaceStaff: (name: string) =>
				`This device is connected as ${name}. To connect it that way again later, you’ll need that QR code.`,
			replaceOther:
				'This device is already connected with another QR code. To connect it that way again later, you’ll need that QR code.',
			replaceConfirm: 'Use the new QR code',
			keep: 'Keep the current one'
		},
		setup: {
			title: 'Set up BubbleBoard',
			copy: 'You’ll get two QR codes: your own, and a recovery QR code to keep somewhere safe. Both can manage everything.',
			name: 'Your name',
			nameHint: 'Other teachers will see it, for example “Ana Horvat”.',
			token: 'Setup code',
			tokenHint: 'It’s in the setup link. Ask whoever installed BubbleBoard.',
			submit: 'Create QR codes',
			creating: 'Creating your QR codes…',
			connectedTitle: 'This device is already connected',
			connectedCopy: 'BubbleBoard is set up and ready to use.',
			open: 'Open BubbleBoard',
			connect: 'Connect with your QR code'
		},
		card: {
			title: (count: number): string =>
				count === 1 ? 'Print or save this QR code' : 'Print or save these QR codes',
			copy: 'The code is shown only now. If you leave before printing, use Replace QR code to make a new one.',
			setupCopy:
				'The codes are shown only now. Print both QR codes, or save them as a PDF, before you continue.',
			print: 'Print',
			confirm: 'I’ve printed or saved both QR codes',
			continue: 'Continue',
			leaveFirst: 'Print or save both QR codes first, then tick the box.',
			kinds: {
				admin: 'Admin QR code',
				teacher: 'Teacher QR code',
				recovery: 'Recovery QR code',
				family: 'Family QR code'
			},
			scan: (address: string) =>
				`Point your phone’s camera at the QR code, or go to ${address} and enter:`,
			about: 'Notices and photos from your kindergarten.',
			private: 'Don’t share this QR code. If it’s lost, your kindergarten can give you a new one.',
			recovery:
				'A spare for when every admin QR code is lost: then only it can replace the lost QR codes and add children, teachers, and classrooms. Whoever has it can do everything an admin can, so keep it locked away at the kindergarten, apart from everyday QR codes.',
			qr: (name: string) => `QR code for ${name}`,
			replace: 'Replace QR code',
			replaceTitle: (name: string) => `Replace the QR code for ${name}?`,
			replaceCopy: 'The old QR code stops working, and every device that used it is signed out.'
		},
		home: {
			title: 'Home',
			// Home's first line for staff, by name, for the hour on the device's clock.
			greeting: (hour: number, name: string) => {
				const words =
					hour < 5
						? 'Good evening'
						: hour < 12
							? 'Good morning'
							: hour < 18
								? 'Good afternoon'
								: 'Good evening';
				return `${words}, ${name}`;
			}
		},
		manage: {
			title: 'Manage',
			admin: 'Here’s your kindergarten.',
			teacher: 'Here are your classrooms.',
			classrooms: 'Classrooms',
			addClassroom: 'Add classroom',
			classroomName: 'Classroom name',
			teachers: 'Teachers',
			teachersDetail: 'Names, classrooms, and QR codes',
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
			noCards: 'No family QR code yet',
			replaceCards: 'Replace QR codes',
			replaceTitle: 'Replace family QR codes',
			replaceCopy: 'Choose the QR codes to replace, then print the new ones together.',
			replaceSubmit: (count: number) =>
				count === 1 ? 'Replace 1 QR code' : `Replace ${count} QR codes`,
			replaceConfirm: (count: number) =>
				count === 1 ? 'Replace 1 QR code?' : `Replace ${count} QR codes?`,
			replaceConfirmCopy:
				'The old QR codes stop working, and every device that used them is signed out.'
		},
		newChild: {
			title: 'Add child',
			name: 'Child’s name',
			cards: 'Family QR code',
			newCard: 'New family QR code',
			newCardHint: 'You’ll print it for the family.',
			cardName: 'Who gets the QR code?',
			cardNameHint:
				'For example “Horvat family”. Parents who live apart can each get their own QR code later.',
			sibling: 'Brother’s or sister’s QR code',
			siblingHint: 'The family uses the QR code it already has.',
			siblingName: 'Brother or sister',
			submit: 'Add child',
			added: (name: string) => `Added ${name}.`,
			toPrint: (count: number) =>
				count === 1 ? '1 QR code to print' : `${count} QR codes to print`,
			toPrintCopy:
				'Add more children, then print all the new family QR codes together. They’re shown only on this page.',
			print: (count: number) => (count === 1 ? 'Print the QR code' : `Print ${count} QR codes`),
			leaveTitle: 'Leave without printing?',
			leaveCopy:
				'The new QR codes are shown only on this page. To print them later, replace them from the classroom.',
			leave: 'Leave',
			stay: 'Stay'
		},
		child: {
			cards: 'Family QR codes',
			noCards: 'No family QR code yet. Add one so the family can connect.',
			also: (children: string[]) => `Also for ${list(children)}`,
			removeCardTitle: (name: string) => `Remove the QR code for ${name}?`,
			removeCardShared: (children: string[]) => `The QR code keeps working for ${list(children)}.`,
			removeCardLast: 'The QR code stops working, and every device that used it is signed out.',
			cardName: 'Name on the QR code',
			addFirstCard: 'Add a family QR code',
			addCard: 'Add another family QR code',
			addCardHint: 'For parents who live apart: each QR code gets its own private messages.',
			move: 'Move to another classroom',
			classroom: 'Classroom',
			moveSubmit: 'Move',
			remove: 'Remove child',
			removeTitle: (name: string) => `Remove ${name}?`,
			removeCopy: (cards: string[]) =>
				cards.length
					? `Family QR codes that will stop working: ${list(cards)}.`
					: 'This can’t be undone.'
		},
		teachers: {
			title: 'Teachers',
			add: 'Add teacher',
			admin: 'Admin',
			you: 'you',
			noClassrooms: 'No classrooms',
			recoveryTitle: 'For emergencies',
			recoveryDetail: 'Opens everything if every admin QR code is lost.'
		},
		teacher: {
			newTitle: 'Add teacher',
			name: 'Name',
			classrooms: 'Classrooms',
			noClassrooms: 'There are no classrooms yet.',
			admin: 'Admin',
			adminHint: 'Can add classrooms, teachers, and children, and open every classroom.',
			selfAdmin: 'Another admin can change this.',
			create: 'Create QR code',
			remove: 'Remove teacher',
			removeTitle: (name: string) => `Remove ${name}?`,
			removeCopy: (name: string) =>
				`${name} won’t be able to open BubbleBoard anymore, and devices using their QR code will be signed out.`,
			self: 'This is you. Another admin can remove you.',
			recovery:
				'A spare for when every admin QR code is lost. Then only it can replace the lost QR codes, and without it no one could add children, teachers, or classrooms. Because it can do everything an admin can, keep it locked away at the kindergarten, apart from everyday QR codes, and replace it if someone else may have seen it.'
		},
		options: {
			title: 'Settings',
			staff: (name: string) => `Connected as ${name}`,
			family: 'Connected with a family QR code',
			signOut: 'Sign out of this device',
			signOutTitle: 'Sign out of this device?',
			signOutCopy: 'To use BubbleBoard here again, you’ll need your QR code.'
		},
		// The link to the landing page in the footer of every app page.
		about: 'About BubbleBoard',
		notices: {
			title: 'Notices',
			new: 'Add notice',
			empty: 'No notices yet. When your kindergarten puts one up, it appears here.',
			emptyStaff: 'No notices yet.',
			emptyClassroom: 'No notices for this classroom yet.',
			show: 'Show notices for',
			all: 'All classrooms',
			unreadable: 'Some notices didn’t open on this device.',
			edited: 'edited',
			edit: 'Edit',
			delete: 'Delete',
			deleteTitle: 'Delete this notice?',
			deleteCopy: 'It comes off every board right away.',
			markSeen: 'Mark as seen',
			seen: 'Seen',
			seenBy: (seen: number, families: number) =>
				`Seen by ${seen} of ${families === 1 ? '1 family' : `${families} families`}`,
			seenNames: (names: string[]) => `Seen: ${list(names)}`,
			notSeenNames: (names: string[]) => `Not seen yet: ${list(names)}`,
			newTitle: 'New notice',
			editTitle: 'Edit notice',
			text: 'Notice',
			classrooms: 'Classrooms',
			days: 'Keep it up for',
			dayCount: (count: number) => (count === 1 ? '1 day' : `${count} days`),
			// Under the number on each choice of days.
			dayUnit: (count: number): string => (count === 1 ? 'day' : 'days'),
			until: (date: string) => `It stays up until ${date}.`,
			announce: 'Notify everyone again',
			announceHint:
				'For a change everyone should see. The notice goes back to the top of the board.',
			post: 'Post notice',
			save: 'Save changes',
			noClassrooms: 'You can post notices once an admin adds you to a classroom.'
		},
		polls: {
			add: 'Add a poll',
			addHint:
				'Ask the question, and say what the poll is about, in the notice’s text, then add the answers here. Only teachers see who chose what.',
			answers: 'Answers',
			answer: (number: number) => `Answer ${number}`,
			removeAnswer: (number: number) => `Remove answer ${number}`,
			addAnswer: 'Add an answer',
			counts: 'Families see the vote counts',
			countsHint: 'Beside each answer, how many families chose it, but not which.',
			countsChanging: 'Saving clears the answers so far, and families answer again.',
			removing: 'Saving takes the poll off the notice, with its answers.',
			title: 'Poll',
			countsShown: 'Families see how many votes each answer has.',
			choose: 'Choose an answer',
			confirm: 'Confirm answer',
			yours: (answer: string) => `Your answer: ${answer}`,
			change: 'Change answer',
			private: 'Only teachers see your answer.',
			counted: 'Every family sees the vote counts, and only teachers see who chose what.',
			votes: (count: number) => (count === 1 ? '1 vote' : `${count} votes`),
			noAnswer: (names: string[]) => `No answer yet: ${list(names)}`
		},
		photos: {
			new: 'Post the board',
			title: 'Photos of the notice board',
			// A board photo's caption on home, and the title of the page that puts one up.
			photo: 'Photo of the notice board',
			newCopy:
				'Take a photo of the classroom’s board, with no children in it. Its families see it on their home until you put up a new one.',
			classroom: 'Classroom',
			chooseClassroom: 'Choose the classroom first.',
			take: 'Take a photo',
			retake: 'Take another',
			choose: 'Choose a photo',
			preparing: 'Getting the photo ready…',
			preview: 'The photo, as families will see it',
			putUp: 'Put it up',
			replaces: 'It takes the place of the photo that’s up now.',
			open: (classroom: string) => `Open the photo of the ${classroom} notice board`,
			loading: 'Opening the photo…',
			replace: 'Put up a new photo',
			remove: 'Take down',
			removeTitle: 'Take down this photo?',
			removeCopy: 'It comes off every home right away.'
		},
		notifications: {
			test: 'Notifications are on',
			cardTitle: 'Turn on notifications',
			cardCopy: 'Find out when your kindergarten posts something new.',
			turnOn: 'Turn on',
			turnOff: 'Turn off',
			notNow: 'Not now',
			blocked:
				'Notifications are blocked for BubbleBoard. Allow them in your device’s settings, then turn them on here.',
			title: 'Notifications',
			on: 'On: this device hears about new notices.',
			off: 'Off on this device.',
			unsupported: 'This browser can’t show notifications from BubbleBoard.'
		},
		install: {
			iosTitle: 'Add BubbleBoard to your Home Screen',
			iosCopy:
				'On iPhone and iPad, notifications from your kindergarten reach only the BubbleBoard on your Home Screen.',
			iosShare: 'Tap Share. In Safari, it can be in the ··· menu.',
			iosAdd: 'Choose Add to Home Screen, then Add.',
			iosOpen: 'Open BubbleBoard from your Home Screen.',
			androidTitle: 'Install BubbleBoard',
			androidCopy: 'As an app on your phone, BubbleBoard can tell you when there’s something new.',
			androidMenu: 'Open your browser’s menu.',
			androidAdd: 'Choose Install app, or Add to Home screen.',
			androidOpen: 'Open BubbleBoard from your home screen.',
			install: 'Install',
			installed: 'BubbleBoard is installed. Open it from your home screen.',
			inAppTitle: 'Open BubbleBoard in your browser',
			inAppCopy:
				'The browser inside this app can’t install BubbleBoard. Open the page in Safari or Chrome, usually from the ··· menu, then scan your QR code again.'
		},
		editor: {
			toolbar: 'Formatting',
			loading: 'Opening the editor…',
			bold: 'Bold',
			bulletList: 'Bulleted list',
			orderedList: 'Numbered list',
			link: 'Link',
			linkAddress: 'Web or email address',
			addLink: 'Add link',
			removeLink: 'Remove link',
			invalidLink: 'Use a web address that starts with https://, or an email address.',
			paper: 'Background colour',
			papers: {
				white: 'White',
				yellow: 'Yellow',
				peach: 'Peach',
				pink: 'Pink',
				lilac: 'Lilac',
				blue: 'Blue',
				green: 'Green'
			}
		},
		files: {
			title: 'Files',
			attach: 'Attach files',
			hint: 'PDFs, documents, and pictures, up to 10 MB each.',
			preparing: 'Getting the files ready…',
			remove: (name: string) => `Remove ${name}`,
			save: (name: string) => `Save ${name}`,
			pictures: 'Pictures',
			open: (name: string) => `Open ${name}`
		},
		// A board photo or a notice's picture on the whole screen.
		viewer: {
			zoom: 'Zoom in',
			fit: 'Fit to the screen',
			close: 'Close',
			save: 'Save'
		},
		errors: {
			'empty-notice': 'Write the notice first.',
			'notice-too-long': 'This notice is too long. Shorten it, then try again.',
			'no-classrooms': 'Choose at least one classroom.',
			'poll-answers': 'Give the poll at least two answers.',
			'unusable-photo': 'That photo couldn’t be used. Try another one.',
			'file-type':
				'BubbleBoard can’t attach that kind of file. Attach a PDF, a document, or a picture.',
			'file-too-large': 'That file is larger than 10 MB. Attach a smaller one.',
			'too-many-files': 'A notice can carry up to 10 files.',
			'unreadable-file':
				'This file didn’t open on this device. Ask your kindergarten to attach it again.',
			'unreadable-photo':
				'This photo didn’t open on this device. Ask your kindergarten to put it up again.',
			'storage-full':
				'BubbleBoard’s storage is full. Delete notices with files or take down photos you no longer need, or ask whoever installed BubbleBoard.',
			'upload-limit':
				'BubbleBoard has reached this month’s limit for uploads. Try again next month, or ask whoever installed BubbleBoard.',
			'download-limit':
				'BubbleBoard has reached this month’s limit for opening photos and files. They open again next month, or whoever installed BubbleBoard can raise the limit.',
			offline: 'BubbleBoard can’t be reached. Check your internet connection and try again.',
			'signed-out': 'This device was signed out. Scan your QR code again to continue.',
			'unreadable-records':
				'Some of your kindergarten’s records didn’t open on this device. Try again, and if it keeps happening, tell an admin.',
			'unknown-card': 'This QR code doesn’t work anymore. Ask your kindergarten for a new one.',
			'invalid-card': 'That isn’t a BubbleBoard code. Check it and try again.',
			mistyped: 'One of the characters doesn’t match. Check the code and try again.',
			'other-installation': 'This QR code is for a different BubbleBoard.',
			'no-code':
				'There’s no readable QR code in that photo. Try again with the whole QR code in view.',
			unreadable:
				'This QR code couldn’t open BubbleBoard’s records. Ask your kindergarten for a new one.',
			'too-many-attempts': 'Too many attempts. Wait a minute, then try again.',
			'wrong-setup-token':
				'This setup code isn’t right. Ask whoever installed BubbleBoard for a new setup link.',
			'already-set-up': 'BubbleBoard is already set up here. Connect with your QR code instead.',
			'setup-unavailable':
				'Setup isn’t ready on this installation. Ask whoever installed BubbleBoard.',
			'last-admin': 'BubbleBoard needs at least one admin. Make someone else an admin first.',
			'not-empty': 'Move or remove this classroom’s children first.',
			'empty-name': 'A name can’t be left blank. Type one and try again.',
			stale:
				'Someone else changed this at the same time. It’s up to date now, so please try again.',
			'not-found': 'This doesn’t exist anymore.',
			forbidden: 'You don’t have access to this.',
			'push-unavailable':
				'This browser couldn’t turn on notifications: its notification service didn’t answer. Try again later, or use another browser.',
			'push-brave':
				'Brave needs one setting before it can get notifications from websites. Type brave://settings/privacy in the address bar, turn on “Use Google services for push messaging”, restart Brave, then try again.',
			unexpected: 'Something went wrong. Please try again.'
		}
	}
};

/** Names in a sentence, such as “Bubbles and Ladybirds”. */
function list(names: string[]) {
	return new Intl.ListFormat('en', { type: 'conjunction' }).format(names);
}

export type Messages = typeof en;
