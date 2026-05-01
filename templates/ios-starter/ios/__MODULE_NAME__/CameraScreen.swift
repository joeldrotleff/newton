import AVFoundation
import SwiftUI
import UIKit

struct CameraScreen: View {
    @State private var authorizationStatus = AVCaptureDevice.authorizationStatus(for: .video)

    var body: some View {
        content
            .navigationTitle("Camera")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                authorizationStatus = AVCaptureDevice.authorizationStatus(for: .video)
            }
    }

    @ViewBuilder
    private var content: some View {
        switch authorizationStatus {
        case .authorized:
            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                BasicCameraView()
                    .ignoresSafeArea(edges: .bottom)
            } else {
                ContentUnavailableView(
                    "Camera Unavailable",
                    systemImage: "camera.slash",
                    description: Text("Run on a physical device to see the live camera preview.")
                )
            }

        case .notDetermined:
            VStack(spacing: 16) {
                Image(systemName: "camera")
                    .font(.system(size: 48))
                    .foregroundStyle(.tint)

                Text("Camera Access")
                    .font(.title2.weight(.semibold))

                Text("Grant camera access to show a live preview.")
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                Button {
                    Task { await requestCameraAccess() }
                } label: {
                    Label("Allow Camera", systemImage: "camera.fill")
                }
                .buttonStyle(.borderedProminent)
            }
            .padding()

        case .denied, .restricted:
            ContentUnavailableView(
                "Camera Access Needed",
                systemImage: "camera.badge.ellipsis",
                description: Text("Enable camera access in Settings to use this screen.")
            )

        @unknown default:
            ContentUnavailableView(
                "Camera Status Unknown",
                systemImage: "questionmark.circle",
                description: Text("The app could not determine camera authorization status.")
            )
        }
    }

    private func requestCameraAccess() async {
        _ = await AVCaptureDevice.requestAccess(for: .video)
        authorizationStatus = AVCaptureDevice.authorizationStatus(for: .video)
    }
}

private struct BasicCameraView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.cameraCaptureMode = .photo
        picker.showsCameraControls = true
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_: UIImagePickerController, context _: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {}
}

#Preview {
    NavigationStack {
        CameraScreen()
    }
}
