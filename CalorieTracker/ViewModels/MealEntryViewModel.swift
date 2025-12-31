import Foundation
import CoreData
import SwiftUI

@MainActor
class MealEntryViewModel: ObservableObject {
    @Published var foodInput: String = ""
    @Published var isProcessing: Bool = false
    @Published var errorMessage: String?
    @Published var currentEstimate: CalorieEstimate?
    @Published var conversationHistory: [ConversationMessage] = []
    @Published var showingClarification: Bool = false

    private let claudeService: ClaudeService
    private let persistenceController: PersistenceController
    private var conversationContext: String = ""

    init(persistenceController: PersistenceController = .shared) {
        self.persistenceController = persistenceController
        self.claudeService = ClaudeService()
    }

    func submitFood() async {
        guard !foodInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return
        }

        isProcessing = true
        errorMessage = nil

        let userMessage = ConversationMessage(
            id: UUID(),
            text: foodInput,
            isUser: true,
            timestamp: Date()
        )
        conversationHistory.append(userMessage)

        // Update conversation context
        conversationContext += "User: \(foodInput)\n"

        do {
            let estimate = try await claudeService.estimateCalories(
                foodDescription: foodInput,
                previousContext: conversationContext.isEmpty ? nil : conversationContext
            )

            currentEstimate = estimate
            conversationContext += "Assistant: \(estimate.analysis)\n"

            let assistantMessage = ConversationMessage(
                id: UUID(),
                text: estimate.analysis,
                isUser: false,
                timestamp: Date()
            )
            conversationHistory.append(assistantMessage)

            if estimate.clarificationNeeded, let question = estimate.clarificationQuestion {
                showingClarification = true
                let clarificationMessage = ConversationMessage(
                    id: UUID(),
                    text: question,
                    isUser: false,
                    timestamp: Date()
                )
                conversationHistory.append(clarificationMessage)
                conversationContext += "Question: \(question)\n"
                foodInput = ""
            } else {
                // Save to Core Data
                saveMealEntry(estimate: estimate)
                resetConversation()
            }
        } catch {
            errorMessage = "Failed to estimate calories: \(error.localizedDescription)"
        }

        isProcessing = false
    }

    func saveMealEntry(estimate: CalorieEstimate) {
        let context = persistenceController.container.viewContext
        let entry = MealEntry(context: context)

        entry.id = UUID()
        entry.timestamp = Date()
        entry.foodDescription = conversationHistory
            .filter { $0.isUser }
            .map { $0.text }
            .joined(separator: " | ")
        entry.caloriesMin = Int32(estimate.caloriesMin)
        entry.caloriesMax = Int32(estimate.caloriesMax)
        entry.clarifications = conversationHistory
            .filter { !$0.isUser }
            .map { $0.text }
            .joined(separator: "\n")
        entry.notes = estimate.analysis

        persistenceController.save()
    }

    func resetConversation() {
        foodInput = ""
        currentEstimate = nil
        conversationHistory = []
        conversationContext = ""
        showingClarification = false
    }
}

struct ConversationMessage: Identifiable {
    let id: UUID
    let text: String
    let isUser: Bool
    let timestamp: Date
}
