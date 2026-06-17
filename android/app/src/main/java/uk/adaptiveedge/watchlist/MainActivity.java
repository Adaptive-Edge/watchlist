package uk.adaptiveedge.watchlist;

import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.view.inputmethod.InputMethodManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private class TVKeyboardBridge {
        @JavascriptInterface
        public void showKeyboard() {
            runOnUiThread(() -> {
                WebView wv = getBridge().getWebView();
                wv.requestFocus();
                InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null) imm.showSoftInput(wv, InputMethodManager.SHOW_FORCED);
            });
        }

        @JavascriptInterface
        public void hideKeyboard() {
            runOnUiThread(() -> {
                WebView wv = getBridge().getWebView();
                InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null) imm.hideSoftInputFromWindow(wv.getWindowToken(), 0);
            });
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(this.getBridge().getWebView(), true);
        cookieManager.flush();

        boolean isTV = getPackageManager().hasSystemFeature(PackageManager.FEATURE_LEANBACK);

        WebView webView = this.getBridge().getWebView();
        // Dark background prevents a white flash in the status/nav bar areas on
        // edge-to-edge (Android 15+/SDK 36) before the web content paints.
        webView.setBackgroundColor(0xFF0A0A0F);

        if (isTV) {
            webView.addJavascriptInterface(new TVKeyboardBridge(), "TVKeyboard");
            webView.requestFocus();

            // Wait for Capacitor + React to finish loading before injecting TV behaviour.
            // 2.5s covers slow first loads; the JS itself is idempotent so a retry is safe.
            webView.postDelayed(() -> webView.evaluateJavascript(
                "(function() {" +
                "  document.documentElement.classList.add('tv');" +
                "  var el = document.querySelector('[data-tv-content] button:not([disabled]), [data-tv-content] [tabindex]:not([tabindex=\"-1\"]):not(input):not(textarea)');" +
                "  if (el) el.focus();" +
                "})()", null
            ), 2500);
        }
    }
}
