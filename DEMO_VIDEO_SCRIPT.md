# SplitMate — Loom Video Recording Script & Demo Guide 🎬

**Target Duration**: 4 to 6 minutes  
**Deliverable**: Loom / Screen-Recording Link + GitHub Repository Link  
**Tone**: Confident, engineering-focused, clear, and casual.

---

## 🛠️ Pre-Recording Setup Checklist

1. **Terminal Services Running**:
   - **Backend**: ASGI Daphne running at `http://127.0.0.1:8000` (`python -m daphne -b 127.0.0.1 -p 8000 config.asgi:application` or `python manage.py runserver 127.0.0.1:8000`).
   - **Frontend**: Vite running at `http://localhost:5173` (`npm run dev`).
   - **Fresh Seed Data**: Run `python seed.py` in `backend/` to start with a clean state.

2. **Screen Layout (Side-by-Side Windows)**:
   - **Left Window (50% screen)**: Google Chrome (Normal profile) logged in as **Alice** (`alice@test.com` / `password123`).
   - **Right Window (50% screen)**: Chrome Incognito or Firefox/Brave logged in as **Bob** (`bob@test.com` / `password123`).
   - *Why Incognito?* The refresh token cookie is stored with `HttpOnly; SameSite=Lax`. An Incognito window ensures Alice and Bob maintain independent sessions without colliding cookies.

3. **Audio / Video**:
   - Microphone tested and clear.
   - Loom set to record the **Entire Desktop / Screen** so both browser windows are visible simultaneously.

---

## ⏱️ Minute-by-Minute Recording Script

```
   0:00 ─── 0:45  [Intro & Architecture]
   0:45 ─── 1:30  [Auth, JWT Security & Data Model]
   1:30 ─── 2:15  [Group Creation, Members & Removal Guard]
   2:15 ─── 3:15  [Equal Split & Live Real-Time WebSocket Sync]
   3:15 ─── 4:00  [Exact Split, Inline Validation & Remainder Math]
   4:00 ─── 4:45  [Debt Simplification & Live Settle Up]
   4:45 ─── 5:30  [Permission Guards, Personal History & Wrap-Up]
```

---

### Scene 1: Introduction & Architecture Overview
**Time**: `0:00 – 0:45`  
**What to show on screen**: Both windows side-by-side on the SplitMate Dashboard (`http://localhost:5173/dashboard`). Left is Alice; Right is Bob.

**What to Say**:
> *"Hi everyone, welcome to the demo of SplitMate, a real-time shared expense management application built to handle complex multi-user ledger math, real-time synchronization, and airtight edge cases.*
>
> *On the left side of my screen, I have Alice logged in, and on the right side in an incognito window, I have Bob.*
>
> *Under the hood, SplitMate is built with a Django 5 ASGI backend using Daphne, Django REST Framework, and Channels for authenticated WebSockets, backed by MySQL 8. The frontend is a single-page React app with TypeScript, Vite, and Tailwind CSS."*

---

### Scene 2: Authentication, Security & Data Model
**Time**: `0:45 – 1:30`  
**What to show on screen**: Point cursor to Alice's profile card, then open Chrome DevTools (Application > Cookies) briefly to show the `refresh_token` cookie.

**What to Say**:
> *"Let's start with security. SplitMate uses an enterprise-grade auth flow:
> 1. Passwords are never stored in plaintext—they are hashed using Argon2, the winner of the Password Hashing Competition.
> 2. We use a sliding JWT refresh token architecture. The short-lived access token lasts 15 minutes and lives strictly in JavaScript memory—never in localStorage—to block XSS token theft.
> 3. The refresh token lasts 7 days, stored in an HttpOnly, SameSite cookie scoped to `/api/auth/`. In the database, refresh tokens are stored as cryptographic SHA-256 hashes.
> 4. When the access token expires, an Axios response interceptor transparently calls the refresh endpoint, rotates the token hash, and replays pending requests seamlessly."*

---

### Scene 3: Group Membership & The Zero-Balance Guard
**Time**: `1:30 – 2:15`  
**What to show on screen**:
- Both Alice and Bob navigate to **"My Groups"** and open the **"Goa Trip"** group (`/groups/1`).
- Alice clicks the **"Members"** tab. Show Alice is the Owner and Bob is a Member.
- Highlight the **"Add Member"** modal (adds by registered email).
- Point to the member removal option.

**What to Say**:
> *"Next is group membership. A user can belong to many groups, and a group has many members modeled with a clean many-to-many relationship. The group creator is the owner.*
>
> *Notice our membership constraints: the owner can add members by email, but cannot remove a member unless their net balance in this group is exactly zero. If a member owes money or is owed money, the backend rejects the removal with a 409 Conflict. Furthermore, when deleting a group, cascade rules cleanly clean up records without corrupting historical split data."*

---

### Scene 4: Equal Split & Instant Cross-Window WebSocket Sync (The "Hard Part")
**Time**: `2:15 – 3:15`  
**What to show on screen**:
- Alice (left window) clicks **"Add Expense"**.
- Alice enters:
  - Description: `Scuba Diving & Boat Trip`
  - Amount: `₹3,000`
  - Date: Today
  - Split Type: **Equal Split**
  - Members: Alice and Bob selected.
- Keep Bob's window (right window) clearly in view.
- Alice clicks **"Save Expense"**.
- **Watch Bob's window immediately update balances and activity without any page reload!**

**What to Say**:
> *"Now for the core math and real-time synchronization. Watch Bob's window on the right carefully.
>
> Alice is adding a ₹3,000 expense for 'Scuba Diving & Boat Trip' paid by Alice, split equally between Alice and Bob.
>
> When Alice clicks Save... Boom! Bob's window on the right updates instantly with zero page reload.
>
> This is powered by authenticated Django Channels WebSockets. Notice the green 'Live' indicator in the header. Our WebSocket consumer authenticates via JWT, checks group membership on the backend, and joins strictly isolated rooms—`group_{id}` and `user_{id}`. There is zero global broadcasting or leakage to other groups. If the connection ever drops, our client handles exponential backoff and automatically reconnects."*

---

### Scene 5: Custom/Exact Split, Remainder Rounding & Inline Validation
**Time**: `3:15 – 4:00`  
**What to show on screen**:
- Bob (right window) clicks **"Add Expense"**.
- Description: `Dinner at Fisherman's Wharf`
- Amount: `₹1,000`
- Payer: Bob
- Split Type: Select **"Exact Split"**.
- In the per-member share inputs:
  - Enter `₹400` for Bob.
  - Enter `₹500` for Alice (Total = ₹900).
- **Point out the inline error message**: *"Shares add up to ₹900.00, expense is ₹1,000.00"*. The Save button is disabled.
- Change Alice's share to `₹600` (Total = ₹1,000). The error clears and Save enables.
- Bob submits. Alice's left window updates live immediately!

**What to Say**:
> *"Now let's demonstrate custom exact splits and our rounding rules.
>
> In our database, money is strictly stored as integer minor units—paisa—never floating-point numbers. This eliminates IEEE-754 precision errors.
>
> For equal splits that don't divide evenly—like ₹100 split 3 ways—our algorithm calculates base = total // n and distributes the remainder paisa to the first members ordered by user ID. Sum of shares always equals the total to the exact paisa; zero money is ever dropped or invented.
>
> For exact splits, as you can see, when Bob enters shares adding up to ₹900 against a ₹1,000 expense, the UI displays an inline validation error and disables the submit button. Once corrected to ₹600, it validates and updates both screens live."*

---

### Scene 6: Derived Balances, Debt Simplification & Settle Up
**Time**: `4:00 – 4:45`  
**What to show on screen**:
- Switch to the **"Balances"** tab on either window.
- Show the **"Net Balances"** card and the **"Who Owes Whom"** simplified settlement suggestion card.
- Bob clicks **"Settle Up"**.
- Amount pre-fills with the exact owed amount.
- Bob clicks **"Record Payment"**.
- Both windows instantly turn green showing the **"All Settled Up"** zero-balance status!

**What to Say**:
> *"Now let's examine derived balances. Balances in SplitMate are never stored as static fields; they are derived dynamically from immutable transactions, preventing race conditions.
>
> On the Balances tab, our engine runs a greedy debt simplification algorithm that collapses complex multi-party debts into the minimum number of direct transactions.
>
> It shows that Bob owes Alice ₹900. Bob clicks 'Settle Up' to record a direct payment.
>
> Notice the airtight backend validation: you cannot settle a negative amount, you cannot settle with yourself, and you cannot settle more than is owed.
>
> When Bob records the settlement, both screens immediately reflect the payment, and our settlement badge turns to 'All Clear'."*

---

### Scene 7: Backend Permissions, Audit Trail & Dashboard
**Time**: `4:45 – 5:30`  
**What to show on screen**:
- In the **"Expenses"** tab, show that Bob sees an Edit/Delete button on his own expense, but cannot edit Alice's expense.
- Click the **"Activity"** tab: show the reverse-chronological audit trail with icons for expense additions, edits, member events, and settlements.
- Click **"Dashboard"** in the sidebar: show the 4 KPI cards (Total Owed By Me, Total Owed To Me, Net Balance, Group Count, Most Owed Group) and recent personal activity feed.
- Click **"Personal History"** in the sidebar: show the paginated ledger of all user transactions across all groups.

**What to Say**:
> *"Finally, let's review permissions, audit logging, and the dashboard.
>
> Requirement 19 dictates that only the expense creator or group owner can edit or delete an expense. The backend enforces this strictly with 403 Forbidden checks.
>
> On the Activity tab, every mutation—expense additions, edits, deletions, member joins, and settlements—is recorded in a reverse-chronological group audit feed.
>
> On our Dashboard, the logged-in user has a bird's-eye view of their net balance, total they owe, total they are owed, the group where they owe the most, and real-time activity.
>
> On the Personal History page, members can audit their personal transaction history across all groups with server-side pagination.
>
> We also have a test suite with 70 passing automated tests covering all critical paths. SplitMate is completely clean-clone ready. Thank you!"*

---

## 🎯 Cheat Sheet for the Technical Follow-Up Call ("The Deal")

The assessment mentions:
> *"In the follow-up call we will pick parts of your code, ask you to explain them, make a small live change, and debug something."*

Here is your rapid-fire technical cheat sheet so you ace every question:

### 1. "Explain your refresh token flow. Where is what stored and why?"
- **Answer**:
  - **Access token**: Short-lived (15 min) JWT stored **only in JavaScript memory** (`api/client.ts`). Not in `localStorage` to prevent Cross-Site Scripting (XSS) exfiltration.
  - **Refresh token**: Long-lived (7 days) random cryptographic string (`secrets.token_urlsafe(64)`), sent via an `HttpOnly`, `SameSite=Lax` cookie scoped strictly to `/api/auth/`. In MySQL, we store a **SHA-256 hash** of this token (`RefreshToken` model), so even a database leak does not expose valid refresh tokens.
  - **Expiry/Rotation**: When the access token expires, Axios intercepts the 401, calls `/api/auth/refresh`, the server verifies the hash, rotates the token (revokes old, issues new hash), and returns a fresh access token.

### 2. "How did you handle rounding for uneven splits like ₹100 split 3 ways?"
- **Answer**:
  - We store all amounts in integer minor units (paisa) using `BigIntegerField`.
  - In `backend/core/money.py`, `equal_split(total, member_ids)` calculates:
    `base, rem = divmod(total, len(member_ids))`
  - The first `rem` members (sorted deterministically by user ID) receive `base + 1` paisa, and the remaining members receive `base`.
  - For ₹100.00 (`10000` paisa) split 3 ways: User A gets `3334` paisa (₹33.34), User B gets `3333` (₹33.33), User C gets `3333` (₹33.33). Sum is strictly `10000` paisa. Zero paisa is dropped or invented.

### 3. "How are balances calculated? Are they stored in a table?"
- **Answer**:
  - Balances are **derived on-the-fly**, never stored as static columns. Storing balances causes race conditions and desynchronization.
  - In `backend/core/balances.py`, `net_balances(expenses, settlements)` aggregates:
    $$\text{net}[\text{payer}] \mathrel{+}= \text{amount}$$
    $$\text{net}[\text{member}] \mathrel{-}= \text{share}$$
    $$\text{net}[\text{settlement\_from}] \mathrel{+}= \text{amount}$$
    $$\text{net}[\text{settlement\_to}] \mathrel{-}= \text{amount}$$

### 4. "How does your debt simplification algorithm work?"
- **Answer**:
  - In `backend/core/balances.py`, `simplify(net)` uses a greedy two-pointer strategy.
  - It sorts debtors in descending order of what they owe and creditors in descending order of what they are owed.
  - At each step, the largest debtor pays the largest creditor $\min(\text{debt}, \text{credit})$. One party's balance drops to zero and the pointer advances.
  - This reduces $N(N-1)/2$ complex bilateral debts into at most $N-1$ clean settlement steps.

### 5. "How do you scope WebSockets so User A doesn't see User C's private groups?"
- **Answer**:
  - In `apps/realtime/consumers.py`, `GroupConsumer.connect()` extracts the JWT from `?token=...`, decodes and verifies the signature.
  - It queries `Membership.objects.filter(group_id=group_id, user_id=user.id).exists()`. If false, it immediately drops the socket with code `4003 Forbidden`.
  - It registers the channel only to `group_{group_id}` and `user_{user_id}`. There are no global broadcasts.

### 6. "What was an unexpected technical bug you solved?"
- **Answer**:
  - On Windows, `localhost` resolves to IPv6 `::1` before falling back to IPv4 `127.0.0.1`. In Python Daphne and Node.js Axios, this caused a 2.08-second socket timeout on every API request.
  - We profiled the network waterfall, diagnosed the socket timeout, and configured explicit `127.0.0.1` endpoints across backend settings, database configurations, and frontend API clients, reducing page transitions from 4,000ms down to 140ms.
