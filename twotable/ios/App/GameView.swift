import SwiftUI
import UIKit
import WebKit
import StoreKit

final class GameBridge {
    static let shared = GameBridge()
    weak var web: WKWebView?
    private var last: (Double, String)?
    private var ready = false

    func hinge(_ deg: Double, _ status: String) {
        last = (deg, status)
        send()
    }
    func pageLoaded() { ready = true; send() }
    private func send() {
        guard ready, let l = last else { return }
        web?.evaluateJavaScript("window.onHinge && window.onHinge(\(l.0), '\(l.1)')", completionHandler: nil)
    }
}

struct GameView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> GameViewController { GameViewController() }
    func updateUIViewController(_ vc: GameViewController, context: Context) {}
}

final class GameViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {
    private var web: WKWebView!
    private let soft = UIImpactFeedbackGenerator(style: .light)
    private let note = UINotificationFeedbackGenerator()
    private let hard = UIImpactFeedbackGenerator(style: .heavy)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.106, green: 0.165, blue: 0.133, alpha: 1)
        let cfg = WKWebViewConfiguration()
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.userContentController.add(self, name: "haptic")
        web = WKWebView(frame: view.bounds, configuration: cfg)
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        web.isOpaque = false
        web.backgroundColor = view.backgroundColor
        web.scrollView.isScrollEnabled = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.navigationDelegate = self
        view.addSubview(web)
        GameBridge.shared.web = web
        load()
    }

    private func load() {
        // the folder reference keeps its on-disk name (web/), not the group name
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web")
            ?? Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") {
            web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        GameBridge.shared.pageLoaded()
        // simulator launch check (CI): -ttdemo <game id> opens that game with a few moves played
        let args = ProcessInfo.processInfo.arguments
        if let i = args.firstIndex(of: "-ttdemo"), i + 1 < args.count {
            let id = args[i + 1].filter { $0.isLetter }
            webView.evaluateJavaScript("window.tt && window.tt.demo('\(id)', 9)", completionHandler: nil)
        }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { load() }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.body as? String {
        case "tap": soft.impactOccurred()
        case "win": note.notificationOccurred(.success)
        case "heavy":
            hard.impactOccurred()
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { self.hard.impactOccurred() }
        // the screen stays on during a match, the phone may lock again in the menu
        case "awake1": UIApplication.shared.isIdleTimerDisabled = true
        case "awake0": UIApplication.shared.isIdleTimerDisabled = false
        case "review":
            if let scene = view.window?.windowScene { SKStoreReviewController.requestReview(in: scene) }
        default: break
        }
    }
}
