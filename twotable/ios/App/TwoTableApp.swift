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
        }
    }
}
