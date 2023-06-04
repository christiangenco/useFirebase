import { useFirebase } from "../useFirebase";
import { getAnalytics, logEvent, setUserProperties } from "firebase/analytics";

export function useAnalytics() {
  const firebaseApp = useFirebase();
  const isServer = typeof window === "undefined";
  const analytics = isServer ? null : getAnalytics(firebaseApp);

  const isDevelopment =
    window.location.hostname === "localhost" ||
    process.env.NODE_ENV === "development";

  return {
    // ex: { source: "google" }
    setUserProperties: (props = {}) => setUserProperties(analytics, props),
    // built in events: https://developers.google.com/analytics/devguides/collection/ga4/reference/events
    // relevant to me: login, purchase, refund, sign_up, tutorial_begin, tutorial_complete
    // first_open, first_visit, logout, page_view, screen_view, session_start
    // meta built in params: page_location, page_referrer, page_title, source, term,
    logEvent: (title, meta = {}) => {
      if (isDevelopment) {
        console.info("logEvent not running in development", { title, meta });
        return;
      }

      logEvent(analytics, title, meta);
    },
    pageview: () => {
      if (isDevelopment) {
        console.info("pageview not running in development");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const source = params.get("utm_source");

      logEvent(analytics, "page_view", {
        page_location: document.location.href,
        page_referrer: document.referrer,
        page_title: document.title,
        source,
      });
    },
  };
}
