import SwiftUI
import UIKit
import WebKit

struct WebView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> WebViewController { WebViewController() }
    func updateUIViewController(_ vc: WebViewController, context: Context) {}
}

// Hosts the bundled web/index.html full-bleed; the page handles safe areas via env(safe-area-inset-*).
// No IAP yet. Bridge stub: the page may post {a, v} to "ef" (only "haptic" is handled).
final class WebViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {
    private var web: WKWebView!
    private let tap = UIImpactFeedbackGenerator(style: .light)

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(named: "LaunchBg")
        let cfg = WKWebViewConfiguration()
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.userContentController.add(self, name: "ef")
        web = WKWebView(frame: view.bounds, configuration: cfg)
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        web.isOpaque = false
        web.backgroundColor = view.backgroundColor
        web.scrollView.backgroundColor = view.backgroundColor
        web.scrollView.bounces = false
        web.scrollView.alwaysBounceVertical = false
        web.scrollView.alwaysBounceHorizontal = false
        web.scrollView.isScrollEnabled = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.allowsBackForwardNavigationGestures = false
        web.allowsLinkPreview = false
        web.navigationDelegate = self
        view.addSubview(web)
        load()
    }

    // The folder reference keeps its disk name (web/). "www" is checked too so a renamed bundle folder
    // cannot silently produce a blank screen.
    private func indexURL() -> URL? {
        for dir in ["web", "www"] {
            if let u = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: dir) { return u }
        }
        return Bundle.main.url(forResource: "index", withExtension: "html")
    }

    private func load() {
        guard let url = indexURL() else {
            web.loadHTMLString("<body style='background:#0b0e1a;color:#fff;font:16px -apple-system;padding:40px'>Epochfall: web/index.html missing from app bundle</body>", baseURL: nil)
            return
        }
        web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { load() }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if action.targetFrame?.isMainFrame != false, let u = action.request.url, u.scheme != "file", u.scheme != "about" {
            UIApplication.shared.open(u)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let body = message.body as? [String: Any], let a = body["a"] as? String else { return }
        switch a {
        case "haptic": tap.impactOccurred()
        default: break
        }
    }
}
