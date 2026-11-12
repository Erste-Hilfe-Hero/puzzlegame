package com.nyrathen.tastyisland;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Insets;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.AtomicFile;
import android.util.Base64;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedDispatcher;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Hosts the web game and bridges purchases to Google Play Billing.
 *
 * Purchase flow: a PURCHASED purchase is kept in {@code unconfirmed} and handed to the page via
 * window.onNativePurchase(id, token) once game.js called AndroidBilling.pageReady(). The purchase is only
 * consumed after the page saved the grant and called AndroidBilling.ack(token). Unconsumed purchases come
 * back through queryPurchasesAsync on start/resume, game.js ignores tokens it already granted.
 *
 * Threading: billing callbacks and bridge calls are posted to the main thread, so all fields except the
 * mirror file (guarded by {@code mirrorLock}) and {@code trusted} are main-thread confined.
 *
 * Refunds: refunded purchases are not taken back (no server); accepted by design, see plan point J27.
 */
public class MainActivity extends Activity {
    private static final String[] PRODUCTS = {
        "gems_80", "gems_500", "gems_1200", "gems_2600", "gems_7000", "gems_15000", "starter", "pass"
    };
    private static final String HOME = "file:///android_asset/www/";
    private static final long[] BACKOFF_MS = {1000, 2000, 4000, 8000};
    // game.js uses object spread (Chrome 60+); older WebViews cannot parse it at all.
    private static final int MIN_CHROME = 61;

    private final Handler main = new Handler(Looper.getMainLooper());
    private final Map<String, ProductDetails> details = new HashMap<>();
    private final Map<String, Purchase> unconfirmed = new LinkedHashMap<>();
    private final Object mirrorLock = new Object();
    private FrameLayout root;
    private WebView web;
    private BillingClient billing;
    private String prices = "{}";
    private boolean pageReady;
    private boolean paused;
    private int retry;
    private volatile boolean trusted = true;
    private AtomicFile mirror;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        mirror = new AtomicFile(new File(getFilesDir(), "save-mirror.json"));
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        root = new FrameLayout(this);
        root.setBackgroundColor(0xFF1B1530);
        if (Build.VERSION.SDK_INT >= 35) {
            // targetSdk 35 forces edge-to-edge: keep the page out from under the system bars and cutout.
            root.setOnApplyWindowInsetsListener((v, in) -> {
                Insets i = in.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                v.setPadding(i.left, i.top, i.right, i.bottom);
                return WindowInsets.CONSUMED;
            });
        }
        setContentView(root);
        createWeb();
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::back);
        }
        setupBilling();
        checkWebViewVersion();
    }

    private void createWeb() {
        pageReady = false;
        web = new WebView(this);
        web.setBackgroundColor(0xFF1B1530);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setSupportMultipleWindows(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, android.webkit.WebResourceRequest r) {
                if (r.getUrl().toString().startsWith(HOME)) return false;
                try { startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, r.getUrl())); } catch (Exception ignored) { }
                return true;
            }
            @Override public void onPageStarted(WebView v, String url, android.graphics.Bitmap icon) {
                trusted = url != null && url.startsWith(HOME);
                pageReady = false;
            }
            @Override public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) {
                // Renderer crashed or was killed: rebuild the WebView instead of letting the app die.
                if (v != web) return true;
                root.removeView(web);
                web.destroy();
                createWeb();
                return true;
            }
        });
        web.addJavascriptInterface(new Bridge(), "AndroidBilling");
        root.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        web.loadUrl(HOME + "index.html");
    }

    private void checkWebViewVersion() {
        Matcher m = Pattern.compile("Chrome/(\\d+)").matcher(WebSettings.getDefaultUserAgent(this));
        if (m.find() && Integer.parseInt(m.group(1)) < MIN_CHROME) {
            new AlertDialog.Builder(this).setMessage(R.string.old_webview).setPositiveButton(android.R.string.ok, null).show();
        }
    }

    private void setupBilling() {
        billing = BillingClient.newBuilder(this)
            .setListener((result, purchases) -> main.post(() -> {
                int code = result.getResponseCode();
                if (code == BillingClient.BillingResponseCode.OK && purchases != null) {
                    for (Purchase p : purchases) handle(p, true);
                } else if (code != BillingClient.BillingResponseCode.USER_CANCELED) {
                    if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) queryPurchases();
                    js("window.onNativePurchaseError && window.onNativePurchaseError(" + code + ")");
                }
            }))
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build();
    }

    private void connect() {
        if (billing.isReady() || billing.getConnectionState() == BillingClient.ConnectionState.CONNECTING) return;
        billing.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult r) {
                main.post(() -> {
                    if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) { retryLater(); return; }
                    retry = 0;
                    queryDetails();
                    queryPurchases();
                });
            }
            @Override public void onBillingServiceDisconnected() { main.post(MainActivity.this::retryLater); }
        });
    }

    private void retryLater() {
        if (retry < BACKOFF_MS.length) main.postDelayed(this::connect, BACKOFF_MS[retry++]);
    }

    private void queryDetails() {
        List<QueryProductDetailsParams.Product> list = new ArrayList<>();
        for (String id : PRODUCTS) {
            list.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());
        }
        billing.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build(),
            (r, res) -> main.post(() -> {
                JSONObject map = new JSONObject();
                for (ProductDetails d : res) {
                    details.put(d.getProductId(), d);
                    try {
                        if (d.getOneTimePurchaseOfferDetails() != null)
                            map.put(d.getProductId(), d.getOneTimePurchaseOfferDetails().getFormattedPrice());
                    } catch (Exception ignored) { }
                }
                if (map.length() > 0) prices = map.toString();
                sendPrices();
            }));
    }

    private void sendPrices() {
        if (pageReady && !details.isEmpty()) js("window.onNativePrices && window.onNativePrices(" + prices + ")");
    }

    private void queryPurchases() {
        if (!billing.isReady()) return;
        billing.queryPurchasesAsync(
            QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
            (res, list) -> main.post(() -> { for (Purchase p : list) handle(p, false); }));
    }

    // Every product is consumable on the store side; the game keeps one-time state (starter) itself.
    private void handle(Purchase p, boolean fromFlow) {
        if (p.getPurchaseState() == Purchase.PurchaseState.PENDING) {
            if (fromFlow) js("window.onNativePurchasePending && window.onNativePurchasePending()");
            return;
        }
        if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED || !verified(p)) return;
        unconfirmed.put(p.getPurchaseToken(), p);
        deliver(p);
    }

    private void deliver(Purchase p) {
        if (!pageReady) return;
        js("window.onNativePurchase && window.onNativePurchase(" + JSONObject.quote(p.getProducts().get(0)) + ","
            + JSONObject.quote(p.getPurchaseToken()) + ")");
    }

    private void consume(String token) {
        if (unconfirmed.remove(token) == null || !billing.isReady()) return;
        // If consuming fails the purchase comes back via queryPurchases; game.js then only acks it again.
        billing.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(token).build(), (r, t) -> { });
    }

    // Local check against the Play license key (TI_PLAY_LICENSE_KEY at build time). Without a key every
    // purchase is accepted, as before.
    private boolean verified(Purchase p) {
        if (BuildConfig.PLAY_KEY.isEmpty()) return true;
        try {
            PublicKey key = KeyFactory.getInstance("RSA")
                .generatePublic(new X509EncodedKeySpec(Base64.decode(BuildConfig.PLAY_KEY, Base64.DEFAULT)));
            Signature s = Signature.getInstance("SHA1withRSA");
            s.initVerify(key);
            s.update(p.getOriginalJson().getBytes(StandardCharsets.UTF_8));
            return s.verify(Base64.decode(p.getSignature(), Base64.DEFAULT));
        } catch (Exception e) {
            return false;
        }
    }

    private void js(String code) {
        runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    private void back() {
        js("window.onNativeBack ? window.onNativeBack() : 0");
    }

    private class Bridge {
        @JavascriptInterface
        public void exit() { runOnUiThread(() -> moveTaskToBack(true)); }

        @JavascriptInterface
        public void buy(String id) {
            if (!trusted) return;
            main.post(() -> {
                ProductDetails d = details.get(id);
                if (d == null) { js("window.onNativePurchaseError && window.onNativePurchaseError(-100)"); return; }
                List<BillingFlowParams.ProductDetailsParams> list = new ArrayList<>();
                list.add(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d).build());
                billing.launchBillingFlow(MainActivity.this, BillingFlowParams.newBuilder().setProductDetailsParamsList(list).build());
            });
        }

        /** game.js saved the grant for this purchase token; now it may be consumed. */
        @JavascriptInterface
        public void ack(String token) {
            if (trusted) main.post(() -> consume(token));
        }

        /** game.js finished loading: send prices and every purchase that arrived before. */
        @JavascriptInterface
        public void pageReady() {
            if (!trusted) return;
            main.post(() -> {
                pageReady = true;
                sendPrices();
                for (Purchase p : new ArrayList<>(unconfirmed.values())) deliver(p);
            });
        }

        @JavascriptInterface
        public void requestPrices() {
            if (!trusted) return;
            main.post(() -> {
                if (billing.isReady()) queryDetails();
                else { retry = 0; connect(); }
            });
        }

        /** Copy of the save in the app files dir (backed up, see res/xml); runs on the bridge thread. */
        @JavascriptInterface
        public void saveMirror(String json) {
            if (!trusted || json == null) return;
            synchronized (mirrorLock) {
                FileOutputStream out = null;
                try {
                    out = mirror.startWrite();
                    out.write(json.getBytes(StandardCharsets.UTF_8));
                    mirror.finishWrite(out);
                } catch (Exception e) {
                    if (out != null) mirror.failWrite(out);
                }
            }
        }

        @JavascriptInterface
        public String loadMirror() {
            if (!trusted) return "";
            synchronized (mirrorLock) {
                try {
                    return new String(mirror.readFully(), StandardCharsets.UTF_8);
                } catch (Exception e) {
                    return "";
                }
            }
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        paused = true;
        // Save first, then stop timers (render, auto-merge) while in the background.
        WebView w = web;
        w.evaluateJavascript("window.onNativePause && window.onNativePause()", v -> {
            if (paused && w == web) { w.onPause(); w.pauseTimers(); }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        paused = false;
        web.onResume();
        web.resumeTimers();
        if (billing.isReady()) queryPurchases();
        else { retry = 0; connect(); }
    }

    @Override
    protected void onDestroy() {
        billing.endConnection();
        super.onDestroy();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        back();
    }
}
