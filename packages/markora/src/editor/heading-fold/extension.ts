import {
  Facet,
  StateEffect,
  StateField,
  type EditorState,
  type Extension,
  type Range,
  type Transaction,
} from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view";
import { extractHeadingFoldRangesFromState } from "./extract";
import { headingFoldTheme } from "./theme";
import type { MarkoraHeadingFoldConfig, MarkoraHeadingFoldRange } from "./types";

const toggleHeadingFoldEffect = StateEffect.define<number>();

const headingFoldConfigFacet = Facet.define<MarkoraHeadingFoldConfig, MarkoraHeadingFoldConfig>({
  combine: (values) => values[values.length - 1] ?? {},
});

interface HeadingFoldState {
  foldedHeadings: readonly number[];
  decorations: DecorationSet;
}

function nextFoldedHeadings(value: readonly number[], transaction: Transaction): readonly number[] {
    const next = new Set<number>();

    if (transaction.docChanged) {
      for (const position of value) {
        next.add(transaction.changes.mapPos(position, 1));
      }
    } else {
      for (const position of value) next.add(position);
    }

    for (const effect of transaction.effects) {
      if (!effect.is(toggleHeadingFoldEffect)) continue;
      if (next.has(effect.value)) {
        next.delete(effect.value);
      } else {
        next.add(effect.value);
      }
    }

  return Array.from(next).sort((a, b) => a - b);
}

class HeadingFoldWidget extends WidgetType {
  constructor(
    private readonly range: MarkoraHeadingFoldRange,
    private readonly folded: boolean
  ) {
    super();
  }

  override eq(other: HeadingFoldWidget): boolean {
    return other.range.headingFrom === this.range.headingFrom && other.folded === this.folded;
  }

  override toDOM(): HTMLElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cm-markora-heading-fold-toggle";
    button.setAttribute("aria-label", `${this.folded ? "Expand" : "Collapse"} H${this.range.level} section`);
    button.dataset.markoraHeadingFoldFolded = String(this.folded);
    button.dataset.markoraHeadingFoldFrom = String(this.range.headingFrom);

    const level = document.createElement("span");
    level.className = "cm-markora-heading-fold-level";
    level.textContent = `H${this.range.level}`;

    const arrow = document.createElement("span");
    arrow.className = "cm-markora-heading-fold-arrow";
    arrow.setAttribute("aria-hidden", "true");

    button.append(level, arrow);

    return button;
  }

  override ignoreEvent(event: Event): boolean {
    return event.type === "mousedown" || event.type === "click";
  }
}

class FoldPlaceholderWidget extends WidgetType {
  override eq(other: FoldPlaceholderWidget): boolean {
    return other instanceof FoldPlaceholderWidget;
  }

  override toDOM(): HTMLElement {
    const placeholder = document.createElement("span");
    placeholder.className = "cm-markora-heading-fold-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.textContent = "...";
    return placeholder;
  }
}

function selectionTouchesHeading(state: EditorState, range: MarkoraHeadingFoldRange): boolean {
  return state.selection.ranges.some((selection) => {
    const line = state.doc.lineAt(selection.head);
    return line.from === range.headingLineFrom;
  });
}

function readHeadingFoldButtonPosition(target: EventTarget | null, view: EditorView): number | null {
  if (!(target instanceof Element)) return null;
  const button = target.closest(".cm-markora-heading-fold-toggle");
  if (!(button instanceof HTMLElement) || !view.dom.contains(button)) return null;
  const position = Number(button.dataset.markoraHeadingFoldFrom);
  return Number.isFinite(position) ? position : null;
}

function toggleHeadingFoldAt(view: EditorView, position: number): void {
  view.dispatch({ effects: toggleHeadingFoldEffect.of(position) });
  view.focus();
}

const headingFoldDomHandlers = EditorView.domEventHandlers({
  mousedown: (event, view) => {
    if (event.button !== 0) return false;
    const position = readHeadingFoldButtonPosition(event.target, view);
    if (position === null) return false;
    event.preventDefault();
    event.stopPropagation();
    toggleHeadingFoldAt(view, position);
    return true;
  },
  click: (event, view) => {
    if (event.detail !== 0) return false;
    const position = readHeadingFoldButtonPosition(event.target, view);
    if (position === null) return false;
    event.preventDefault();
    event.stopPropagation();
    toggleHeadingFoldAt(view, position);
    return true;
  },
});

export function __buildHeadingFoldDecorations(
  state: EditorState,
  config: MarkoraHeadingFoldConfig,
  foldedHeadings: readonly number[]
): DecorationSet {
  const folded = new Set(foldedHeadings);
  const decorations: Range<Decoration>[] = [];

  for (const range of extractHeadingFoldRangesFromState(state, config)) {
    const isFolded = folded.has(range.headingFrom);
    const active = selectionTouchesHeading(state, range);
    const lineClass = [
      "cm-markora-heading-fold-line",
      active ? "cm-markora-heading-fold-line-active" : "",
      isFolded ? "cm-markora-heading-fold-line-folded" : "",
    ]
      .filter(Boolean)
      .join(" ");

    decorations.push(Decoration.line({ class: lineClass }).range(range.headingLineFrom));
    decorations.push(
      Decoration.widget({
        widget: new HeadingFoldWidget(range, isFolded),
        side: -1,
      }).range(range.headingFrom)
    );

    if (isFolded) {
      decorations.push(
        Decoration.widget({
          widget: new FoldPlaceholderWidget(),
          side: 1,
          markoraHeadingFoldRole: "placeholder",
        }).range(range.headingTo)
      );
      decorations.push(
        Decoration.replace({
          markoraHeadingFoldRole: "hidden-content",
        }).range(range.foldFrom, range.foldTo)
      );
    }
  }

  return Decoration.set(decorations, true);
}

const headingFoldStateField = StateField.define<HeadingFoldState>({
  create: (state) => {
    const foldedHeadings: readonly number[] = [];
    return {
      foldedHeadings,
      decorations: __buildHeadingFoldDecorations(state, state.facet(headingFoldConfigFacet), foldedHeadings),
    };
  },
  update: (value, transaction) => {
    const foldedHeadings = nextFoldedHeadings(value.foldedHeadings, transaction);
    return {
      foldedHeadings,
      decorations: __buildHeadingFoldDecorations(transaction.state, transaction.state.facet(headingFoldConfigFacet), foldedHeadings),
    };
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
});

class HeadingFoldViewPlugin {
  private suppressNextMouseDown = false;

  constructor(
    private readonly view: EditorView,
    _config: MarkoraHeadingFoldConfig
  ) {
    void _config;
    this.view.dom.addEventListener("pointerdown", this.handlePointerDown, true);
    this.view.dom.addEventListener("mousedown", this.handleMouseDown, true);
    this.view.dom.addEventListener("click", this.handleClick, true);
  }

  update(_update: ViewUpdate): void {
    void _update;
  }

  destroy(): void {
    this.view.dom.removeEventListener("pointerdown", this.handlePointerDown, true);
    this.view.dom.removeEventListener("mousedown", this.handleMouseDown, true);
    this.view.dom.removeEventListener("click", this.handleClick, true);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    if (readHeadingFoldButtonPosition(event.target, this.view) !== null) this.suppressNextMouseDown = true;
    this.handleToggleEvent(event);
  };

  private readonly handleMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    if (this.suppressNextMouseDown) {
      this.suppressNextMouseDown = false;
      return;
    }
    this.handleToggleEvent(event);
  };

  private readonly handleClick = (event: MouseEvent): void => {
    if (event.detail !== 0) return;
    this.handleToggleEvent(event);
  };

  private handleToggleEvent(event: MouseEvent | PointerEvent): void {
    const position = readHeadingFoldButtonPosition(event.target, this.view);
    if (position === null) return;
    event.preventDefault();
    event.stopPropagation();
    toggleHeadingFoldAt(this.view, position);
  }
}

export function headingFold(config: MarkoraHeadingFoldConfig = {}): Extension[] {
  if (config.enabled === false) return [];

  return [
    headingFoldConfigFacet.of(config),
    headingFoldStateField,
    headingFoldTheme,
    headingFoldDomHandlers,
    ViewPlugin.define((view) => new HeadingFoldViewPlugin(view, config)),
  ];
}
