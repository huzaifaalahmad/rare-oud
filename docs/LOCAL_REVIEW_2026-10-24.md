# Rare Oud local development — 24 October 2026

Base: public main commit 6ed63139eb0c14d9b4b75a273c26c62ffa39d9fc. The received older TypeScript archive is preserved separately and was not overwritten.
Live site identified by owner: https://rare-oud.vercel.app/ . API identified from public image URLs: https://rare-oud-api.onrender.com/ . Owner subsequently approved updating this same public site on 24 October 2026. Production uses live API configuration; the local snapshot mode is excluded from production.

## Visual direction
Preserve the existing purple #621B66, deep purple #4A144D, brass #D4AF37, paper #FCF9F5 and existing night surfaces. Use original Britanica Latin fonts and the existing Arabic typography. The supplied gallery image from the received image/1.png provides the opening visual; no synthetic product pictures or invented product facts. Opening image, concise CMS headline and two actions, category navigation, instrument collection, accessories, then linked policy excerpts. This replaces the oversized floating logo and metric cards with the actual musical subject. The gallery is an identity concept, not an assertion that a physical showroom exists.

## Functional changes
Catalogue pagination uses the API total, server sorting, request cancellation, translated category names, genuine error/retry state and filter reset. Out-of-stock filtering is applied by the repository query before pagination. Public CMS policy text is unchanged; the home page shows a short excerpt and links to the full policy.

## Local preview
Run npm run review in frontend. The review server serves saved public GET responses from evidence/, with local filtering for demonstration. Login, submissions, favorites writes, analytics writes and other non-GET requests are blocked. This is not a backend/database end-to-end test. Product images are read from the existing public media host. The public snapshot has 55 products, fetched on 24 October 2026; stock and prices remain a dated snapshot, not a current commitment. No live order, review, user or admin mutation is tested.
