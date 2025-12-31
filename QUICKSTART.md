# Quick Start Guide

Get up and running with CalorieTracker in 5 minutes!

## Prerequisites

- Mac with Xcode 15.0 or later installed
- iPhone running iOS 16.0 or later (or use simulator)
- Anthropic API key ([Get free credits](https://console.anthropic.com))

## Step-by-Step Setup

### 1. Create Xcode Project

Since the repository contains the source files but not the .xcodeproj file, you'll need to create it:

1. **Open Xcode**
2. **File** > **New** > **Project**
3. Select **iOS** > **App**
4. Click **Next**

5. Configure your project:
   - **Product Name**: `CalorieTracker`
   - **Team**: Select your development team
   - **Organization Identifier**: `com.yourname` (or your preference)
   - **Interface**: **SwiftUI**
   - **Storage**: **Core Data** (Important!)
   - **Language**: **Swift**
   - Uncheck "Include Tests" (optional)
6. Click **Next**

7. **Save location**: Navigate to and select the `PersonalApp/CalorieTracker` folder
8. Click **Create**

### 2. Add Source Files

The project wizard will create some default files. We need to replace/organize them:

1. **Delete default files** (if created):
   - `ContentView.swift` in the root (we have our own in Views/)
   - Any default Core Data model file

2. **Organize the project structure**:
   - In Xcode's left sidebar (Project Navigator), create groups by right-clicking the CalorieTracker folder:
     - Models
     - Services
     - ViewModels
     - Views

3. **Move files to groups**:
   - Drag `PersistenceController.swift` to Models group
   - Drag `CalorieTracker.xcdatamodeld` to Models group
   - Drag `ClaudeService.swift` to Services group
   - Drag `MealEntryViewModel.swift` to ViewModels group
   - Drag all view files to Views group:
     - `ContentView.swift`
     - `MealEntryView.swift`
     - `HistoryView.swift`
     - `SettingsView.swift`

4. **Verify Info.plist**:
   - Make sure `Info.plist` is in the project
   - In project settings, confirm it's set as the Info.plist file

### 3. Build Settings

1. Select your project in the navigator
2. Select the CalorieTracker target
3. Go to **General** tab:
   - Ensure **Minimum Deployments** is set to iOS 16.0 or later
4. Go to **Build Settings** tab:
   - Search for "Swift Language Version"
   - Ensure it's set to Swift 5 or later

### 4. Get Your API Key

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign up or sign in
3. Click **API Keys** in the sidebar
4. Click **Create Key**
5. Name it "CalorieTracker"
6. Copy the key (you'll need it in step 6)

### 5. Build and Run

1. Select a target device:
   - Choose an iPhone simulator (e.g., iPhone 15 Pro)
   - Or connect your iPhone and select it
2. Press **⌘R** or click the **Play** button
3. Wait for the build to complete

### 6. Configure API Key

Once the app launches:

1. Tap the **Settings** tab (gear icon)
2. Paste your Anthropic API key in the text field
3. The key is automatically saved

### 7. Log Your First Meal!

1. Tap the **Add Meal** tab (+ icon)
2. Type something like: `scrambled eggs and toast`
3. Tap the send button (↑)
4. Watch as Claude analyzes your meal and provides calorie estimates!
5. Answer any clarification questions if asked
6. The meal is automatically saved

### 8. View Your History

1. Tap the **History** tab (chart icon)
2. See your daily summary
3. Browse your meals
4. Use the calendar to navigate between days

## Troubleshooting

### Build Errors

**"Cannot find 'PersistenceController' in scope"**
- Make sure all files are added to the target
- Check that you selected "Core Data" when creating the project

**"Module compiled with Swift X cannot be imported by Swift Y"**
- Clean build folder: **Product** > **Clean Build Folder** (⌘⇧K)
- Rebuild: **Product** > **Build** (⌘B)

### Runtime Issues

**App crashes on launch**
- Reset simulator: **Device** > **Erase All Content and Settings**
- Rebuild and run again

**"Failed to estimate calories"**
- Check that you entered your API key in Settings
- Verify you have an internet connection
- Ensure your Anthropic account has available credits

### Core Data Errors

**"The model used to open the store is incompatible"**
- This can happen if you ran the app before adding all files
- Solution: Delete the app from simulator and reinstall
- Or: **Device** > **Erase All Content and Settings**

## Using the App

### Example Meal Entries

Try these to see how Claude responds:

**Simple entries:**
- `black coffee`
- `apple`
- `2 eggs scrambled`

**Claude will ask for clarification:**
- `sandwich` → Will ask what type/size
- `salad` → Will ask about dressing and ingredients
- `pasta` → Will ask about portion size and sauce

**Detailed entries (no clarification needed):**
- `large turkey sandwich with mayo on wheat bread`
- `small mixed green salad with balsamic vinegar`
- `1 cup of cooked white rice with butter`

### Best Practices

1. **Be specific when possible**: "large coffee" vs just "coffee"
2. **Include preparation method**: "grilled chicken" vs "fried chicken"
3. **Mention portions**: "2 cups of pasta" vs "pasta"
4. **Answer clarifications honestly**: Better estimates come from accurate info
5. **Use ranges**: Claude provides ranges when uncertain - this is intentional!

## API Usage & Costs

- Each meal estimate costs approximately **$0.01-0.02**
- 50 estimates = roughly $0.50-$1.00
- New Anthropic accounts typically get $5 in free credits
- Monitor usage at [console.anthropic.com](https://console.anthropic.com)

## Next Steps

- Explore the History view to see daily trends
- Try asking for clarifications to see the conversational interface
- Check out the full README.md for architecture details
- Customize the app to your needs!

## Need Help?

- Check the full [README.md](README.md) for detailed documentation
- Review [Anthropic API documentation](https://docs.anthropic.com)
- Check Xcode documentation for iOS development questions

---

**Enjoy tracking your calories with AI! 🍎📊**
