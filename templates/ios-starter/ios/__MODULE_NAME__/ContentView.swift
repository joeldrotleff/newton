import SwiftUI

struct ContentView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Image(systemName: "sparkles")
                    .font(.system(size: 56))
                    .foregroundStyle(.tint)

                VStack(spacing: 8) {
                    Text("__DISPLAY_NAME_SWIFT__")
                        .font(.largeTitle.weight(.bold))

                    Text("A Newton starter app with a camera preview screen.")
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }

                NavigationLink {
                    CameraScreen()
                } label: {
                    Label("Open Camera", systemImage: "camera.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .navigationTitle("Home")
        }
    }
}

#Preview {
    ContentView()
}
