import Foundation

struct CalorieEstimate {
    let caloriesMin: Int
    let caloriesMax: Int
    let clarificationNeeded: Bool
    let clarificationQuestion: String?
    let analysis: String
}

enum ClaudeServiceError: Error {
    case invalidAPIKey
    case invalidResponse
    case networkError(Error)
}

class ClaudeService {
    private var apiKey: String {
        UserDefaults.standard.string(forKey: "anthropicAPIKey") ?? ""
    }
    private let baseURL = "https://api.anthropic.com/v1/messages"

    init() {
    }

    func estimateCalories(foodDescription: String, previousContext: String? = nil) async throws -> CalorieEstimate {
        var prompt = """
        You are a nutrition expert helping estimate calories for food and drinks. The user has described what they consumed.

        User's input: "\(foodDescription)"
        """

        if let context = previousContext {
            prompt += "\n\nPrevious conversation context:\n\(context)"
        }

        prompt += """

        Please analyze this food/drink and provide:
        1. A calorie estimate (provide a range if uncertain, e.g., 200-300 calories)
        2. If you need clarification about portion size, preparation method, or specific variant, ask ONE specific question
        3. A brief explanation of your estimate

        Respond in this exact JSON format:
        {
            "caloriesMin": <minimum calories as integer>,
            "caloriesMax": <maximum calories as integer>,
            "needsClarification": <true/false>,
            "clarificationQuestion": "<your question or null>",
            "analysis": "<brief explanation>"
        }

        Important:
        - Be reasonable with estimates - use common portion sizes if not specified
        - Only ask for clarification if it would significantly impact the estimate (>50 calorie difference)
        - For drinks, assume standard serving sizes unless otherwise specified
        - Provide ranges when uncertain rather than asking unnecessary questions
        """

        let requestBody: [String: Any] = [
            "model": "claude-sonnet-4-5-20250929",
            "max_tokens": 1024,
            "messages": [
                [
                    "role": "user",
                    "content": prompt
                ]
            ]
        ]

        guard let url = URL(string: baseURL) else {
            throw ClaudeServiceError.invalidResponse
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                throw ClaudeServiceError.invalidResponse
            }

            return try parseResponse(data)
        } catch {
            throw ClaudeServiceError.networkError(error)
        }
    }

    private func parseResponse(_ data: Data) throws -> CalorieEstimate {
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let content = json["content"] as? [[String: Any]],
              let firstContent = content.first,
              let text = firstContent["text"] as? String else {
            throw ClaudeServiceError.invalidResponse
        }

        // Extract JSON from the response text
        let jsonPattern = #"\{[\s\S]*\}"#
        guard let regex = try? NSRegularExpression(pattern: jsonPattern),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              let range = Range(match.range, in: text) else {
            throw ClaudeServiceError.invalidResponse
        }

        let jsonString = String(text[range])
        guard let jsonData = jsonString.data(using: .utf8),
              let estimateJSON = try JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
            throw ClaudeServiceError.invalidResponse
        }

        guard let caloriesMin = estimateJSON["caloriesMin"] as? Int,
              let caloriesMax = estimateJSON["caloriesMax"] as? Int,
              let needsClarification = estimateJSON["needsClarification"] as? Bool,
              let analysis = estimateJSON["analysis"] as? String else {
            throw ClaudeServiceError.invalidResponse
        }

        let clarificationQuestion = estimateJSON["clarificationQuestion"] as? String

        return CalorieEstimate(
            caloriesMin: caloriesMin,
            caloriesMax: caloriesMax,
            clarificationNeeded: needsClarification,
            clarificationQuestion: clarificationQuestion,
            analysis: analysis
        )
    }
}
