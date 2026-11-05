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
	photos: 'New photos from your kindergarten',
	corkboard: 'New photo of the notice board',
	report: 'A parent reported photos',
	tomorrow: 'You have an individual meeting tomorrow'
};

export const en = {
	languageName: 'English',
	description:
		'BubbleBoard is a free app for kindergartens. Teachers share news and photos and answer parents’ questions. Everything is in one place, and only the people it’s meant for can see it.',
	language: 'Language',
	nav: {
		label: 'Main'
	},
	// The footer of app pages and of the privacy policy.
	footer: {
		// Commit's site about BubbleBoard (siteUrl in src/lib/project.ts).
		about: 'About BubbleBoard',
		privacy: 'Privacy policy',
		// The font, icon, and library licenses (static/third-party-notices.txt).
		credits: 'Credits and licenses'
	},
	// The privacy policy (/privacy), in short points. It describes what the code does, so change it with anything
	// that changes what BubbleBoard stores, where it goes, or for how long.
	privacyPolicy: {
		title: 'Privacy policy',
		description: 'What BubbleBoard stores about families and children, where, and for how long.',
		updated: 'Updated on 5 November 2026',
		// The first point, from the installation's settings (src/lib/project.ts): the kindergarten by name when
		// it's set, and whoever runs the installation for it, when someone does.
		responsible: {
			title: 'Who’s responsible',
			kindergarten: (name: string) => `${name} is responsible for your data.`,
			yourKindergarten: 'Your kindergarten is responsible for your data.',
			operator: (name: string) =>
				`${name} runs the app on the kindergarten’s behalf, as its processor.`
		},
		// Followed by the installation's privacy address, which the last point calls the address below.
		points: [
			{
				title: 'Event photos',
				copy: 'Faces are detected and labelled on the teacher’s device. A covered photo and separate face patches are encrypted before upload; the original is not uploaded. An unfinished event stays only on the teacher’s device until it is published or discarded, and is deleted after 7 days. Families see their own children and faces permitted for classroom sharing. Your kindergarten may enter what your consent form says, and you can change it in the app at any time. Consent is encrypted and changes apply only to future publications. The app keeps the last 50 changes for each child and family QR code, with when each was made and by whom, so you and the kindergarten can look back; they go when the child or the QR code is removed. Events and their photos remain available for the 1 to 90 days chosen by the teacher, then are deleted. There is no hidden archive for a yearly album. If you report an event’s photos, the server knows that your family reported that event; which photos and why are encrypted, like any message.'
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
				copy: 'Notices stay up for the 1 to 90 days a teacher chooses, a notice board photo until it’s replaced, info pages until the kindergarten changes or deletes them, conversations with their files until the family leaves their classroom or a teacher deletes the closed conversation, names until the kindergarten removes them, and a device’s login until it goes unused for 90 days. Individual meeting offers and reservations are removed 90 days after the last time in the offer. Deleted records stay in the database’s backup history for up to 30 days.'
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
		label: 'Version',
		// The build had uncommitted changes, so its commit doesn't fully describe it.
		modified: 'modified'
	},
	// A page that doesn't exist, or an error no page handles, shown with a popped bubble.
	error: {
		missingTitle: 'Oops! This bubble popped.',
		missingCopy: 'There’s nothing at this address. It may have moved, or the link was mistyped.',
		title: 'Oops! Something popped.',
		copy: 'Something went wrong on our side. Try again in a moment.',
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
			faceVisibility: 'Face visibility',
			faceVisibilityHint:
				'Every child of the classroom, as their families’ consent stood when these photos were prepared. Publishing checks it again.',
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
			edit: 'Edit',
			editTitle: 'Edit event',
			save: 'Save changes',
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
			// The teacher's own view in the gallery's "Preview as" list, beside "All covers" and each family.
			asMyself: 'Me, with every face',
			staysUntil: (date: string) =>
				`Photos stay here until ${date}. Save the ones you’d like to keep.`,
			untilShort: (date: string) => `Photos stay here until ${date}.`,
			// Under a family's gallery, followed by the link to Settings, where the choice is made.
			stickersExplained:
				'A sticker covers the children whose families keep their photos to themselves. You choose this for your own child in Settings.'
		},
		// A family's report of an event's photos, from its gallery, and the conversation it becomes.
		reports: {
			start: 'Report photos',
			hint: 'Pick the photos above. The teachers will see your message and can take them down.',
			picked: (n: number) => (n === 1 ? '1 photo picked' : `${n} photos picked`),
			whole: 'No photos picked, so the whole event is reported.',
			message: 'Your message to the teachers',
			send: 'Send report',
			// Where Report photos was, once this family has reported the event.
			sent: 'You reported this event',
			// Beside a report in the inbox, and above its conversation.
			label: 'Photo report',
			// The inbox's section of reports, above the inquiries.
			inbox: 'Photo reports',
			wholeEvent: 'The whole event reported',
			gone: (n: number, total: number) =>
				n === total
					? 'They have all been changed or taken down since.'
					: n === 1
						? '1 of them has been changed or taken down since.'
						: `${n} of them have been changed or taken down since.`,
			eventGone: 'This event is no longer up.',
			open: 'Open event',
			// Staff see the open reports of an event above its gallery and its editor's photos.
			title: 'Parents’ reports',
			// The photos a report names, by the numbers on the gallery's squares.
			numbers: (numbers: number[]) =>
				numbers.length === 1 ? `Photo ${numbers[0]}` : `Photos ${list(numbers.map(String))}`,
			openReport: 'Open report',
			// On a reported photo in the gallery and the editor.
			flagged: 'Reported',
			marked: 'A flag marks the photos that were reported.',
			// Under a report the family wrote last, where the box to write in would be.
			waiting: 'The teachers will answer here. You can write again once they do.'
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
			addCover: 'Cover',
			who: 'Who is in this photo?',
			pick: 'Tap a face on the photo to say who it is.',
			crop: 'Original crop — visible only while editing',
			search: 'Find a child',
			already: 'Already in this photo',
			// What the child's consent says, as it stood when the editor opened; publishing checks it again.
			faceShared: 'Classroom families see this face',
			faceOwnFamily: 'Only their family sees this face',
			sharedMark: 'classroom families see the face',
			empty: 'No children match.',
			covered: 'Keep covered',
			coveredHint:
				'For someone who isn’t from the classroom, such as a parent, a sibling or a passer-by, or when you aren’t sure who it is. The face stays covered for everyone.',
			removeCover: 'Remove cover',
			invisible: 'Invisible cover',
			invisibleHint:
				'For a child whose face can’t be seen, such as from behind. Choose the child too: nothing is drawn over them, but their family still finds the photo among their child’s.',
			fixedCover:
				'This face was kept covered when the photo was published, so its picture is gone. The cover stays where it is; only its sticker can change.',
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
			draftDiscard: 'Start over',
			localChange:
				'New photos stay on this device until you save the changes. A change isn’t kept here, so finish it in one go.',
			published: 'Photos already up',
			publishedHint:
				'This photo is up as it was published. You can change its words, take it off, or open its covers again: the photo is put back together on this device, and once you save, families see the new version in its place. A face kept covered when it was published is gone for good and stays covered.',
			editCovers: 'Edit covers',
			reopened:
				'This photo is already up. Saving replaces it with this version, checked against the families’ current choices. Anyone who already saved the photo keeps their copy.',
			keepPublished: 'Drop the edit',
			keepPublishedCopy:
				'The covers changed here are dropped and the photo stays up exactly as it is.',
			moveEarlier: 'Move earlier',
			moveLater: 'Move later',
			removePublished: 'Take photo off',
			removePublishedCopy:
				'Families will no longer see this photo. Anyone who already saved it keeps their copy.',
			keepOne: 'An event needs at least one photo. Remove the event to take it down altogether.'
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
			hint: 'Choose a date, then add the times one by one. A new time starts when the one before ends and lasts as long, and you can change it.',
			date: 'Date',
			start: 'From',
			end: 'Until',
			classroom: 'Classroom',
			publish: 'Publish times',
			publishing: 'Publishing…',
			cancel: 'Cancel',
			free: 'Available',
			booked: 'Booked',
			mine: 'Your meeting',
			myMeeting: 'Individual meeting',
			bookedBadge: 'You’ve booked a time',
			bookedForYou: 'Your teacher booked this time for you',
			mineByStaff: 'Your meeting, booked by your teacher',
			byStaff: 'booked by a teacher',
			bookFor: 'Book for a family',
			bookForCopy:
				'Choose the child. Their family will see that you booked this time for them, and can cancel it.',
			bookedFor: 'The time is booked. The family gets a notification if they turned them on.',
			change: 'Change or cancel the time',
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
			success: 'Meeting times published.',
			reserved: 'Your meeting is reserved.',
			cancelled: 'Meeting cancelled.',
			removed: 'Time removed.',
			onePerChild:
				'You can reserve one time for each child. To change it, cancel your current reservation first.',
			already: 'A time is already reserved for this child in this offer.',
			noInvite: 'No invitation for your child in this offer. Please contact your teacher.',
			closed: 'Past',
			summary: 'View available times and your reservations.',
			staffSummary: 'Offer times and see who has booked.',
			freeCount: (n: number) => `${n} available`,
			bookedCount: (n: number) => `${n} booked`,
			times: 'Times',
			addTime: 'Add a time',
			noTimes: 'Add at least one time.',
			rowOrder: 'The end must be after the start.',
			rowLength: 'A meeting lasts at least 5 minutes and at most 2 hours.',
			rowPast: 'This time has already passed.',
			rowOverlap: 'This overlaps another time.',
			edit: 'Edit this day’s times',
			editHint:
				'You can move or remove available times, or add new ones. A booked time stays as it is; to move it, cancel that meeting first. Parents aren’t notified of this change.',
			save: 'Save changes',
			saving: 'Saving…',
			saved: 'Times saved.',
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
		headOnly: {
			title: 'Only a BubbleBoard administrator can open this page',
			copy: 'If you need something here, ask your kindergarten’s BubbleBoard administrator.'
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
			copy: 'BubbleBoard couldn’t open some of your kindergarten’s records on this device. Try again, and if it keeps happening, tell the BubbleBoard administrator.'
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
				head: 'BubbleBoard administrator QR code',
				lead: 'Group lead QR code',
				teacher: 'Teacher QR code',
				recovery: 'Recovery QR code',
				family: 'Family QR code'
			},
			scan: (address: string) =>
				`Point your phone’s camera at the QR code, or go to ${address} and enter:`,
			about: 'Notices and photos from your kindergarten.',
			private: 'Don’t share this QR code. If it’s lost, your kindergarten can give you a new one.',
			recovery:
				'A spare for when every BubbleBoard administrator QR code is lost: then only it can replace the lost QR codes and add children, teachers, and classrooms. Whoever has it can do everything a BubbleBoard administrator can, so keep it locked away at the kindergarten, apart from everyday QR codes.',
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
			head: 'Here’s your kindergarten.',
			teacher: 'Here are your classrooms.',
			classrooms: 'Classrooms',
			addClassroom: 'Add classroom',
			classroomName: 'Classroom name',
			teachers: 'Teachers',
			teachersDetail: 'Names, classrooms, and QR codes',
			emptyHead: 'Start by adding your first classroom.',
			emptyTeacher:
				'You haven’t been added to a classroom yet. A BubbleBoard administrator can add you.'
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
			// Beside each child: whether the classroom's other families see their face in event photos.
			faceShown: 'Face visible',
			faceCovered: 'Face covered',
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
		leaveForm: {
			title: 'Leave without saving?',
			copy: 'What you wrote will not be saved.',
			leave: 'Leave',
			stay: 'Stay'
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
		// Face-sharing history, opened from the child's page and from Settings (ConsentHistory.svelte).
		history: {
			open: 'History',
			title: 'Face visibility history',
			hint: 'Every change, newest first. Changes made before 27 September 2026 aren’t listed.',
			shown: 'Classroom families may see the face',
			covered: 'Face covered for other families',
			byOwnFamily: 'Set by your family',
			byKindergarten: 'Recorded by the kindergarten from the consent form',
			byFamily: (card: string) => `Set by the family (${card})`,
			byParents: 'Set by the family',
			byTeacher: (name: string) => `Recorded by ${name} from the consent form`,
			byStaff: 'Recorded by staff from the consent form',
			onAddingChild: 'Set when the child was added',
			onAddingOwnChild: 'Set by the kindergarten when your child was added',
			onAddingChildBy: (name: string) => `Set by ${name} when adding the child`,
			empty: 'No changes recorded yet.'
		},
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
			alsoElsewhere: 'Also in another group',
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
		// What each staff member may do, on her QR code, in the list of teachers, and in her form.
		roles: {
			teacher: 'Teacher',
			lead: 'Group lead',
			head: 'BubbleBoard administrator'
		},
		teachers: {
			title: 'Teachers',
			add: 'Add teacher',
			you: 'you',
			noClassrooms: 'No classrooms',
			recoveryTitle: 'For emergencies',
			recoveryDetail: 'Opens everything if every BubbleBoard administrator QR code is lost.'
		},
		teacher: {
			newTitle: 'Add teacher',
			name: 'Name',
			classrooms: 'Classrooms',
			noClassrooms: 'There are no classrooms yet.',
			headClassrooms:
				'A BubbleBoard administrator sees every classroom. Tick the ones she teaches in, so the classroom knows who is in it. She chooses her notifications in Settings.',
			role: 'What she may do',
			teacherHint: 'Posts notices and photos in her classrooms.',
			leadHint:
				'Everything a teacher does, and in her classrooms she also adds children and family QR codes and sets up parent messaging.',
			headHint:
				'Everything a group lead does, in every classroom, and also adds classrooms, teachers, and info pages.',
			selfRole: 'Another BubbleBoard administrator can change this.',
			create: 'Create QR code',
			remove: 'Remove teacher',
			removeTitle: (name: string) => `Remove ${name}?`,
			removeCopy: (name: string) =>
				`${name} won’t be able to open BubbleBoard anymore, and devices using their QR code will be signed out.`,
			self: 'This is you. Another BubbleBoard administrator can remove you.',
			recovery:
				'A spare for when every BubbleBoard administrator QR code is lost. Then only it can replace the lost QR codes, and without it no one could add children, teachers, or classrooms. Because it can do everything a BubbleBoard administrator can, keep it locked away at the kindergarten, apart from everyday QR codes, and replace it if someone else may have seen it.'
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
		// In a family device's Settings, under the family's connected devices: a one-time QR code that connects
		// another of the family's devices.
		addDevice: {
			copy: 'Connect another phone, tablet, or computer, such as a grandparent’s, without the printed QR code.',
			show: 'Add a device',
			scan: (until: string) =>
				`Scan it with the other device, or send it as a link. It connects one device, until ${until}.`,
			qr: 'QR code for another device',
			share: 'Share link',
			copyLink: 'Copy link',
			copied: 'Link copied.',
			shareText: 'Join our kindergarten’s BubbleBoard. This link works for 24 hours.',
			connectAgain:
				'This device was connected before it could add others. To add devices from it, sign out, then connect it again with your family QR code. If you no longer have the family QR code, don’t sign out; ask your kindergarten for a new one first.'
		},
		// In a family device's Settings: the devices connected for the family, with who uses each, above adding
		// another, and home's card that asks who uses this one.
		devices: {
			title: 'Connected devices',
			copy: 'Every phone, tablet, or computer connected for your family. Only your family sees the names.',
			current: 'This device',
			unnamed: 'Unnamed device',
			nameLabel: 'Who uses this device?',
			namePlaceholder: 'Mum, Grandpa Ivo…',
			nameHint: 'Only your family sees this name, in the list of connected devices.',
			addName: 'Add a name',
			changeName: 'Change name',
			removeTitle: (name: string) => `Remove ${name}?`,
			removeCopy:
				'This device will be signed out. To use BubbleBoard on it again, it needs your family QR code.',
			about: 'About removing devices',
			aboutCopy:
				'A removed device can connect again with your family QR code. If someone who shouldn’t have your QR code has it, ask your kindergarten to replace it. Replacing it signs out every device of your family, and you connect them again with the new QR code.',
			cardCopy:
				'Write a name, such as Mum or Grandpa Ivo. Your family sees it in Settings, so you know which devices are connected. Your kindergarten doesn’t see it.',
			notNow: 'Not now'
		},
		// The kindergarten's info pages, from the header: what everyone who uses the app should know.
		info: {
			title: 'Info',
			empty:
				'Nothing here yet. When your kindergarten adds information for everyone, such as opening hours or contacts, it appears here.',
			emptyHead:
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
			editedBy: (name: string) => `edited by ${name}`,
			edit: 'Edit',
			delete: 'Delete',
			deleteTitle: 'Delete this notice?',
			deleteCopy: 'It comes off every board right away.',
			pin: 'Pin to the top',
			unpin: 'Unpin',
			pinned: 'Pinned',
			markSeen: 'Mark as seen',
			seen: 'Seen',
			seenBy: (seen: number, families: number) =>
				`Seen by ${seen} of ${families === 1 ? '1 family' : `${families} families`}`,
			seenNames: (names: string[]) => `Seen: ${list(names)}`,
			notSeenNames: (names: string[]) => `Not seen yet: ${list(names)}`,
			// Hiding a notice or event someone is done with, on their own device, and showing it again.
			hide: 'Hide',
			unhide: 'Show on the board',
			hidden: (count: number) => `Hidden (${count})`,
			hiddenHint: 'Hidden only on this device, until they come off the board.',
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
			noClassrooms: 'You can post notices once a BubbleBoard administrator adds you to a classroom.'
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
			classrooms: 'Classrooms that notify you',
			classroomsHint:
				'You run every classroom, so choose the ones you want to hear about. A classroom added later notifies you until you take it off.',
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
			iosNoAdd: 'No “Add to Home Screen”?',
			safariTitle: 'Open BubbleBoard in Safari',
			safariCopy:
				'The browser inside this app can’t add BubbleBoard to your Home Screen. Safari can, and the link takes your code along.',
			safariMenu: 'Nothing opens? Choose Open in Safari from the ··· menu.',
			openSafari: 'Open in Safari',
			androidTitle: 'Install BubbleBoard',
			androidCopy: 'As an app on your phone, BubbleBoard can tell you when there’s something new.',
			androidMenu: 'Open your browser’s menu.',
			androidAdd: 'Choose Install app, or Add to Home screen.',
			androidOpen: 'Open BubbleBoard from your home screen.',
			androidStuck: 'If adding it brings you back to this page, install BubbleBoard from Chrome.',
			install: 'Install',
			installed: 'BubbleBoard is installed. Open it from your home screen.',
			chromeTitle: 'Open BubbleBoard in Chrome',
			chromeCopy:
				'This browser can’t install BubbleBoard. Chrome can, and the link takes your code along.',
			chromeMenu: 'Nothing opens? Choose Open in browser, or Open in Chrome, from the ··· menu.',
			openChrome: 'Open in Chrome'
		},
		editor: {
			toolbar: 'Formatting',
			loading: 'Opening the editor…',
			bold: 'Bold',
			underline: 'Underline',
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
			zoomOut: 'Zoom out',
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
			editMessage: 'Edit',
			editing: 'Editing message',
			saveEditing: 'Save changes',
			cancelEditing: 'Cancel',
			editHint: 'You can change a message until a teacher opens it.',
			edited: 'edited',
			removeMessage: 'Delete',
			removeMessageTitle: 'Delete this message?',
			removeMessageCopy:
				'Its text and any files go for the family too, and “Message deleted” stays in its place. This cannot be undone.',
			deletedMessage: 'Message deleted',
			// Before the last thing said in the inbox: who said it, a teacher by name or this device's side.
			said: (who: string, text: string) => `${who}: ${text}`,
			you: 'You',
			// A teacher's inbox, on a family whose message is the latest; a family's, on its own.
			waitingForYou: 'Waiting for your answer',
			waitingForTeachers: 'Waiting for the teachers’ answer',
			empty: 'No inquiries match this view.',
			// Over the inquiries, when the inbox also has photo reports above them.
			inquiries: 'Inquiries',
			emptyTitle: 'No messages yet',
			emptyCopy: 'Private conversations with your classroom’s teachers happen here.',
			emptyCopyStaff: 'Private conversations with the families of your classrooms happen here.',
			unread: 'Unread',
			older: 'Earlier messages',
			more: 'More inquiries',
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
			// Above a family's answer to a teacher's message sent outside the hours.
			anytime: 'A teacher wrote outside the classroom’s hours, so you can answer now.',
			// Above a teacher's box to write in, when the family's answer is ruled differently from usual.
			staffAfterHours:
				'It’s outside the classroom’s hours for parents. Because you’re writing now, the family can answer this message at any time.',
			staffDisabled:
				'Parent messaging is off for this classroom, so the family can’t answer you here.',
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
			'meeting-times-changed':
				'A time on this day changed in the meantime, for example a parent booked it. The list has been refreshed; close the editor and open it again.',
			'meeting-overlap':
				'These times overlap an existing offer for this classroom or teacher. Choose another time.',
			'meeting-changed':
				'This time has changed or was just booked. The list has been refreshed; choose an available time.',
			'meeting-already-booked': 'This child already has a meeting in this offer.',
			'unreadable-messages': 'Some inquiries could not be opened on this device.',
			'messages-disabled': 'Parent messaging is turned off for this classroom.',
			'messages-hours': 'Sending is outside the classroom’s hours. Your text has been kept.',
			'messages-limit': 'You have used this month’s inquiries.',
			'message-seen': 'A teacher has already opened this message, so it can’t be changed any more.',
			'message-answered':
				'This message has already been answered, so it can’t be changed any more.',
			'messages-schedule': 'A day’s To time must come after its From time.',
			'messages-closed':
				'This inquiry has been closed. Refresh the list to see the current status.',
			reported: 'You have already reported this event. Your report is in Messages.',
			'report-waiting': 'The teachers haven’t answered yet. You can write again once they do.',
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
			'too-large':
				'This is too large to send. Remove a few photos or shorten the text, then try again.',
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
				'Some of your kindergarten’s records didn’t open on this device. Try again, and if it keeps happening, tell the BubbleBoard administrator.',
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
			'last-head':
				'BubbleBoard needs at least one administrator. Make someone else an administrator first.',
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
