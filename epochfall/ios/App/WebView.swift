import SwiftUI
import UIKit
import WebKit
import StoreKit

struct WebView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> WebViewController { WebViewController() }
    func updateUIViewController(_ vc: WebViewController, context: Context) {}
}

// Hosts the bundled web/index.html full-bleed; the page handles safe areas via env(safe-area-inset-*).
// Bridge "ef": {a: "haptic"} for haptics, {type: "products" | "buy" | "restore" | "ack", id} for the Tala shop (web/shop.js).
// Purchases use StoreKit 2 (iOS only). A verified transaction is kept in `unconfirmed` and handed to
// window.EFShop.onPurchased(productId, txId) once the page asked for products (shop.js loaded). It is finished only
// after the page saved the grant and posted {type: "ack", id: txId}; unfinished transactions come back on the next
// start (StoreKit.Transaction.unfinished) or via StoreKit.Transaction.updates, and shop.js ignores transaction ids it already granted.
// Refunded (revoked) transactions are finished without a grant. StoreKit.Transaction is spelled out because SwiftUI has its own Transaction.
final class WebViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate {
    private static let productIDs = ["starter", "moonpass", "tala_60", "tala_300", "tala_980", "tala_1980", "tala_3280", "tala_6480"]
        .map { "com.nyrathen.epochfall." + $0 }
    // paid random items are not sold in Belgium and the Netherlands (concept section 9); free Tala still work there
    private static let lockedStorefronts: Set<String> = ["BEL", "NLD"]

    private var web: WKWebView!
    private let tap = UIImpactFeedbackGenerator(style: .light)
    private var products: [String: Product] = [:]
    private var pageReady = false
    private var unconfirmed: [UInt64: StoreKit.Transaction] = [:]
    private var updates: Task<Void, Never>?

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
        updates = Task { await listenForTransactions() }
        Task { await queueUnfinished() }
        Task { await loadProducts() }
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
        pageReady = false
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
        guard message.frameInfo.isMainFrame, let body = message.body as? [String: Any] else { return }
        if let a = body["a"] as? String {
            if a == "haptic" { tap.impactOccurred() }
            return
        }
        let id = body["id"] as? String ?? ""
        switch body["type"] as? String ?? "" {
        case "products":
            // shop.js is loaded: from now on transactions can be delivered to the page
            pageReady = true
            if products.isEmpty { Task { await loadProducts() } } else { sendProducts() }
            Task { await sendStorefront() }
            for t in unconfirmed.values { deliver(t) }
        case "buy":
            Task { await purchase(id) }
        case "restore":
            Task { await restore() }
        case "ack":
            if let key = UInt64(id), let t = unconfirmed.removeValue(forKey: key) {
                Task { await t.finish() }
            }
        default:
            break
        }
    }

    // MARK: - StoreKit 2

    private func json(_ value: Any) -> String {
        guard let d = try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed]),
              let s = String(data: d, encoding: .utf8) else { return "null" }
        return s
    }

    // calls window.EFShop.<fn>(args...) with JSON-encoded arguments
    private func shop(_ fn: String, _ args: Any...) {
        let a = args.map { json($0) }.joined(separator: ",")
        web.evaluateJavaScript("window.EFShop && window.EFShop.\(fn)(\(a))", completionHandler: nil)
    }

    private func loadProducts() async {
        if let list = try? await Product.products(for: Self.productIDs) {
            for p in list { products[p.id] = p }
        }
        sendProducts()
    }

    private func sendProducts() {
        guard pageReady else { return }
        let list: [[String: String]] = Self.productIDs.compactMap { (id: String) -> [String: String]? in
            guard let p = products[id] else { return nil }
            return ["id": p.id, "price": p.displayPrice, "title": p.displayName]
        }
        shop("onProducts", list)
    }

    private func storefrontCountry() async -> String? {
        await Storefront.current?.countryCode
    }

    private func sendStorefront() async {
        guard let cc = await storefrontCountry() else { return }
        shop("onStorefront", cc)
    }

    private func receive(_ t: StoreKit.Transaction) {
        guard Self.productIDs.contains(t.productID), t.revocationDate == nil else {
            Task { await t.finish() }
            return
        }
        unconfirmed[t.id] = t
        deliver(t)
    }

    private func deliver(_ t: StoreKit.Transaction) {
        guard pageReady else { return }
        shop("onPurchased", t.productID, String(t.id))
    }

    private func listenForTransactions() async {
        for await result in StoreKit.Transaction.updates {
            if case .verified(let t) = result { receive(t) }
        }
    }

    private func queueUnfinished() async {
        for await result in StoreKit.Transaction.unfinished {
            if case .verified(let t) = result { receive(t) }
        }
    }

    private func purchase(_ id: String) async {
        if let cc = await storefrontCountry(), Self.lockedStorefronts.contains(cc) {
            shop("onFailed", id, "region")
            return
        }
        if products[id] == nil { await loadProducts() }
        guard let p = products[id] else {
            shop("onFailed", id, "unavailable")
            return
        }
        do {
            switch try await p.purchase() {
            case .success(let v):
                switch v {
                case .verified(let t): receive(t)
                case .unverified: shop("onFailed", id, "unverified")
                }
            case .pending:
                // Ask to Buy or a delayed payment; the approved transaction arrives later via StoreKit.Transaction.updates.
                shop("onFailed", id, "pending")
            case .userCancelled:
                shop("onFailed", id, "cancelled")
            @unknown default:
                shop("onFailed", id, "error")
            }
        } catch {
            shop("onFailed", id, "error")
        }
    }

    // "Restore purchases": non-consumables only (the Starter Pack); consumables never appear in currentEntitlements.
    private func restore() async {
        try? await AppStore.sync()
        var list: [[String: String]] = []
        for await result in StoreKit.Transaction.currentEntitlements {
            if case .verified(let t) = result, t.revocationDate == nil, Self.productIDs.contains(t.productID) {
                list.append(["id": t.productID, "txId": String(t.id)])
            }
        }
        shop("onRestored", list)
    }
}
