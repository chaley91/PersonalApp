import SwiftUI

struct MealEntryView: View {
    @StateObject private var viewModel = MealEntryViewModel()
    @Environment(\.managedObjectContext) private var viewContext

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Conversation history
                if !viewModel.conversationHistory.isEmpty {
                    ScrollViewReader { proxy in
                        ScrollView {
                            VStack(alignment: .leading, spacing: 12) {
                                ForEach(viewModel.conversationHistory) { message in
                                    MessageBubble(message: message)
                                        .id(message.id)
                                }
                            }
                            .padding()
                        }
                        .onChange(of: viewModel.conversationHistory.count) { _ in
                            if let lastMessage = viewModel.conversationHistory.last {
                                withAnimation {
                                    proxy.scrollTo(lastMessage.id, anchor: .bottom)
                                }
                            }
                        }
                    }
                    .background(Color(.systemGroupedBackground))
                }

                Divider()

                // Input area
                VStack(spacing: 12) {
                    if let error = viewModel.errorMessage {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                            Text(error)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Spacer()
                        }
                        .padding(.horizontal)
                        .padding(.top, 8)
                    }

                    HStack(alignment: .bottom, spacing: 12) {
                        TextField("What did you eat or drink?", text: $viewModel.foodInput, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(1...5)
                            .disabled(viewModel.isProcessing)

                        Button(action: {
                            Task {
                                await viewModel.submitFood()
                            }
                        }) {
                            if viewModel.isProcessing {
                                ProgressView()
                                    .frame(width: 24, height: 24)
                            } else {
                                Image(systemName: "arrow.up.circle.fill")
                                    .font(.system(size: 32))
                            }
                        }
                        .disabled(viewModel.foodInput.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.isProcessing)
                    }
                    .padding(.horizontal)

                    if !viewModel.conversationHistory.isEmpty {
                        Button(action: {
                            if let estimate = viewModel.currentEstimate {
                                viewModel.saveMealEntry(estimate: estimate)
                            }
                            viewModel.resetConversation()
                        }) {
                            Text(viewModel.showingClarification ? "Skip & Save Entry" : "Save Entry")
                                .font(.caption)
                        }
                        .padding(.bottom, 4)
                    }
                }
                .padding(.vertical, 12)
                .background(Color(.systemBackground))
            }
            .navigationTitle("Add Meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    if !viewModel.conversationHistory.isEmpty {
                        Button("Clear") {
                            viewModel.resetConversation()
                        }
                        .font(.subheadline)
                    }
                }
            }
        }
    }
}

struct MessageBubble: View {
    let message: ConversationMessage

    var body: some View {
        HStack {
            if message.isUser {
                Spacer()
            }

            VStack(alignment: message.isUser ? .trailing : .leading, spacing: 4) {
                Text(message.text)
                    .padding(12)
                    .background(message.isUser ? Color.blue : Color(.systemGray5))
                    .foregroundColor(message.isUser ? .white : .primary)
                    .cornerRadius(16)

                Text(message.timestamp, style: .time)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            .frame(maxWidth: 280, alignment: message.isUser ? .trailing : .leading)

            if !message.isUser {
                Spacer()
            }
        }
    }
}

#Preview {
    MealEntryView()
        .environment(\.managedObjectContext, PersistenceController.shared.container.viewContext)
}
