# Tin's Collection

A free product catalog. Customers browse, pick sizes, and send their cart to the shop on Messenger.
The admin adds, edits and deletes items, and manages stock and sold-out status.

**Runs on free tiers only:** Supabase (database, photos, login) and Vercel or Netlify (hosting).

## 1. Set up Supabase (about 5 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: paste all of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   This creates the tables, security rules and the `product-images` storage bucket.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up". Only you should have an account.
4. **Authentication → Users → Add user**: enter your email and a strong password, and tick auto-confirm.
5. Back in the SQL Editor, run this with your email to make yourself the admin:
   ```sql
   insert into public.admins (user_id)
     select id from auth.users where email = 'you@example.com'
   on conflict do nothing;
   ```
6. Copy the two values the website needs to connect:
   - **Project URL**, which looks like `https://abcdefghijklmnop.supabase.co`. Find it under **Project Settings → Data API** (older dashboards: **Project Settings → API**), or click **Connect** at the top of the dashboard.
     → goes in `VITE_SUPABASE_URL`
   - **Public key**: under **Project Settings → API Keys**. Newer projects call it the **publishable** key (starts with `sb_publishable_`); older ones call it the **`anon` `public`** key (a long string starting with `eyJ`). Either works.
     → goes in `VITE_SUPABASE_PUBLISHABLE_KEY` (the older name `VITE_SUPABASE_ANON_KEY` also works)

   This key is *meant* to be public. It ships inside the website, and the security rules from step 2 stop it from changing anything.
   **Never** use the `secret` / `service_role` key here: it bypasses all security rules and must never be put in a website.

> **Already set up before conditions (brand new / pre-loved) were added?** Run `supabase/schema.sql` again in the SQL Editor. It's safe to re-run: it adds the `condition` column and marks every existing item as brand new.

## 2. Run locally

```bash
cp .env.example .env    # then fill in the 3 values
npm install
npm run dev
```

- Shop: http://localhost:5173
- Admin: http://localhost:5173/admin

`VITE_FB_PAGE_USERNAME` is your Facebook Page username, the part after `facebook.com/`
(the cart opens `https://m.me/<username>`).

Optional, for the footer's **Where to find us** section (anything left blank is hidden):
- `VITE_FB_PAGE_URL`: full link to your Facebook Page. Leave blank to use `facebook.com/<VITE_FB_PAGE_USERNAME>`.
- `VITE_STORE_ADDRESS`: your physical store's address. It links to Google Maps for directions.
- `VITE_STORE_COORDS`: exact map pin as `latitude, longitude`. Google Maps can't find a purok precisely from the address, so set this to make **Get directions** land on the shop.

## 3. Deploy (free)

**Vercel:** import the repo, then add the three `VITE_*` env vars (plus any of the optional footer ones). `vercel.json` already handles page refreshes.
**Netlify:** build command `npm run build`, publish directory `dist`, plus the same env vars. `public/_redirects` handles refreshes.

### Stop the free database from pausing
Supabase pauses free projects after a week with no visits. If the repo is on GitHub, add the repo secrets
`SUPABASE_URL` and `SUPABASE_ANON_KEY`. The workflow `.github/workflows/keepalive.yml` then pings it every 3 days.
If it ever pauses anyway, click **Restore** in the Supabase dashboard.

## How it works

| | |
|---|---|
| Stock | Tracked per size. A size with 0 stock can't be picked. |
| Condition | Every item is **Brand new** or **Pre-loved**, chosen in the item form. Shoppers can filter by it, and pre-loved items are labelled in the cart and the Messenger order. |
| Sold out | Shown when the admin ticks "sold out" **or** every size is at 0. |
| Deleting | Removes the item, its sizes **and its photos** from storage, to free up space. |
| Photos | Up to 5 per item, shrunk in the browser to about 1200px WebP (usually under 250 KB) before upload. |
| Cart | Saved in the customer's browser. It's re-checked against live stock each time the cart opens. |
| Ordering | "Order via Messenger" copies a summary (items, sizes, quantities, total) and opens your page's Messenger. The customer pastes and sends it. Messenger links can't pre-fill text, so the order is copied instead. |
| Security | Anyone can read products. Only users in the `admins` table can change anything (enforced by Supabase Row Level Security). |

Free-tier limits: 500 MB database (thousands of products) and 1 GB photo storage (about 4,000 or more compressed photos).
