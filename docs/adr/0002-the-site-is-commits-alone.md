# The site is Commit's alone, and installations serve only their app

Every installation used to serve BubbleBoard's landing pages with Commit's contact details, so any copy of the code presented itself on its own domain as the project's site. Those pages, the walk through the app, the tour, and the contact for kindergartens move to a project of their own, the site at bubbleboard.fyi, which only Commit deploys. An installation keeps its app, its error pages, and its privacy policy, which describes what that installation stores and so names its own kindergarten's contact rather than Commit's, and names Commit too when Commit operates it, as the processor working for that kindergarten under an agreement they sign; its home address opens the app.

## Considered options

- **A front page for each installation**, with its kindergarten's name and a way to scan a QR code. The app already greets a device that isn't connected with exactly that, and a second page in two languages would only need keeping up.
- **One project that builds the landing pages only for Commit's own installation.** Every copy would still carry them a setting away, and the site couldn't become a home for BubbleBoard's sister apps without becoming part of BubbleBoard.

## Consequences

- Every installation's app links to the site as the place to learn about BubbleBoard, so families of every installation, self-hosted ones included, reach it. The site therefore offers nobody a way into an app. It opens once the first installation has left bubbleboard.fyi (ADR 0003), so it shares its origin with no installation.
- The site's videos, BubbleCam's among them, come from an R2 bucket at media.bubbleboard.fyi, so watching them spends none of the requests that the installations in Commit's account share.
