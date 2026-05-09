import type {
  StreakrDay,
  StreakrInstance,
  StreakrLeveledDay,
  StreakrOptions,
  StreakrProvider,
  StreakrProviders,
} from "../types";

const MAX_VISIBLE_YEARS = 5;
const MONTH_LABELS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_LABELS = ["Mon", "Wed", "Fri"];

const BUILTIN_ICONS: Record<string, string> = {
  github:
    '<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 005.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>',
  gitlab:
    '<svg viewBox="0 0 16 16" width="13" height="13"><path d="M8 14.7L10.95 5.6H5.05L8 14.7z" fill="#e24329"/><path d="M8 14.7L5.05 5.6H.92L8 14.7z" fill="#fc6d26"/><path d="M.92 5.6L.02 8.36c-.08.25 0 .53.22.69L8 14.7.92 5.6z" fill="#fca326"/><path d="M.92 5.6h4.13L3.27.1c-.09-.27-.48-.27-.57 0L.92 5.6z" fill="#e24329"/><path d="M8 14.7l2.95-9.1h4.13L8 14.7z" fill="#fc6d26"/><path d="M15.08 5.6l.9 2.76c.08.25 0 .53-.22.69L8 14.7l7.08-9.1z" fill="#fca326"/><path d="M15.08 5.6h-4.13L12.73.1c.09-.27.48-.27.57 0l1.78 5.5z" fill="#e24329"/></svg>',
  bitbucket:
    '<svg viewBox="0 0 16 16" width="13" height="13"><path d="M.51 1.18c-.27 0-.51.24-.51.51 0 .03 0 .07.01.1l2.18 13.17c.06.36.37.62.74.63h10.46c.27 0 .51-.2.55-.47l2.18-13.32a.512.512 0 00-.41-.59L.6 1.18zm9.13 9.42H6.4l-.88-4.55h4.92l-.8 4.55z" fill="#2684ff"/></svg>',
};

const DEFAULT_PROVIDERS: StreakrProvider[] = [
  { key: "github", name: "GitHub", color: "#39d353" },
  { key: "gitlab", name: "GitLab", color: "#fc6d26" },
  { key: "bitbucket", name: "Bitbucket", color: "#2684ff" },
];

type SimpleAttr = string | number | boolean;
type StyleAttr = Partial<CSSStyleDeclaration> | Record<string, string>;
type EventAttr = (e: Event) => void;
type ElAttrValue = SimpleAttr | EventAttr | StyleAttr | null | undefined;
type ElAttrs = Record<string, ElAttrValue>;
type ElChild = Node | string | null | false | undefined;

const SVG_NS = "http://www.w3.org/2000/svg";

function isSimple(value: ElAttrValue): value is SimpleAttr {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function setSimpleAttr(el: Element, key: string, value: SimpleAttr): void {
  const str = String(value);
  if (key === "class") {
    el.setAttribute("class", str);
  } else if (key === "html") {
    (el as HTMLElement).innerHTML = str;
  } else if (key === "text") {
    el.textContent = str;
  } else {
    el.setAttribute(key, str);
  }
}

function setAttr(el: Element, key: string, value: ElAttrValue): void {
  if (value === false || value == null) return;
  if (key === "style") {
    if (typeof value === "object") Object.assign((el as HTMLElement).style, value);
    return;
  }
  if (key.startsWith("on")) {
    if (typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    }
    return;
  }
  if (isSimple(value)) setSimpleAttr(el, key, value);
}

function appendChildren(el: Element, list: ElChild[]): void {
  for (const child of list) {
    if (child == null || child === false) continue;
    el.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: ElAttrs,
  children?: ElChild | ElChild[],
): HTMLElementTagNameMap[K];
function h(tag: string, attrs?: ElAttrs, children?: ElChild | ElChild[]): Element;
function h(tag: string, attrs?: ElAttrs, children?: ElChild | ElChild[]): Element {
  const isSvg = tag.includes(":");
  const el = isSvg
    ? document.createElementNS(SVG_NS, tag.slice(tag.indexOf(":") + 1))
    : document.createElement(tag);

  if (attrs) {
    for (const key of Object.keys(attrs)) setAttr(el, key, attrs[key]);
  }

  if (children !== undefined && children !== null) {
    appendChildren(el, Array.isArray(children) ? children : [children]);
  }

  return el;
}

function svg(tag: string, attrs?: ElAttrs, children?: ElChild | ElChild[]): SVGElement {
  return h("svg:" + tag, attrs, children) as SVGElement;
}

function gridFromDays<T extends StreakrDay>(days: T[]): (T | null)[][] {
  if (!days.length) return [];
  const cols: (T | null)[][] = [];
  let col: (T | null)[] = new Array(days[0].date.getDay()).fill(null);
  for (const day of days) {
    if (col.length === 7) {
      cols.push(col);
      col = [];
    }
    col.push(day);
  }
  while (col.length < 7) col.push(null);
  cols.push(col);
  return cols;
}

function monthHeaders<T extends StreakrDay>(
  cols: (T | null)[][],
): { col: number; label: string }[] {
  const out: { col: number; label: string }[] = [];
  let lastMonth = -1;
  cols.forEach((col, i) => {
    const firstDay = col.find((d): d is T => Boolean(d));
    if (!firstDay) return;
    const m = firstDay.date.getMonth();
    if (m !== lastMonth) {
      if (out.length === 0 || i - out[out.length - 1].col >= 3) {
        out.push({ col: i, label: MONTH_LABELS_SHORT[m] });
      }
      lastMonth = m;
    }
  });
  return out;
}

function levelize(days: StreakrDay[]): StreakrLeveledDay[] {
  const counts = days
    .map((d) => d.total)
    .filter((x) => x > 0)
    .sort((a, b) => a - b);
  if (!counts.length) return days.map((d) => ({ ...d, level: 0 }));
  const p = (q: number) => counts[Math.min(counts.length - 1, Math.floor(counts.length * q))];
  const t1 = p(0.25);
  const t2 = p(0.55);
  const t3 = p(0.8);
  return days.map((d) => {
    let level: 0 | 1 | 2 | 3 | 4 = 0;
    if (d.total > 0) level = 1;
    if (d.total > t1) level = 2;
    if (d.total > t2) level = 3;
    if (d.total > t3) level = 4;
    return { ...d, level };
  });
}

interface StreakrStats {
  total: number;
  active: number;
  best: number;
  current: number;
}

function computeStats(days: StreakrDay[]): StreakrStats {
  const total = days.reduce((s, d) => s + d.total, 0);
  const active = days.filter((d) => d.total > 0).length;
  let best = 0;
  let cur = 0;
  let current = 0;
  for (const d of days) {
    if (d.total > 0) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 0;
    }
  }
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].total > 0) current++;
    else break;
  }
  return { total, active, best, current };
}

function fmtDateLong(d: Date): string {
  return `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function formatTotalLabel(total: number): string {
  if (total === 0) return "No contributions";
  const noun = total === 1 ? "contribution" : "contributions";
  return `${total} ${noun}`;
}

function providerIconHtml(p: StreakrProvider): string | null {
  if (p.icon) return p.icon;
  return BUILTIN_ICONS[p.key] ?? null;
}

function logoR(): SVGElement {
  const FILL = "var(--sk-heat-4, #39d353)";
  const HOLE = "var(--sk-heat-1, #0e4429)";
  const cells: [number, number, string][] = [
    [1, 1, FILL],
    [7, 1, FILL],
    [13, 1, FILL],
    [1, 7, FILL],
    [7, 7, FILL],
    [13, 7, HOLE],
    [1, 13, FILL],
    [7, 13, HOLE],
    [13, 13, FILL],
  ];
  return svg(
    "svg",
    { width: 18, height: 18, viewBox: "0 0 18 18", fill: "none" },
    cells.map(([x, y, fill]) => svg("rect", { x, y, width: 4, height: 4, rx: 1, fill })),
  );
}

interface InternalState {
  year: number | null;
  providers: StreakrProviders;
  yearModalOpen: boolean;
}

interface ResolvedConfig {
  target: HTMLElement;
  theme: "dark" | "light";
  accent: string;
  tintHeatmap: boolean;
  showProviders: boolean;
  showStats: boolean;
  state: "loading" | "empty" | "ready";
  years: number[];
  year: number | null;
  getDays: (year: number) => StreakrDay[];
  providers: StreakrProvider[];
  onYearChange: ((year: number) => void) | null;
  onProviderToggle: ((key: string, enabled: boolean, providers: StreakrProviders) => void) | null;
}

function dayCount(day: StreakrDay, key: string): number {
  return day.sources?.[key] ?? 0;
}

/**
 * Creates a stateful Streakr component instance.
 *
 * Mounts a contribution heatmap inside `target`, with year tabs, configurable
 * provider toggles, loading/empty/ready states, an interactive tooltip, and
 * a year picker modal. Returns an object with `update`, `setYear`,
 * `setProviders`, and `destroy` methods.
 *
 * The component is framework-agnostic and uses no global state — it only
 * reads/writes inside the provided `target` element (and a single
 * document-level tooltip node).
 */
export function createStreakr(options: StreakrOptions): StreakrInstance {
  const cfg: ResolvedConfig = {
    target: options.target,
    theme: options.theme ?? "dark",
    accent: options.accent ?? "#39d353",
    tintHeatmap: options.tintHeatmap ?? true,
    showProviders: options.showProviders ?? true,
    showStats: options.showStats ?? true,
    state: options.state ?? "ready",
    years: options.years ?? [],
    year: options.year ?? null,
    getDays: options.getDays ?? (() => []),
    providers: options.providers ?? DEFAULT_PROVIDERS,
    onYearChange: options.onYearChange ?? null,
    onProviderToggle: options.onProviderToggle ?? null,
  };

  if (!cfg.target) throw new Error("streakr: `target` is required");
  if (cfg.year == null && cfg.years.length) {
    cfg.year = cfg.years[cfg.years.length - 1];
  }

  const initialProviders: StreakrProviders = {};
  for (const p of cfg.providers) initialProviders[p.key] = true;

  const state: InternalState = {
    year: cfg.year,
    providers: initialProviders,
    yearModalOpen: false,
  };

  function syncProviderState(): void {
    const next: StreakrProviders = {};
    for (const p of cfg.providers) {
      next[p.key] = state.providers[p.key] ?? true;
    }
    state.providers = next;
  }

  const root = h("div", { class: "sk-root" }) as HTMLElement;
  cfg.target.appendChild(root);
  const tooltipEl = h("div", { class: "sk-tooltip" }) as HTMLElement;
  document.body.appendChild(tooltipEl);
  let currentDraw: (() => void) | null = null;
  const resizeObs = new ResizeObserver(() => currentDraw?.());

  function applyAccentVars(el: HTMLElement): void {
    const a = cfg.accent;
    el.style.setProperty("--sk-accent", a);
    el.style.setProperty("--sk-accent-glow", a + "47");
    el.style.setProperty("--sk-accent-soft", a + "0d");
    el.style.setProperty("--sk-accent-mid", a + "8c");
    el.style.setProperty("--sk-accent-bg", a + "1a");
    if (cfg.tintHeatmap) {
      el.style.setProperty("--sk-heat-1", `color-mix(in oklab, ${a} 18%, var(--sk-heat-0))`);
      el.style.setProperty("--sk-heat-2", `color-mix(in oklab, ${a} 45%, var(--sk-heat-0))`);
      el.style.setProperty("--sk-heat-3", `color-mix(in oklab, ${a} 75%, var(--sk-heat-0))`);
      el.style.setProperty("--sk-heat-4", a);
    } else {
      ["--sk-heat-1", "--sk-heat-2", "--sk-heat-3", "--sk-heat-4"].forEach((v) =>
        el.style.removeProperty(v),
      );
    }
  }

  function visibleYears(): { visible: number[]; all: number[]; hasMore: boolean } {
    const all = cfg.years.slice().reverse();
    return {
      visible: all.slice(0, MAX_VISIBLE_YEARS),
      all,
      hasMore: all.length > MAX_VISIBLE_YEARS,
    };
  }

  function getCurrentDays(): StreakrDay[] {
    if (cfg.state !== "ready" || state.year == null) return [];
    const raw = cfg.getDays(state.year) || [];
    return raw.map((d) => {
      let total = 0;
      for (const p of cfg.providers) {
        if (state.providers[p.key]) total += dayCount(d, p.key);
      }
      return { ...d, total };
    });
  }

  function showTooltip(e: MouseEvent, day: StreakrDay): void {
    tooltipEl.innerHTML = "";
    tooltipEl.appendChild(h("div", { class: "tt-date", text: fmtDateLong(day.date) }));
    const totalLabel = formatTotalLabel(day.total);
    tooltipEl.appendChild(h("div", { class: "tt-total", text: totalLabel }));
    if (day.total > 0) {
      cfg.providers.forEach((p) => {
        const value = dayCount(day, p.key);
        if (value > 0) {
          tooltipEl.appendChild(
            h("div", { class: "tt-row" }, [
              h("span", { class: "tt-label" }, [
                h("span", { class: "dot", style: { background: p.color } }),
                p.name,
              ]),
              h("span", { class: "tt-val", text: String(value) }),
            ]),
          );
        }
      });
    }
    tooltipEl.style.left = e.clientX + 14 + "px";
    tooltipEl.style.top = e.clientY + 14 + "px";
    tooltipEl.classList.add("visible");
  }

  function moveTooltip(e: MouseEvent): void {
    tooltipEl.style.left = e.clientX + 14 + "px";
    tooltipEl.style.top = e.clientY + 14 + "px";
  }

  function hideTooltip(): void {
    tooltipEl.classList.remove("visible");
  }

  function bindCellEvents(rect: SVGElement, day: StreakrDay): void {
    rect.addEventListener("mouseenter", (e) => showTooltip(e, day));
    rect.addEventListener("mousemove", (e) => moveTooltip(e));
    rect.addEventListener("mouseleave", hideTooltip);
  }

  function buildHeatmapCell(
    day: StreakrLeveledDay | null,
    ri: number,
    sq: number,
    colStep: number,
  ): SVGElement {
    const rect = svg("rect", {
      class: day ? "sk-heatmap-cell" : null,
      y: ri * colStep,
      width: sq,
      height: sq,
      rx: Math.max(2, sq * 0.22),
      fill: day ? `var(--sk-heat-${day.level})` : "transparent",
      style: { cursor: day ? "pointer" : "default" },
    });
    if (day) bindCellEvents(rect, day);
    return rect;
  }

  function buildHeatmapColumn(
    col: (StreakrLeveledDay | null)[],
    ci: number,
    sq: number,
    colStep: number,
  ): SVGElement {
    const colG = svg("g", { transform: `translate(${ci * colStep}, 0)` });
    col.forEach((day, ri) => {
      colG.appendChild(buildHeatmapCell(day, ri, sq, colStep));
    });
    return colG;
  }

  function renderHeatmap(wrap: HTMLElement, days: StreakrLeveledDay[], containerW: number): void {
    const cols = gridFromDays(days);
    const headers = monthHeaders(cols);
    const labelsW = 28;
    const trailingW = 8;
    const gridW = Math.max(
      0,
      (containerW || wrap.getBoundingClientRect().width || 820) - labelsW - trailingW,
    );
    const targetGap = 3;
    const rawSq = gridW / Math.max(1, cols.length) - targetGap;
    const sq = Math.max(9, Math.min(11, rawSq));
    const gap = Math.max(2, Math.min(3, Math.round(sq * 0.25)));
    const colStep = sq + gap;
    const H = 7 * colStep + 24;
    const W = labelsW + cols.length * colStep + trailingW;
    const fontSize = Math.max(9, Math.min(11, sq * 0.82));

    const svgEl = svg("svg", {
      class: "sk-heatmap-svg",
      width: W,
      height: H,
      viewBox: `0 0 ${W} ${H}`,
    });

    headers.forEach((hd) => {
      svgEl.appendChild(
        svg(
          "text",
          {
            x: labelsW + hd.col * colStep,
            y: 10,
            fill: "var(--sk-text-muted)",
            "font-size": fontSize,
            "font-family": "'Geist', sans-serif",
          },
          hd.label,
        ),
      );
    });

    [1, 3, 5].forEach((d, i) => {
      svgEl.appendChild(
        svg(
          "text",
          {
            x: 0,
            y: 24 + d * colStep + sq - 2,
            fill: "var(--sk-text-subtle)",
            "font-size": Math.max(8.5, fontSize - 1),
            "font-family": "'Geist', sans-serif",
          },
          DAY_LABELS[i],
        ),
      );
    });

    const g = svg("g", { transform: `translate(${labelsW}, 18)` });
    cols.forEach((col, ci) => {
      g.appendChild(buildHeatmapColumn(col, ci, sq, colStep));
    });
    svgEl.appendChild(g);

    const inner = h("div", { class: "sk-heatmap-svg-wrap" }, [svgEl]);
    wrap.innerHTML = "";
    wrap.appendChild(inner);
  }

  type ReadyBody = HTMLElement & {
    __skDraw?: () => void;
    __skObserveTarget?: HTMLElement;
  };

  interface RenderFlags {
    isLoading: boolean;
    isEmpty: boolean;
    allOff: boolean;
    leveled: StreakrLeveledDay[];
    stats: StreakrStats;
  }

  function computeRenderFlags(): RenderFlags {
    const days = getCurrentDays();
    const leveled = levelize(days);
    const stats = computeStats(leveled);
    const yearTotal = days.reduce((a, d) => a + d.total, 0);
    const isLoading = cfg.state === "loading";
    const isEmpty = cfg.state === "empty" || (cfg.state === "ready" && yearTotal === 0);
    const allOff = cfg.providers.length > 0 && cfg.providers.every((p) => !state.providers[p.key]);
    return { isLoading, isEmpty, allOff, leveled, stats };
  }

  function renderTitleRow(): HTMLElement {
    const subtitleText =
      state.year === currentYearLabel() ? "Last 12 months" : String(state.year ?? "");
    return h("div", { class: "sk-title-row" }, [
      h("div", { class: "sk-brand" }, [
        h("div", { class: "sk-logo" }, [logoR()]),
        h("div", { class: "sk-title", text: "streakr" }),
        h("div", { class: "sk-subtitle", text: subtitleText }),
      ]),
    ]);
  }

  function buildYearTab(year: number, isLoading: boolean): HTMLElement {
    return h("button", {
      class: "sk-year-tab" + (state.year === year ? " active" : ""),
      onclick: () => setYear(year),
      disabled: isLoading || undefined,
      text: String(year),
    });
  }

  function renderYearsList(isLoading: boolean): HTMLElement {
    const { visible, hasMore } = visibleYears();
    const yearIsHidden = state.year != null && !visible.includes(state.year);
    const list = h("div", { class: "sk-years-list" });
    visible.forEach((y) => list.appendChild(buildYearTab(y, isLoading)));
    if (yearIsHidden && state.year != null) {
      list.appendChild(
        h("button", {
          class: "sk-year-tab active",
          onclick: () => openYearModal(),
          text: String(state.year),
        }),
      );
    }
    if (hasMore) {
      list.appendChild(
        h(
          "button",
          {
            class: "sk-year-more",
            "aria-label": "More years",
            onclick: () => openYearModal(),
          },
          [h("span"), h("span"), h("span")],
        ),
      );
    }
    return list;
  }

  function shouldRenderProviderRow(flags: RenderFlags): boolean {
    if (flags.isLoading || flags.isEmpty) return false;
    if (!cfg.showProviders) return false;
    return cfg.providers.length > 0;
  }

  function renderYearsBar(flags: RenderFlags): HTMLElement {
    const yearsBar = h("div", { class: "sk-years" });
    yearsBar.dataset.noProviders = String(!cfg.showProviders);
    yearsBar.appendChild(renderYearsList(flags.isLoading));
    if (shouldRenderProviderRow(flags)) {
      yearsBar.appendChild(renderProviderRow());
    }
    return yearsBar;
  }

  function renderHeader(flags: RenderFlags): HTMLElement {
    const header = h("div", { class: "sk-header" });
    header.appendChild(renderTitleRow());
    header.appendChild(renderYearsBar(flags));
    return header;
  }

  function appendBody(card: Element, flags: RenderFlags): void {
    if (flags.isLoading) {
      card.appendChild(renderLoadingBody());
      return;
    }
    if (flags.allOff) {
      // Check `allOff` before `isEmpty` so users who explicitly toggled every
      // provider off see "providers disabled" guidance instead of the
      // (technically true but misleading) "no contributions" empty state.
      card.appendChild(renderNoProviders());
      return;
    }
    if (flags.isEmpty) {
      card.appendChild(renderEmpty());
      return;
    }
    const body = renderReadyBody(flags.leveled, flags.stats) as ReadyBody;
    card.appendChild(body);
    body.__skDraw?.();
    if (body.__skObserveTarget) resizeObs.observe(body.__skObserveTarget);
  }

  function render(): void {
    syncProviderState();
    // Hide any tooltip pinned by a hovered cell that is about to be replaced
    // when we wipe `root.innerHTML` below — the cell's mouseleave never fires.
    hideTooltip();
    // Drop the previous heatmap wrap from the observer (the new render will
    // re-observe the freshly mounted wrap, if any).
    resizeObs.disconnect();
    currentDraw = null;

    const wasOpen = state.yearModalOpen;
    const flags = computeRenderFlags();

    root.innerHTML = "";
    root.dataset.theme = cfg.theme;
    applyAccentVars(root);

    const card = h("div", { class: "sk-card" });
    root.appendChild(card);
    card.appendChild(renderHeader(flags));
    appendBody(card, flags);

    if (wasOpen) renderYearModal(card);
  }

  function renderProviderRow(): HTMLElement {
    const row = h("div", { class: "sk-providers" });
    const totals = computeProviderTotals();
    cfg.providers.forEach((p) => {
      const active = !!state.providers[p.key];
      const iconHtml = providerIconHtml(p);
      const btn = h(
        "button",
        {
          class: "sk-provider" + (active ? " active" : ""),
          title: p.name + " — " + totals[p.key].toLocaleString(),
          onclick: () => toggleProvider(p.key),
        },
        [
          h("span", {
            class: "sk-provider-icon",
            html: iconHtml ?? "",
            style: iconHtml ? undefined : { background: p.color, borderRadius: "50%" },
          }),
          h("span", { class: "sk-provider-count", text: totals[p.key].toLocaleString() }),
        ],
      );
      row.appendChild(btn);
    });
    return row;
  }

  function computeProviderTotals(): Record<string, number> {
    const totals: Record<string, number> = {};
    for (const p of cfg.providers) totals[p.key] = 0;
    if (cfg.state !== "ready" || state.year == null) return totals;
    const raw = cfg.getDays(state.year) || [];
    for (const d of raw) {
      for (const p of cfg.providers) {
        totals[p.key] += dayCount(d, p.key);
      }
    }
    return totals;
  }

  function renderLoadingBody(): HTMLElement {
    const grid = h("div", { class: "sk-skel-grid-cells" });
    for (let i = 0; i < 53 * 7; i++) {
      // Deterministic ~40% "on" pattern via Knuth's multiplicative hash —
      // not for security, just for a non-uniform shimmer that stays stable
      // across re-renders (avoids the flicker a real PRNG would cause).
      const on = ((i * 2654435761) >>> 0) % 100 < 40;
      grid.appendChild(
        h("div", {
          class: "sk-skel-cell" + (on ? " shimmer" : ""),
          style: { animationDelay: (i % 53) * 30 + "ms" },
        }),
      );
    }
    const skel = (w: number, hpx: number) =>
      h("div", {
        class: "sk-skeleton",
        style: { width: w + "px", height: hpx + "px", marginBottom: "10px" },
      });
    const stat = () => h("div", { class: "sk-stat" }, [skel(90, 11), skel(60, 26)]);
    return h("div", { class: "sk-body" }, [
      h("div", { class: "sk-heatmap-wrap" }, [
        grid,
        h("div", { class: "sk-legend", html: '<span style="opacity:.4">Loading…</span>' }),
      ]),
      h("div", { class: "sk-stats" }, [stat(), stat(), stat(), stat()]),
    ]);
  }

  function renderEmpty(): HTMLElement {
    return h("div", { class: "sk-empty" }, [
      h("div", {
        class: "sk-empty-icon",
        html:
          '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5">' +
          '<rect x="3" y="5" width="16" height="14" rx="2"/><path d="M3 9 H19"/>' +
          '<path d="M8 3 V7 M14 3 V7" stroke-linecap="round"/></svg>',
      }),
      h("div", {
        class: "sk-empty-title",
        text:
          "No contributions in " +
          (state.year === currentYearLabel() ? "the last 12 months" : String(state.year ?? "")),
      }),
      h("div", {
        class: "sk-empty-sub",
        text: "When you commit, push, or open PRs across your connected accounts, they'll show up here.",
      }),
    ]);
  }

  function renderNoProviders(): HTMLElement {
    return h("div", { class: "sk-noprov" }, [
      h("span", { class: "sk-noprov-dot" }),
      h("div", {
        style: { flex: "1" },
        text: "All providers are disabled — toggle one above to see contributions.",
      }),
      h("button", {
        class: "sk-year-tab",
        onclick: () => enableAllProviders(),
        text: "Enable all",
      }),
    ]);
  }

  function renderReadyBody(leveled: StreakrLeveledDay[], stats: StreakrStats): HTMLElement {
    const body = h("div", { class: "sk-body" }) as ReadyBody;
    body.dataset.noStats = String(!cfg.showStats);

    const heatmapWrap = h("div", { class: "sk-heatmap-wrap" });
    const heatmapInner = h("div");
    heatmapWrap.appendChild(heatmapInner);
    const legend = h("div", { class: "sk-legend" }, [
      h("span", { text: "Less" }),
      ...[0, 1, 2, 3, 4].map((i) =>
        h("span", { class: "sk-legend-sq", style: { background: `var(--sk-heat-${i})` } }),
      ),
      h("span", { text: "More" }),
    ]);
    heatmapWrap.appendChild(legend);
    body.appendChild(heatmapWrap);

    const draw = () => {
      try {
        const w = heatmapWrap.clientWidth - 32;
        renderHeatmap(heatmapInner, leveled, Math.max(200, w));
      } catch (err) {
        console.error("[streakr] draw failed:", err);
      }
    };
    body.__skDraw = draw;
    currentDraw = draw;
    body.__skObserveTarget = heatmapWrap;

    if (cfg.showStats) {
      body.appendChild(
        h("div", { class: "sk-stats" }, [
          statCard("Total Contributions", stats.total.toLocaleString()),
          statCard("Best Streak", stats.best, " days"),
          statCard("Current Streak", stats.current, " days"),
          statCard("Active Days", stats.active.toLocaleString()),
        ]),
      );
    }
    return body;
  }

  function statCard(label: string, value: string | number, suffix?: string): HTMLElement {
    return h("div", { class: "sk-stat" }, [
      h("div", { class: "sk-stat-label", text: label }),
      h("div", { class: "sk-stat-value" }, [
        document.createTextNode(String(value)),
        suffix ? h("span", { class: "sk-stat-suffix", text: suffix }) : null,
      ]),
    ]);
  }

  function renderYearModal(card: Element): void {
    const overlay = h("div", { class: "sk-modal-overlay", onclick: () => closeYearModal() });
    const modal = h("div", {
      class: "sk-modal",
      onclick: (e: Event) => e.stopPropagation(),
    });
    modal.appendChild(
      h("div", { class: "sk-modal-header" }, [
        h("div", { class: "sk-modal-title", text: "Select year" }),
        h("button", {
          class: "sk-modal-close",
          "aria-label": "Close",
          onclick: () => closeYearModal(),
          html: '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
        }),
      ]),
    );
    const grid = h("div", { class: "sk-modal-grid" });
    cfg.years
      .slice()
      .reverse()
      .forEach((y) => {
        const days = cfg.getDays(y) || [];
        const tot = days.reduce((s, d) => s + (d.total || 0), 0);
        grid.appendChild(
          h(
            "button",
            {
              class: "sk-modal-year" + (state.year === y ? " active" : ""),
              onclick: () => {
                setYear(y);
                closeYearModal();
              },
            },
            [
              h("div", { class: "sk-modal-year-num", text: String(y) }),
              h("div", {
                class: "sk-modal-year-count",
                text: tot.toLocaleString() + " contributions",
              }),
            ],
          ),
        );
      });
    modal.appendChild(grid);
    overlay.appendChild(modal);
    card.appendChild(overlay);
  }

  function currentYearLabel(): number | null {
    return cfg.years.length ? Math.max(...cfg.years) : null;
  }

  function setYear(y: number): void {
    state.year = y;
    cfg.onYearChange?.(y);
    render();
  }

  function toggleProvider(key: string): void {
    state.providers[key] = !state.providers[key];
    cfg.onProviderToggle?.(key, state.providers[key], { ...state.providers });
    render();
  }

  function enableAllProviders(): void {
    const next: StreakrProviders = {};
    for (const p of cfg.providers) next[p.key] = true;
    state.providers = next;
    render();
  }

  function openYearModal(): void {
    state.yearModalOpen = true;
    render();
  }

  function closeYearModal(): void {
    state.yearModalOpen = false;
    render();
  }

  function onKey(e: KeyboardEvent): void {
    if (e.key === "Escape" && state.yearModalOpen) closeYearModal();
  }

  document.addEventListener("keydown", onKey);
  render();

  return {
    update(patch: Partial<StreakrOptions>): void {
      // Skip undefined values so callers can spread partial patches without
      // accidentally clobbering resolved defaults (e.g. theme: undefined).
      for (const key of Object.keys(patch) as (keyof StreakrOptions)[]) {
        const value = patch[key];
        if (value !== undefined) {
          (cfg as unknown as Record<string, unknown>)[key] = value;
        }
      }
      render();
    },
    setYear,
    setProviders(next: StreakrProviders): void {
      state.providers = { ...state.providers, ...next };
      render();
    },
    destroy(): void {
      resizeObs.disconnect();
      document.removeEventListener("keydown", onKey);
      tooltipEl.remove();
      root.remove();
    },
  };
}
