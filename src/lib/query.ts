"use client";

import { useSyncExternalStore } from "react";

// Reactive URL query-param hook.
//
// Unlike a mount-only `useState(() => location.search)` snapshot, this
// re-reads the query string on every navigation: router.push/replace (via a
// history.pushState/replaceState hook) and browser back/forward (popstate).
// A single module-level store keeps the history patch installed once.

type Listener = () => void;

const listeners = new Set<Listener>();
let installed = false;

function getSearch(): string {
  if (typeof window === "undefined") return "";
  return window.location.search;
}

function emit() {
  for (const listener of listeners) listener();
}

function installHistoryHooks() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const origPush = history.pushState;
  const origReplace = history.replaceState;

  window.addEventListener("popstate", emit);
  window.addEventListener("hashchange", emit);

  history.pushState = function patchedPush(...args) {
    const result = origPush.apply(this, args as Parameters<typeof origPush>);
    emit();
    return result;
  };
  history.replaceState = function patchedReplace(...args) {
    const result = origReplace.apply(this, args as Parameters<typeof origReplace>);
    emit();
    return result;
  };
}

function subscribe(listener: Listener) {
  installHistoryHooks();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const serverSnapshot = () => "";

export function useQueryParam(key: string, fallback: string) {
  const search = useSyncExternalStore(subscribe, getSearch, serverSnapshot);
  return new URLSearchParams(search).get(key) ?? fallback;
}