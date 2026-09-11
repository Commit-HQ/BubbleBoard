export const en = {
	languageName: 'English',
	title: 'A little closer to their day',
	description:
		'A simple space for kindergarten updates, photos, and conversations. BubbleBoard is currently in development.',
	skip: 'Skip to content',
	home: 'BubbleBoard home',
	language: 'Language',
	nav: {
		label: 'Main',
		sections: {
			features: 'Features',
			how: 'How it works',
			privacy: 'Privacy',
			teachers: 'For teachers'
		}
	},
	hero: {
		heading: 'A little closer',
		headingAccent: 'to their day.',
		lead: 'The news, the discoveries, the little things that made them smile. A place for your kindergarten to keep you in the loop.',
		cta: 'See how it works',
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
		copy: 'When BubbleBoard is ready, your teacher will give you a family QR card to get started.',
		photoAlt: 'A kindergarten teacher reading a picture book to a group of children',
		steps: [
			{
				title: 'Add it to your home screen',
				copy: 'BubbleBoard installs from your browser. No app store needed.'
			},
			{ title: 'Turn on notifications', copy: 'Hear when there’s something new to see.' },
			{
				title: 'Scan your family card',
				copy: 'Open the app and scan. No username or password to remember.'
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
			'Photos disappear on their own after a while',
			'Built so the host can’t read your family’s content'
		]
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
	open: {
		title: 'Built in the open.',
		copy: 'BubbleBoard is open source, so anyone can check how family content is handled. No ads, no trackers, no third-party scripts.',
		cta: 'Follow along on GitHub',
		noticeTitle: 'We’re just getting started.',
		noticeCopy:
			'This is a design preview. Classroom access, notifications, messaging, and photo sharing are not available yet. Please don’t enter personal information.'
	},
	footer: {
		tagline: 'A little community. A lot of care.',
		product: 'Product',
		project: 'Project',
		source: 'Source code',
		license: 'License (AGPL-3.0)',
		architecture: 'Architecture',
		credits: 'Photo credits',
		status: 'Early preview',
		build: 'Build'
	}
};

export type Messages = typeof en;
