import type { PushKind } from '../push';

/**
 * What a notification says, by what happened. The service worker shows these without the rest of the
 * messages. A teacher sees the same words as a family, so none of them say who they came from.
 */
export const notificationText: Record<PushKind, string> = {
	notice: 'New notice from your kindergarten',
	message: 'New message',
	slots: 'New meeting times',
	booking: 'Meeting time changed',
	photos: 'New photos from your kindergarten'
};

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
		// Lock-screen notifications, newest first, in the words the app's own pushes use (`notificationTexts`).
		// They stay this generic; the details wait in the app.
		notifications: [
			{ time: 'Just now', message: 'New photos from your kindergarten' },
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
			copy: 'Galleries from the day, with the photos your child is in marked for you. Other children wear a cheerful sticker unless their parents allow sharing.'
		},
		messages: {
			title: 'A direct line to teachers',
			copy: 'Ask your child’s teachers something privately, with each question in its own conversation.'
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
			'Faces covered for other families, unless you allow more',
			'Save or share the photos you love before they’re removed from the app'
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
			title: 'Faces covered for you',
			copy: 'Your phone finds the faces and covers them. You name each child, then see the gallery exactly as each family will before it goes out.'
		},
		meetings: {
			title: 'Individual meetings',
			copy: 'Offer the times you’re free, and families book one for their child without seeing who else has.'
		},
		retention: {
			title: 'You choose how long',
			copy: 'Photos are removed from the app after the time you choose, from one day to three months.'
		},
		seen: {
			title: 'You see who’s read it',
			copy: 'Families tap once to say they’ve read a notice, and a poll brings quick answers back.'
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
		updated: 'Updated on 21 September 2026',
		// Followed by the project's contact address, which the last point calls the address below.
		points: [
			{
				title: 'Event photos',
				copy: 'Faces are detected and labelled on the teacher’s device. A covered photo and separate face patches are encrypted before upload; the original is not uploaded. An unfinished event stays only on the teacher’s device until it is published or discarded, and is deleted after 7 days. Families see their own children and faces permitted for classroom sharing. Your kindergarten may enter what your consent form says, and you can change it in the app at any time. Consent is encrypted and changes apply only to future publications. Events and their photos remain available for the 1 to 90 days chosen by the teacher, then are deleted. There is no hidden archive for a yearly album.'
			},
			{
				title: 'What’s stored',
				copy: 'Names, inquiry subjects and messages, notices, info pages, polls, photos, and the files attached to any of them are encrypted on the device before they’re sent. The server can’t read them, and keeps only what it needs to work, without names, such as when a notice was posted. Individual meeting times, reservations, and which child and family IDs may book are scheduling metadata; children’s names remain encrypted.'
			},
			{
				title: 'Where',
				copy: 'BubbleBoard runs on Cloudflare, a US company, so data may also be handled outside the EU, under the safeguards EU law requires.'
			},
			{
				title: 'How long',
				copy: 'Notices stay up for the 1 to 90 days a teacher chooses, a notice board photo until it’s replaced, info pages until an admin changes or deletes them, conversations with their files until the family leaves their classroom or a teacher deletes the closed conversation, names until an admin removes them, and a device’s login until it goes unused for 90 days. Individual meeting offers and reservations are removed 90 days after the last time in the offer. Deleted records stay in the database’s backup history for up to 30 days.'
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
		events: {
			view: 'Photo view',
			finalView: 'Final photo',
			originalView: 'Original photo',
			title: 'Event',
			new: 'New event',
			name: 'Event title',
			date: 'Event date',
			description: 'Description',
			days: 'Keep it up for',
			publish: 'Publish event',
			published: 'Event published.',
			preparing: 'Preparing encrypted photos',
			uploading: 'Uploading photos',
			previewAs: 'Preview as',
			base: 'All covers',
			consentTitle: 'My child’s face visibility',
			consentHint:
				'Your kindergarten may have set this from your consent form, and you can change it here at any time. Your choice applies to photos published from then on, and you always see your own child. If a child has several family QR codes, every linked family has to allow the classroom to see them.',
			private: 'Only our family',
			privateHint:
				'Other families in the classroom see a sticker over your child’s face. A sticker covers the face, but people who know your child may still recognise them by their hair or clothes.',
			group: 'Families in our classroom too',
			groupHint: 'Families of the classroom see your child’s face in classroom events.',
			consentSaved: 'Saved.',
			noChildren: 'The list of children is not ready yet. A teacher needs to open the app.',
			child: 'Child',
			download: 'Save photo',
			downloadAll: 'Save all photos',
			preparingPhoto: (n: number, total: number) => `Preparing photo ${n} of ${total}…`,
			remove: 'Remove event',
			removeHint: 'This event and its photos will no longer be available to families.',
			open: 'Open gallery',
			back: 'Back to board',
			expired: 'This event is unavailable or has expired.',
			stale:
				'Consent or the list of children changed. Return to editing and prepare the preview again.',
			review: 'Review and publish',
			ready: 'Check all covered faces and the selected family’s view before publishing.',
			failed: 'Unable to open this photo.',
			tooOld:
				'This device’s software is too old to show event photos. Update it, or open BubbleBoard on a newer phone or a computer.',
			retry: 'Try again',
			loading: 'Opening the photo…',
			// While the photos are still being put together on this device, one after another.
			openingPhotos: (done: number, total: number) => `Opening photos… ${done} of ${total}`,
			filter: 'Which photos to show',
			allPhotos: 'All photos',
			// On the photos this family's own child is in, and on the button that shows only those.
			withMyChild: 'With your child',
			staysUntil: (date: string) =>
				`Photos stay here until ${date}. Save the ones you’d like to keep.`,
			untilShort: (date: string) => `Photos stay here until ${date}.`,
			// Under a family's gallery, followed by the link to Settings, where the choice is made.
			stickersExplained:
				'A sticker covers the children whose families keep their photos to themselves. You choose this for your own child in Settings.'
		},
		eventEditor: {
			steps: ['Event', 'Photos', 'Review'],
			local:
				'The photos stay on this device and nothing is sent until you publish. An unfinished event waits here for 7 days.',
			classroom: 'Classroom',
			classroomLocked: 'Remove the photos to prepare the event for another classroom.',
			continue: 'Continue',
			backToDetails: 'Back to the event',
			tools: 'Photo tools',
			add: 'Add photos',
			addMore: 'Add more',
			limit: (photos: number, mb: number) =>
				`Choose up to ${photos} photos, each no larger than ${mb} MB.`,
			none: 'Add the photos of the event. They open on this device only; nothing is sent yet.',
			loading: 'Preparing photos…',
			adding: (n: number, total: number) => `Preparing photo ${n} of ${total}…`,
			photos: 'Photos',
			caption: 'A few words about this photo',
			captionPlaceholder: 'Optional',
			progress: (done: number, total: number) => `${done} of ${total} photos reviewed`,
			detecting: 'Looking for faces…',
			failed: 'Face detection is unavailable. Add covers manually and check the whole photo.',
			retry: 'Retry detection',
			manual: 'Continue manually',
			noFaces: 'No faces found. Check the whole photo and cover every face yourself.',
			noCovers: 'Nothing is covered yet. Add a cover over every face.',
			photo: (n: number, total: number) => `Photo ${n} of ${total}`,
			face: (n: number) => `Face ${n}`,
			remaining: (n: number) =>
				n === 1
					? '1 face still needs a name or a cover decision.'
					: `${n} faces still need a name or a cover decision.`,
			addCover: 'Add cover',
			who: 'Who is in this photo?',
			pick: 'Tap a face on the photo to say who it is.',
			crop: 'Original crop — visible only while editing',
			search: 'Find a child',
			already: 'Already in this photo',
			empty: 'No children match.',
			covered: 'Keep covered',
			coverRest: (n: number) => `Keep the remaining ${n} faces covered`,
			coveredRest: (n: number) => `${n} faces are now kept covered.`,
			removeCover: 'Remove cover',
			sticker: 'Sticker',
			stickerNames: {
				smile: 'Smile',
				star: 'Star',
				heart: 'Heart',
				sun: 'Sun',
				flower: 'Flower',
				cloud: 'Cloud',
				bubble: 'Bubble',
				cat: 'Cat',
				bear: 'Bear',
				bunny: 'Bunny',
				fox: 'Fox',
				frog: 'Frog',
				panda: 'Panda',
				chick: 'Chick',
				penguin: 'Penguin',
				ladybug: 'Ladybird',
				moon: 'Moon',
				strawberry: 'Strawberry'
			},
			undo: 'Undo',
			redo: 'Redo',
			zoom: 'Zoom',
			assigned: (name: string) => `Named: ${name}`,
			reviewed: 'Reviewed',
			review: 'Reviewed, next photo',
			nextPhoto: 'Next photo',
			reviewNeeded: 'Needs review',
			overlap:
				'Some covers overlap. The shared area is revealed only to a family allowed to see every face there. Check the edges.',
			removePhoto: 'Remove photo',
			removePhotoCopy: 'This photo and everything marked on it leave the draft.',
			back: 'Back to the photos',
			backToGrid: 'Back to all photos',
			previewFailed: 'Could not prepare the preview. Return to the photos and try again.',
			unusable: 'This photo could not be opened. Choose a JPEG, PNG, WebP or HEIC photo.',
			leaveTitle: 'Leave the event?',
			leaveCopy:
				'This device has not kept the photos and everything marked on them yet, so they would be lost.',
			leave: 'Leave and discard',
			stay: 'Stay',
			allReviewed: 'Every photo is reviewed.',
			tooManyFaces: 'This photo has too many covers. Use another photo or remove false detections.',
			rosterChanged: 'The classroom’s children changed. Check the names again.',
			draftFound: 'Unfinished event',
			draftFoundCopy: (n: number) =>
				`This device kept the event you were preparing, with ${n === 1 ? '1 photo' : `${n} photos`}.`,
			draftContinue: 'Continue',
			draftDiscard: 'Start over'
		},

		meetings: {
			removeDay: 'Remove all times for this day',
			dayRemoved: 'The day’s times have been removed.',
			removeDayCopy: (count: number, booked: number) =>
				`All your upcoming times for this classroom on this day will be removed (${count}). Reservations to cancel: ${booked}. Parents with a reservation will be notified if notifications are enabled.`,

			title: 'Individual meetings',
			offer: 'Offer times',
			open: 'Open meetings',
			choose: 'Choose a time',
			emptyStaff: 'No meeting times offered yet.',
			emptyFamily: 'There are no meeting times available yet.',
			hint: 'Offer a day of conversations with parents.',
			date: 'Date',
			start: 'From',
			end: 'Until',
			duration: 'Meeting length',
			minutes: 'minutes',
			classroom: 'Classroom',
			preview: 'Offered times',
			previewHint: 'Uncheck any time you want to keep for a break.',
			publish: 'Publish times',
			publishing: 'Publishing…',
			cancel: 'Cancel',
			free: 'Available',
			booked: 'Booked',
			mine: 'Your meeting',
			reserve: 'Reserve',
			reservation: 'Confirm reservation',
			confirmCopy: 'Reserve this time for your child?',
			cancelBooking: 'Cancel meeting',
			cancelCopy: 'Cancel this meeting? The time will become available again.',
			remove: 'Remove time',
			removeCopy: 'Remove this available time from the offer?',
			past: 'Past meetings',
			child: 'Child',
			loading: 'Loading times…',
			noChildren: 'No children have been added to this classroom yet.',
			invalidRange: 'Choose a future date and a time range that fits at least one full meeting.',
			success: 'Meeting times published.',
			reserved: 'Your meeting is reserved.',
			cancelled: 'Meeting cancelled.',
			removed: 'Time removed.',
			onePerChild:
				'You can reserve one time for each child. To change it, cancel your current reservation first.',
			already: 'A time is already reserved for this child in this offer.',
			noInvite: 'No invitation for your child in this offer. Please contact your teacher.',
			refresh: 'Refresh',
			closed: 'Past',
			summary: 'View available times and your reservations.',
			staffSummary: 'Offer times and see who has booked.',
			freeCount: 'available',
			bookedCount: 'booked',
			remaining: 'Any minutes left at the end are not offered.',
			cancelForm: 'Close form'
		},
		// The day something happened, such as an event's date (formatDay).
		date: (day: string, month: string, year: number) => `${day}/${month}/${year}`,
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
		// What staff record from a family's consent form, when a child is added and on the child's page.
		// Families change the same choice themselves in Settings (app.events.consentTitle).
		sharing: {
			title: 'Face in event photos',
			hint: 'Set this from the family’s consent form. Parents can change it themselves in the app, and it counts for photos published from then on.',
			covered: 'Covered for other families',
			coveredHint:
				'Other families in the classroom see a sticker over the child’s face. A sticker covers the face, but people who know the child may still recognise them by their hair or clothes.',
			shared: 'Classroom families may see the face',
			sharedHint: 'Every family QR code of this child allows it, as the consent form says.',
			saved: 'Saved.'
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
			lostCode: 'Lost your QR code? Your kindergarten can give you a new one.',
			signOut: 'Sign out of this device',
			signOutTitle: 'Sign out of this device?',
			signOutCopy: 'To use BubbleBoard here again, you’ll need your QR code.'
		},
		// In a family device's Settings: a one-time QR code that connects another of the family's devices.
		addDevice: {
			title: 'Add a device',
			copy: 'Connect another phone, tablet, or computer, such as a grandparent’s, without the printed QR code.',
			show: 'Show a QR code',
			scan: (until: string) =>
				`Scan it with the other device, or send it as a link. It connects one device, until ${until}.`,
			qr: 'QR code for another device',
			share: 'Share link',
			copyLink: 'Copy link',
			copied: 'Link copied.',
			shareText: 'Join our kindergarten’s BubbleBoard. The link works for 24 hours.',
			connectAgain:
				'This device was connected before it could add others. To add devices from it, sign out, then connect it again with your family QR code.'
		},
		// The link to the landing page in the footer of every app page.
		about: 'About BubbleBoard',
		// The kindergarten's info pages, from the header: what everyone who uses the app should know.
		info: {
			title: 'Info',
			empty:
				'Nothing here yet. When your kindergarten adds information for everyone, such as opening hours or contacts, it appears here.',
			emptyAdmin:
				'Nothing here yet. Add a page for each thing everyone at your kindergarten should know, such as opening hours, contacts, or meals, with files if you like.',
			add: 'Add page',
			newTitle: 'New page',
			editTitle: 'Edit page',
			edit: 'Edit',
			delete: 'Delete',
			deleteTitle: 'Delete this page?',
			deleteCopy: 'It comes off right away, with its files.',
			moveUp: 'Move up',
			moveDown: 'Move down',
			text: 'Text',
			hint: 'Families and teachers of every classroom see this page until you change or delete it. Saving it sends no notification.',
			save: 'Save changes',
			// When a page was last saved (formatDateTime).
			updated: (when: string) => `Updated ${when}`,
			unreadable: 'Some pages didn’t open on this device.'
		},
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
			save: 'Save',
			share: 'Share',
			opening: 'Opening the photo…',
			previous: 'Previous photo',
			next: 'Next photo'
		},
		messaging: {
			title: 'Messages',
			new: 'New inquiry',
			subject: 'Subject',
			body: 'Message',
			write: 'Write a message…',
			send: 'Send',
			sendInquiry: 'Send inquiry',
			family: 'Family',
			classroom: 'Classroom',
			choose: 'Choose…',
			search: 'Search subjects',
			all: 'All',
			open: 'Open',
			closed: 'Closed',
			closedStatus: 'Closed',
			close: 'Close inquiry',
			closeTitle: 'Close this inquiry?',
			closeCopy:
				'The conversation remains available to read. For a new topic, start a new inquiry.',
			closedCopy: 'This inquiry is closed and remains available to read.',
			remove: 'Delete inquiry',
			removeTitle: 'Delete this inquiry?',
			removeCopy: 'The conversation is deleted for the family too. This cannot be undone.',
			empty: 'No inquiries match this view.',
			emptyTitle: 'No messages yet',
			emptyCopy: 'Private conversations with your classroom’s teachers happen here.',
			emptyCopyStaff: 'Private conversations with the families of your classrooms happen here.',
			unread: 'Unread',
			older: 'Earlier messages',
			more: 'More inquiries',
			refresh: 'Refresh',
			loading: 'Loading…',
			parent: 'Family',
			teacher: 'Teacher',
			children: (names: string[]) => `${names.length > 1 ? 'Children' : 'Child'}: ${list(names)}`,
			today: 'Today',
			yesterday: 'Yesterday',
			retention: 'Conversations are kept until the family leaves this classroom.',
			settings: 'Parent messaging',
			settingsOn: 'On',
			settingsOff: 'Off',
			edit: 'Change',
			done: 'Close',
			noDays: 'No days chosen yet.',
			quotaEach: (limit: number) =>
				`${limit} ${limit === 1 ? 'inquiry' : 'inquiries'} per family a month`,
			enabled: 'Allow parents to send messages',
			limit: 'Inquiries per family each month',
			limitHint:
				'A new inquiry, and every message sent before a teacher answers, uses one inquiry. Answering a teacher is always free, and the allowance renews on the first day of each month.',
			fromTime: 'From',
			toTime: 'To',
			days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
			// On narrow screens, and in the week at a glance under the classroom's children.
			daysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
			save: 'Save settings',
			saved: 'Settings saved.',
			schedule: 'Sending hours',
			offDay: 'Closed',
			disabled: 'Parent messaging is turned off for this classroom.',
			outside: 'Sending is available during the classroom’s hours.',
			holiday: 'On public holidays and other non-working days, an answer may take longer.',
			closingSoon: (minutes: number) =>
				`Today’s sending window closes in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`,
			charged: 'This message uses one inquiry.',
			free: 'Answering a teacher doesn’t use an inquiry.',
			noQuota:
				'You have used this month’s inquiries. Once a teacher writes, answering is free again.',
			quota: (remaining: number) => `${remaining} left this month`,
			confirmTitle: 'Send this message?',
			confirmCopy: (left: number) =>
				`No teacher has answered your last message yet, so this one uses an inquiry. ${left} will be left this month.`
		},
		errors: {
			'meeting-day-changed':
				'The day’s times have changed. The list has been refreshed; close this confirmation and review the times again.',
			'meeting-overlap':
				'These times overlap an existing offer for this classroom or teacher. Choose another time.',
			'meeting-changed':
				'This time has changed or was just booked. The list has been refreshed; choose an available time.',
			'meeting-already-booked': 'This child already has a meeting in this offer.',
			'unreadable-messages': 'Some inquiries could not be opened on this device.',
			'messages-disabled': 'Parent messaging is turned off for this classroom.',
			'messages-hours': 'Sending is outside the classroom’s hours. Your text has been kept.',
			'messages-limit': 'You have used this month’s inquiries.',
			'messages-schedule': 'A day’s To time must come after its From time.',
			'messages-closed':
				'This inquiry has been closed. Refresh the list to see the current status.',
			'not-found': 'This doesn’t exist anymore.',
			forbidden: 'You don’t have access to this.',
			'empty-notice': 'Write the notice first.',
			'notice-too-long': 'This notice is too long. Shorten it, then try again.',
			'event-too-long': 'These words are too long. Shorten them, then try again.',
			'info-too-long': 'This page is too long. Shorten it, then try again.',
			'empty-page': 'Write the page first.',
			'too-many-pages': 'There can be up to 20 pages. Delete one you no longer need first.',
			'no-classrooms': 'Choose at least one classroom.',
			'poll-answers': 'Give the poll at least two answers.',
			'unusable-photo': 'That photo couldn’t be used. Try another one.',
			'file-type':
				'BubbleBoard can’t attach that kind of file. Attach a PDF, a document, or a picture.',
			'file-too-large': 'That file is larger than 10 MB. Attach a smaller one.',
			'too-many-files': 'You can attach up to 10 files.',
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
			'ended-card':
				'This QR code was already used, or its day is over. Ask whoever gave it to you for a new one.',
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
