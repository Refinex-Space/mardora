export type NativeSelectionActivationInput = {
  editorSelectionEmpty: boolean;
  nativeSelectionCollapsed: boolean;
  anchorInEditor: boolean;
  focusInEditor: boolean;
  rangeCount: number;
  anchorExcluded?: boolean;
  focusExcluded?: boolean;
};

export type SelectionToolbarSyntaxNodeInput = {
  selectionFrom: number;
  selectionTo: number;
  nodeFrom: number;
  nodeTo: number;
  nodeName: string;
};

type ClassListLike = {
  length: number;
  item(index: number): string | null;
};

type ElementLike = {
  className?: unknown;
  classList?: unknown;
  parentElement?: unknown;
};

const excludedClassPrefixes = [
  "cm-mardora-code-block",
  "cm-mardora-code-caption",
  "cm-mardora-code-copy",
  "cm-mardora-code-diff",
  "cm-mardora-code-fence",
  "cm-mardora-code-header",
  "cm-mardora-code-line",
  "cm-mardora-image-",
  "cm-mardora-math-",
  "cm-mardora-mermaid-",
] as const;

const excludedSyntaxNodeNames = new Set([
  "FencedCode",
  "MermaidBlock",
  "MathBlock",
  "InlineMath",
  "Image",
  "HorizontalRule",
]);

/** Returns whether a browser native selection should activate the toolbar. */
export function canActivateFromNativeSelection(input: NativeSelectionActivationInput): boolean {
  return (
    !input.nativeSelectionCollapsed &&
    input.anchorInEditor &&
    input.focusInEditor &&
    input.rangeCount > 0 &&
    !input.anchorExcluded &&
    !input.focusExcluded
  );
}

export function hasSelectionToolbarExcludedAncestor(target: unknown, root?: unknown): boolean {
  let current = toElementLike(target);
  while (current) {
    if (hasExcludedClass(current)) {
      return true;
    }
    if (current === root) {
      return false;
    }
    current = toElementLike(current.parentElement);
  }
  return false;
}

export function selectionOverlapsExcludedSyntaxNode(input: SelectionToolbarSyntaxNodeInput): boolean {
  return (
    excludedSyntaxNodeNames.has(input.nodeName) &&
    input.selectionFrom < input.nodeTo &&
    input.selectionTo > input.nodeFrom
  );
}

function toElementLike(value: unknown): ElementLike | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const element = value as ElementLike;
  if (hasClassData(element)) {
    return element;
  }
  return toElementLike(element.parentElement);
}

function hasClassData(value: ElementLike): boolean {
  return value.className !== undefined || value.classList !== undefined || value.parentElement !== undefined;
}

function hasExcludedClass(element: ElementLike): boolean {
  for (const className of classNamesFrom(element)) {
    if (excludedClassPrefixes.some((prefix) => className.startsWith(prefix))) {
      return true;
    }
  }
  return false;
}

function classNamesFrom(element: ElementLike): string[] {
  const classList = element.classList;
  if (isClassListLike(classList)) {
    const classNames: string[] = [];
    for (let index = 0; index < classList.length; index += 1) {
      const item = classList.item(index);
      if (item) classNames.push(item);
    }
    return classNames;
  }
  return typeof element.className === "string" ? element.className.split(/\s+/).filter(Boolean) : [];
}

function isClassListLike(value: unknown): value is ClassListLike {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as ClassListLike).length === "number" &&
    typeof (value as ClassListLike).item === "function"
  );
}
