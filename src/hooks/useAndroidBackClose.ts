import { useEffect, useRef } from "react";

/**
 * Integrates modal/drawer open state with the Android hardware back gesture /
 * browser history stack without breaking React Router in-drawer `<Link>` navigation.
 *
 * State Guard Invariants:
 * 1. Opening the sheet records `openedUrlRef` (`pathname + search`) and pushes
 *    a synthetic history state `{ ...state, __kffSheet: sheetId }`.
 * 2. If the user presses the Android hardware back button (`popstate` fires),
 *    `closedByPopStateRef` is set to `true` and `onClose()` is called without
 *    any further `history.back()`.
 * 3. If the sheet closes via UI (`X` button, backdrop tap, or clicking an
 *    internal `<Link to="/privacy" onClick={close}>`), the cleanup inspects:
 *      - `navigatedAway`: whether `window.location.pathname + window.location.search`
 *        changed from `openedUrlRef.current`
 *      - `stillOnSheetEntry`: whether `window.history.state?.__kffSheet === sheetId`
 *    `window.history.back()` is ONLY called when `!navigatedAway && stillOnSheetEntry`,
 *    preventing any undo of React Router route transitions.
 */
export function useAndroidBackClose(
  open: boolean,
  onClose: () => void,
  sheetId: string
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const pushedRef = useRef(false);
  const closedByPopStateRef = useRef(false);
  const openedUrlRef = useRef("");

  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    closedByPopStateRef.current = false;
    pushedRef.current = true;
    openedUrlRef.current = window.location.pathname + window.location.search;

    const currentState =
      window.history.state && typeof window.history.state === "object"
        ? (window.history.state as Record<string, unknown>)
        : {};

    window.history.pushState({ ...currentState, __kffSheet: sheetId }, "");

    const handlePopState = () => {
      if (!pushedRef.current) return;
      closedByPopStateRef.current = true;
      pushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);

      if (pushedRef.current && !closedByPopStateRef.current) {
        const currentUrl = window.location.pathname + window.location.search;
        const navigatedAway = currentUrl !== openedUrlRef.current;
        const activeState = window.history.state as Record<string, unknown> | null;
        const stillOnSheetEntry = Boolean(
          activeState && activeState.__kffSheet === sheetId
        );

        pushedRef.current = false;

        if (!navigatedAway && stillOnSheetEntry) {
          window.history.back();
        }
      }
    };
  }, [open, sheetId]);
}
