import { useSyncExternalStore } from "react";
import { useMe } from "@/lib/auth";

/**
 * "Bekijk als leraar": admins can switch the whole app to what a teacher sees and try it out, like the
 * parent view. It only changes what this admin's own app shows (remembered on this device); their
 * account stays what it is. The server shows admins every lesson as a preview (no school, no logging).
 */
const KEY = "cerita-leraarweergave";
const EVENT = "cerita-weergave";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("cerita-ouderweergave", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("cerita-ouderweergave", cb);
    window.removeEventListener("storage", cb);
  };
}

export function setTeacherView(on: boolean) {
  try {
    if (on) {
      localStorage.setItem(KEY, "1");
      // One view at a time.
      localStorage.removeItem("cerita-ouderweergave");
    } else localStorage.removeItem(KEY);
  } catch {
    // Not remembered: it simply stays as it was.
  }
  window.dispatchEvent(new Event(EVENT));
  window.dispatchEvent(new Event("cerita-ouderweergave"));
}

/** Whether the admin switched on the teacher view (always false for everyone else). */
export function useTeacherView(): boolean {
  const { data: me } = useMe();
  const on = useSyncExternalStore(subscribe, read, () => false);
  return !!me?.isAdmin && on;
}

/** True for real teachers, and for an admin who is looking at the app as a teacher. */
export function useActsAsTeacher(): boolean {
  const { data: me } = useMe();
  const view = useTeacherView();
  return !!me?.profile?.is_teacher || view;
}
