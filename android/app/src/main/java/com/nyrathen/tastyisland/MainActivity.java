package com.nyrathen.tastyisland;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

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

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MainActivity extends Activity {
    private static final String[] PRODUCTS = {
        "gems_80", "gems_500", "gems_1200", "gems_2600", "gems_7000", "gems_15000", "starter", "pass"
    };

    private WebView web;
    private BillingClient billing;
    private final Map<String, ProductDetails> details = new HashMap<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, android.webkit.WebResourceRequest r) {
                String u = r.getUrl().toString();
                if (u.startsWith("file:")) return false;
                try { startActivity(new android.content.Intent(android.content.Intent.ACTION_VIEW, r.getUrl())); } catch (Exception ignored) { }
                return true;
            }
        });
        s.setSupportMultipleWindows(false);
        web.addJavascriptInterface(new Bridge(), "AndroidBilling");
        setContentView(web);
        web.loadUrl("file:///android_asset/www/index.html");
        setupBilling();
    }

    private void setupBilling() {
        billing = BillingClient.newBuilder(this)
            .setListener((result, purchases) -> {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                    for (Purchase p : purchases) handle(p);
                } else if (result.getResponseCode() != BillingClient.BillingResponseCode.USER_CANCELED) {
                    js("window.onNativePurchaseError && window.onNativePurchaseError(" + result.getResponseCode() + ")");
                }
            })
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build();
        billing.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult r) {
                if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) return;
                queryDetails();
                billing.queryPurchasesAsync(
                    QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
                    (res, list) -> { for (Purchase p : list) handle(p); });
            }
            @Override public void onBillingServiceDisconnected() { }
        });
    }

    private void queryDetails() {
        List<QueryProductDetailsParams.Product> list = new ArrayList<>();
        for (String id : PRODUCTS) {
            list.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id).setProductType(BillingClient.ProductType.INAPP).build());
        }
        billing.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(list).build(),
            (r, res) -> {
                JSONObject prices = new JSONObject();
                for (ProductDetails d : res) {
                    details.put(d.getProductId(), d);
                    try {
                        if (d.getOneTimePurchaseOfferDetails() != null)
                            prices.put(d.getProductId(), d.getOneTimePurchaseOfferDetails().getFormattedPrice());
                    } catch (Exception ignored) { }
                }
                js("window.onNativePrices && window.onNativePrices(" + prices + ")");
            });
    }

    // Every product is consumable on the store side; the game keeps one-time state (starter) itself.
    private void handle(Purchase p) {
        if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) return;
        billing.consumeAsync(ConsumeParams.newBuilder().setPurchaseToken(p.getPurchaseToken()).build(), (r, token) -> {
            if (r.getResponseCode() != BillingClient.BillingResponseCode.OK) return;
            for (String id : p.getProducts()) {
                js("window.onNativePurchase && window.onNativePurchase(" + JSONObject.quote(id) + ")");
            }
        });
    }

    private void js(String code) {
        runOnUiThread(() -> web.evaluateJavascript(code, null));
    }

    private class Bridge {
        @JavascriptInterface
        public boolean ready() { return !details.isEmpty(); }

        @JavascriptInterface
        public void exit() { runOnUiThread(() -> moveTaskToBack(true)); }

        @JavascriptInterface
        public void buy(String id) {
            ProductDetails d = details.get(id);
            if (d == null) { js("window.onNativePurchaseError && window.onNativePurchaseError(-100)"); return; }
            List<BillingFlowParams.ProductDetailsParams> list = new ArrayList<>();
            list.add(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d).build());
            runOnUiThread(() -> billing.launchBillingFlow(MainActivity.this,
                BillingFlowParams.newBuilder().setProductDetailsParamsList(list).build()));
        }
    }

    @Override
    public void onBackPressed() {
        js("window.onNativeBack ? window.onNativeBack() : 0");
    }
}
