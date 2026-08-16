// Native (Capacitor) bootstrap. Every call is dynamically imported and guarded
// so the browser/PWA build behaves exactly as before when no native shell exists.

let cachedIsNative: boolean | null = null;

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  if (cachedIsNative !== null) return cachedIsNative;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  cachedIsNative = Boolean(cap?.isNativePlatform?.());
  return cachedIsNative;
}

export function nativePlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const platform = cap?.getPlatform?.();
  return platform === "ios" || platform === "android" ? platform : "web";
}

/** Light haptic tap — no-op on web. */
export async function tapFeedback(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* noop */
  }
}

/** Open an external URL in the in-app browser on native, a new tab on web. */
export async function openExternal(url: string): Promise<void> {
  if (!isNativeApp()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

/**
 * Configure status bar, splash screen and Android hardware back button.
 * Safe to call unconditionally on every platform.
 */
export function initNativeShell(navigateBack: () => void): () => void {
  if (!isNativeApp()) return () => {};

  let cleanup: () => void = () => {};

  void (async () => {
    try {
      const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
        import("@capacitor/app"),
      ]);

      await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      if (nativePlatform() === "android") {
        await StatusBar.setBackgroundColor({ color: "#0f172a" }).catch(() => {});
      }
      await SplashScreen.hide().catch(() => {});

      const handle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          navigateBack();
        } else {
          void App.exitApp();
        }
      });
      cleanup = () => {
        void handle.remove();
      };
    } catch {
      /* noop — native plugins unavailable */
    }
  })();

  return () => cleanup();
}
