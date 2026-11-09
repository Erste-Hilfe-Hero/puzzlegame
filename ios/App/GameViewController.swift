import UIKit
import WebKit
import StoreKit

// Hosts the web game and bridges purchases to StoreKit 2. The game calls window.AndroidBilling.buy(id)
// on both platforms; Apple product ids are the game ids with the bundle id as prefix.
class GameViewController: UIViewController, WKScriptMessageHandler {
    private static let prefix = "com.nyrathen.tastyisland."
    private static let ids = ["gems_80", "gems_500", "gems_1200", "gems_2600", "gems_7000", "gems_15000", "starter", "pass"]
    private var web: WKWebView!
    private var products: [String: Product] = [:]
    private var updates: Task<Void, Never>?

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.106, green: 0.082, blue: 0.188, alpha: 1)
        let cfg = WKWebViewConfiguration()
        cfg.mediaTypesRequiringUserActionForPlayback = []
        let bridge = "window.AndroidBilling = { buy: function (id) { window.webkit.messageHandlers.billing.postMessage(id); }, exit: function () {} };"
        cfg.userContentController.addUserScript(WKUserScript(source: bridge, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        cfg.userContentController.add(self, name: "billing")
        web = WKWebView(frame: view.bounds, configuration: cfg)
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        web.isOpaque = false
        web.backgroundColor = view.backgroundColor
        web.scrollView.isScrollEnabled = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        view.addSubview(web)
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") {
            web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        updates = Task { await listenForTransactions() }
        Task { await loadProducts() }
    }

    private func js(_ code: String) {
        DispatchQueue.main.async { self.web.evaluateJavaScript(code, completionHandler: nil) }
    }

    private func loadProducts() async {
        guard let list = try? await Product.products(for: Self.ids.map { Self.prefix + $0 }) else { return }
        var prices: [String: String] = [:]
        for p in list {
            let id = String(p.id.dropFirst(Self.prefix.count))
            products[id] = p
            prices[id] = p.displayPrice
        }
        if let data = try? JSONSerialization.data(withJSONObject: prices), let s = String(data: data, encoding: .utf8) {
            // the page may not be loaded yet; retry until the hook exists
            for _ in 0..<20 {
                js("window.onNativePrices && window.onNativePrices(\(s))")
                try? await Task.sleep(nanoseconds: 1_000_000_000)
            }
        }
    }

    private func grant(_ t: Transaction) async {
        guard t.productID.hasPrefix(Self.prefix) else { await t.finish(); return }
        let id = String(t.productID.dropFirst(Self.prefix.count))
        js("window.onNativePurchase && window.onNativePurchase(\"\(id)\")")
        await t.finish()
    }

    private func listenForTransactions() async {
        for await result in Transaction.updates {
            if case .verified(let t) = result { await grant(t) }
        }
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let id = message.body as? String else { return }
        Task {
            guard let p = products[id] else { js("window.onNativePurchaseError && window.onNativePurchaseError(-100)"); return }
            do {
                let result = try await p.purchase()
                switch result {
                case .success(let v):
                    if case .verified(let t) = v { await grant(t) }
                case .pending, .userCancelled:
                    break
                @unknown default:
                    break
                }
            } catch {
                js("window.onNativePurchaseError && window.onNativePurchaseError(-1)")
            }
        }
    }
}
