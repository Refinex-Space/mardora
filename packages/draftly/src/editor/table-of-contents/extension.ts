import { EditorSelection, Extension, Prec } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { extractTocItemsFromState } from "./extract";
import { createTocPanelElement } from "./panel";
import { clampTocWidth, resolveTocConfig } from "./slug";
import { readTocPanelState, writeTocPanelState } from "./storage";
import { tocTheme } from "./theme";
import type { DraftlyTocConfig, DraftlyTocItem, ResolvedDraftlyTocConfig, TocPanelState } from "./types";

function sameItems(a: DraftlyTocItem[], b: DraftlyTocItem[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

class TocViewPlugin {
  private panel: HTMLElement | null = null;
  private config: ResolvedDraftlyTocConfig;
  private panelState: TocPanelState;
  private items: DraftlyTocItem[] = [];

  constructor(private readonly view: EditorView, rawConfig: DraftlyTocConfig) {
    this.config = resolveTocConfig(rawConfig);
    const stored = readTocPanelState(this.config.storageKey);
    this.panelState = {
      expanded: stored?.expanded ?? this.config.defaultExpanded,
      width: clampTocWidth(stored?.width ?? this.config.defaultWidth, this.config),
    };
    this.view.scrollDOM.addEventListener("scroll", this.handleScroll, { passive: true });
    this.recompute();
  }

  update(update: ViewUpdate): void {
    if (update.docChanged || update.viewportChanged || update.geometryChanged) this.recompute();
  }

  destroy(): void {
    this.view.scrollDOM.removeEventListener("scroll", this.handleScroll);
    this.panel?.remove();
    this.panel = null;
  }

  private readonly handleScroll = (): void => {
    this.updateActiveItem();
  };

  private recompute(): void {
    const next = extractTocItemsFromState(this.view.state, this.config);
    this.items = this.withActive(next);
    this.config.onTocChange?.(this.items);
    this.render();
  }

  private withActive(items: DraftlyTocItem[]): DraftlyTocItem[] {
    if (items.length === 0) return [];
    const viewportTop = this.view.scrollDOM.getBoundingClientRect().top + 24;
    let activeIndex = 0;
    items.forEach((item, index) => {
      if (typeof item.from !== "number") return;
      const coords = this.view.coordsAtPos(item.from);
      if (coords && coords.top <= viewportTop) activeIndex = index;
    });
    return items.map((item, index) => ({ ...item, active: index === activeIndex }));
  }

  private updateActiveItem(): void {
    const next = this.withActive(this.items);
    if (sameItems(next, this.items)) return;
    this.items = next;
    this.config.onTocChange?.(this.items);
    this.render();
  }

  private render(): void {
    if (!this.config.enabled) {
      this.panel?.remove();
      this.panel = null;
      return;
    }
    const nextPanel = createTocPanelElement(
      { expanded: this.panelState.expanded, width: this.panelState.width, items: this.items },
      {
        onSelect: (item) => this.selectItem(item),
        onToggle: () => this.toggle(),
        onResizeStart: (event) => this.startResize(event),
      }
    );
    this.panel?.replaceWith(nextPanel);
    if (!this.panel) this.view.dom.appendChild(nextPanel);
    this.panel = nextPanel;
  }

  private selectItem(item: DraftlyTocItem): void {
    if (typeof item.from !== "number") return;
    this.view.dispatch({
      selection: EditorSelection.cursor(item.from),
      effects: EditorView.scrollIntoView(item.from, { y: "start" }),
    });
    this.view.focus();
    this.updateActiveItem();
  }

  private persistPanelState(): void {
    writeTocPanelState(this.config.storageKey, this.panelState);
  }

  private toggle(): void {
    this.panelState = { ...this.panelState, expanded: !this.panelState.expanded };
    this.persistPanelState();
    this.render();
  }

  private startResize(event: MouseEvent): void {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = this.panelState.width;
    const doc = this.view.dom.ownerDocument;
    doc.body.classList.add("cm-draftly-toc-resizing");

    const move = (moveEvent: MouseEvent) => {
      const nextWidth = clampTocWidth(startWidth - (moveEvent.clientX - startX), this.config);
      this.panelState = { ...this.panelState, width: nextWidth };
      this.render();
    };
    const up = () => {
      doc.body.classList.remove("cm-draftly-toc-resizing");
      doc.removeEventListener("mousemove", move);
      doc.removeEventListener("mouseup", up);
      this.persistPanelState();
    };

    doc.addEventListener("mousemove", move);
    doc.addEventListener("mouseup", up);
  }
}

export function tableOfContents(config: DraftlyTocConfig = {}): Extension[] {
  return [tocTheme, Prec.low(ViewPlugin.define((view) => new TocViewPlugin(view, config)))];
}
