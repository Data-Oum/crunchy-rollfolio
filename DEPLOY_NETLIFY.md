# Deploying Crunchy-Rollfolio to Netlify

Follow these steps to deploy your site and ensure the AI (AURA) works in production.

## 1. Environment Variables in Netlify

You must add these variables to your Netlify dashboard (**Site settings > Environment variables**):

| Key                             | Value (from your .env)                           |
| :------------------------------ | :----------------------------------------------- |
| `VITE_SUPABASE_URL`             | `https://wuxfgmpwanictdaaypmq.supabase.co`       |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_HVfG-uleO0pHr4dWNnpphQ_dRbeTuUd` |
| `VITE_SUPABASE_PROJECT_ID`      | `wuxfgmpwanictdaaypmq`                           |
| `GEMINI_API_KEY`                | `AIzaSyDrwkfrXSYXn86R-h-QKNQAtkH4v7C8A_Y`        |

## 2. Supabase Cloud Configuration

Ensure your functions are deployed to the **Supabase Cloud** (not just running locally):

```bash
# Set secret for the cloud functions
npx supabase secrets set GEMINI_API_KEY=AIzaSyDrwkfrXSYXn86R-h-QKNQAtkH4v7C8A_Y

# Deploy logic to cloud
npx supabase functions deploy aura-chat --no-verify-jwt
npx supabase functions deploy aura-summary --no-verify-jwt
```

## 3. Netlify Build Settings

- **Build Command:** `npm run build` or `yarn build`
- **Publish Directory:** `dist`
- **Node Version:** Ensure Netlify is using Node 18+

## 4. Handling Routes (SPA)

If you use React Router, create a `public/_redirects` file with this content to prevent 404s on refresh:

```
/*    /index.html   200
```

## 5. Troubleshooting AURA

If AURA doesn't respond on the live site:

1.  Open Chrome DevTools (**F12**) > **Console**.
2.  Look for `[Aura] Invoke Error`.
3.  Ensure your `VITE_SUPABASE_URL` in Netlify matches the one in your dashboard.
4.  Check **Supabase Logs** (Edge Functions > aura-chat > Logs) to see if Gemini is returning an error.
