import {
  AGENT_PROVIDERS,
  createStreakr,
  type StreakrInstance,
  type StreakrProvider,
  type StreakrState,
  type StreakrTheme,
} from "../src/index";
import "../src/component/streakr.css";
import { StreakrSampleData } from "./sample-data";

const DEMO_PROVIDERS: StreakrProvider[] = [
  { key: "github", name: "GitHub", color: "#39d353" },
  { key: "gitlab", name: "GitLab", color: "#fc6d26" },
];

function providersFor(showAgents: boolean): StreakrProvider[] {
  return showAgents ? [...DEMO_PROVIDERS, ...AGENT_PROVIDERS] : DEMO_PROVIDERS;
}

interface DemoState {
  theme: StreakrTheme;
  accent: string;
  showProviders: boolean;
  showStats: boolean;
  showAgents: boolean;
  componentState: StreakrState;
}

let instance: StreakrInstance | null = null;

function mount(options: Partial<DemoState> = {}): void {
  const target = document.getElementById("mobile-root");
  if (!target) return;
  target.innerHTML = "";
  instance = createStreakr({
    target,
    theme: options.theme ?? "dark",
    accent: options.accent ?? "#39d353",
    tintHeatmap: true,
    showProviders: options.showProviders ?? true,
    showStats: options.showStats ?? true,
    state: options.componentState ?? "ready",
    providers: providersFor(options.showAgents ?? true),
    years: StreakrSampleData.availableYears,
    year: 2026,
    today: StreakrSampleData.today,
    getDays: StreakrSampleData.getDays,
  });
}

function update(options: Partial<DemoState>): void {
  if (!instance) {
    mount(options);
    return;
  }
  instance.update({
    theme: options.theme,
    accent: options.accent,
    tintHeatmap: true,
    showProviders: options.showProviders,
    showStats: options.showStats,
    state: options.componentState,
    providers: options.showAgents === undefined ? undefined : providersFor(options.showAgents),
  });
}

interface DemoGlobal extends EventTarget {
  location: Location;
  parent: DemoGlobal;
  postMessage(message: unknown, targetOrigin: string): void;
}

const g = globalThis as unknown as DemoGlobal;

g.addEventListener("message", (event: MessageEvent) => {
  if (event.origin !== g.location.origin) return;
  const data: unknown = event.data;
  if (
    !data ||
    typeof data !== "object" ||
    (data as { type?: unknown }).type !== "streakr-demo-state"
  ) {
    return;
  }
  update((data as { payload?: Partial<DemoState> }).payload ?? {});
});

mount();
g.parent.postMessage({ type: "streakr-mobile-ready" }, g.location.origin);
