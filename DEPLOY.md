# Deploy CalorieTracker to Netlify

This guide will help you deploy your CalorieTracker app to Netlify so you can use it on your iPhone!

## 🚀 Quick Deploy (5 minutes)

### Step 1: Create Netlify Account

1. Go to: **https://www.netlify.com/**
2. Click **Sign up** (top right)
3. Choose **Sign up with GitHub** (easiest!)
4. Authorize Netlify to access your GitHub account

### Step 2: Push Your Code to GitHub

Make sure all your latest code is on GitHub:

1. **In VS Code**, open the terminal (Ctrl + `)
2. Run these commands:
   ```bash
   git add -A
   git commit -m "Add Netlify serverless functions"
   git push
   ```

### Step 3: Deploy on Netlify

1. **Log in to Netlify**
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub**
4. Find and select your **PersonalApp** repository
5. Configure build settings:
   - **Build command**: Leave blank
   - **Publish directory**: `web`
   - **Functions directory**: `netlify/functions`
6. Click **"Deploy site"**

### Step 4: Wait for Deployment

- Netlify will build and deploy your site (takes 1-2 minutes)
- You'll see a URL like: `https://random-name-12345.netlify.app`

### Step 5: Test Your Deployed App

1. Click the URL Netlify gives you
2. Go to **Settings** tab
3. Enter your Anthropic API key
4. Test with "scrambled eggs"

It should work! 🎉

---

## 📱 Install on iPhone

### Step 1: Open in Safari

1. On your iPhone, open **Safari**
2. Go to your Netlify URL (e.g., `https://your-app.netlify.app`)

### Step 2: Add to Home Screen

1. Tap the **Share** button (square with arrow pointing up)
2. Scroll down and tap **"Add to Home Screen"**
3. Give it a name (e.g., "CalorieTracker")
4. Tap **Add**

### Step 3: Use Like a Native App!

- Icon appears on your home screen
- Opens full-screen (no browser bar)
- Works offline (after first load)
- Stores data locally

---

## 🎨 Customize Your URL (Optional)

Your initial URL will be something random like `random-name-12345.netlify.app`.

To change it:

1. In Netlify dashboard, go to **Site settings**
2. Click **Change site name**
3. Choose a custom name (e.g., `my-calorie-tracker`)
4. Your new URL: `https://my-calorie-tracker.netlify.app`

**Want a custom domain?** (e.g., `mycalorietracker.com`)
- Buy a domain (~$10-15/year)
- Add it in Netlify's Domain settings
- Netlify provides free SSL/HTTPS!

---

## 🔧 How It Works

**Local Development:**
- Frontend: Live Server (port 5500)
- Backend: Node.js Express (port 3000)
- Uses `http://localhost:3000/api/estimate-calories`

**Production (Netlify):**
- Frontend: Served by Netlify CDN
- Backend: Serverless function
- Uses `/.netlify/functions/estimate-calories`

**The code automatically detects which environment it's in!**

---

## 🔄 Updating Your Deployed App

Whenever you make changes:

1. **Save changes in VS Code**
2. **Commit and push to GitHub:**
   ```bash
   git add -A
   git commit -m "Your change description"
   git push
   ```
3. **Netlify automatically redeploys!** (in ~1 minute)

No need to manually redeploy - it's automatic!

---

## 🐛 Troubleshooting

### "Failed to estimate calories" on deployed site

- **Check API key**: Make sure you entered it in Settings on the deployed site (it's separate from your local version)
- **Check browser console** (F12 on desktop): Look for error messages
- **Check Netlify function logs**: Netlify dashboard → Functions → estimate-calories → Logs

### App won't install on iPhone

- Must use **Safari** (not Chrome)
- Must be on HTTPS (Netlify provides this automatically)
- Try hard-refreshing the page first

### Changes not appearing

- Wait 1-2 minutes after pushing to GitHub
- Check Netlify dashboard → Deploys to see if it's still building
- Hard refresh the page (Shift + Reload)

### Icons not showing

- You need to add actual PNG files to `web/icons/`
- Create 192x192 and 512x512 pixel images
- Use a tool like [RealFaviconGenerator](https://realfavicongenerator.net/)

---

## 💰 Cost

**Netlify Free Tier includes:**
- ✅ 100GB bandwidth/month (plenty for personal use)
- ✅ 300 build minutes/month
- ✅ Unlimited sites
- ✅ HTTPS/SSL included
- ✅ Serverless functions

**You only pay for Anthropic API usage** (~$0.01-0.02 per estimate)

---

## 🎯 What's Next?

Once deployed:
- ✅ Use on iPhone (install to home screen)
- ✅ Use on any device (it's a URL!)
- ✅ Share with friends/family
- ✅ Works offline after first load
- ✅ Automatic updates when you push to GitHub

---

**Ready to deploy?** Follow the steps above and you'll have your app live in 5 minutes!
