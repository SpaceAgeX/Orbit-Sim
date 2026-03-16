import { METERS_PER_KM } from "./format.js";
import { kmToPixels } from "../geometry.js";

function pointerWorldPxFromEvent(e, canvas, view) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const worldX = ((e.clientX - rect.left) * dpr - view.panX) / view.zoom;
  const worldY = ((e.clientY - rect.top) * dpr - view.panY) / view.zoom;
  return { x: worldX, y: worldY };
}

function getPickRadiusKm(body) {
  if (!body) return 0;

  // All radii are stored in meters; convert to km for hit testing.
  const radiusKm = (body.realRadius || 0) / METERS_PER_KM;

  if (body?.name === "Earth" || body?.constructor?.name === "Earth") return radiusKm;
  if (body?.name === "Moon" || body?.constructor?.name === "Moon") return Math.max(radiusKm, 2000); // keep moon easy to click
  if (body?.name === "Ship" || body?.constructor?.name === "Ship") return Math.max(radiusKm, 150); // keep ship easy to click

  return radiusKm;
}

function findBodyAtEvent(e, { canvas, view, pickableBodies }) {
  const { x: pxX, y: pxY } = pointerWorldPxFromEvent(e, canvas, view);
  let best = null;
  let bestDistSq = Infinity;

  for (const body of pickableBodies || []) {
    const xPx = kmToPixels(body.realPosition.x / METERS_PER_KM);
    const yPx = kmToPixels(body.realPosition.y / METERS_PER_KM);
    const radiusPx = kmToPixels(getPickRadiusKm(body));
    if (!Number.isFinite(radiusPx) || radiusPx <= 0) continue;

    const dx = pxX - xPx;
    const dy = pxY - yPx;
    const distSq = dx * dx + dy * dy;
    if (distSq <= radiusPx * radiusPx && distSq < bestDistSq) {
      best = body;
      bestDistSq = distSq;
    }
  }

  return best;
}

export function initContextMenu({
  canvas,
  view,
  pickableBodies = [],
  onSelect,
  onFocus,
  onTarget,
}) {
  const ctxMenu = document.getElementById("contextMenu");
  const ctxSelect = document.getElementById("ctxSelect");
  const ctxFocus = document.getElementById("ctxFocus");
  const ctxTarget = document.getElementById("ctxTarget");

  let contextTarget = null;

  const hideContextMenu = () => ctxMenu?.classList.add("hidden");

  function showContextMenu(body, clientX, clientY) {
    if (!ctxMenu || !body) return;
    contextTarget = body;
    const uiScale =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--ui-scale")
      ) || 1;
    ctxMenu.style.left = `${clientX / uiScale}px`;
    ctxMenu.style.top = `${clientY / uiScale}px`;
    ctxMenu.classList.remove("hidden");
  }

  const onContextMenu = (e) => {
    e.preventDefault();
    const body = findBodyAtEvent(e, { canvas, view, pickableBodies });
    if (!body) {
      hideContextMenu();
      return;
    }
    showContextMenu(body, e.clientX, e.clientY);
  };

  const onDocClick = (e) => {
    if (!ctxMenu) return;
    if (!ctxMenu.contains(e.target)) {
      hideContextMenu();
    }
  };

  const onSelectClick = () => {
    if (contextTarget && typeof onSelect === "function") onSelect(contextTarget);
    hideContextMenu();
  };

  const onFocusClick = () => {
    if (contextTarget && typeof onFocus === "function") onFocus(contextTarget);
    hideContextMenu();
  };

  const onTargetClick = () => {
    if (typeof onTarget === "function") onTarget(contextTarget);
    hideContextMenu();
  };

  canvas.addEventListener("contextmenu", onContextMenu);
  document.addEventListener("click", onDocClick);
  ctxSelect?.addEventListener("click", onSelectClick);
  ctxFocus?.addEventListener("click", onFocusClick);
  ctxTarget?.addEventListener("click", onTargetClick);

  return {
    destroy() {
      canvas.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("click", onDocClick);
      ctxSelect?.removeEventListener("click", onSelectClick);
      ctxFocus?.removeEventListener("click", onFocusClick);
      ctxTarget?.removeEventListener("click", onTargetClick);
    },
  };
}
