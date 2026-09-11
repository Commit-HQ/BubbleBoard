export const en = {
	languageName: 'English',
	ogLocale: 'en_US',
	title: 'A little closer to their day',
	description:
		'BubbleBoard is a free, open-source app that connects kindergarten teachers and families. Notices, photos from the day, and private messages, all in one place and private by design.',
	skip: 'Skip to content',
	home: 'BubbleBoard home',
	language: 'Language',
	app: { open: 'Open the app', soon: 'Coming soon' },
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
		quiet: 'Made for families. Inspired by the Bubbles.',
		photoAlt: 'Children laughing and blowing soap bubbles in a sunny park',
		mockTeacher: 'Teacher Ana',
		mockTime: 'Just now',
		mockMessage: 'Luka built the tallest tower today!'
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
			copy: 'Moments from the classroom, shared with care and gone after a while.'
		},
		messages: {
			title: 'A direct line to teachers',
			copy: 'Private conversations between your family and the classroom.'
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
		copy: 'Parents and teachers join the same way. Your kindergarten gives you a personal QR card, and that’s all you need.',
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
			'Photos disappear on their own after a while'
		]
	},
	security: {
		title: 'Locked before it leaves your phone.',
		copy: 'Photos, messages, and children’s names are encrypted on your device before they’re sent. Only the families and teachers in your classroom hold the keys to open them.',
		device: {
			title: 'Encrypted on your device',
			copy: 'Everything is locked on the phone or computer it comes from, before it’s uploaded.'
		},
		server: {
			title: 'Unreadable if it leaks',
			copy: 'The server stores only locked data. A leaked database would reveal no photos, names, or messages.'
		},
		host: {
			title: 'Not even we can look',
			copy: 'Whoever hosts BubbleBoard, us included, has no keys to your classroom. The code is public, so anyone can check.'
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
			copy: 'Take a post down instantly if something slips through.'
		},
		retention: {
			title: 'Nothing stays forever',
			copy: 'Choose how long photos stay, from one day to three months.'
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
		// The part in brackets links to Commit.
		madeBy: 'Made with love by the people at [Commit]',
		license: 'License (AGPL-3.0)',
		credits: 'Photo credits',
		build: 'Build'
	}
};

export type Messages = typeof en;
