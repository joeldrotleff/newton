import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            List {
                Label("Ready", systemImage: "checkmark.circle.fill")
                    .foregroundStyle(.green)

                Text("__DISPLAY_NAME_SWIFT__ is running on Apple Watch.")
                    .foregroundStyle(.secondary)
            }
            .navigationTitle("__DISPLAY_NAME_SWIFT__")
        }
    }
}

#Preview {
    ContentView()
}
