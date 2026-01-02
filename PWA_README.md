# CalorieTracker PWA - Setup Guide for Windows

This is the **Progressive Web App (PWA)** version of CalorieTracker that you can develop on your Windows PC and use on your iPhone!

## ✨ What's a PWA?

A Progressive Web App is a website that works like a native app:
- ✅ Install to iPhone home screen
- ✅ Works offline (after first load)
- ✅ Fast and responsive
- ✅ No App Store needed
- ✅ Develop on Windows, use on any device

## 🚀 Quick Start (5 minutes)

### 1. Install a Local Web Server

You need a simple web server to run the app. Choose one:

**Option A: Using Python** (if you have Python installed)
```bash
cd web
python -m http.server 8000
```

**Option B: Using Node.js** (if you have Node.js installed)
```bash
npm install -g http-server
cd web
http-server -p 8000
```

**Option C: Using VS Code** (recommended for development)
1. Install [Visual Studio Code](https://code.visualstudio.com/)
2. Install the "Live Server" extension
3. Right-click `index.html` → "Open with Live Server"

### 2. Open in Browser

Visit: `http://localhost:8000` (or the port shown by Live Server)

### 3. Get Your API Key

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign up (get $5 free credits)
3. Create API key named "CalorieTracker"
4. Copy the key

### 4. Configure the App

1. Click **Settings** tab (gear icon)
2. Paste your API key
3. Click **Add Meal** tab

### 5. Test It!

Try: `"2 scrambled eggs with cheese"`

You should see Claude estimate the calories!

## 📱 Install on iPhone

### Method 1: Deploy Online (Recommended)

1. **Sign up for free hosting** at [Netlify](https://www.netlify.com/) or [Vercel](https://vercel.com/)

2. **Deploy your app:**
   - Drag the `web` folder to Netlify/Vercel
   - Get your URL (e.g., `https://your-app.netlify.app`)

3. **Install on iPhone:**
   - Open Safari on your iPhone
   - Visit your deployed URL
   - Tap the Share button (square with arrow)
   - Tap "Add to Home Screen"
   - Tap "Add"

Now it works like a native app!

### Method 2: Local Network (Testing Only)

1. **Find your PC's IP address:**
   ```bash
   ipconfig
   ```
   Look for "IPv4 Address" (e.g., 192.168.1.100)

2. **Make sure both PC and iPhone are on same WiFi**

3. **On iPhone Safari, visit:**
   ```
   http://YOUR_PC_IP:8000
   ```
   Replace YOUR_PC_IP with the IP from step 1

4. **Add to home screen** (same as Method 1, step 3)

⚠️ **Note:** This only works when both devices are on the same network

## 🎨 Customize Icons (Optional)

The app needs icons for the home screen:

1. Create two PNG images:
   - `icon-192.png` (192x192 pixels)
   - `icon-512.png` (512x512 pixels)

2. Save them to `web/icons/`

3. Use any image editor or online tool like [RealFaviconGenerator](https://realfavicongenerator.net/)

## 📁 Project Structure

```
web/
├── index.html           # Main HTML structure
├── styles.css           # Responsive styling
├── app.js              # Main application logic
├── db.js               # IndexedDB storage wrapper
├── claude-service.js   # Claude API integration
├── service-worker.js   # Offline support
├── manifest.json       # PWA configuration
└── icons/
    ├── icon-192.png    # Small icon
    └── icon-512.png    # Large icon
```

## 🛠️ Development on Windows

### Recommended Tools

1. **Visual Studio Code** - Code editor
2. **Live Server Extension** - Auto-reload during development
3. **Browser DevTools** - Chrome or Edge Developer Tools (F12)

### Development Workflow

1. Open `web` folder in VS Code
2. Start Live Server
3. Edit files - changes appear instantly
4. Test in browser
5. Deploy when ready

### Testing

**Desktop Testing:**
- Chrome/Edge: Right-click → Inspect → Toggle Device Toolbar (Ctrl+Shift+M)
- Choose "iPhone 12 Pro" or similar
- Test responsive design

**iPhone Testing:**
- Deploy to Netlify/Vercel
- Or use local IP method
- Test actual device behavior

## 🎯 Features

All the same features as the iOS Swift version:

✅ **Natural Language Input**
- "2 eggs and toast"
- "large coffee with milk"
- "chicken salad"

✅ **Smart Clarifications**
- Claude asks questions when needed
- Skip clarifications if you want

✅ **Calorie Ranges**
- Shows ranges when uncertain
- Honest estimates

✅ **Conversation History**
- See the full back-and-forth
- Refine your entries

✅ **Daily Tracking**
- View any day's meals
- See total calories
- Calendar navigation

✅ **Offline Support**
- Works without internet (after first load)
- All data stored locally
- Syncs when online

## 🔒 Privacy & Security

- **API Key**: Stored in browser's localStorage (only on your device)
- **Meal Data**: Stored in IndexedDB (only on your device)
- **No Cloud Storage**: Everything stays on your device
- **CORS**: API calls go directly to Anthropic (not through any server)

## 💰 Cost

Same as iOS version:
- ~$0.01-0.02 per calorie estimate
- $5 free credits for new accounts
- 250-500 estimates with free credits

## 🚀 Deployment Options

### Free Hosting (Recommended)

**Netlify** (Easiest)
1. Sign up at [netlify.com](https://www.netlify.com/)
2. Drag `web` folder to Netlify
3. Get instant URL
4. Auto-deploys on git push (optional)

**Vercel**
1. Sign up at [vercel.com](https://vercel.com/)
2. Install Vercel CLI: `npm i -g vercel`
3. Run `vercel` in web folder
4. Follow prompts

**GitHub Pages**
1. Create GitHub repo
2. Push `web` folder contents
3. Enable GitHub Pages in repo settings
4. Visit `https://yourusername.github.io/repo-name/`

### Custom Domain (Optional)

Most hosts let you add a custom domain:
- `mycalorietracker.com`
- Usually costs $10-15/year
- Configure in host settings

## 🐛 Troubleshooting

### "API key not configured"
- Go to Settings tab
- Enter your Anthropic API key
- Make sure it's saved

### "Failed to estimate calories"
- Check internet connection
- Verify API key is correct
- Check Anthropic credits: [console.anthropic.com](https://console.anthropic.com)

### App won't install on iPhone
- Must use HTTPS (deploy online, or...)
- HTTP only works for localhost/local network
- Try reloading page in Safari

### Icons not showing
- Create PNG files in `web/icons/`
- Must be exactly 192x192 and 512x512 pixels
- Clear browser cache

### Service Worker issues
- Check browser console (F12)
- Unregister old service worker
- Hard reload (Ctrl+Shift+R)

### Database errors
- Open browser DevTools
- Application tab → IndexedDB
- Delete CalorieTrackerDB if corrupted
- Refresh page

## 🔧 Advanced Configuration

### Change Claude Model

Edit `claude-service.js`:
```javascript
const MODEL = 'claude-sonnet-4-5-20250929'; // Current
// or
const MODEL = 'claude-opus-4-5-20251101'; // More accurate, costs more
```

### Customize Theme Colors

Edit `styles.css` root variables:
```css
:root {
    --primary-color: #007AFF; /* Change to your color */
    --background: #ffffff;
    /* ... */
}
```

### Modify Calorie Estimation Prompt

Edit `claude-service.js` → `estimateCalories()` → `prompt` variable

## 📊 Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Safari (iOS) | ✅ Full | Best experience, can install |
| Chrome (Android) | ✅ Full | Can install |
| Edge (Desktop) | ✅ Full | Can install |
| Chrome (Desktop) | ✅ Full | Can install |
| Firefox | ⚠️ Partial | No install, works otherwise |

## 🔄 Updates

To update the app after changes:

1. **Edit files** in `web` folder
2. **Test locally** with Live Server
3. **Deploy** (if using Netlify/Vercel, just git push)
4. **Update service worker** cache version in `service-worker.js`:
   ```javascript
   const CACHE_NAME = 'calorie-tracker-v2'; // Increment version
   ```

## 📝 TODO / Future Enhancements

Ideas for improvements:
- [ ] Macro tracking (protein, carbs, fat)
- [ ] Weekly charts/graphs
- [ ] Export data to CSV
- [ ] Voice input
- [ ] Photo-based logging (use Claude vision)
- [ ] Dark mode
- [ ] Multiple profiles
- [ ] Sync across devices (add backend)

## 🆚 PWA vs Native iOS App

| Feature | PWA | Native iOS |
|---------|-----|------------|
| Develop on Windows | ✅ Yes | ❌ No (needs Mac) |
| Install to home screen | ✅ Yes | ✅ Yes |
| Works offline | ✅ Yes | ✅ Yes |
| App Store | ❌ No | ✅ Yes |
| Platform | ✅ All | iOS only |
| Development cost | Free | $99/year (developer account) |
| Push notifications | ⚠️ Limited | ✅ Full |
| System integration | ⚠️ Limited | ✅ Full |

## 🤝 Contributing

Want to improve the app?
1. Fork the repo
2. Make changes in `web/` folder
3. Test thoroughly
4. Submit pull request

## 📄 License

MIT License - Free to use and modify

## 🙋 Need Help?

- **API Issues**: [Anthropic Docs](https://docs.anthropic.com/)
- **PWA Questions**: [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- **Deployment Help**: Check host documentation (Netlify, Vercel, etc.)

---

**Enjoy your calorie tracking app! 🍎📱**
