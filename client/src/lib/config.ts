import { Capacitor } from "@capacitor/core";

export const isNative = Capacitor.isNativePlatform();

export const API_BASE = isNative
  ? "https://adaptiveedge.uk/watchlist"
  : "/watchlist";

export const ROUTER_BASE = isNative ? "" : "/watchlist";

export const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent) || isNative;
