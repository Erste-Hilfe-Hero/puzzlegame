import SwiftUI
import UIKit
import WebKit

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
    private let pop = UIImpactFeedbackGenerator(style: .rigid)
    private let soft = UIImpactFeedbackGenerator(style: .light)
    private let note = UINotificationFeedbackGenerator()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.165, green: 0.114, blue: 0.078, alpha: 1)
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
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") {
            web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { GameBridge.shared.pageLoaded() }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { load() }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.body as? String {
        case "pop": pop.impactOccurred()
        case "star": soft.impactOccurred()
        case "win": note.notificationOccurred(.success)
        case "die": note.notificationOccurred(.error)
        default: break
        }
    }
}
