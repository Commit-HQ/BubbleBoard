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
		copy: 'Photos, messages, and children’s names are encrypted before they leave the device. Classroom notices and photos open only for families and teachers in your classroom, and private conversations only for your family and your child’s teachers.',
		device: {
			title: 'Encrypted on your device',
			copy: 'Content is encrypted on your phone or computer before it’s uploaded.'
		},
		server: {
			title: 'Unreadable if it leaks',
			copy: 'The server stores content without the keys needed to read it. A leak would reveal no photos, names, or messages.'
		},
		host: {
			title: 'Keys stay in your classroom',
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
		credits: 'Credits and licenses',
		build: 'Build',
		// The build had uncommitted changes, so its commit doesn't fully describe it.
		modified: 'modified',
		// Built without Git, for example from a source ZIP.
		unknownBuild: 'Unknown build'
	}
};

export type Messages = typeof en;
