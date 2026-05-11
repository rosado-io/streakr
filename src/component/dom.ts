type SimpleAttr = string | number | boolean;
type StyleAttr = Partial<CSSStyleDeclaration> | Record<string, string>;
type EventAttr = (event: Event) => void;
type ElAttrValue = SimpleAttr | EventAttr | StyleAttr | null | undefined;
type ElAttrs = Record<string, ElAttrValue>;
type ElChild = Node | string | null | false | undefined;

const SVG_NS = "http://www.w3.org/2000/svg";

const simpleAttrSetters: Record<string, (el: Element, value: string) => void> = {
  class: (el, value) => el.setAttribute("class", value),
  html: (el, value) => {
    (el as HTMLElement).innerHTML = value;
  },
  text: (el, value) => {
    el.textContent = value;
  },
};

function isSimple(value: ElAttrValue): value is SimpleAttr {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function setSimpleAttr(el: Element, key: string, value: SimpleAttr): void {
  const str = String(value);
  (simpleAttrSetters[key] ?? ((node, attrValue) => node.setAttribute(key, attrValue)))(el, str);
}

function setStyle(el: Element, value: ElAttrValue): boolean {
  if (typeof value !== "object") return false;
  Object.assign((el as HTMLElement).style, value);
  return true;
}

function setListener(el: Element, key: string, value: ElAttrValue): boolean {
  if (!key.startsWith("on")) return false;
  if (typeof value === "function") {
    el.addEventListener(key.slice(2).toLowerCase(), value);
  }
  return true;
}

function setAttr(el: Element, key: string, value: ElAttrValue): void {
  if (value === false || value == null) return;

  const handled = (key === "style" && setStyle(el, value)) || setListener(el, key, value);
  if (!handled && isSimple(value)) setSimpleAttr(el, key, value);
}

function appendChildren(el: Element, list: ElChild[]): void {
  list
    .filter((child): child is Node | string => child != null && child !== false)
    .forEach((child) =>
      el.appendChild(typeof child === "string" ? document.createTextNode(child) : child),
    );
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: ElAttrs,
  children?: ElChild | ElChild[],
): HTMLElementTagNameMap[K];
export function h(tag: string, attrs?: ElAttrs, children?: ElChild | ElChild[]): Element;
export function h(tag: string, attrs?: ElAttrs, children?: ElChild | ElChild[]): Element {
  const isSvg = tag.includes(":");
  const el = isSvg
    ? document.createElementNS(SVG_NS, tag.slice(tag.indexOf(":") + 1))
    : document.createElement(tag);

  Object.entries(attrs ?? {}).forEach(([key, value]) => setAttr(el, key, value));

  if (children !== undefined && children !== null) {
    appendChildren(el, Array.isArray(children) ? children : [children]);
  }

  return el;
}

export function svg(tag: string, attrs?: ElAttrs, children?: ElChild | ElChild[]): SVGElement {
  return h("svg:" + tag, attrs, children) as SVGElement;
}
