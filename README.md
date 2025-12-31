# CalorieTracker - AI-Powered Calorie Tracking for iOS

A simple, intelligent iPhone app that uses Claude AI to estimate calories from natural language food descriptions. Just type what you ate, and the app handles the rest - including asking clarifying questions when needed.

## Features

- **Natural Language Input**: Simply describe what you ate or drank (e.g., "2 eggs and toast" or "large coffee with milk")
- **Intelligent Estimation**: Claude AI analyzes your input and provides calorie estimates
- **Smart Clarifications**: The app asks follow-up questions only when they'll significantly impact the estimate
- **Range-Based Estimates**: When uncertain, the app provides calorie ranges instead of false precision
- **Conversation History**: Track the back-and-forth as you refine your meal entry
- **Daily Summaries**: View total calories and meal counts for any day
- **Historical Tracking**: Browse your meal history with calendar navigation
- **Local Storage**: All meal data is stored securely on your device using Core Data

## Screenshots

The app includes three main sections:
1. **Add Meal** - Conversational interface for logging meals
2. **History** - Daily summaries and meal list with calendar navigation
3. **Settings** - API key configuration and app information

## Requirements

- iOS 16.0 or later
- Xcode 15.0 or later
- An Anthropic API key ([Get one here](https://console.anthropic.com))

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd PersonalApp
```

### 2. Open in Xcode

```bash
open CalorieTracker/CalorieTracker.xcodeproj
```

If the project file doesn't exist yet, you can create it in Xcode:
1. Open Xcode
2. File > New > Project
3. Choose "iOS" > "App"
4. Product Name: "CalorieTracker"
5. Interface: SwiftUI
6. Storage: Core Data
7. Save to the CalorieTracker folder
8. Add all the existing .swift files to the project

### 3. Configure the Project

Ensure these files are included in the project:
- CalorieTrackerApp.swift (App entry point)
- Models/
  - PersistenceController.swift
  - CalorieTracker.xcdatamodeld/
- Services/
  - ClaudeService.swift
- ViewModels/
  - MealEntryViewModel.swift
- Views/
  - ContentView.swift
  - MealEntryView.swift
  - HistoryView.swift
  - SettingsView.swift

### 4. Get Your Anthropic API Key

1. Visit [console.anthropic.com](https://console.anthropic.com)
2. Sign in or create an account
3. Navigate to "API Keys" in the sidebar
4. Click "Create Key" and name it (e.g., "CalorieTracker")
5. Copy the generated API key

### 5. Run the App

1. Select a simulator or your iPhone as the target device
2. Press ⌘R or click the Run button
3. Once the app launches, go to the Settings tab
4. Paste your Anthropic API key
5. Return to the "Add Meal" tab and start logging!

## Usage Guide

### Adding a Meal

1. Tap the "Add Meal" tab
2. Type what you ate or drank in natural language:
   - "Large breakfast burrito"
   - "Coffee with cream and sugar"
   - "Chicken salad with ranch dressing"
3. Tap the send button (↑)
4. Claude will analyze your input and respond with:
   - A calorie estimate (may be a range)
   - An explanation of the estimate
   - A clarifying question if needed (e.g., "Was this a 6-inch or 12-inch sandwich?")
5. If clarification is requested, respond naturally
6. Once satisfied, the entry is automatically saved
7. Tap "Skip & Save Entry" to save without answering clarification questions

### Viewing History

1. Tap the "History" tab
2. View your daily summary (total calories and meal count)
3. Scroll through meals for the selected day
4. Navigate between days using:
   - The calendar button (top left) for date picker
   - Arrow buttons (top right) for previous/next day
5. Swipe left on any meal to delete it

### Settings

- **API Key**: Configure or update your Anthropic API key
- **API Key Info**: View detailed instructions for getting an API key
- **Version Info**: View app version
- **Privacy Policy**: Link to Anthropic's privacy policy

## How It Works

1. **Natural Language Processing**: Your food description is sent to Claude AI via the Anthropic API
2. **Intelligent Analysis**: Claude analyzes the food, considering:
   - Typical portion sizes
   - Preparation methods
   - Common variants
   - Need for clarification
3. **Calorie Estimation**: Claude provides:
   - Minimum and maximum calorie estimates
   - Explanation of the reasoning
   - Follow-up questions if needed (>50 calorie impact)
4. **Local Storage**: The final entry is saved to your device using Core Data:
   - Food description
   - Calorie range (min/max)
   - Timestamp
   - Conversation history
   - Analysis notes

## Cost Considerations

- Each calorie estimate costs approximately **$0.01-0.02** in API usage
- This is based on using the Claude Sonnet 4.5 model
- Daily usage of 10-15 estimates would cost roughly $0.10-0.30/day
- Monitor your usage in the [Anthropic Console](https://console.anthropic.com)

## Privacy & Security

- **API Key**: Stored locally on your device using iOS UserDefaults
- **Meal Data**: Stored locally using Core Data (never sent to external servers except during calorie estimation)
- **Network Requests**: Only made to Anthropic's API for calorie estimation
- **No Tracking**: The app does not track or collect any analytics

## Architecture

### Technologies Used
- **SwiftUI**: Modern declarative UI framework
- **Core Data**: Local persistence for meal entries
- **Async/Await**: Modern concurrency for API calls
- **MVVM Pattern**: Separation of concerns with ViewModels
- **Combine**: Reactive state management with @Published properties

### Key Components

**Models**
- `MealEntry` (Core Data): Persistent storage for meal entries
- `CalorieEstimate`: Response structure from Claude API
- `ConversationMessage`: Chat message in the meal entry flow

**Services**
- `ClaudeService`: Handles API communication with Anthropic
- `PersistenceController`: Manages Core Data stack

**ViewModels**
- `MealEntryViewModel`: Business logic for meal entry and conversation flow

**Views**
- `MealEntryView`: Conversational UI for adding meals
- `HistoryView`: Daily summaries and meal list
- `SettingsView`: API key configuration

## Troubleshooting

### "Failed to estimate calories" Error
- **Check API Key**: Ensure your API key is correctly entered in Settings
- **Check Internet**: Verify you have an active internet connection
- **Check API Credits**: Ensure your Anthropic account has available credits

### App Crashes on Launch
- **Clean Build**: Product > Clean Build Folder (⌘⇧K)
- **Reset Simulator**: Device > Erase All Content and Settings
- **Check Core Data**: Ensure CalorieTracker.xcdatamodeld is in the project

### Clarification Questions Not Working
- The app only asks questions when the calorie impact would be >50 calories
- You can always skip clarifications using "Skip & Save Entry"

## Future Enhancements

Potential features for future versions:
- Macro tracking (protein, carbs, fats)
- Weekly/monthly trend charts
- Export data to CSV
- Nutritional goals and targets
- Photo-based meal logging
- Apple Health integration
- Widget for quick entry
- Siri Shortcuts support

## Contributing

This is a personal project, but suggestions and improvements are welcome! Please open an issue or submit a pull request.

## License

MIT License - Feel free to use and modify for your own purposes.

## Acknowledgments

- Built with [Claude AI](https://www.anthropic.com/claude) by Anthropic
- Uses the Claude Sonnet 4.5 model for calorie estimation
- Inspired by the need for simple, intelligent calorie tracking

---

**Note**: This app requires an active internet connection and Anthropic API key to function. Calorie estimates are AI-generated and should be used as approximations, not exact measurements. Always consult with healthcare professionals for medical or dietary advice.
