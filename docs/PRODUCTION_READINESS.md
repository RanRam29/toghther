# Production Readiness Checklist & Instructions

Before going live with the **Together** platform, the following infrastructure and security configurations must be applied manually in your Vercel and Supabase dashboards.

## 1. Supabase Production Setup

### Authentication Settings
1. Go to **Authentication > Settings**.
2. **Site URL:** Set this to your production domain (e.g., `https://together-app.com`).
3. **Redirect URLs:** Add any allowed mobile deep links (e.g., `together://callback`).
4. **Email Settings:** 
   - Ensure **Confirm email** is enabled so users must verify their email address.
   - Configure a custom SMTP server (like Resend or SendGrid) for reliable delivery instead of the built-in Supabase mailer (which has strict limits).
5. **MFA (Multi-Factor Authentication):**
   - It is highly recommended to enforce MFA for users with the `professional` and `admin` roles, given their access to sensitive `child_details` data.

### Database Settings
1. Go to **Database > Backups**.
2. Ensure **Point-in-Time Recovery (PITR)** is enabled (requires Supabase Pro tier). This is critical for disaster recovery.
3. Review your **Connection Pooling** settings if you expect high traffic from serverless functions. Use the provided Supavisor connection string for edge functions.

## 2. Vercel Production Setup

### Environment Variables
For the production application, configure the following Environment Variables in your Vercel project settings:

```env
# Supabase Production URLs
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROD_PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_PROD_ANON_KEY]

# Supabase Admin Key (DO NOT EXPOSE TO CLIENT)
SUPABASE_SERVICE_ROLE_KEY=[YOUR_PROD_SERVICE_ROLE_KEY]

# Application URLs
NEXT_PUBLIC_APP_URL=https://[YOUR_PRODUCTION_DOMAIN]
```

### Deployment Configuration
1. **Custom Domain:** Link your production domain in Vercel (e.g., `www.together-app.com`).
2. **Analytics & Speed Insights:** Enable Vercel Web Vitals to monitor production performance.
3. **Branch Protection:** Ensure the Vercel production environment ONLY deploys from the `main` branch.

## 3. Security & Monitoring
1. **Logs:** Keep an eye on Supabase **Logs > Postgres Logs** during the first few days of launch to spot any slow queries or missing indexes.
2. **Rate Limits:** Supabase Edge Functions and Auth have default rate limits. Monitor `429 Too Many Requests` errors and adjust limits via Supabase support if your traffic spikes.
3. **App Stores:** Ensure the mobile apps have the production Deep Linking entitlements correctly set up in Google Play Console and Apple App Store Connect.
