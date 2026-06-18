type IconElementName = "circle" | "line" | "path" | "rect";

type IconElementDefinition = {
  name: IconElementName;
  attrs: Record<string, string>;
};

export type MarkoraIconName =
  | "arrow-down"
  | "arrow-down-to-line"
  | "arrow-left"
  | "arrow-left-to-line"
  | "arrow-right"
  | "arrow-right-to-line"
  | "arrow-up"
  | "arrow-up-to-line"
  | "baseline"
  | "bold"
  | "code"
  | "copy"
  | "external-link"
  | "file"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "heading-4"
  | "heading-5"
  | "heading-6"
  | "highlighter"
  | "image"
  | "italic"
  | "link"
  | "list"
  | "list-ordered"
  | "list-todo"
  | "minus"
  | "music-2"
  | "play"
  | "strikethrough"
  | "table"
  | "table-delete"
  | "table-of-contents"
  | "text-quote"
  | "trash-2"
  | "underline"
  | "type";

const svgNamespace = "http://www.w3.org/2000/svg";

const iconDefinitions: Record<MarkoraIconName, IconElementDefinition[]> = {
  "arrow-down": [
    { name: "path", attrs: { d: "M12 5v14" } },
    { name: "path", attrs: { d: "m19 12-7 7-7-7" } },
  ],
  "arrow-down-to-line": [
    { name: "path", attrs: { d: "M19 21H5" } },
    { name: "path", attrs: { d: "M12 3v14" } },
    { name: "path", attrs: { d: "m19 10-7 7-7-7" } },
  ],
  "arrow-left": [
    { name: "path", attrs: { d: "M19 12H5" } },
    { name: "path", attrs: { d: "m12 19-7-7 7-7" } },
  ],
  "arrow-left-to-line": [
    { name: "path", attrs: { d: "M3 5v14" } },
    { name: "path", attrs: { d: "M21 12H7" } },
    { name: "path", attrs: { d: "m14 19-7-7 7-7" } },
  ],
  "arrow-right": [
    { name: "path", attrs: { d: "M5 12h14" } },
    { name: "path", attrs: { d: "m12 5 7 7-7 7" } },
  ],
  "arrow-right-to-line": [
    { name: "path", attrs: { d: "M21 5v14" } },
    { name: "path", attrs: { d: "M3 12h14" } },
    { name: "path", attrs: { d: "m10 5 7 7-7 7" } },
  ],
  "arrow-up": [
    { name: "path", attrs: { d: "M12 19V5" } },
    { name: "path", attrs: { d: "m5 12 7-7 7 7" } },
  ],
  "arrow-up-to-line": [
    { name: "path", attrs: { d: "M5 3h14" } },
    { name: "path", attrs: { d: "M12 21V7" } },
    { name: "path", attrs: { d: "m5 14 7-7 7 7" } },
  ],
  baseline: [
    { name: "path", attrs: { d: "M4 20h16" } },
    { name: "path", attrs: { d: "m6 16 6-12 6 12" } },
    { name: "path", attrs: { d: "M8 12h8" } },
  ],
  bold: [
    {
      name: "path",
      attrs: {
        d: "M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8",
      },
    },
  ],
  code: [
    { name: "path", attrs: { d: "m16 18 6-6-6-6" } },
    { name: "path", attrs: { d: "m8 6-6 6 6 6" } },
  ],
  copy: [
    { name: "rect", attrs: { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" } },
    { name: "path", attrs: { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" } },
  ],
  "external-link": [
    { name: "path", attrs: { d: "M15 3h6v6" } },
    { name: "path", attrs: { d: "M10 14 21 3" } },
    { name: "path", attrs: { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" } },
  ],
  file: [
    {
      name: "path",
      attrs: {
        d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      },
    },
    { name: "path", attrs: { d: "M14 2v5a1 1 0 0 0 1 1h5" } },
  ],
  "heading-1": [
    { name: "path", attrs: { d: "M4 12h8" } },
    { name: "path", attrs: { d: "M4 18V6" } },
    { name: "path", attrs: { d: "M12 18V6" } },
    { name: "path", attrs: { d: "m17 12 3-2v8" } },
  ],
  "heading-2": [
    { name: "path", attrs: { d: "M4 12h8" } },
    { name: "path", attrs: { d: "M4 18V6" } },
    { name: "path", attrs: { d: "M12 18V6" } },
    { name: "path", attrs: { d: "M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" } },
  ],
  "heading-3": [
    { name: "path", attrs: { d: "M4 12h8" } },
    { name: "path", attrs: { d: "M4 18V6" } },
    { name: "path", attrs: { d: "M12 18V6" } },
    { name: "path", attrs: { d: "M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" } },
    { name: "path", attrs: { d: "M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" } },
  ],
  "heading-4": [
    { name: "path", attrs: { d: "M12 18V6" } },
    { name: "path", attrs: { d: "M17 10v3a1 1 0 0 0 1 1h3" } },
    { name: "path", attrs: { d: "M21 10v8" } },
    { name: "path", attrs: { d: "M4 12h8" } },
    { name: "path", attrs: { d: "M4 18V6" } },
  ],
  "heading-5": [
    { name: "path", attrs: { d: "M4 12h8" } },
    { name: "path", attrs: { d: "M4 18V6" } },
    { name: "path", attrs: { d: "M12 18V6" } },
    { name: "path", attrs: { d: "M17 13v-3h4" } },
    { name: "path", attrs: { d: "M17 17.7c.4.2.8.3 1.3.3 1.5 0 2.7-1.1 2.7-2.5S19.8 13 18.3 13H17" } },
  ],
  "heading-6": [
    { name: "path", attrs: { d: "M4 12h8" } },
    { name: "path", attrs: { d: "M4 18V6" } },
    { name: "path", attrs: { d: "M12 18V6" } },
    { name: "circle", attrs: { cx: "19", cy: "16", r: "2" } },
    { name: "path", attrs: { d: "M20 10c-2 2-3 3.5-3 6" } },
  ],
  highlighter: [
    { name: "path", attrs: { d: "m9 11-6 6v3h9l3-3" } },
    { name: "path", attrs: { d: "m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" } },
  ],
  image: [
    { name: "rect", attrs: { width: "18", height: "18", x: "3", y: "3", rx: "2", ry: "2" } },
    { name: "circle", attrs: { cx: "9", cy: "9", r: "2" } },
    { name: "path", attrs: { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" } },
  ],
  italic: [
    { name: "line", attrs: { x1: "19", x2: "10", y1: "4", y2: "4" } },
    { name: "line", attrs: { x1: "14", x2: "5", y1: "20", y2: "20" } },
    { name: "line", attrs: { x1: "15", x2: "9", y1: "4", y2: "20" } },
  ],
  link: [
    { name: "path", attrs: { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" } },
    { name: "path", attrs: { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" } },
  ],
  list: [
    { name: "path", attrs: { d: "M3 5h.01" } },
    { name: "path", attrs: { d: "M3 12h.01" } },
    { name: "path", attrs: { d: "M3 19h.01" } },
    { name: "path", attrs: { d: "M8 5h13" } },
    { name: "path", attrs: { d: "M8 12h13" } },
    { name: "path", attrs: { d: "M8 19h13" } },
  ],
  "list-ordered": [
    { name: "path", attrs: { d: "M11 5h10" } },
    { name: "path", attrs: { d: "M11 12h10" } },
    { name: "path", attrs: { d: "M11 19h10" } },
    { name: "path", attrs: { d: "M4 4h1v5" } },
    { name: "path", attrs: { d: "M4 9h2" } },
    { name: "path", attrs: { d: "M6.5 20H3.4c0-1 2.6-1.925 2.6-3.5a1.5 1.5 0 0 0-2.6-1.02" } },
  ],
  "list-todo": [
    { name: "path", attrs: { d: "M13 5h8" } },
    { name: "path", attrs: { d: "M13 12h8" } },
    { name: "path", attrs: { d: "M13 19h8" } },
    { name: "path", attrs: { d: "m3 17 2 2 4-4" } },
    { name: "rect", attrs: { x: "3", y: "4", width: "6", height: "6", rx: "1" } },
  ],
  minus: [{ name: "path", attrs: { d: "M5 12h14" } }],
  "music-2": [
    { name: "circle", attrs: { cx: "8", cy: "18", r: "4" } },
    { name: "path", attrs: { d: "M12 18V2l7 4" } },
  ],
  play: [
    {
      name: "path",
      attrs: { d: "M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" },
    },
  ],
  strikethrough: [
    { name: "path", attrs: { d: "M16 4H9a3 3 0 0 0-2.83 4" } },
    { name: "path", attrs: { d: "M14 12a4 4 0 0 1 0 8H6" } },
    { name: "line", attrs: { x1: "4", x2: "20", y1: "12", y2: "12" } },
  ],
  table: [
    { name: "path", attrs: { d: "M12 3v18" } },
    { name: "rect", attrs: { width: "18", height: "18", x: "3", y: "3", rx: "2" } },
    { name: "path", attrs: { d: "M3 9h18" } },
    { name: "path", attrs: { d: "M3 15h18" } },
  ],
  "table-delete": [
    { name: "rect", attrs: { width: "18", height: "18", x: "3", y: "3", rx: "2" } },
    { name: "path", attrs: { d: "M3 9h18" } },
    { name: "path", attrs: { d: "M9 3v18" } },
    { name: "path", attrs: { d: "m14 14 4 4" } },
    { name: "path", attrs: { d: "m18 14-4 4" } },
  ],
  "table-of-contents": [
    { name: "path", attrs: { d: "M16 5H3" } },
    { name: "path", attrs: { d: "M16 12H3" } },
    { name: "path", attrs: { d: "M16 19H3" } },
    { name: "path", attrs: { d: "M21 5h.01" } },
    { name: "path", attrs: { d: "M21 12h.01" } },
    { name: "path", attrs: { d: "M21 19h.01" } },
  ],
  "text-quote": [
    { name: "path", attrs: { d: "M17 5H3" } },
    { name: "path", attrs: { d: "M21 12H8" } },
    { name: "path", attrs: { d: "M21 19H8" } },
    { name: "path", attrs: { d: "M3 12v7" } },
  ],
  "trash-2": [
    { name: "path", attrs: { d: "M10 11v6" } },
    { name: "path", attrs: { d: "M14 11v6" } },
    { name: "path", attrs: { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" } },
    { name: "path", attrs: { d: "M3 6h18" } },
    { name: "path", attrs: { d: "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" } },
  ],
  underline: [
    { name: "path", attrs: { d: "M6 4v6a6 6 0 0 0 12 0V4" } },
    { name: "line", attrs: { x1: "4", x2: "20", y1: "20", y2: "20" } },
  ],
  type: [
    { name: "path", attrs: { d: "M12 4v16" } },
    { name: "path", attrs: { d: "M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" } },
    { name: "path", attrs: { d: "M9 20h6" } },
  ],
};

export function hasMarkoraIcon(name: string): name is MarkoraIconName {
  return name in iconDefinitions;
}

export function createMarkoraIcon(name: string): SVGSVGElement | null {
  if (!hasMarkoraIcon(name)) return null;

  const svg = document.createElementNS(svgNamespace, "svg");
  svg.setAttribute("xmlns", svgNamespace);
  svg.setAttribute("width", "24");
  svg.setAttribute("height", "24");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  for (const definition of iconDefinitions[name]) {
    const element = document.createElementNS(svgNamespace, definition.name);
    for (const [attr, value] of Object.entries(definition.attrs)) {
      element.setAttribute(attr, value);
    }
    svg.appendChild(element);
  }

  return svg;
}
