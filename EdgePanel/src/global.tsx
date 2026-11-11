import "dayjs/locale/en";
import "dayjs/locale/zh-cn";
import "dayjs/locale/zh-tw";

import "./index.css";
import "./tailwind.css";
import { applyCachedDocumentBranding } from "./runtime/branding";
import { applyDayjsLocale, readWindowBootPanelLocale } from "./runtime/i18n";

type LocaleAwareWindow = Window & {
  __EDGE_PANEL_DAYJS_LOCALE_LISTENER__?: () => void;
};

applyDayjsLocale(readWindowBootPanelLocale());

if (typeof window !== "undefined") {
  const localeAwareWindow = window as LocaleAwareWindow;
  if (localeAwareWindow.__EDGE_PANEL_DAYJS_LOCALE_LISTENER__) {
    localeAwareWindow.removeEventListener("languagechange", localeAwareWindow.__EDGE_PANEL_DAYJS_LOCALE_LISTENER__);
  }

  const syncDayjsLocale = () => {
    applyDayjsLocale(readWindowBootPanelLocale());
  };

  localeAwareWindow.__EDGE_PANEL_DAYJS_LOCALE_LISTENER__ = syncDayjsLocale;
  localeAwareWindow.addEventListener("languagechange", syncDayjsLocale);
}

applyCachedDocumentBranding();
