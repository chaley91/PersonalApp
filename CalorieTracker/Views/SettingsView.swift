import SwiftUI

struct SettingsView: View {
    @AppStorage("anthropicAPIKey") private var apiKey: String = ""
    @State private var showingAPIKeyInfo = false
    @State private var apiKeyVisible = false

    var body: some View {
        NavigationView {
            Form {
                Section {
                    HStack {
                        if apiKeyVisible {
                            TextField("API Key", text: $apiKey)
                                .autocapitalization(.none)
                                .autocorrectionDisabled()
                        } else {
                            SecureField("API Key", text: $apiKey)
                        }

                        Button(action: {
                            apiKeyVisible.toggle()
                        }) {
                            Image(systemName: apiKeyVisible ? "eye.slash" : "eye")
                                .foregroundColor(.secondary)
                        }
                    }

                    Button(action: {
                        showingAPIKeyInfo = true
                    }) {
                        HStack {
                            Image(systemName: "info.circle")
                            Text("How to get an API key")
                        }
                    }
                } header: {
                    Text("Anthropic API")
                } footer: {
                    Text("Your API key is stored securely on your device and used only to estimate calories using Claude.")
                }

                Section {
                    HStack {
                        Text("App Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }

                    Link(destination: URL(string: "https://www.anthropic.com/privacy")!) {
                        HStack {
                            Text("Privacy Policy")
                            Spacer()
                            Image(systemName: "arrow.up.right.square")
                                .foregroundColor(.secondary)
                        }
                    }
                } header: {
                    Text("About")
                }
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $showingAPIKeyInfo) {
                NavigationView {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Getting Your Anthropic API Key")
                                .font(.title2)
                                .fontWeight(.bold)

                            VStack(alignment: .leading, spacing: 12) {
                                StepView(
                                    number: 1,
                                    title: "Visit Anthropic Console",
                                    description: "Go to console.anthropic.com and sign in or create an account"
                                )

                                StepView(
                                    number: 2,
                                    title: "Navigate to API Keys",
                                    description: "Click on 'API Keys' in the left sidebar"
                                )

                                StepView(
                                    number: 3,
                                    title: "Create New Key",
                                    description: "Click 'Create Key' and give it a name like 'CalorieTracker'"
                                )

                                StepView(
                                    number: 4,
                                    title: "Copy and Paste",
                                    description: "Copy the generated API key and paste it in the field above"
                                )
                            }

                            Divider()

                            VStack(alignment: .leading, spacing: 8) {
                                Text("Important Notes")
                                    .font(.headline)

                                Label("Your API key is stored only on your device", systemImage: "lock.shield")
                                    .font(.subheadline)

                                Label("API usage is billed by Anthropic based on your plan", systemImage: "dollarsign.circle")
                                    .font(.subheadline)

                                Label("Each calorie estimate costs approximately $0.01-0.02", systemImage: "chart.bar")
                                    .font(.subheadline)
                            }
                            .padding()
                            .background(Color(.systemGray6))
                            .cornerRadius(8)

                            Link("Visit Anthropic Console", destination: URL(string: "https://console.anthropic.com")!)
                                .font(.headline)
                                .frame(maxWidth: .infinity)
                                .padding()
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .cornerRadius(8)
                        }
                        .padding()
                    }
                    .navigationTitle("API Key Setup")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button("Done") {
                                showingAPIKeyInfo = false
                            }
                        }
                    }
                }
            }
        }
    }
}

struct StepView: View {
    let number: Int
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(number)")
                .font(.headline)
                .frame(width: 28, height: 28)
                .background(Color.blue)
                .foregroundColor(.white)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                Text(description)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
    }
}

#Preview {
    SettingsView()
}
