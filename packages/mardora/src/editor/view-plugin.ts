import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { Extension, Facet, Range, RangeSetBuilder } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { cursorInRange, selectionOverlapsRange, ThemeEnum } from "./utils";
import { createMardoraBaseTheme, MardoraContentWidth } from "./theme";
import { DecorationContext, MardoraPlugin } from "./plugin";
import { MardoraNode } from "./mardora";

export type MardoraDecorationUpdateSignal = {
  docChanged: boolean;
  selectionSet: boolean;
  viewportChanged: boolean;
  pendingCompositionDecorationRebuild?: boolean;
  view: {
    composing: boolean;
    compositionStarted: boolean;
  };
};

export function shouldRebuildMardoraDecorations(update: MardoraDecorationUpdateSignal): boolean {
  const hasDecorationTrigger =
    update.docChanged || update.selectionSet || update.viewportChanged || !!update.pendingCompositionDecorationRebuild;
  if (!hasDecorationTrigger) {
    return false;
  }

  return !update.view.composing && !update.view.compositionStarted;
}

/**
 * Facet to register plugins with the view plugin
 */
export const MardoraPluginsFacet = Facet.define<MardoraPlugin[], MardoraPlugin[]>({
  combine: (values) => values.flat(),
});

/**
 * Facet to register the onNodesChange callback
 */
export const mardoraOnNodesChangeFacet = Facet.define<
  ((nodes: MardoraNode[]) => void) | undefined,
  ((nodes: MardoraNode[]) => void) | undefined
>({
  combine: (values) => values.find((v) => v !== undefined),
});

/**
 * Facet to register the theme
 */
export const mardoraThemeFacet = Facet.define<ThemeEnum, ThemeEnum>({
  combine: (values) => values.find((v) => v !== undefined) || ThemeEnum.AUTO,
});

/**
 * Build decorations for the visible viewport
 * @param view - The EditorView instance
 * @param plugins - Optional array of plugins to invoke for decorations
 */
function buildDecorations(view: EditorView, plugins: MardoraPlugin[] = []): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const decorations: Range<Decoration>[] = [];

  // Allow plugins to contribute decorations
  if (plugins.length > 0) {
    const ctx: DecorationContext = {
      view,
      decorations,
      selectionOverlapsRange: (from, to) => selectionOverlapsRange(view, from, to),
      cursorInRange: (from, to) => cursorInRange(view, from, to),
    };

    // Sort plugins by priority and invoke each one's decoration builder
    const sortedPlugins = [...plugins].sort((a, b) => a.decorationPriority - b.decorationPriority);

    for (const plugin of sortedPlugins) {
      try {
        plugin.buildDecorations(ctx);
      } catch {
        // Silently ignore errors from partial tree states (e.g., Lezer TreeBuffer
        // "Invalid child in posBefore"). These resolve on the next update cycle.
      }
    }
  }

  // Sort decorations by position (required for RangeSetBuilder)
  decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);

  // Build the decoration set
  for (const decoration of decorations) {
    builder.add(decoration.from, decoration.to, decoration.value);
  }

  return builder.finish();
}

/**
 * mardora View Plugin
 * Handles rich markdown rendering with decorations
 */
class mardoraViewPluginClass {
  decorations: DecorationSet;
  private plugins: MardoraPlugin[];
  private onNodesChange: ((nodes: MardoraNode[]) => void) | undefined;
  private pendingCompositionDecorationRebuild = false;

  constructor(view: EditorView) {
    this.plugins = view.state.facet(MardoraPluginsFacet);
    this.onNodesChange = view.state.facet(mardoraOnNodesChangeFacet);
    this.decorations = buildDecorations(view, this.plugins);

    // Notify plugins that view is ready
    for (const plugin of this.plugins) {
      plugin.onViewReady(view);
    }

    // Call onNodesChange callback with initial nodes
    if (this.onNodesChange && typeof this.onNodesChange === "function") {
      this.onNodesChange(this.buildNodes(view));
    }
  }

  update(update: ViewUpdate) {
    // Update plugins list if facet changed
    this.plugins = update.view.state.facet(MardoraPluginsFacet);
    this.onNodesChange = update.view.state.facet(mardoraOnNodesChangeFacet);

    // Notify plugins of the update
    for (const plugin of this.plugins) {
      plugin.onViewUpdate(update);
    }

    if (
      shouldRebuildMardoraDecorations({
        docChanged: update.docChanged,
        selectionSet: update.selectionSet,
        viewportChanged: update.viewportChanged,
        view: update.view,
        pendingCompositionDecorationRebuild: this.pendingCompositionDecorationRebuild,
      })
    ) {
      this.decorations = buildDecorations(update.view, this.plugins);
      this.pendingCompositionDecorationRebuild = false;

      // Call onNodesChange callback
      if (this.onNodesChange) {
        this.onNodesChange(this.buildNodes(update.view));
      }
    } else if (update.docChanged && (update.view.composing || update.view.compositionStarted)) {
      this.decorations = this.decorations.map(update.changes);
      this.pendingCompositionDecorationRebuild = true;
    } else if ((update.selectionSet || update.viewportChanged) && (update.view.composing || update.view.compositionStarted)) {
      this.pendingCompositionDecorationRebuild = true;
    }
  }

  private buildNodes(view: EditorView): MardoraNode[] {
    const tree = syntaxTree(view.state);
    const roots: MardoraNode[] = [];
    const stack: MardoraNode[] = [];

    tree.iterate({
      enter: (nodeRef) => {
        const node: MardoraNode = {
          from: nodeRef.from,
          to: nodeRef.to,
          name: nodeRef.name,
          children: [],
          isSelected: selectionOverlapsRange(view, nodeRef.from, nodeRef.to),
        };

        if (stack.length > 0) {
          stack[stack.length - 1]!.children.push(node);
        } else {
          roots.push(node);
        }

        stack.push(node);
      },
      leave: () => {
        stack.pop();
      },
    });

    return roots;
  }
}

/**
 * The main mardora ViewPlugin extension
 */
export const mardoraViewPlugin = ViewPlugin.fromClass(mardoraViewPluginClass, {
  decorations: (v) => v.decorations,
  provide: () => [],
});

/**
 * Extension to add the cm-mardora-enabled class to the editor
 */
const mardoraEditorClass = EditorView.editorAttributes.of({ class: "cm-mardora" });

/**
 * Create mardora view extension bundle with plugin support
 * @param plugins - Optional array of MardoraPlugin instances
 * @param onNodesChange - Optional callback to receive nodes on every update
 * @returns Extension array including view plugin, theme, and plugin facet
 */
export function createMardoraViewExtension(
  theme: ThemeEnum = ThemeEnum.AUTO,
  baseStyles: boolean = true,
  plugins: MardoraPlugin[] = [],
  onNodesChange?: (nodes: MardoraNode[]) => void,
  contentWidth: MardoraContentWidth = "default"
): Extension[] {
  return [
    mardoraEditorClass,
    MardoraPluginsFacet.of(plugins),
    mardoraOnNodesChangeFacet.of(onNodesChange),
    mardoraThemeFacet.of(theme),
    mardoraViewPlugin,
    ...(baseStyles ? [createMardoraBaseTheme(contentWidth)] : []),
  ];
}
