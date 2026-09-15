# Deploying & restricting access (Cloudflare Workers + Access)

The app is static, so access control is enforced by Cloudflare Access in front of
the Cloudflare Worker that serves the static build: nobody gets the app files without first passing a login that is
limited to `@cognition.ai` emails. Login is a magic link / one-time PIN emailed to
the user (Google sign-in can be added alongside).

## 1. Create the Worker (once)

1. Cloudflare dashboard → **Workers & Pages → Create → Upload your static files**.
2. Name it `territory-planner` (must match `name` in `wrangler.toml`). Upload anything
   to create it; the GitHub Action below replaces it on the next push to `main`.
3. Note the site URL, e.g. `https://territory-planner.<account>.workers.dev`.

## 2. Add GitHub repo secrets

Repo → **Settings → Secrets and variables → Actions**:

| Secret | Where to get it |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Dashboard → Workers & Pages → right sidebar "Account ID" |
| `CLOUDFLARE_API_TOKEN` | My Profile → API Tokens → Create Token → template **"Edit Cloudflare Workers"** |

Every push to `main` now runs `.github/workflows/deploy.yml`, which builds `dist/`
and runs `wrangler deploy`, which uploads `dist/` as the Worker's static assets
(`wrangler.toml`).

## 3. Restrict access to @cognition.ai (Cloudflare Access)

1. **Zero Trust** dashboard (one.dash.cloudflare.com) → pick the Free plan if prompted
   (covers up to 50 users) and choose a team name.
2. **Settings → Authentication → Login methods → Add new → One-time PIN.**
   This is the magic-link/emailed-code login. (Optionally also add **Google** here.)
3. **Access → Applications → Add an application → Self-hosted.**
   - Application name: `Territory Planner`
   - Session duration: e.g. 1 week
   - Application domain: `territory-planner.<account>.workers.dev`
     (copy the exact hostname from the Worker's overview page)
4. **Add a policy**:
   - Name: `Cognition staff`, Action: **Allow**
   - Include → Selector **Emails ending in** → `@cognition.ai`
5. Save. Visiting the site now shows the Cloudflare login page; entering a
   `@cognition.ai` address emails a one-time code, anything else is rejected before
   the app is served.

## Notes

- Saved versions live in each user's browser (localStorage). Access gates who can
  open the app; it does not make plans shared between users.
- Preview URLs (`<version>-territory-planner.<account>.workers.dev`) are not covered by
  the policy above; disable them under the Worker's **Settings → Domains & Routes →
  Preview URLs** or add `*.<account>.workers.dev` to the Access application.
