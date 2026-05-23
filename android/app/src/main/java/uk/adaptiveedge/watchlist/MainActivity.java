package uk.adaptiveedge.watchlist;

import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(this.getBridge().getWebView(), true);
        cookieManager.flush();

        boolean isTV = getPackageManager().hasSystemFeature(PackageManager.FEATURE_LEANBACK);
        if (!isTV) return;

        WebView webView = this.getBridge().getWebView();
        webView.requestFocus();

        WebViewClient existing = this.getBridge().getWebViewClient();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                if (existing != null) existing.onPageFinished(view, url);
                // Wait for React to render, then mark TV mode and focus first button
                view.postDelayed(() -> view.evaluateJavascript(
                    "(function() {" +
                    "  document.documentElement.classList.add('tv');" +
                    "  var el = document.querySelector('button:not([disabled]), [tabindex]:not([tabindex=\"-1\"])');" +
                    "  if (el) el.focus();" +
                    "})()", null
                ), 500);
            }
        });
    }
}
