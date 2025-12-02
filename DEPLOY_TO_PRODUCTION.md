# 🚀 Deploy to Production - Quick Guide

## Prerequisites Checklist

Before deploying, make sure you have:

- [ ] Supabase project created and configured
- [ ] All database migrations applied (`supabase db push`)
- [ ] Edge functions deployed (optional but recommended)
- [ ] Domain name ready (e.g., app.yourdomain.com)
- [ ] Environment variables ready (see below)

---

## Option 1: Deploy to Vercel (Recommended - 10 minutes)

### Step 1: Prepare Your Code

```bash
# Make sure everything is committed
git add .
git commit -m "Ready for production deployment"
git push origin main
```

### Step 2: Deploy to Vercel

1. **Sign up/Login**: Go to [vercel.com](https://vercel.com)
2. **Import Project**: Click "New Project" → Import from GitHub
3. **Configure**:
   - Framework Preset: **Vite** (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install --legacy-peer-deps`

4. **Add Environment Variables** (see section below)

5. **Deploy**: Click "Deploy" and wait 2-3 minutes

### Step 3: Add Custom Domain

1. In your Vercel project dashboard → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain: `app.yourdomain.com`
4. Follow DNS instructions:
   - Add CNAME record: `app` → `cname.vercel-dns.com`
   - Or A record to Vercel's IP
5. Wait 5-10 minutes for DNS propagation
6. ✅ SSL certificate auto-generated!

---

## Option 2: Deploy to Netlify

### Step 1: Build Locally

```bash
npm install --legacy-peer-deps
npm run build
```

### Step 2: Deploy

**Method A: Drag & Drop**
1. Go to [netlify.com](https://netlify.com)
2. Drag `dist/` folder to deploy area
3. Done! Get a temporary URL

**Method B: GitHub (Continuous Deployment)**
1. Click "New site from Git"
2. Connect GitHub → Select repository
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Install command: `npm install --legacy-peer-deps`
4. Add environment variables
5. Deploy

### Step 3: Add Custom Domain

1. Site settings → **Domain management**
2. **Add custom domain**
3. Follow DNS instructions
4. SSL auto-configured

---

## Option 3: Cloudflare Pages

### Step 1: Connect Repository

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. **Create a project** → Connect to Git
3. Select your repository

### Step 2: Configure Build

- Framework preset: **Vite**
- Build command: `npm run build`
- Build output: `dist`
- Root directory: `/`

### Step 3: Environment Variables

Add in **Settings** → **Environment variables**

### Step 4: Custom Domain

1. **Custom domains** → Add a custom domain
2. If domain is on Cloudflare, auto-configured
3. If external, add CNAME record

---

## Required Environment Variables

Add these in your deployment platform's settings:

```bash
# ============================================
# REQUIRED - Supabase Configuration
# ============================================
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Get these from: Supabase Dashboard → Settings → API

# ============================================
# REQUIRED - Twilio (for SMS Gift Cards)
# ============================================
VITE_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxx
VITE_TWILIO_AUTH_TOKEN=your_auth_token
VITE_TWILIO_PHONE_NUMBER=+1234567890

# Get these from: console.twilio.com

# ============================================
# REQUIRED - Public URL
# ============================================
VITE_PUBLIC_APP_URL=https://app.yourdomain.com

# Use your actual domain here

# ============================================
# OPTIONAL - Gift Card API Provider
# ============================================
TILLO_API_KEY=your_tillo_api_key
TILLO_SECRET_KEY=your_tillo_secret

# Only if using Tillo API for gift cards

# ============================================
# OPTIONAL - AI Features
# ============================================
VITE_GEMINI_API_KEY=your_gemini_api_key

# Only if using AI landing page builder

# ============================================
# OPTIONAL - Email Provider
# ============================================
VITE_EMAIL_PROVIDER=resend
VITE_RESEND_API_KEY=your_resend_key

# Or use SendGrid, AWS SES, etc.
```

---

## Backend Setup (Supabase)

Your backend is already on Supabase cloud. Just make sure:

### 1. Apply All Migrations

```bash
cd supabase
supabase db push
```

Or manually in Supabase SQL Editor:
- Run all files in `supabase/migrations/` in order

### 2. Deploy Critical Edge Functions

```bash
# Core functions for gift card system
supabase functions deploy send-sms-opt-in
supabase functions deploy handle-sms-response
supabase functions deploy approve-customer-code
supabase functions deploy redeem-customer-code
supabase functions deploy provision-gift-card-unified

# Optional but recommended
supabase functions deploy generate-google-wallet-pass
supabase functions deploy generate-apple-wallet-pass
```

### 3. Configure Supabase Environment Variables

In Supabase Dashboard → Project Settings → Edge Functions → Environment Variables:

```bash
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=your_number
PUBLIC_APP_URL=https://app.yourdomain.com
TILLO_API_KEY=your_key (optional)
OPENAI_API_KEY=your_key (optional)
```

---

## DNS Configuration

### For Most Domains (GoDaddy, Namecheap, etc.)

**CNAME Record** (Recommended):
```
Type: CNAME
Name: app (or your subdomain)
Value: cname.vercel-dns.com (or your platform's CNAME)
TTL: Automatic or 3600
```

**A Record** (Alternative):
```
Type: A
Name: @ (for root) or app (for subdomain)
Value: [Platform's IP address]
TTL: Automatic or 3600
```

### For Cloudflare Domains

If your domain is on Cloudflare DNS:
- Add CNAME record
- Enable orange cloud (CDN + DDoS protection)
- SSL/TLS mode: **Full (strict)**

---

## Post-Deployment Checklist

After deployment, verify:

### Frontend Checks
- [ ] Site loads at your domain
- [ ] SSL certificate is active (https://)
- [ ] Login page works
- [ ] Can create an account
- [ ] Dashboard loads
- [ ] No console errors

### Backend Checks
- [ ] Supabase connection works
- [ ] Database queries succeed
- [ ] Edge functions respond
- [ ] SMS delivery works (test with call center)
- [ ] Gift card provisioning works

### Test the System
1. **Login**: Go to your domain
2. **Create Campaign**: Test the campaign wizard
3. **Call Center**: Visit `/call-center` and test redemption
4. **SMS Opt-in**: Test sending an SMS
5. **Landing Page**: Test a public landing page

---

## Monitoring & Maintenance

### Check These Regularly

**Vercel/Netlify Dashboard**:
- Deployment status
- Build logs
- Error logs
- Traffic analytics

**Supabase Dashboard**:
- Database size
- Edge function logs
- API usage
- Slow queries

### Set Up Alerts

**Supabase**:
- Go to Project Settings → Database → Connection Pooling
- Enable monitoring alerts

**Vercel**:
- Project Settings → Integrations → Add monitoring tools

---

## Troubleshooting

### Build Fails

**Error**: `Cannot find module`
```bash
# Solution: Update package.json install command
npm install --legacy-peer-deps
```

**Error**: `Out of memory`
```bash
# Solution: Increase Node memory
NODE_OPTIONS="--max_old_space_size=4096" npm run build
```

### Environment Variables Not Working

1. Make sure all start with `VITE_` prefix
2. Rebuild after adding variables
3. Clear cache: Vercel → Deployments → ⋯ → Redeploy

### Domain Not Working

1. **Check DNS**: Use [dnschecker.org](https://dnschecker.org)
2. **Wait**: DNS can take up to 48 hours (usually 10-30 minutes)
3. **Clear cache**: Try incognito mode
4. **Check SSL**: Make sure HTTPS is enabled

### Supabase Connection Issues

1. **Check URL**: Should be `https://xxxxx.supabase.co`
2. **Check Key**: Use ANON key (not service role)
3. **Check RLS**: Make sure policies are enabled
4. **Check migrations**: Run `supabase db push`

---

## Quick Commands Reference

```bash
# Build for production
npm run build

# Test production build locally
npm run preview

# Deploy edge functions
cd supabase
supabase functions deploy [function-name]

# Apply database migrations
supabase db push

# Check Supabase status
supabase status
```

---

## Cost Estimation

### Free Tier (Perfect for Starting)

**Vercel Free**:
- Unlimited bandwidth
- 100 GB/month
- Automatic SSL
- ✅ More than enough for most apps

**Supabase Free**:
- 500 MB database
- 5 GB bandwidth
- 2 GB file storage
- 500K Edge Function invocations

**Total**: $0/month for small to medium usage

### Paid Plans (Scale Later)

- **Vercel Pro**: $20/month (more teams, analytics)
- **Supabase Pro**: $25/month (better performance, support)
- **Twilio**: Pay-as-you-go (~$0.0075/SMS in US)

---

## Next Steps

After your site is live:

1. ✅ **Test Everything**: Run through all workflows
2. ✅ **Add Team Members**: Invite users in Supabase Auth
3. ✅ **Configure Branding**: Update logo, colors, domain
4. ✅ **Set Up Analytics**: Add Google Analytics or similar
5. ✅ **Monitor Performance**: Use built-in platform tools
6. ✅ **Backup Database**: Regular Supabase backups
7. ✅ **Document**: Keep this guide updated with your settings

---

## Support Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Netlify Docs**: [docs.netlify.com](https://docs.netlify.com)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Project Docs**: See `public/docs/` in your repo

---

## Success!

Your system is now online! 🎉

**Next**: Share your URL with your team and start creating campaigns!

Need help? Check the troubleshooting section or review the detailed docs in `public/docs/`.

---

*Generated for ACE Engage Direct Mail Platform*
*Version 2.0.0 - Production Ready*

