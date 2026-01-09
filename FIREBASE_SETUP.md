# Firebase Cloud Sync Setup Guide

This guide will help you set up Firebase to automatically sync your calorie data across all your devices!

## Why Firebase?

- ✅ **Automatic sync** across all devices
- ✅ **Real-time updates** - changes appear instantly
- ✅ **Never lose data** - backed up in the cloud
- ✅ **Free tier** - 1GB storage, 50K reads/day, 20K writes/day
- ✅ **Anonymous auth** - no email/password required

---

## 🚀 Step-by-Step Setup (10 minutes)

### Step 1: Create Firebase Project

1. **Go to**: https://console.firebase.google.com/
2. Click **"Add project"** or **"Create a project"**
3. **Project name**: `CalorieTracker` (or whatever you like)
4. Click **Continue**
5. **Google Analytics**: Toggle OFF (not needed)
6. Click **Create project**
7. Wait 30 seconds for project creation
8. Click **Continue**

### Step 2: Register Your Web App

1. In Firebase Console, click the **`</>`** (web) icon
2. **App nickname**: `CalorieTracker Web`
3. **Don't** check "Firebase Hosting"
4. Click **Register app**
5. You'll see your Firebase configuration - **keep this page open!**

### Step 3: Enable Firestore Database

1. In the left sidebar, click **"Firestore Database"**
2. Click **"Create database"**
3. **Start mode**: Select **"Start in production mode"**
4. Click **Next**
5. **Location**: Choose closest to you (e.g., `us-central` for USA)
6. Click **Enable**
7. Wait for database creation (~1 minute)

### Step 4: Set Up Security Rules

1. In Firestore, click the **"Rules"** tab
2. **Replace** the existing rules with this:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /meals/{mealId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

3. Click **Publish**

### Step 5: Enable Email/Password Authentication

1. In the left sidebar, click **"Authentication"**
2. Click **"Get started"**
3. Click the **"Sign-in method"** tab
4. Click **"Email/Password"** in the list of providers
5. Toggle the **"Enable"** switch ON (first toggle only, not "Email link")
6. Click **Save**

### Step 6: You're Done with Firebase Setup! 🎉

Firebase is now configured and ready. The app already has the Firebase configuration built in, so you don't need to copy or paste any values.

**Next: Create your account in the CalorieTracker app**

### Step 7: Create Your Account

1. **Open your CalorieTracker app** (on phone, laptop, tablet, etc.)
2. A **sign-in modal** will automatically appear
3. Click the **"Sign Up"** tab
4. Enter your email and password (minimum 6 characters)
5. Confirm your password
6. Click **"Create Account"**
7. You should see **"✓ Syncing (your@email.com)"** in Settings!

Your meals will now automatically sync across all devices!

### Step 8: Sign In on Other Devices

1. **Open the app** on another device
2. When the sign-in modal appears, click **"Sign In"** tab
3. Enter the **same email and password** from Step 7
4. Your meals automatically appear! ✨

That's it! No need to configure Firebase on each device - just sign in and you're synced.

---

## 🔄 How Sync Works

### Hybrid Storage Strategy

The app uses **both** local storage (IndexedDB) and cloud storage (Firebase):

**When Online:**
- Meals save to **both** IndexedDB (instant) and Firebase (cloud)
- Real-time listener updates from other devices
- API key syncs across devices

**When Offline:**
- Meals save to IndexedDB only
- When back online, syncs to Firebase automatically
- You never lose data!

### Data Structure

```
Firestore:
└── users/
    └── {userId}/
        ├── apiKey
        ├── updatedAt
        └── meals/
            └── {mealId}/
                ├── timestamp
                ├── date
                ├── foodDescription
                ├── caloriesMin
                ├── caloriesMax
                ├── clarifications
                ├── notes
                └── syncedAt
```

---

## 💰 Cost & Limits

### Firebase Free Tier (Spark Plan)

**Firestore:**
- 1 GB storage
- 50,000 reads/day
- 20,000 writes/day
- 20,000 deletes/day

**Typical Usage:**
- ~50 meals/month = ~50 writes
- Viewing history = ~100 reads/month
- **Well within free tier!**

**You only pay if you exceed these limits** (unlikely for personal use)

---

## 🔒 Privacy & Security

- ✅ **Email/password auth** - your credentials are securely hashed by Firebase
- ✅ **User isolation** - you can only access your own data
- ✅ **Cross-device sync** - same account on all devices
- ✅ **Secure rules** - enforced by Firebase
- ✅ **HTTPS only** - encrypted in transit
- ✅ **Your control** - can export/delete anytime

### Where is Data Stored?

- **Firestore location**: Chosen in Step 3 (e.g., us-central)
- **Managed by**: Google Cloud Platform
- **Privacy**: Google's privacy policy applies
- **Control**: You own the Firebase project

---

## 🔧 Managing Your Data

### View Your Data

1. Firebase Console → Firestore Database
2. Browse: `users/{your-user-id}/meals`
3. See all synced meals

### Export Data

```javascript
// In browser console
const meals = await firebaseService.getAllMeals();
console.log(JSON.stringify(meals, null, 2));
// Copy and save as JSON file
```

### Delete All Data

1. Firebase Console → Firestore Database
2. Find your user document
3. Click the 3 dots → Delete document
4. Or delete entire project in Project Settings

---

## 🐛 Troubleshooting

### Can't sign in or sign up

- Make sure you completed Step 5 (Enable Email/Password Authentication in Firebase Console)
- Check that you're using a valid email format
- Password must be at least 6 characters
- If you forgot your password, you'll need to reset it in Firebase Console

### Meals not syncing

- Make sure you're signed in (check Settings → Cloud Sync status)
- Check internet connection
- Open browser console (F12) - look for errors
- Verify Firestore rules are set correctly (Step 4)
- Verify Email/Password auth is enabled in Firebase Console (Step 5)

### "Permission denied" errors

- Check security rules match Step 4 exactly
- Make sure you're signed in with email/password
- Try signing out and signing back in

### Different data on different devices

- Make sure you're signed in with the **same email** on both devices
- If devices were offline, wait a few minutes for sync
- Refresh the page on both devices

---

## 🎯 Multiple Users / Family Accounts

Want separate tracking for different people in your household?

**Option 1: Separate Email Accounts (Recommended)**
- Person A creates account with their email
- Person B creates account with their email
- Each person signs in with their own credentials
- Data stays completely separate

**Option 2: Shared Account**
- Create one account and share the email/password
- Everyone sees the same meals
- Good for shared meal planning

**Option 3: Different Browsers**
- Chrome = Person A's account
- Firefox = Person B's account
- Safari = Person C's account
- Each browser stays signed into a different account

---

## ❓ FAQ

**Q: Can I use this without Firebase?**
A: Yes! The app works offline with IndexedDB. Firebase is optional for syncing.

**Q: What if I hit the free tier limits?**
A: Very unlikely for personal use. If you do, upgrade to Blaze (pay-as-you-go) for ~$0.01/day.

**Q: Can I self-host instead of Firebase?**
A: Advanced users can set up their own backend, but Firebase is easiest.

**Q: Is my API key safe in Firebase?**
A: Yes - Firestore security rules ensure only you can access your data.

**Q: Can I share my data with family?**
A: Each person should create their own account with their own email. See "Multiple Users / Family Accounts" section above.

**Q: Is my Firebase API key exposed in the app code?**
A: Yes, and that's normal! Firebase web apps typically have the config visible in the code. Security is enforced by Firestore rules, not by hiding the config.

---

## ✅ Setup Checklist

### Firebase Console Setup:
- [ ] Created Firebase project
- [ ] Registered web app
- [ ] Enabled Firestore database
- [ ] Set security rules (email/password auth required)
- [ ] Enabled Email/Password authentication

### App Setup:
- [ ] Opened CalorieTracker app
- [ ] Created account with email/password
- [ ] Verified sync status shows "✓ Syncing (your@email.com)"
- [ ] Added a test meal
- [ ] Signed in on another device with same credentials
- [ ] Verified meals sync across devices

---

**You're all set! Your meals now sync automatically across all your devices.** 🎉

If you have issues, check the troubleshooting section or open an issue on GitHub.
