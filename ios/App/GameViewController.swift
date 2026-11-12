import UIKit
import WebKit
import StoreKit

// Hosts the web game and bridges purchases to StoreKit 2. The game calls window.AndroidBilling.buy(id)
// on both platforms; Apple product ids are the game ids with the bundle id as prefix.
// A verified transaction is kept in `unconfirmed` and handed to the page once game.js called pageReady();
// it is only finished after the page saved the grant and called ack(transactionId). Unfinished transactions
// come back on the next start (Transaction.unfinished / Transaction.updates); game.js ignores ids it already granted.
// Refunded (revoked) transactions are finished without a grant; gems are not taken back (no server, plan J27).
class GameViewController: UIViewController, WKScriptMessageHandler, WKNavigationDelegate, WKUIDelegate {
    private static let prefix = "com.nyrathen.tastyisland."
    private static let ids = ["gems_80", "gems_500", "gems_1200", "gems_2600", "gems_7000", "gems_15000", "starter", "pass"]
    private static let messages = ["billing", "ack", "ready", "prices", "mirror", "haptic"]
    private var web: WKWebView!
    private let content = WKUserContentController()
    private var products: [String: Product] = [:]
    private var prices = "{}"
    private var pageReady = false
    private var unconfirmed: [UInt64: Transaction] = [:]
    private var updates: Task<Void, Never>?
    // WKWebView has no navigator.vibrate; x-design.js posts "merge" / "deliver" here (plan I43).
    private let tap = UIImpactFeedbackGenerator(style: .light)
    private let success = UINotificationFeedbackGenerator()

    // Copy of the save in Application Support (part of the iCloud device backup); restored when localStorage is empty.
    private static var mirrorURL: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("save-mirror.json")
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.106, green: 0.082, blue: 0.188, alpha: 1)
        let cfg = WKWebViewConfiguration()
        cfg.mediaTypesRequiringUserActionForPlayback = []
        for name in Self.messages { content.add(self, name: name) }
        cfg.userContentController = content
        web = WKWebView(frame: view.bounds, configuration: cfg)
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        web.isOpaque = false
        web.backgroundColor = view.backgroundColor
        web.scrollView.isScrollEnabled = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.navigationDelegate = self
        web.uiDelegate = self
        view.addSubview(web)
        loadGame()
        NotificationCenter.default.addObserver(self, selector: #selector(willResignActive), name: UIApplication.willResignActiveNotification, object: nil)
        updates = Task { await listenForTransactions() }
        Task { await queueUnfinished() }
        Task { await loadProducts() }
    }

    // (Re)loads the page; the bridge script carries the current save mirror, so it is rebuilt on every load.
    private func loadGame() {
        pageReady = false
        content.removeAllUserScripts()
        content.addUserScript(WKUserScript(source: Self.bridgeScript(), injectionTime: .atDocumentStart, forMainFrameOnly: true))
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") {
            web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }

    private static func bridgeScript() -> String {
        var mirror = "''"
        if let s = try? String(contentsOf: mirrorURL, encoding: .utf8),
           let d = try? JSONSerialization.data(withJSONObject: [s]), let j = String(data: d, encoding: .utf8) {
            mirror = j + "[0]"
        }
        return """
        (function () {
          var m = window.webkit.messageHandlers, mirror = \(mirror);
          window.AndroidBilling = {
            buy: function (id) { m.billing.postMessage(id); },
            ack: function (tx) { m.ack.postMessage(String(tx)); },
            pageReady: function () { m.ready.postMessage(''); },
            requestPrices: function () { m.prices.postMessage(''); },
            saveMirror: function (json) { m.mirror.postMessage(json); },
            loadMirror: function () { return mirror; },
            exit: function () {}
          };
        })();
        """
    }

    @objc private func willResignActive() {
        web.evaluateJavaScript("window.onNativePause && window.onNativePause()", completionHandler: nil)
    }

    // links (privacy policy, mail) open outside the game
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let u = action.request.url, u.scheme != "file" { UIApplication.shared.open(u); decisionHandler(.cancel); return }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let u = action.request.url { UIApplication.shared.open(u) }
        return nil
    }

    // The web content process crashed or was killed under memory pressure: reload instead of a blank screen.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        loadGame()
    }

    private func js(_ code: String) {
        DispatchQueue.main.async { self.web.evaluateJavaScript(code, completionHandler: nil) }
    }

    private func loadProducts() async {
        guard let list = try? await Product.products(for: Self.ids.map { Self.prefix + $0 }), !list.isEmpty else { return }
        var map: [String: String] = [:]
        for p in list {
            let id = String(p.id.dropFirst(Self.prefix.count))
            products[id] = p
            map[id] = p.displayPrice
        }
        if let data = try? JSONSerialization.data(withJSONObject: map), let s = String(data: data, encoding: .utf8) { prices = s }
        sendPrices()
    }

    private func sendPrices() {
        guard pageReady, !products.isEmpty else { return }
        js("window.onNativePrices && window.onNativePrices(\(prices))")
    }

    private func receive(_ t: Transaction) {
        guard t.productID.hasPrefix(Self.prefix), t.revocationDate == nil else {
            Task { await t.finish() }
            return
        }
        unconfirmed[t.id] = t
        deliver(t)
    }

    private func deliver(_ t: Transaction) {
        guard pageReady else { return }
        let id = String(t.productID.dropFirst(Self.prefix.count))
        js("window.onNativePurchase && window.onNativePurchase(\"\(id)\", \"\(t.id)\")")
    }

    private func listenForTransactions() async {
        for await result in Transaction.updates {
            if case .verified(let t) = result { receive(t) }
        }
    }

    private func queueUnfinished() async {
        for await result in Transaction.unfinished {
            if case .verified(let t) = result { receive(t) }
        }
    }

    private func purchase(_ id: String) async {
        guard let p = products[id] else { js("window.onNativePurchaseError && window.onNativePurchaseError(-100)"); return }
        do {
            switch try await p.purchase() {
            case .success(let v):
                if case .verified(let t) = v { receive(t) }
            case .pending:
                // Ask to Buy or a delayed payment; the approved transaction arrives later via Transaction.updates.
                js("window.onNativePurchasePending && window.onNativePurchasePending()")
            case .userCancelled:
                break
            @unknown default:
                break
            }
        } catch {
            js("window.onNativePurchaseError && window.onNativePurchaseError(-1)")
        }
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, message.frameInfo.request.url?.isFileURL == true else { return }
        switch message.name {
        case "billing":
            if let id = message.body as? String { Task { await purchase(id) } }
        case "ack":
            if let s = message.body as? String, let key = UInt64(s), let t = unconfirmed.removeValue(forKey: key) {
                Task { await t.finish() }
            }
        case "ready":
            pageReady = true
            sendPrices()
            for t in unconfirmed.values { deliver(t) }
        case "prices":
            if products.isEmpty { Task { await loadProducts() } } else { sendPrices() }
        case "mirror":
            if let s = message.body as? String {
                try? FileManager.default.createDirectory(at: Self.mirrorURL.deletingLastPathComponent(), withIntermediateDirectories: true)
                try? s.write(to: Self.mirrorURL, atomically: true, encoding: .utf8)
            }
        case "haptic":
            if (message.body as? String) == "deliver" { success.notificationOccurred(.success) } else { tap.impactOccurred() }
        default:
            break
        }
    }
}
