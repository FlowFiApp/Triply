# Triply — Nimiq Mini App Competition Submission

> **Travel, booked on-chain. No accounts. No borders.**

---

## App Name
**Triply**

## Category
Lifestyle

## Tagline
Book real flights, stays, and cars with crypto — settled on-chain in minutes.

## Short Description
Triply is a web3 travel marketplace where you search real flights, hotels, and rental cars and pay with USDT on Polygon, cashback points in NIM — no sign-up, no KYC, no card required. Your wallet is your account. Built for crypto-native travelers who want real-world utility from their on-chain assets.

**Who it's for:** The 600M+ crypto owners who travel, and Nimiq Pay users who want a wallet-first, checkout-fast booking experience that traditional OTAs can't offer.

## Pricing
**Freemium** — Browse and search free; earn points and rewards for every activity; pay only when you book. Early users get loyalty points redeemable for NIM.

## Nimiq Points & Rewards
Every action in Triply earns **Nimiq Points** — the loyalty engine of the app:

- **2 NIM points** for every **1 USDT** spent on a booking (flights, stays, cars).
- **Feed rewards** for sharing travel moments, posting, and engaging with the community.
- Points accumulate in a **on-chain ledger** per user and are **redeemable for NIM** — paid out straight to your wallet.

You don't just spend with Nimiq — you earn it back on every trip.

---

## Links & Demo

| Item | Link |
|------|------|
| Repo | https://github.com/FlowFiApp/Triply |
| Live Demo | https://triply-nimiq.vercel.app |
| Video Walkthrough | *(paste your YouTube / Loom / Vimeo link)* |

## Media
- **App icon / favicon:** `public/logo.png`
- **Thumbnail:** *(attach 240×240 PNG/JPG/WebP)*
- **Screenshots:** *(attach 3–5 images — the first is used as the social preview. Suggested: Home search, Flight search results, Checkout/pay sheet, Feed, Profile with points)*

---

## About the Team

- **GitHub:** [devarogundade](https://github.com/devarogundade)
- **Email:** devarogundade@gmail.com
- **Team name:** Triply
- **Team members:** Ibrahim Arogundade · Taiwo Omoyeni
- **X (Twitter):** @yourhandle

### Builder Story

We noticed a strange gap: millions of people hold crypto and pay for everything with it online — except travel. The biggest travel platforms still demand credit cards, KYC, and bank accounts, which locks out a huge share of the world and forces crypto users to off-ramp into fiat just to book a hotel.

So we built Triply: a travel marketplace where your wallet **is** your account. Search real flights through Duffel's live inventory, book stays and cars, and pay with USDT on Polygon — fully settled on-chain in minutes. No account creation, no KYC, no card required.

We deliberately built it as a Nimiq Mini App to prove the ecosystem can power real-world commerce. Nimiq's identity is the login (a signed message becomes a JWT session), Nimiq is the loyalty backbone (points accrue per booking and reward payouts go out in NIM), and the whole flow behaves natively inside Nimiq Pay on mobile. From search to boarding pass, it's a finished product — not a demo.

The harder it is to move money, the more people need apps like this. We built the app we'd want to fly with.

---

## Promotion & Discovery

| Item | Points | Link |
|------|--------|------|
| Skool community post | 2 pts | https://www.skool.com/… |
| Social media post | 3 pts | https://x.com/you/status/… |
| How we heard | — | From a friend |

---

## Scoring Highlights

### Functionality & Usefulness (45 pts)
- **Core promise delivered end-to-end:** search → pick → pay → e-ticket → trip management, all without a crash or dead end.
- **Error handling:** every failure surfaces a clear, human message — no blank screens, no freezes.
- **Speed:** Next.js 16 streaming + edge caching; results render as fast as the supplier returns them.
- **Completeness:** flights, stays, cars, e-tickets, cancellations, saved passengers, profile, feed, loyalty points, rewards — a finished product.
- **Real need:** crypto-native travel with on-chain settlement, for users banks exclude or who refuse KYC.
- **Repeat value:** the feed, community moments, and a points/rewards loop give a reason to come back.

### Nimiq Pay & Nimiq Integration (25 pts)
- **Payments are core:** USDT-on-Polygon checkout is the beating heart of the flow, not a bolt-on.
- **Payment states handled:** success, failure, and cancellation each land the user in a clear state — never stuck.
- **Trustworthy flow:** the pay sheet always shows exactly what you're paying, to whom, the network, and what happens next.
- **Mobile experience:** safe-area aware, no zooming, no cut-off buttons — feels native inside Nimiq Pay.
- **NIM & ecosystem:** Nimiq signed-message identity (no password), **Nimiq Points rewards** — earn **2 NIM points per 1 USDT** spent + feed rewards, redeemable for **NIM payouts** straight to users' wallets.

### Design & UX (10 pts)
- Clean, consistent, professional mobile-first UI (dark/light themes).
- First-time user reaches booking in under 60 seconds with zero instructions.

### Real Usage (15 pts)
- *(Track unique users — see `/api/stats` — and share the demo URL widely.)*

---

## How to Try It

1. Open the **Demo URL** on your phone (or in a browser).
2. Tap a destination or search flights / stays / cars.
3. Pick an offer → **Pay with USDT** on Polygon.
4. Your **e-ticket** appears instantly in My Trips.
5. Connect your Nimiq wallet to earn points, post to the feed, and redeem rewards in **NIM**.

---

*Submission prepared for the Nimiq Mini App Competition. All links and credentials above are the team's own.*