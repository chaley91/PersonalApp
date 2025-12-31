import SwiftUI
import CoreData

struct HistoryView: View {
    @Environment(\.managedObjectContext) private var viewContext
    @FetchRequest(
        sortDescriptors: [NSSortDescriptor(keyPath: \MealEntry.timestamp, ascending: false)],
        animation: .default)
    private var meals: FetchedResults<MealEntry>

    @State private var selectedDate = Date()
    @State private var showingDatePicker = false

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Daily summary card
                DailySummaryCard(meals: mealsForSelectedDate)
                    .padding()

                Divider()

                // Meal list
                if mealsForSelectedDate.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "fork.knife.circle")
                            .font(.system(size: 60))
                            .foregroundColor(.secondary)
                        Text("No meals logged for this day")
                            .foregroundColor(.secondary)
                    }
                    .frame(maxHeight: .infinity)
                } else {
                    List {
                        ForEach(mealsForSelectedDate) { meal in
                            MealRowView(meal: meal)
                        }
                        .onDelete(perform: deleteMeals)
                    }
                }
            }
            .navigationTitle("History")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: {
                        showingDatePicker.toggle()
                    }) {
                        HStack {
                            Text(selectedDate, style: .date)
                            Image(systemName: "calendar")
                        }
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack {
                        Button(action: previousDay) {
                            Image(systemName: "chevron.left")
                        }
                        Button(action: nextDay) {
                            Image(systemName: "chevron.right")
                        }
                        .disabled(Calendar.current.isDateInToday(selectedDate))
                    }
                }
            }
            .sheet(isPresented: $showingDatePicker) {
                NavigationView {
                    DatePicker("Select Date", selection: $selectedDate, displayedComponents: .date)
                        .datePickerStyle(.graphical)
                        .padding()
                        .navigationTitle("Select Date")
                        .navigationBarTitleDisplayMode(.inline)
                        .toolbar {
                            ToolbarItem(placement: .navigationBarTrailing) {
                                Button("Done") {
                                    showingDatePicker = false
                                }
                            }
                        }
                }
            }
        }
    }

    private var mealsForSelectedDate: [MealEntry] {
        let calendar = Calendar.current
        return meals.filter { meal in
            guard let timestamp = meal.timestamp else { return false }
            return calendar.isDate(timestamp, inSameDayAs: selectedDate)
        }
    }

    private func previousDay() {
        if let newDate = Calendar.current.date(byAdding: .day, value: -1, to: selectedDate) {
            selectedDate = newDate
        }
    }

    private func nextDay() {
        guard !Calendar.current.isDateInToday(selectedDate) else { return }
        if let newDate = Calendar.current.date(byAdding: .day, value: 1, to: selectedDate) {
            selectedDate = newDate
        }
    }

    private func deleteMeals(offsets: IndexSet) {
        withAnimation {
            offsets.map { mealsForSelectedDate[$0] }.forEach(viewContext.delete)
            PersistenceController.shared.save()
        }
    }
}

struct DailySummaryCard: View {
    let meals: [MealEntry]

    private var totalCaloriesMin: Int {
        meals.reduce(0) { $0 + Int($1.caloriesMin) }
    }

    private var totalCaloriesMax: Int {
        meals.reduce(0) { $0 + Int($1.caloriesMax) }
    }

    private var displayCalories: String {
        if totalCaloriesMin == totalCaloriesMax {
            return "\(totalCaloriesMin)"
        } else {
            return "\(totalCaloriesMin) - \(totalCaloriesMax)"
        }
    }

    var body: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Total Calories")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text(displayCalories)
                        .font(.system(size: 36, weight: .bold))
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Meals")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    Text("\(meals.count)")
                        .font(.system(size: 36, weight: .bold))
                }
            }

            if totalCaloriesMin != totalCaloriesMax {
                Text("Ranges shown due to estimation uncertainty")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct MealRowView: View {
    let meal: MealEntry

    private var calorieDisplay: String {
        if meal.caloriesMin == meal.caloriesMax {
            return "\(meal.caloriesMin) cal"
        } else {
            return "\(meal.caloriesMin)-\(meal.caloriesMax) cal"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(meal.foodDescription ?? "Unknown")
                    .font(.headline)
                Spacer()
                Text(calorieDisplay)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.blue)
            }

            if let timestamp = meal.timestamp {
                Text(timestamp, style: .time)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            if let notes = meal.notes, !notes.isEmpty {
                Text(notes)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    HistoryView()
        .environment(\.managedObjectContext, PersistenceController.shared.container.viewContext)
}
