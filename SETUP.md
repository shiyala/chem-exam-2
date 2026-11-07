# Setting up Ask Claude

Ask Claude adds a Google sign-in to the study site. Once you're signed in, you can ask Claude about any Exam 2 topic, or tap **Ask Claude** on a practice problem.

A GitHub Pages site is public, so it can't hold an API key. A small free Cloudflare Worker sits in between:

1. The page signs you in with Google.
2. The Worker checks that sign-in and that it's an allowed account.
3. The Worker sends your question to Claude with the API key, which stays secret on Cloudflare.

The rest of the site keeps working as it does now until all of this is done. The Ask Claude tab only appears once the last step is finished.

You'll set up three accounts. Plan on about 30 minutes at a computer.

## 1. Google: get a sign-in client ID

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and sign in with the Google account you'll use on the site.
2. Create a project, for example **Chem Exam 2**.
3. Open **Google Auth Platform**. You can also reach it from **APIs & Services**, then **OAuth consent screen**. Click **Get started** and fill in the following:
   - **App name:** Chem Exam 2 Prep
   - **Support email:** your Gmail
   - **Audience:** External
   - **Contact email:** your Gmail
   
   Then agree and click **Create**.
4. Under **Audience**, go to **Test users** and add your own Gmail address.
5. Open **Clients**, then **Create client**, and fill in the following:
   - **Application type:** Web application
   - **Name:** Chem Exam 2 site
   - **Authorized JavaScript origins:** add `https://shiyala.github.io`. Use exactly that, with no slash or path at the end.
   - **Authorized redirect URIs:** leave empty.
6. Click **Create** and copy the **Client ID**. It ends in `.apps.googleusercontent.com`. It's public, so it's fine to send to Claude.

## 2. Anthropic: get an API key

1. Go to the Claude Console at [platform.claude.com](https://platform.claude.com) and create an account.
2. Under **Billing**, add credits. The API is billed per use, separately from a Claude subscription.
   - The Worker uses Claude Sonnet 5.5, which costs $2 per million input tokens and $10 per million output tokens.
   - A typical question costs roughly 1 to 4 cents.
3. Optional but recommended: under **Limits**, set a monthly spend limit you're comfortable with.
4. Under **API keys**, create a key and copy it. It's shown only once.

**Keep this key secret.** Don't send it to anyone, Claude included, and don't put it in the repo. You'll paste it straight into Cloudflare in the next step.

## 3. Cloudflare: deploy the Worker

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and create a free account. If it asks, pick a `workers.dev` subdomain. That name becomes part of the Worker's address.
2. Open **Workers & Pages**, then **Create**, then **Import a repository**.
3. Connect GitHub and allow access to the **chem-exam-2** repository, then select it.
4. Fill in the following:
   - **Project name:** `chem-exam-2-ask`. It must match the name in `worker/wrangler.toml`.
   - **Root directory / path:** `worker`. You'll find it under **Advanced settings**.
   - **Deploy command:** leave it as `npx wrangler deploy`.
   
   Then click **Deploy**.
5. When the build finishes, open the Worker's **Settings**, then **Variables and Secrets**. Add two values, both with the type **Secret**:
   - **`ANTHROPIC_API_KEY`:** paste the key from step 2.
   - **`ALLOWED_EMAILS`:** your Gmail address. To let more people ask, list several addresses separated by commas.
   
   Save and deploy.
6. Copy the Worker's address from its overview page. It looks like `https://chem-exam-2-ask.YOUR-SUBDOMAIN.workers.dev`.

## 4. Send Claude two things

Send Claude these two values:

- **Client ID:** the one from step 1.
- **Worker address:** the one from step 3.

Both are public. Claude will put them in `config.js` and `worker/wrangler.toml`, push the change, and test the sign-in. Cloudflare rebuilds the Worker on its own after each push.

## How it stays safe

- **API key:** it lives only in Cloudflare's secret storage, never in the site or the repo.
- **Who can ask:** the Worker accepts only a valid Google sign-in for this site's client ID, from an address in `ALLOWED_EMAILS`.
- **Where requests come from:** it answers only requests from `https://shiyala.github.io`.
- **Limits:** questions and conversations have length caps, each answer is capped at 8,000 tokens, and the spend limit in the Claude Console is your backstop.
- **To change the model or the cap:** edit `MODEL` or `MAX_TOKENS` in `worker/wrangler.toml`.
