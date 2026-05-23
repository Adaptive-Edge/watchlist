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
        WebView webView = this.getBridge().getWebView();
        if (isTV) {
            webView.post(() -> {
                webView.requestFocus();
                webView.evaluateJavascript(
                    "document.documentElement.classList.add('tv');", null
                );
            });
        }
    }
}
