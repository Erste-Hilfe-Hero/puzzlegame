import SwiftUI
import UIKit
import WebKit
import StoreKit

struct WebView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> WebViewController { WebViewController() }
    func updateUIViewController(_ vc: WebViewController, context: Context) {}
}

// Hosts web/index.html. Bridge: page posts {a, v} to "kl"; native answers via window.klNative.
// One non-consumable "pro" (com.nyrathen.kaeselegen.pro); entitlement is re-read from StoreKit on every start.
final class WebViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {
    private static let proID = "com.nyrathen.kaeselegen.pro"
    private var web: WKWebView!
    private var product: Product?
    private var pageReady = false
    private var hasPro = false
    private var updates: Task<Void, Never>?
    private let tap = UIImpactFeedbackGenerator(style: .light)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(named: "LaunchBg")
        let cfg = WKWebViewConfiguration()
        cfg.userContentController.add(self, name: "kl")
        web = WKWebView(frame: view.bounds, configuration: cfg)
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        web.isOpaque = false
        web.backgroundColor = view.backgroundColor
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.navigationDelegate = self
        view.addSubview(web)
        load()
        updates = Task { await listen() }
        Task { await refreshEntitlement(); await loadProduct() }
    }

    private func load() {
        pageReady = false
        // folder reference keeps its disk name: web/
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") {
            web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { load() }

    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let u = action.request.url, u.scheme != "file" { UIApplication.shared.open(u); decisionHandler(.cancel); return }
        decisionHandler(.allow)
    }

    private func js(_ code: String) {
        DispatchQueue.main.async { self.web.evaluateJavaScript(code, completionHandler: nil) }
    }

    private func sendState() {
        guard pageReady else { return }
        if let p = product, let d = try? JSONSerialization.data(withJSONObject: [p.displayPrice]), let s = String(data: d, encoding: .utf8) {
            js("window.klNative && window.klNative.price(\(s)[0])")
        }
        js("window.klNative && window.klNative.pro(\(hasPro))")
    }

    private func loadProduct() async {
        product = try? await Product.products(for: [Self.proID]).first
        await MainActor.run { sendState() }
    }

    private func refreshEntitlement() async {
        var on = false
        for await r in Transaction.currentEntitlements {
            if case .verified(let t) = r, t.productID == Self.proID, t.revocationDate == nil { on = true }
        }
        await MainActor.run { hasPro = on; sendState() }
    }

    private func listen() async {
        for await r in Transaction.updates {
            if case .verified(let t) = r { await t.finish(); await refreshEntitlement() }
        }
    }

    private func buy() async {
        if product == nil { await loadProduct() }
        guard let p = product else { js("window.klNative && window.klNative.toast('buyErr')"); return }
        do {
            switch try await p.purchase() {
            case .success(let v):
                if case .verified(let t) = v { await t.finish() }
                await refreshEntitlement()
            case .pending:
                js("window.klNative && window.klNative.toast('pending')")
            default: break
            }
        } catch {
            js("window.klNative && window.klNative.toast('buyErr')")
        }
    }

    private func restore() async {
        try? await AppStore.sync()
        await refreshEntitlement()
    }

    private func share(_ items: [Any]) {
        let vc = UIActivityViewController(activityItems: items, applicationActivities: nil)
        vc.popoverPresentationController?.sourceView = view
        vc.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.maxY - 80, width: 1, height: 1)
        present(vc, animated: true)
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let body = message.body as? [String: Any], let a = body["a"] as? String else { return }
        let v = body["v"] as? String ?? ""
        switch a {
        case "ready": pageReady = true; sendState()
        case "prices": if product == nil { Task { await loadProduct() } } else { sendState() }
        case "buy": Task { await buy() }
        case "restore": Task { await restore() }
        case "copy": UIPasteboard.general.string = v
        case "share": share([v])
        case "shareImage":
            if let i = v.range(of: "base64,"), let d = Data(base64Encoded: String(v[i.upperBound...])), let img = UIImage(data: d) { share([img]) }
        case "open":
            if v.hasPrefix("mailto:") || v.hasPrefix("https:"), let u = URL(string: v) { UIApplication.shared.open(u) }
            else if let u = Bundle.main.url(forResource: (v as NSString).deletingPathExtension, withExtension: "html", subdirectory: "web") {
                web.loadFileURL(u, allowingReadAccessTo: u.deletingLastPathComponent())
            }
        case "haptic": tap.impactOccurred()
        default: break
        }
    }
}
