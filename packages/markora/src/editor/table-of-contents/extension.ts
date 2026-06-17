import { EditorSelection, Extension, Prec } from "@codemirror/state";
import { EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { extractTocItemsFromState } from "./extract";
import { createTocPanelElement } from "./panel";
import { clampTocWidth, resolveTocConfig } from "./slug";
import { readTocPanelState, writeTocPanelState } from "./storage";
import { tocTheme } from "./theme";
import type { MarkoraTocConfig, MarkoraTocItem, ResolvedMarkoraTocConfig, TocPanelState } from "./types";

function sameItems(a: MarkoraTocItem[], b: MarkoraTocItem[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

class TocViewPlugin {
  private panel: HTMLElement | null = null;
  private config: ResolvedMarkoraTocConfig;
  private panelState: TocPanelState;
  private items: MarkoraTocItem[] = [];
  private renderFrame: number | null = null;
  private readonly measureKey = {};

  constructor(
    private readonly view: EditorView,
    rawConfig: MarkoraTocConfig
  ) {
    this.config = resolveTocConfig(rawConfig);
    const stored = readTocPanelState(this.config.storageKey);
    this.panelState = {
      expanded: stored?.expanded ?? this.config.defaultExpanded,
      width: clampTocWidth(stored?.width ?? this.config.defaultWidth, this.config),
    };
    this.view.scrollDOM.addEventListener("scroll", this.handleScroll, { passive: true });
    this.recompute();
    this.scheduleRender();
    this.scheduleActiveMeasure();
  }

  update(update: ViewUpdate): void {
    if (update.docChanged) {
      this.recompute();
      return;
    }
    if (update.viewportChanged || update.geometryChanged) this.scheduleActiveMeasure();
  }

  destroy(): void {
    this.view.scrollDOM.removeEventListener("scroll", this.handleScroll);
    if (this.renderFrame !== null) {
      this.view.dom.ownerDocument.defaultView?.cancelAnimationFrame(this.renderFrame);
      this.renderFrame = null;
    }
    this.clearLayoutWidth();
    this.panel?.remove();
    this.panel = null;
  }

  private readonly handleScroll = (): void => {
    this.scheduleActiveMeasure();
  };

  private recompute(): void {
    const next = extractTocItemsFromState(this.view.state, this.config);
    this.items = this.withPreservedActive(next);
    this.config.onTocChange?.(this.items);
    this.render();
    this.scheduleActiveMeasure();
  }

  private withPreservedActive(items: MarkoraTocItem[]): MarkoraTocItem[] {
    if (items.length === 0) return [];
    const previousActive = this.items.find((item) => item.active)?.id;
    const fallbackActiveId = items[0]?.id;
    const activeId =
      previousActive && items.some((item) => item.id === previousActive) ? previousActive : fallbackActiveId;
    return items.map((item) => ({ ...item, active: item.id === activeId }));
  }

  private scheduleActiveMeasure(): void {
    if (this.items.length === 0 || !this.view.dom.isConnected) return;
    this.view.requestMeasure({
      key: this.measureKey,
      read: (view) => {
        const viewportTop = view.scrollDOM.getBoundingClientRect().top + 24;
        let activeId = this.items[0]?.id ?? null;
        for (const item of this.items) {
          if (typeof item.from !== "number") continue;
          const coords = view.coordsAtPos(item.from);
          if (coords && coords.top <= viewportTop) activeId = item.id;
        }
        return activeId;
      },
      write: (activeId) => {
        if (!activeId) return;
        this.updateActiveItem(activeId);
      },
    });
  }

  private updateActiveItem(activeId: string): void {
    const next = this.items.map((item) => ({ ...item, active: item.id === activeId }));
    if (sameItems(next, this.items)) return;
    this.items = next;
    this.config.onTocChange?.(this.items);
    this.render();
  }

  private scheduleRender(): void {
    const win = this.view.dom.ownerDocument.defaultView;
    if (!win) {
      this.render();
      return;
    }
    if (this.renderFrame !== null) return;
    this.renderFrame = win.requestAnimationFrame(() => {
      this.renderFrame = null;
      this.render();
    });
  }

  private render(): void {
    if (!this.config.enabled) {
      this.clearLayoutWidth();
      this.panel?.remove();
      this.panel = null;
      return;
    }
    this.syncLayoutWidth();
    const nextPanel = createTocPanelElement(
      { expanded: this.panelState.expanded, width: this.panelState.width, items: this.items },
      {
        onSelect: (item) => this.selectItem(item),
        onToggle: () => this.toggle(),
        onResizeStart: (event) => this.startResize(event),
      }
    );
    if (this.panel?.isConnected) {
      this.panel.replaceWith(nextPanel);
    } else {
      this.view.dom.appendChild(nextPanel);
    }
    this.panel = nextPanel;
  }

  private selectItem(item: MarkoraTocItem): void {
    if (typeof item.from !== "number") return;
    this.view.dispatch({
      selection: EditorSelection.cursor(item.from),
      effects: EditorView.scrollIntoView(item.from, { y: "start" }),
    });
    this.view.focus();
    this.updateActiveItem(item.id);
    this.scheduleActiveMeasure();
  }

  private persistPanelState(): void {
    writeTocPanelState(this.config.storageKey, this.panelState);
  }

  private toggle(): void {
    this.panelState = { ...this.panelState, expanded: !this.panelState.expanded };
    this.persistPanelState();
    this.render();
  }

  private syncLayoutWidth(): void {
    const layoutWidth = this.panelState.expanded ? this.panelState.width : 42;
    this.view.dom.style.setProperty("--markora-toc-layout-width", `${layoutWidth}px`);
    this.view.dom.style.setProperty("--markora-toc-scrollbar-gutter", "14px");
  }

  private clearLayoutWidth(): void {
    this.view.dom.style.removeProperty("--markora-toc-layout-width");
    this.view.dom.style.removeProperty("--markora-toc-scrollbar-gutter");
  }

  private startResize(event: MouseEvent): void {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = this.panelState.width;
    const doc = this.view.dom.ownerDocument;
    doc.body.classList.add("cm-markora-toc-resizing");

    const move = (moveEvent: MouseEvent) => {
      const nextWidth = clampTocWidth(startWidth - (moveEvent.clientX - startX), this.config);
      this.panelState = { ...this.panelState, width: nextWidth };
      this.render();
    };
    const up = () => {
      doc.body.classList.remove("cm-markora-toc-resizing");
      doc.removeEventListener("mousemove", move);
      doc.removeEventListener("mouseup", up);
      this.persistPanelState();
    };

    doc.addEventListener("mousemove", move);
    doc.addEventListener("mouseup", up);
  }
}

export function tableOfContents(config: MarkoraTocConfig = {}): Extension[] {
  return [tocTheme, Prec.low(ViewPlugin.define((view) => new TocViewPlugin(view, config)))];
}
