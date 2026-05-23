package uk.adaptiveedge.watchlist;

import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebView;
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

        // Wait for Capacitor + React to finish loading before injecting TV behaviour.
        // 2.5s covers slow first loads; the JS itself is idempotent so a retry is safe.
        webView.postDelayed(() -> webView.evaluateJavascript(
            "(function() {" +
            "  document.documentElement.classList.add('tv');" +
            "  var el = document.querySelector('[data-tv-content] button:not([disabled]), [data-tv-content] [tabindex]:not([tabindex=\"-1\"])');" +
            "  if (el) el.focus();" +
            "})()", null
        ), 2500);
    }
}
