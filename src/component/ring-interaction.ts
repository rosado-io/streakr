import { dayToHandRotation, localDateKey } from "./calendar";
import type { ComponentCtx } from "./config";
import {
  findDayByDate,
  RING_CX,
  RING_CY,
  RING_INNER_R,
  RING_OUTER_R,
  updateRingCenter,
} from "./render/ring";
import type { LeveledDay } from "./types";

const RING_CLICK_DRAG_TOLERANCE = 6;
const RING_SUPPRESS_CLICK_MS = 350;
const FULL_TURN = Math.PI * 2;

type RingPoint = {
  x: number;
  y: number;
};

export const bindRingEvents = (
  ctx: ComponentCtx,
  svgEl: SVGElement,
  handGroup: SVGGElement,
  centerEl: HTMLElement,
  days: LeveledDay[],
): void => {
  let activePointerId: number | null = null;
  let pointerDownPoint: RingPoint | null = null;
  let activePointerMoved = false;
  let suppressNextClick = false;
  let suppressResetTimer: ReturnType<typeof setTimeout> | null = null;

  const setHandRotation = (rotation: number): void => {
    handGroup.setAttribute(
      "transform",
      `rotate(${(rotation * 180) / Math.PI}, ${RING_CX}, ${RING_CY})`,
    );
  };

  const selectDay = (day: LeveledDay, syncHand = true): void => {
    ctx.state.selectedDay = day.date;
    updateRingCenter(centerEl, day);
    if (syncHand) {
      setHandRotation(dayToHandRotation(day.date, days.length));
    }
  };

  const lineToDay = (target: EventTarget | null): LeveledDay | null => {
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

  const clientToRingPoint = (e: PointerEvent): RingPoint | null => {
    const rect = svgEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * RING_CX * 2,
      y: ((e.clientY - rect.top) / rect.height) * RING_CY * 2,
    };
  };

  const isPointInRing = (point: RingPoint): boolean => {
    const radius = Math.hypot(point.x - RING_CX, point.y - RING_CY);
    return radius >= RING_INNER_R && radius <= RING_OUTER_R;
  };

  const dayAtPoint = (point: RingPoint): LeveledDay | null => {
    if (!isPointInRing(point) || days.length === 0) return null;
    const angle = Math.atan2(point.y - RING_CY, point.x - RING_CX);
    const turnFromTop = (((angle + Math.PI / 2) % FULL_TURN) + FULL_TURN) % FULL_TURN;
    const dayIndex = Math.round(turnFromTop / (FULL_TURN / days.length)) % days.length;
    const line = svgEl.querySelectorAll<SVGLineElement>(".sk-ring-line")[dayIndex];
    if (!line || line.classList.contains("sk-ring-line--future")) return null;
    return days[dayIndex] ?? null;
  };

  const releaseActivePointer = (pointerId: number): void => {
    if (!svgEl.hasPointerCapture(pointerId)) return;
    svgEl.releasePointerCapture(pointerId);
  };

  const finishGesture = (e: PointerEvent): void => {
    if (e.pointerId !== activePointerId) return;
    activePointerMoved ||= hasMovedBeyondClickTolerance(e);
    if (activePointerMoved) {
      suppressNextClick = true;
      resetSuppressedClickAfterDrag();
    }
    releaseActivePointer(e.pointerId);
    activePointerId = null;
    pointerDownPoint = null;
    activePointerMoved = false;
  };

  const handlePointerDown = (e: PointerEvent): void => {
    if (activePointerId !== null || e.button !== 0) return;
    const point = clientToRingPoint(e);
    const selected = point ? dayAtPoint(point) : null;
    if (!point || !selected) return;
    clearSuppressResetTimer();
    suppressNextClick = false;
    activePointerId = e.pointerId;
    pointerDownPoint = { x: e.clientX, y: e.clientY };
    activePointerMoved = false;
    svgEl.setPointerCapture(e.pointerId);
    selectDay(selected);
  };

  const handlePointerMove = (e: PointerEvent): void => {
    if (e.pointerId !== activePointerId) return;
    activePointerMoved ||= hasMovedBeyondClickTolerance(e);
    const point = clientToRingPoint(e);
    if (!point || !isPointInRing(point)) {
      finishGesture(e);
      return;
    }
    const selected = dayAtPoint(point);
    if (selected) {
      activePointerMoved ||= localDateKey(selected.date) !== localDateKey(ctx.state.selectedDay);
      selectDay(selected);
    }
  };

  const handlePointerUp = (e: PointerEvent): void => {
    if (e.pointerId !== activePointerId) return;
    const point = clientToRingPoint(e);
    if (point && isPointInRing(point)) {
      const selected = dayAtPoint(point);
      if (selected) {
        activePointerMoved ||= localDateKey(selected.date) !== localDateKey(ctx.state.selectedDay);
        selectDay(selected);
      }
    }
    finishGesture(e);
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
  svgEl.addEventListener("pointercancel", finishGesture);
  svgEl.addEventListener("pointerleave", finishGesture);
  svgEl.addEventListener("click", handleLineInteraction);
  svgEl.addEventListener("keydown", handleLineKeydown);
};
