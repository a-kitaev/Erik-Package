# Compensation Package — FY2027

A tiny static app: pick perks, stay under budget, lock it in once.

## Files
- `index.html` — page shell
- `style.css` — styling
- `items.js` — **edit this** to change items, descriptions, costs, or `BUDGET`
- `script.js` — app logic (shouldn't need to touch this)

## Run it locally
Just open `index.html` in a browser — no server, no build step.

## Deploy to GitHub Pages (free)
1. Create a new **public** repo on GitHub (GitHub Pages on the free tier requires
   the repo to be public — the values aren't meaningfully secret anyway, since
   anyone can view-source a static site regardless of repo visibility).
2. Push these four files to the repo root.
3. Repo → Settings → Pages → Source: "Deploy from a branch" → branch `main`, folder `/root`.
4. Your app will be live at `https://<your-username>.github.io/<repo-name>/`.

## How it works
- Selections are tracked in memory; the budget bar and the "hard cap" (items
  that would push you over budget grey out) update live.
- **Lock In Package** is final — there's no edit mode after. If he submits by
  mistake, the only way to reset on that device is clearing the site's local
  storage (Settings → Site data, in most browsers) — there's no backend, so
  nothing enforces this except that friction.
- The result is saved in the browser's local storage, so reopening the app on
  the *same device* shows the locked-in package automatically.
- Locking in also builds a **share link** (`?pkg=...` with the result encoded
  in the URL) — open that link on any other device to view the same result,
  read-only. No server or database involved; the data lives entirely in the
  link itself.
- Item values are never shown to the user — only the running total vs. budget.
