# Astra — MERN e-commerce store

A production-oriented storefront and operations console. Two apps live in this
repository:

| Folder   | Stack                                    | Port |
| -------- | ---------------------------------------- | ---- |
| `client` | React 19, Vite 8, Redux Toolkit, Tailwind 4 | 5173 |
| `server` | Express 5, Mongoose 9, Stripe, Safepay, Cloudinary | 3000 |

## Features

- **Accounts** — registration, email OTP verification, password reset, profile
  photo with client-side cropping, JWT in an `httpOnly` cookie.
- **Per-user cart** — each signed-in account has its own cart stored in MongoDB.
  A guest cart lives in the browser and merges into the account on sign-in.
  Prices, stock and shipping are **always recomputed on the server**.
- **Checkout** — offline (pay later) plus hosted Stripe and Safepay checkout,
  with server-side verification, idempotent payment confirmation and automatic
  release of reserved stock when a checkout expires.
- **Admin console** — revenue/fulfilment/inventory dashboard, order management
  with search, filters, status transitions, payment reconciliation and internal
  notes, product CRUD with image management, and customer directory with role
  management.

## Getting started

The store has **two** processes. If the API is not running, nothing in the
browser will work (the client shows a "cannot reach the store API" toast).

### Run both at once (recommended)

```bash
npm run install:all    # first time only
npm run dev            # starts the API and the web app together
```

- Web → http://localhost:5173
- API → http://localhost:3000 (health check at `/api/health`)

Press `Ctrl+C` to stop both.

### Run them separately

```bash
cd server
npm install
cp .env.example .env      # then fill in the values
npm run dev               # http://localhost:3000
```

`.env` must contain at least `MONGO_URI` and a `JWT_SECRET` of 24+ characters;
the server refuses to boot otherwise. See `server/.env.example` for the full
list. SMTP, Cloudinary, Stripe and Safepay are optional — the boot log tells you
exactly which features are disabled.

```bash
cd client
npm install
cp .env.example .env      # optional: VITE_API_URL
npm run dev               # http://localhost:5173
```

`CLIENT_URL` in `server/.env` must list the browser origin(s) allowed by CORS
(comma separated), e.g. `http://localhost:5173,http://localhost:5174`. If Vite
falls back to a different port (because 5173 is busy), add that port here too.

### Create an admin

```bash
cd server
npm run admin:promote -- you@example.com
```

Sign out and back in to refresh the session.

## Payments

Two confirmation paths exist for both providers:

1. **Webhooks** (authoritative in production) — point your provider at
   `POST /api/orders/webhooks/stripe` and `POST /api/orders/webhooks/safepay`.
2. **Verified return URL** — the return landing page calls
   `POST /api/orders/:id/confirm`, and the server re-queries Stripe or verifies
   Safepay's `HMAC-SHA256(v1Secret, tracker)` signature. This makes real
   payments testable on `localhost`, where no webhook can arrive.

An order is only ever marked paid once; both paths funnel through the same
guarded transition. Failed or expired checkouts have their reserved stock
released automatically by a background sweep.

To test end to end, run the server and then:

```bash
cd server
npm run smoke
```

It exercises registration, the cart API, checkout, both payment providers and
the admin endpoints against a running server, and deletes everything it creates.

## Production notes

- Set `NODE_ENV=production`, `CLIENT_URL` to your real origin(s) and
  `TRUST_PROXY=true` when running behind a reverse proxy.
- Cookies become `Secure` + `SameSite=None` automatically in production.
- Serve `client/dist` from any static host or CDN and point `VITE_API_URL` at
  the API. Remember to allow the client origin in `CLIENT_URL`.
- `GET /api/health` reports process and database status for uptime monitors.
- Uploads are restricted to images up to `MAX_UPLOAD_BYTES`.
- Security headers, a JSON body limit, rate limiting on every sensitive
  endpoint and a global error handler are configured in `server.js`.

## Admin console

Four sections, all backed by live queries:

- **Overview** — a real analytics report, not static tiles. `GET
  /api/orders/admin/analytics?range=7|30|90` returns a dense daily revenue and
  order series, period-over-period deltas, revenue by category, payment mix,
  fulfilment counts, inventory valuation and low-stock alerts. The charts are
  hand-rolled SVG (`src/components/charts`) so nothing heavy is added to the
  bundle.
- **Orders** — search, status and payment filters, pagination, legal status
  transitions, payment reconciliation and internal notes.
- **Products** — inventory search, image management (unticked images are deleted
  from Cloudinary on save), best-seller toggle and delete confirmation.
- **Customers** — directory with verification status and role management.
- **Messages** — contact-page inbox with search, status filters and one-click
  reply.

## Cart and wishlist

Both follow the same rule: the server is authoritative for signed-in accounts,
and the browser keeps a guest list that is merged on sign-in.

- **Cart** — MongoDB-backed per user, priced from the live catalogue on every
  read, so totals can never go stale.
- **Wishlist** (`/api/wishlist`, `/wishlist`) — stores only product references;
  name, price, stock and images are always resolved live. Deleted products are
  pruned on read, out-of-stock items are kept but flagged, and saving is
  idempotent so a double-click cannot duplicate an entry. Items can be moved to
  the cart in one click.

## Product attributes

The admin product form used to ask for a raw JSON blob. It now renders **typed
inputs chosen by category** — a "Gaming" product shows DPI, sensor and platform;
"Beauty & Skincare" shows skin type and key active ingredient.

- Schemas live in `src/lib/categoryAttributes.js` and
  `src/lib/categoryAttributesMore.js`, covering every category in the
  catalogue. An unknown category falls back to a small generic set.
- Field types: `text`, `number`, `select` (with options) and `boolean`. Every
  field is optional, and a blank one is simply not shown on the product page.
- **Nothing already stored is lost.** Attribute keys are matched
  case-insensitively, `aliases` absorb older spellings (`Battery` vs
  `Battery Life`), and any key the schema does not recognise is kept in an
  "other attributes" section that the admin can rename or remove.
- Boolean fields are only written when switched on, so products do not collect
  a row of "Oven safe: No".

Run `npm run verify:attributes` in `client/` to replay every attribute in the
live database through the form. It is the guard that stops a schema change from
quietly discarding product data.

## Notifications

There are **no toasts**. Floating popups were removed because a message that
appears and vanishes is easy to miss and annoying when it fires for routine
things. Feedback now lives where the action happened:

- Success is shown by the thing that changed — the heart fills in, the cart count
  updates, the page navigates to the order.
- Errors are rendered inline next to the control that failed (cart panel, product
  page, admin actions, contact form) and are dismissible where relevant.
- The single exception is `ApiStatusBanner`: when the API is unreachable, a
  non-modal strip appears at the top of the page. It is a banner rather than a
  toast because it is part of the page flow, never covers content, and stays
  until the problem is actually fixed — a self-dismissing timer would be useless
  for something that does not resolve itself.

`react-toastify` is no longer a dependency.

## Interface and accessibility

Details that are easy to get wrong and are handled deliberately:

- **Scrollbars are styled, not hidden.** Six regions genuinely scroll (cart
  panel, search results, checkout summary, product thumbnails, image viewer,
  admin dialog). A hidden scrollbar removes the only cue that more content
  exists. Firefox uses `scrollbar-width`/`scrollbar-color`; Chromium and Safari
  use a slim `::-webkit-scrollbar` thumb.
- **Sticky-header offset.** `html` has `scroll-padding-top` so in-page anchors
  such as `/#best-sellers` and `?category=…#products` do not land underneath the
  sticky header.
- **One focus ring.** A single global `:focus-visible` outline, instead of
  some controls having a ring and the rest being invisible to keyboard users.
- **Reduced motion is honoured site-wide**, not just in the hero slideshow.
- **Font smoothing** and `text-wrap: balance` / `pretty` to prevent orphaned
  words in headlines and body copy.
- **Sticky mobile purchase bar** on product pages, which appears only once the
  real Add to cart button has scrolled out of view, and is hidden on desktop.
- **Skeletons instead of spinners** for product grids, so the page does not jump
  when content arrives.
- **Dismissible announcement bar** whose choice is remembered in `localStorage`.
  It rotates the store's **real categories**, each linking to that category
  (`GET /api/products/categories` returns one row per in-stock category with a
  count and a representative product, in about 4 KB), followed by the two
  store-wide messages. It used to show three hardcoded strings, so it advertised
  the same thing regardless of what was actually stocked.
- **Category rows have no scrollbar.** Horizontal chip rows (collection filters,
  the hero slide selector, the admin tab bar) use `.scrollbar-none`, because a
  scrollbar under a row of chips looks broken. Scrolling still works with
  wheel, trackpad, touch and keyboard, and the clipped chip at the edge is the
  affordance. Regions that hold *content* — cart, search results, checkout
  summary, admin tables — deliberately keep their visible scrollbar, since that
  is the only cue that more is below.

### Glitches fixed along the way

- **Modal scroll lock.** The image zoom viewer, the profile cropper and the
  admin product dialog all cover the screen, but none of them stopped the page
  scrolling behind on touch devices. `useScrollLock` now handles all three, and
  compensates for the scrollbar so the layout does not jump sideways. It is
  reference counted, so two overlays open at once do not fight over it.
- **Sticky purchase bar no longer covers the footer.** The mobile add-to-cart
  bar is `fixed`, so the product page reserves bottom padding when it is active.
- **Announcement bar layout.** Text and link were inside one truncated
  paragraph, which clipped the link mid-word on narrow screens; they are now
  separate elements. The `aria-live` region was also removed, because a
  rotating strip re-announced itself to screen readers every seven seconds.
- **One clear button in the search bar.** `type="search"` makes Chrome, Edge and
  Safari draw their own clear "X" inside the field. The search bar already
  renders a labelled clear button, so the two sat side by side. The native
  decoration is now suppressed in CSS; only the browser's own control is
  hidden, not the field's behaviour.
- **One money formatter.** `formatPrice` was duplicated in five files. They now
  all import from `lib/format`, so a currency change cannot leave the search
  results and the cart disagreeing.
- **Product images** carry intrinsic `width`/`height` and `decoding="async"`
  to avoid decode jank.
- **The hero no longer hides its call to action.** The slide selector was
  building one button per *product*, so as the catalogue grew the row wrapped,
  the control bar grew with it, and because it was `position: absolute` it
  covered the "Explore" button. The hero now shows one slide per category
  (capped at five), the selector is a single horizontally scrollable row, and
  the bar sits in normal flow so it reserves its own space.
- **Smooth scrolling.** `html` uses `scroll-behavior: smooth`, so in-page
  anchors glide instead of jumping. The existing reduced-motion rule forces it
  back to `auto` for users who ask for less movement.

## Scripts

| Command                | Where   | Does |
| ---------------------- | ------- | ---- |
| `npm run dev`          | both    | Dev servers with hot reload |
| `npm run build`        | client  | Production build into `client/dist` |
| `npm run preview`      | client  | Serve the production build locally |
| `npm run lint`         | client  | oxlint |
| `npm start`            | server  | Production start |
| `npm run admin:promote`| server  | Grant admin to an existing account |
| `npm run seed`         | server  | Add demo products across every category (idempotent) |
| `npm run smoke`        | server  | End-to-end API check (needs a running server) |

## Seeding products

`npm run seed` fills the catalogue with 25 products across seven categories
(Electronics, Fashion, Home & Kitchen, Outdoors, Stationery, Fitness, Lighting).
It is safe to run repeatedly: products are matched by name, so a second run
creates nothing.

| Flag | Effect |
| ---- | ------ |
| `--dry-run` | Report what would change, without writing |
| `--prune-duplicates` | Remove same-name duplicates, keeping the richest record |
| `--remove-seeded` | Delete only the products this script created |

`--remove-seeded` is deliberately narrow. It deletes a product only when **both**
its name is in the catalogue file **and** its image is the generated SVG data URI
this script writes — so a hand-made product that happens to share a name is never
touched. It also refuses to run if any cart, wishlist or order still references
one of the rows, rather than leaving a dangling reference behind.

Two details worth knowing:

- **Images are generated SVG data URIs**, not remote stock photos. Image hosts
  404, rate-limit and block hot-linking, and a catalogue of broken thumbnails
  looks worse than honest placeholder art. These always render and work offline.
  For production, upload real images through the admin console instead.
- **The script repairs broken rows.** Older data stored `userId` as the literal
  string `"YOUR_USER_ID_HERE"`, or as a plain `{ $oid: "..." }` object rather
  than a real `ObjectId`. That second form is invisible to normal queries,
  because Mongoose casting hides it, so the script inspects the raw BSON type
  and re-points those products at an admin account.
