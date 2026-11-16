package com.kenyafundfinder.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.google.androidbrowserhelper.trusted.LauncherActivity;

/**
 * Guards against the Samsung Galaxy Store QA "Airplane Mode / Offline Cold Launch" trap.
 *
 * How `com.google.androidbrowserhelper.trusted.LauncherActivity` works:
 * - `super.onCreate(savedInstanceState)` initializes `mMetadata`, `mSplashScreenStrategy`,
 *   and custom-tabs warm-up, then checks `if (shouldLaunchImmediately()) { launchTwa(); }`.
 * - By overriding `shouldLaunchImmediately()` to return `isOnline()`, `super.onCreate()`
 *   completes all internal `LauncherActivity` initialization without throwing a
 *   NullPointerException, and defers `launchTwa()` whenever the device is offline on cold launch
 *   (whether on very first install before `kff-notifications-sw.js` is registered, or if the
 *   user cleared browser data / launched in Airplane Mode).
 * - When `shouldLaunchImmediately()` returns `false`, `onCreate()` renders a native dark-mode
 *   (#09090b) offline screen with a "Retry Connection" button and registers a live
 *   `ConnectivityManager.NetworkCallback` that automatically invokes `launchTwa()` as soon as
 *   internet connectivity is restored.
 */
public class OfflineFirstTWALauncherActivity extends LauncherActivity {

    private static final String PREFS_NAME = "twa_prefs";
    private static final String KEY_TWA_LAUNCHED = "twa_launched_successfully";

    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private boolean twaLaunchedInThisSession = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        super.onCreate(savedInstanceState);

        if (!twaLaunchedInThisSession) {
            showNativeOfflineScreen();
            registerAutoRetryNetworkCallback();
        }
    }

    @Override
    protected boolean shouldLaunchImmediately() {
        return isOnline();
    }

    @Override
    protected void launchTwa() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(KEY_TWA_LAUNCHED, false)) {
            prefs.edit().putBoolean(KEY_TWA_LAUNCHED, true).apply();
        }
        twaLaunchedInThisSession = true;
        super.launchTwa();
    }

    private boolean isOnline() {
        if (connectivityManager == null) {
            connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        }
        if (connectivityManager == null) return false;
        Network activeNetwork = connectivityManager.getActiveNetwork();
        if (activeNetwork == null) return false;
        NetworkCapabilities caps = connectivityManager.getNetworkCapabilities(activeNetwork);
        return caps != null
                && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
    }

    private void proceedIfOnline() {
        if (twaLaunchedInThisSession || isFinishing() || isDestroyed()) return;
        if (isOnline()) {
            unregisterNetworkCallback();
            launchTwa();
        }
    }

    private void registerAutoRetryNetworkCallback() {
        if (connectivityManager == null || networkCallback != null) return;
        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onCapabilitiesChanged(Network network, NetworkCapabilities networkCapabilities) {
                if (networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                        && networkCapabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)) {
                    runOnUiThread(() -> proceedIfOnline());
                }
            }
        };
        try {
            connectivityManager.registerDefaultNetworkCallback(networkCallback);
        } catch (Exception ignored) {
            // Fallback relies on manual Retry button
        }
    }

    private void unregisterNetworkCallback() {
        if (connectivityManager != null && networkCallback != null) {
            try {
                connectivityManager.unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) {
            }
            networkCallback = null;
        }
    }

    @Override
    protected void onDestroy() {
        unregisterNetworkCallback();
        super.onDestroy();
    }

    private int dp(int value) {
        return (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                value,
                getResources().getDisplayMetrics()
        );
    }

    private void showNativeOfflineScreen() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#09090B"));
        int pad = dp(24);
        root.setPadding(pad, pad, pad, pad);

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        GradientDrawable cardBg = new GradientDrawable();
        cardBg.setColor(Color.parseColor("#131316"));
        cardBg.setCornerRadius(dp(24));
        cardBg.setStroke(dp(1), Color.parseColor("#27272A"));
        card.setBackground(cardBg);
        card.setPadding(dp(24), dp(32), dp(24), dp(32));

        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        card.setLayoutParams(cardParams);

        TextView pill = new TextView(this);
        pill.setText("NO INTERNET CONNECTION");
        pill.setTextColor(Color.parseColor("#FBBF24"));
        pill.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        pill.setTypeface(Typeface.DEFAULT_BOLD);
        pill.setPadding(dp(12), dp(5), dp(12), dp(5));
        GradientDrawable pillBg = new GradientDrawable();
        pillBg.setColor(Color.parseColor("#1F2412"));
        pillBg.setCornerRadius(dp(999));
        pillBg.setStroke(dp(1), Color.parseColor("#854D0E"));
        pill.setBackground(pillBg);

        TextView title = new TextView(this);
        title.setText("You're Currently Offline");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 21);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, dp(16), 0, dp(10));

        TextView subtitle = new TextView(this);
        subtitle.setText(
                "Kenya Fund Finder requires an active internet connection to load live CMA Money Market Fund yields, NSE share prices, CBK Treasury rates, and market news."
        );
        subtitle.setTextColor(Color.parseColor("#A1A1AA"));
        subtitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        subtitle.setGravity(Gravity.CENTER);
        subtitle.setPadding(0, 0, 0, dp(24));

        Button retryBtn = new Button(this);
        retryBtn.setText("Retry Connection");
        retryBtn.setAllCaps(false);
        retryBtn.setTextColor(Color.parseColor("#052E16"));
        retryBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        retryBtn.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable btnBg = new GradientDrawable();
        btnBg.setColor(Color.parseColor("#10B981"));
        btnBg.setCornerRadius(dp(14));
        retryBtn.setBackground(btnBg);
        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(46)
        );
        retryBtn.setLayoutParams(btnParams);
        retryBtn.setOnClickListener((View v) -> proceedIfOnline());

        TextView footer = new TextView(this);
        footer.setText("Kenya Fund Finder · Operated by Elyon Innovation LTD");
        footer.setTextColor(Color.parseColor("#71717A"));
        footer.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        footer.setGravity(Gravity.CENTER);
        footer.setPadding(0, dp(20), 0, 0);

        card.addView(pill);
        card.addView(title);
        card.addView(subtitle);
        card.addView(retryBtn);
        card.addView(footer);
        root.addView(card);

        setContentView(root);
    }
}
