# Triply

A web3 travel app for the [Nimiq Pay mini-app](https://nimiq.dev/mini-apps/) platform.
Book **flights**, **stays** and **car rentals**, pay in **USDT on-chain** — no
accounts, no bank/credit-card rails. Fiat → USDT conversion and settlement are
proxied behind the scenes.

The UI implements all **43 Figma screens** (dark + light themes) for the Triply
design file.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + TypeScript
- **Tailwind CSS v4** with a dark/light token system
- **Host Grotesk** typeface
- **`@duffel/api`** — flights, stays and cars (server-side)
- **`@nimiq/mini-app-sdk`** — Nimiq Pay provider + injected EVM provider
- **OpenStreetMap** — keyless map embeds on stay & car screens
- **lucide-react** icons

## Getting started

```bash
npm install
cp .env.local.example .env.local   # optional: add DUFFEL_ACCESS_TOKEN
npm run dev
```

Open <http://localhost:3000>. The app renders inside a 768px mobile frame and
works in a normal browser; inside Nimiq Pay the wallet provider is used for
real USDT settlement.

### Design index

Visit **`/designs`** for a linked index of all 43 screens (flights, sheets,
stays, cars — each in dark and light). Every screen also has a floating
theme toggle.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Home / flight search |
| `/search` | Search results (filters, sorting) |
| `/flight` | Flight details (timeline, add-ons) |
| `/passengers` | Passenger details |
| `/checkout` | Web3 checkout (USDT only) |
| `/processing` | On-chain settlement + ticket issuance |
| `/ticket` | E-ticket / boarding pass |
| `/trips` | My bookings |
| `/stays`, `/stay`, `/stay/confirmed` | Accommodations flow |
| `/cars`, `/car`, `/car/confirmed` | Car-rental flow |
| `/sheets/class`, `/sheets/filter`, `/sheets/wallet`, `/sheets/rules` | Full-screen sheets |
| `/designs` | Index of all 43 designs |

Query params: `?t=light` sets the light theme, `?v=b` selects a screen variant,
`?sheet=wallet|filter|class|rules` auto-opens a sheet, `?offer=<id>` carries a
selected Duffel offer through the flow.

## Payments — web3 USDT only

There are deliberately **no bank or card payment options**. Checkout supports:

- **Pay with Crypto Wallet** — Solana, Base, Polygon, Arbitrum
- **Pay via QR Code / Transfer**
- Network selector (Base default) with a live fee hint

`src/lib/wallet.ts` connects the wallet (Nimiq Pay provider first, then an
injected EIP-1193 provider) and sends an ERC-20 `transfer` of USDT to the
merchant treasury. If no provider is present it degrades to a simulated
transaction so the flow remains testable.

Fiat → USDT rates are served by `GET /api/rates?fiat=NGN` (proxied).

## Duffel integration

Server-side client in `src/lib/duffel.ts` using the
[`@duffel/api`](https://duffel.com/docs/guides/javascript-client-library) client.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/flights/search` | Offer request (one-way / return) |
| `GET /api/flights/offers/:id` | Retrieve an offer with services |
| `POST /api/orders` | Create an instant order (called after on-chain payment) |
| `POST /api/stays/search` | Accommodation search |
| `POST /api/cars/search` | Car search |
| `GET /api/rates` | Fiat → USDT rate proxy |

Set `DUFFEL_ACCESS_TOKEN` to enable live results; without it the app falls back
to demo data and simulated orders.

The flight flow wires through end to end: search → select (`?offer=`) →
passengers → USDT checkout → on-chain settlement → `POST /api/orders` with the
transaction hash attached as order metadata.

## Maps & city search

Stay details and car pickup locations use **keyless OpenStreetMap** embeds
(`src/components/OsmMap.tsx`), and "Get Directions" opens an OSM directions
route to the property / pickup point.

City selection (flight origin/destination, stay destinations, car pickup
locations) uses a bottom sheet backed by Duffel's **List Cities** endpoint
(`GET /api/cities`), so no Google services are used anywhere.

## Nimiq Pay

The app is a Nimiq mini-app. To test on-device:

```bash
npm run dev -- --host
```

then open the Network URL inside **Nimiq Pay → Mini Apps**. `init()` from
`@nimiq/mini-app-sdk` resolves the injected provider; `window.ethereum` is used
for EVM chains (Base / Polygon / Arbitrum).

## Scripts

```bash
npm run dev      # dev server
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```

## Notes

- `designs/` holds the 43 rendered Figma frames used as the visual reference.
- `DESIGN-REFERENCE.md` is the generated layout/typography/colour spec for every
  node.

## License

[MIT](LICENSE)
