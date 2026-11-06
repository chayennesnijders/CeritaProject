import { useSyncExternalStore } from "react";
import { useMe } from "@/lib/auth";

/**
 * "Bekijk als ouder": admins can switch the whole app to what a parent sees and try it out, like
 * the Beheer and Coach entries. It only changes what this admin's own app shows (remembered on this
 * device); their account stays a youth/admin account and RLS stays the real gate.
 */
const KEY = "cerita-ouderweergave";
const EVENT = "cerita-ouderweergave";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function setParentView(on: boolean) {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // Not remembered: it simply stays as it was.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Whether the admin switched on the parent view (always false for everyone else). */
export function useParentView(): boolean {
  const { data: me } = useMe();
  const on = useSyncExternalStore(subscribe, read, () => false);
  return !!me?.isAdmin && on;
}

/** True for real parents, and for an admin who is looking at the app as a parent. */
export function useActsAsParent(): boolean {
  const { data: me } = useMe();
  const view = useParentView();
  return !!me?.profile?.is_parent || view;
}
