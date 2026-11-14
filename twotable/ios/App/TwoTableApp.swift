import SwiftUI
import AVFoundation

@main
struct TwoTableApp: App {
    init() { try? AVAudioSession.sharedInstance().setCategory(.ambient) }
    var body: some Scene {
        WindowGroup {
            GameView()
                .ignoresSafeArea()
                .statusBarHidden(true)
                .persistentSystemOverlays(.hidden)
                .modifier(HingeFeed())
        }
    }
}

// Sends the iPhone Duo hinge angle (degrees, 180 = flat) and status to the page as window.onHinge(deg, status).
// The hinge API ships with the iOS 27.1 SDK; CI sets DUO_HINGE only when it builds with Xcode 27.1 or newer.
struct HingeFeed: ViewModifier {
    @ViewBuilder
    func body(content: Content) -> some View {
        #if DUO_HINGE
        if #available(iOS 27.1, *) {
            content.onHingeChange { _, ctx in
                guard let hinge = ctx.hinge else { return }
                let status: String
                switch hinge.status {
                case .closed: status = "closed"
                case .partiallyOpen: status = "partial"
                default: status = "open"
                }
                GameBridge.shared.hinge(hinge.angle.degrees, status)
            }
        } else {
            content
        }
        #else
        content
        #endif
    }
}
