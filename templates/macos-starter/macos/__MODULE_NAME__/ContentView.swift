import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "macwindow")
                .font(.system(size: 40))
                .foregroundStyle(.tint)

            Text("__DISPLAY_NAME_SWIFT__")
                .font(.title)
        }
        .frame(minWidth: 420, minHeight: 280)
        .padding()
    }
}

#Preview {
    ContentView()
}
