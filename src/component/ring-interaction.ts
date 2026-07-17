import type { StreakrLeveledDay } from "../types";
import { dayToHandRotation } from "./calendar";
import type { ComponentCtx } from "./config";
import { findDayByDate, RING_CX, RING_CY, updateRingCenter } from "./render/ring";

const RING_CLICK_DRAG_TOLERANCE = 6;
const RING_SUPPRESS_CLICK_MS = 350;

export const bindRingEvents = (
  ctx: ComponentCtx,
  svgEl: SVGElement,
  handGroup: SVGGElement,
  centerEl: HTMLElement,
  days: StreakrLeveledDay[],
): void => {
  let pointerDownPoint: { x: number; y: number } | null = null;
  let suppressNextClick = false;
  let suppressResetTimer: ReturnType<typeof setTimeout> | null = null;

  const setHandRotation = (rotation: number): void => {
    handGroup.setAttribute(
      "transform",
      `rotate(${(rotation * 180) / Math.PI}, ${RING_CX}, ${RING_CY})`,
    );
  };

  const selectDay = (day: StreakrLeveledDay, syncHand = true): void => {
    ctx.state.selectedDay = day.date;
    updateRingCenter(centerEl, day);
    if (syncHand) {
      setHandRotation(dayToHandRotation(day.date, days.length));
    }
  };

  const lineToDay = (target: EventTarget | null): StreakrLeveledDay | null => {
    if (!(target instanceof SVGElement) || !target.classList.contains("sk-ring-line")) {
      return null;
    }
    if (target.classList.contains("sk-ring-line--future")) {
      return null;
    }
    const dateAttr = target.dataset.date;
    if (!dateAttr) return null;
    return findDayByDate(days, new Date(dateAttr));
  };

  setHandRotation(dayToHandRotation(ctx.state.selectedDay, days.length));

  const clearSuppressResetTimer = (): void => {
    if (suppressResetTimer) {
      clearTimeout(suppressResetTimer);
      suppressResetTimer = null;
    }
  };

  const resetSuppressedClickAfterDrag = (): void => {
    clearSuppressResetTimer();
    suppressResetTimer = setTimeout(() => {
      suppressNextClick = false;
      suppressResetTimer = null;
    }, RING_SUPPRESS_CLICK_MS);
  };

  const hasMovedBeyondClickTolerance = (e: PointerEvent): boolean => {
    if (!pointerDownPoint) return false;
    return (
      Math.hypot(e.clientX - pointerDownPoint.x, e.clientY - pointerDownPoint.y) >
      RING_CLICK_DRAG_TOLERANCE
    );
  };

  const handlePointerDown = (e: PointerEvent): void => {
    clearSuppressResetTimer();
    suppressNextClick = false;
    pointerDownPoint = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: PointerEvent): void => {
    if (hasMovedBeyondClickTolerance(e)) {
      suppressNextClick = true;
    }
  };

  const handlePointerUp = (e: PointerEvent): void => {
    if (hasMovedBeyondClickTolerance(e)) {
      suppressNextClick = true;
    }
    pointerDownPoint = null;
    if (suppressNextClick) {
      resetSuppressedClickAfterDrag();
    }
  };

  const selectLineTarget = (target: EventTarget | null): void => {
    const selected = lineToDay(target);
    if (selected) {
      selectDay(selected);
    }
  };

  const handleLineInteraction = (e: PointerEvent): void => {
    if (suppressNextClick) {
      suppressNextClick = false;
      clearSuppressResetTimer();
      return;
    }
    selectLineTarget(e.target);
  };

  const handleLineKeydown = (e: KeyboardEvent): void => {
    const day = lineToDay(e.target);
    if (e.key === "Enter" || e.key === " ") {
      if (!day) return;
      e.preventDefault();
      selectDay(day);
      return;
    }
    if (!day) return;
    const focusableLines = Array.from(
      svgEl.querySelectorAll<SVGLineElement>(".sk-ring-line:not(.sk-ring-line--future)"),
    );
    const currentIndex = focusableLines.indexOf(e.target as SVGLineElement);
    if (currentIndex === -1) return;
    let targetIndex: number;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      targetIndex = Math.min(currentIndex + 1, focusableLines.length - 1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      targetIndex = Math.max(currentIndex - 1, 0);
    } else if (e.key === "Home") {
      targetIndex = 0;
    } else if (e.key === "End") {
      targetIndex = focusableLines.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    if (targetIndex === currentIndex) return;
    const currentLine = focusableLines[currentIndex];
    const targetLine = focusableLines[targetIndex];
    if (!currentLine || !targetLine) return;
    currentLine.setAttribute("tabindex", "-1");
    targetLine.setAttribute("tabindex", "0");
    targetLine.focus();
    const dateAttr = targetLine.dataset.date;
    if (dateAttr) {
      selectDay(findDayByDate(days, new Date(dateAttr)));
    }
  };

  svgEl.addEventListener("pointerdown", handlePointerDown);
  svgEl.addEventListener("pointermove", handlePointerMove);
  svgEl.addEventListener("pointerup", handlePointerUp);
  svgEl.addEventListener("pointercancel", handlePointerUp);
  svgEl.addEventListener("pointerleave", handlePointerUp);
  svgEl.addEventListener("click", handleLineInteraction);
  svgEl.addEventListener("keydown", handleLineKeydown);
};
