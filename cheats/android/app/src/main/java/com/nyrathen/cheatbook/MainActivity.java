package com.nyrathen.cheatbook;

import android.app.Activity;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.HapticFeedbackConstants;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Hosts the bundled web app (assets/www). Page calls window.AndroidCB.post(action, value): copy, haptic, open. */
public class MainActivity extends Activity {
    private static final String HOME = "file:///android_asset/www/index.html";
    private WebView web;

    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        create();
    }

    private void create() {
        web = new WebView(this);
        web.setBackgroundColor(0xFF0E0A1A);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        web.addJavascriptInterface(new Bridge(), "AndroidCB");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("file".equals(u.getScheme())) return false;
                openExternal(u.toString());
                return true;
            }

            @Override
            public boolean onRenderProcessGone(WebView v, RenderProcessGoneDetail d) {
                setContentView(new android.view.View(MainActivity.this));
                v.destroy();
                create();
                return true;
            }
        });
        setContentView(web);
        web.loadUrl(HOME);
    }

    private void openExternal(String url) {
        if (!url.startsWith("https:") && !url.startsWith("mailto:")) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) {}
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack(); else super.onBackPressed();
    }

    public class Bridge {
        @JavascriptInterface
        public void post(String a, String v) {
            runOnUiThread(() -> {
                switch (a) {
                    case "copy":
                        ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                        if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("cheat", v));
                        break;
                    case "haptic": web.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP); break;
                    case "open": openExternal(v); break;
                    default: break;
                }
            });
        }
    }
}
