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

### Step 5: Enable Anonymous Authentication

1. In the left sidebar, click **"Authentication"**
2. Click **"Get started"**
3. Click the **"Sign-in method"** tab
4. Click **"Anonymous"**
5. Toggle the **Enable** switch ON
6. Click **Save**

### Step 6: Get Your Configuration

Go back to **Project Settings** (gear icon in sidebar):

1. Scroll down to **"Your apps"**
2. Find your web app
3. Copy these values:

```javascript
apiKey: "AIza..."
authDomain: "your-project.firebaseapp.com"
projectId: "your-project"
storageBucket: "your-project.appspot.com"
messagingSenderId: "123456789"
appId: "1:123456789:web:abc123"
```

### Step 7: Configure CalorieTracker App

1. **Open your CalorieTracker app** (on phone or computer)
2. Go to **Settings** tab
3. Scroll to **"Cloud Sync (Firebase)"** section
4. Click **"Configure Firebase"**
5. **Paste each value** from Step 6:
   - API Key
   - Auth Domain
   - Project ID
   - Storage Bucket
   - Messaging Sender ID
   - App ID
6. Click **"Save & Enable Sync"**

### Step 8: Test It!

1. Add a meal on your phone
2. Open the app on your computer
3. The meal should appear automatically! ✨

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

- ✅ **Anonymous auth** - no email/password stored
- ✅ **User isolation** - you can only access your own data
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

### "Firebase not configured" message

- Check all 6 config values are entered correctly
- Make sure there are no extra spaces
- Try clicking "Save & Enable Sync" again

### Meals not syncing

- Check internet connection
- Open browser console (F12) - look for errors
- Verify Firestore rules are set correctly
- Check Firebase Authentication is enabled

### "Permission denied" errors

- Check security rules match Step 4 exactly
- Verify Anonymous auth is enabled
- Try signing out and back in (clear browser data)

### Different data on different devices

- This can happen if devices were offline
- Wait a few minutes - should sync automatically
- Refresh the page on both devices

---

## 🎯 Advanced: Multiple Accounts

Want separate tracking for different people?

**Option 1: Different Browsers**
- Chrome = Person A
- Firefox = Person B
- Each gets own anonymous ID

**Option 2: Manual User Switching**
- Clear browser data to "sign out"
- Reopen app to get new anonymous ID
- (Future: can add email/password auth for this)

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
A: Not currently, but this could be added with custom sharing rules.

---

## ✅ Setup Checklist

- [ ] Created Firebase project
- [ ] Registered web app
- [ ] Enabled Firestore
- [ ] Set security rules
- [ ] Enabled Anonymous auth
- [ ] Copied configuration values
- [ ] Entered config in CalorieTracker Settings
- [ ] Tested by adding a meal
- [ ] Verified sync across devices

---

**You're all set! Your meals now sync automatically across all your devices.** 🎉

If you have issues, check the troubleshooting section or open an issue on GitHub.
