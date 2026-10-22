# BidHouse — Online Auction Management System

A complete, human-designed Online Auction Management System built for a college DBMS project. The application connects directly to an existing local CockroachDB database (`auction_db`), exposing full marketplace workflows including active bidding, real-time bid history, user authentication, role-based dashboards, simulated payments, courier tracking, and user reviews.

---

## 1. Architecture & Design Principles

- **Database:** Local CockroachDB instance running at `localhost:26257`.
- **Backend:** Node.js + Express.js utilizing the standard `pg` (PostgreSQL wire-protocol compatible) driver.
- **Frontend:** React + Vite + React Router.
- **Visual Identity:** Non-generic, student-crafted visual aesthetic featuring a warm off-white background (`#fbf9f5`), dark charcoal typography (`#232220`), restrained deep burgundy/cherry accents (`#852236`), thin neutral borders, and small corner radii (no gradients, glowing blobs, or oversized cards).
- **Zero Schema Mutations:** Operates strictly on the 9 existing tables in `auction_db` with `schema_locked = true`. No DDL, no migrations, and no automatic mutations of historical records.

---

## 2. Concurrency & Safe ID Allocation Strategy

Because the schema does not utilize auto-increment sequences or default serial values on primary keys, concurrent ID allocation is addressed as follows:

1. **CockroachDB Serializable Isolation (SSI):** All transactions in CockroachDB run under full Serializable Snapshot Isolation.
2. **Row Locking (`FOR UPDATE`):** When generating the next primary key, the backend queries:
   ```sql
   SELECT <id_column> FROM <table_name> ORDER BY <id_column> DESC LIMIT 1 FOR UPDATE;
   ```
   This acquires an exclusive lock on the highest existing record within an atomic transaction.
3. **Automatic Conflict Retries (Code `40001`):** A custom CockroachDB transaction runner (`server/db/index.js`) detects serialization conflicts (`40001`) and retries the transaction with exponential jitter, ensuring duplicate primary key conflicts are prevented without modifying the database schema.

---

## 3. Project Directory Structure

```text
Online Auction Management System/
├── package.json               # Root scripts for starting client and server
├── .gitignore                 # Excludes .env, node_modules, and build artifacts
├── README.md                  # Comprehensive setup and project documentation
├── server/                    # Node.js + Express Backend
│   ├── .env                   # Local environment config (not tracked in Git)
│   ├── .env.example           # Example environment template
│   ├── package.json           # Backend dependencies: express, pg, bcryptjs, jsonwebtoken, cors
│   ├── server.js              # Express app entry point & route registration
│   ├── db/
│   │   └── index.js           # CockroachDB pg.Pool, query helper & transaction retry runner
│   ├── middleware/
│   │   └── auth.js            # JWT verification & role authorization (Buyer, Seller, Admin)
│   └── routes/
│       ├── auth.js            # Login (bcrypt.compare) & Registration (bcrypt hash)
│       ├── categories.js      # Category listing
│       ├── items.js           # Item listing, search, creation & editing
│       ├── auctions.js        # Auction retrieval, filtering & bid history
│       ├── bids.js            # Server-side bidding validation & insert
│       ├── watchlist.js       # Watchlist management
│       ├── payments.js        # Simulated payment ledger
│       ├── shipping.js        # Shipping fulfillment & tracking
│       ├── reviews.js         # User & seller review records
│       └── users.js           # Admin user directory
└── client/                    # React + Vite Frontend
    ├── package.json           # Frontend dependencies: react, react-router-dom, vite
    ├── vite.config.js         # Vite configuration with /api reverse proxy to port 5000
    ├── index.html             # HTML entry point with clean serif/sans typography
    └── src/
        ├── main.jsx           # React DOM root render
        ├── App.jsx            # Route declarations & layout shell
        ├── index.css          # Restrained student design system (warm palette, no gradients)
        ├── context/
        │   └── AuthContext.jsx # Session management & authenticated fetch helper
        ├── components/
        │   ├── Navbar.jsx     # Navigation bar with role indicators & search
        │   ├── Footer.jsx     # Understated college project footer
        │   └── ImageWithFallback.jsx # Fallback placeholder for missing/broken item images
        └── pages/
            ├── HomePage.jsx          # Marketplace homepage with active auctions & categories
            ├── BrowsePage.jsx        # Filterable & searchable auction catalog
            ├── AuctionDetailsPage.jsx# Item view, dynamic highest bid, history & bidding form
            ├── LoginPage.jsx         # Sign in & Buyer registration form
            ├── BuyerDashboard.jsx    # Bids, won items, watchlist & simulated checkout
            ├── SellerDashboard.jsx   # Inventory management, new listing form & shipping
            ├── AdminDashboard.jsx    # Raw live inspection across all 9 database tables
            └── TrackingPage.jsx      # Order & courier dispatch tracking
```

---

## 4. Installation & Setup Instructions

### Prerequisites
- **Node.js:** v18.0.0 or later (Tested on Node v25.1.0)
- **CockroachDB:** Running locally on port `26257` in insecure mode with database `auction_db` created:
  ```powershell
  cockroach sql --insecure --host=localhost:26257 --database=auction_db
  ```

---

### Step 1: Backend Setup

Open a terminal and navigate to the `server/` directory:

```bash
cd server
npm install
```

Verify that `server/.env` exists and contains your CockroachDB connection string:

```env
PORT=5000
DATABASE_URL=postgresql://root@localhost:26257/auction_db?sslmode=disable
JWT_SECRET=super_secret_college_auction_key_2026
NODE_ENV=development
```

Start the backend server:

```bash
npm start
```

The backend starts listening on `http://localhost:5000`. You can verify API health at:
`http://localhost:5000/api/health`

---

### Step 2: Frontend Setup

Open a **second terminal** and navigate to the `client/` directory:

```bash
cd client
npm install
npm run dev
```

The frontend development server starts on `http://localhost:3000`.

Open your browser and navigate to:
**`http://localhost:3000`**

---

## 5. Demonstration & Role Testing Guide

The system implements authentic role-based access control (`Buyer`, `Seller`, and `Admin`):

### 1. Registering a New Buyer
- Click **Sign In / Register** in the top navigation bar.
- Switch to the **Register Account** tab.
- Enter your Name, Email, Phone, Address, and Password.
- Newly registered accounts default to the **Buyer** role and are saved directly into the `app_user` table using bcrypt password hashing.

### 2. Testing Existing Seeded Accounts
All 20 existing user records in `auction_db` have their passwords preserved in standard bcrypt format:
- **Buyer Accounts:** UserIDs `101`, `104`, `106`, `108`, `110`, `112`, `114`, `117`, `119`.
- **Seller Accounts:** UserIDs `102`, `105`, `107`, `109`, `111`, `113`, `116`, `118`, `120`.
- **Admin Accounts:** UserIDs `103`, `115`.
- Sign in with your demo account credentials.

### 3. Role-Specific Capabilities
- **Buyer:**
  - Place bids on active auctions with server validation (must exceed current highest bid; sellers cannot bid on their own listings).
  - Add items to personal Watchlist.
  - View won auctions and complete simulated checkout with address and courier selection.
  - Track payments (`TXN...`) and shipments (`TRK...`).
- **Seller:**
  - View personal listed inventory and current highest bids.
  - List new items with optional immediate auction scheduling.
  - Edit owned listings.
  - Update shipping status (`Processing` &rarr; `Shipped` &rarr; `Delivered`).
- **Admin:**
  - Access the `/admin` portal.
  - Inspect live ledgers across all 9 database tables (`app_user`, `category`, `item`, `auction`, `bid`, `watchlist`, `payment`, `shipping`, `review`).
  - Search and filter records in real-time.

---

## 6. Troubleshooting

1. **CockroachDB Connection Refused (`ECONNREFUSED 127.0.0.1:26257`):**
   - Verify CockroachDB is active on your machine:
     ```powershell
     cockroach sql --insecure --host=localhost:26257
     ```
   - Ensure `DATABASE_URL` in `server/.env` is set to `postgresql://root@localhost:26257/auction_db?sslmode=disable`.

2. **Port 5000 or 3000 in use:**
   - Change `PORT` in `server/.env` to another port (e.g. `5001`), and update the proxy target in `client/vite.config.js`.

3. **Missing or Broken Product Images:**
   - Seeded URLs (such as `http://img.com/1.jpg`) that fail to resolve are automatically caught by the frontend's `<ImageWithFallback />` component, presenting a clean placeholder so layouts remain intact.
