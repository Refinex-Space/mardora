import { syntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";

export type Alignment = "left" | "center" | "right";
export type TableRowKind = "header" | "body";

export interface ParsedTable {
  headers: string[];
  alignments: Alignment[];
  rows: string[][];
}

export interface TableCellInfo {
  rowKind: TableRowKind;
  rowIndex: number;
  columnIndex: number;
  from: number;
  to: number;
  contentFrom: number;
  contentTo: number;
  lineFrom: number;
  lineNumber: number;
  rawText: string;
}

export interface TableInfo {
  from: number;
  to: number;
  startLineNumber: number;
  delimiterLineNumber: number;
  endLineNumber: number;
  columnCount: number;
  alignments: Alignment[];
  cellsByRow: TableCellInfo[][];
  headerCells: TableCellInfo[];
  bodyCells: TableCellInfo[][];
}

export const BREAK_TAG = "<br />";
export const BREAK_TAG_REGEX = /<br\s*\/?>/gi;
export const DELIMITER_CELL_PATTERN = /^:?-{3,}:?$/;
/** Returns whether the character at the given index is backslash-escaped. */
export function isEscaped(text: string, index: number): boolean {
  let slashCount = 0;
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) {
    slashCount++;
  }
  return slashCount % 2 === 1;
}

/** Collects the positions of every unescaped pipe character in a line. */
export function getPipePositions(lineText: string): number[] {
  const positions: number[] = [];
  for (let index = 0; index < lineText.length; index++) {
    if (lineText[index] === "|" && !isEscaped(lineText, index)) {
      positions.push(index);
    }
  }
  return positions;
}

/** Splits a markdown table row into raw cell strings. */
export function splitTableLine(lineText: string): string[] {
  const cells: string[] = [];
  const trimmed = lineText.trim();

  if (!trimmed.includes("|")) {
    return [trimmed];
  }

  let current = "";
  for (let index = 0; index < trimmed.length; index++) {
    const char = trimmed[index]!;
    if (char === "|" && !isEscaped(trimmed, index)) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);

  if (trimmed.startsWith("|")) {
    cells.shift();
  }
  if (trimmed.endsWith("|")) {
    cells.pop();
  }

  return cells;
}

/** Checks whether the given line can participate in a table block. */
export function isTableRowLine(lineText: string): boolean {
  return getPipePositions(lineText.trim()).length > 0;
}

/** Parses a delimiter cell token into a table alignment value. */
export function parseAlignment(cell: string): Alignment {
  const trimmed = cell.trim();
  const left = trimmed.startsWith(":");
  const right = trimmed.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  return "left";
}

/** Parses the delimiter line and returns per-column alignments. */
export function parseDelimiterAlignments(lineText: string): Alignment[] | null {
  const cells = splitTableLine(lineText).map((cell) => cell.trim());
  if (cells.length === 0 || !cells.every((cell) => DELIMITER_CELL_PATTERN.test(cell))) {
    return null;
  }
  return cells.map(parseAlignment);
}

/** Splits a table node slice into its table lines and any trailing markdown. */
export function splitTableAndTrailingMarkdown(markdown: string): { tableMarkdown: string; trailingMarkdown: string } {
  const lines = markdown.split("\n");
  if (lines.length < 2) {
    return { tableMarkdown: markdown, trailingMarkdown: "" };
  }

  const headerLine = lines[0] || "";
  const delimiterLine = lines[1] || "";
  if (!isTableRowLine(headerLine) || !parseDelimiterAlignments(delimiterLine)) {
    return { tableMarkdown: markdown, trailingMarkdown: "" };
  }

  let endIndex = 1;
  for (let index = 2; index < lines.length; index++) {
    if (!isTableRowLine(lines[index] || "")) {
      break;
    }
    endIndex = index;
  }

  return {
    tableMarkdown: lines.slice(0, endIndex + 1).join("\n"),
    trailingMarkdown: lines.slice(endIndex + 1).join("\n"),
  };
}

/** Normalizes every supported `<br>` form to the canonical `<br />` token. */
export function canonicalizeBreakTags(text: string): string {
  return text.replace(BREAK_TAG_REGEX, BREAK_TAG);
}

/** Escapes literal pipe characters so cell content stays GFM-compatible. */
export function escapeUnescapedPipes(text: string): string {
  let result = "";
  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;
    if (char === "|" && !isEscaped(text, index)) {
      result += "\\|";
      continue;
    }
    result += char;
  }
  return result;
}

/** Trims and normalizes cell content before it is written back to markdown. */
export function normalizeCellContent(text: string): string {
  const normalizedBreaks = canonicalizeBreakTags(text.trim());
  if (!normalizedBreaks) {
    return "";
  }

  const parts = normalizedBreaks.split(BREAK_TAG_REGEX).map((part) => escapeUnescapedPipes(part.trim()));
  if (parts.length === 1) {
    return parts[0] || "";
  }

  return parts.join(` ${BREAK_TAG} `).trim();
}

/** Measures the visible width of a cell for markdown alignment output. */
export function renderWidth(text: string): number {
  return canonicalizeBreakTags(text).replace(BREAK_TAG, " ").replace(/\\\|/g, "|").length;
}

/** Pads a cell according to its alignment for normalized markdown output. */
export function padCell(text: string, width: number, alignment: Alignment): string {
  const safeWidth = Math.max(width, renderWidth(text));
  const difference = safeWidth - renderWidth(text);
  if (difference <= 0) {
    return text;
  }

  if (alignment === "right") {
    return " ".repeat(difference) + text;
  }

  if (alignment === "center") {
    const left = Math.floor(difference / 2);
    const right = difference - left;
    return " ".repeat(left) + text + " ".repeat(right);
  }

  return text + " ".repeat(difference);
}

/** Builds the markdown delimiter token for a column. */
export function delimiterCell(width: number, alignment: Alignment): string {
  const hyphenCount = Math.max(width, 3);
  if (alignment === "center") {
    return ":" + "-".repeat(Math.max(1, hyphenCount - 2)) + ":";
  }
  if (alignment === "right") {
    return "-".repeat(Math.max(2, hyphenCount - 1)) + ":";
  }
  return "-".repeat(hyphenCount);
}

/** Parses a markdown table block into header, alignment, and body rows. */
export function parseTableMarkdown(markdown: string): ParsedTable | null {
  const { tableMarkdown } = splitTableAndTrailingMarkdown(markdown);
  const lines = tableMarkdown.split("\n");
  if (lines.length < 2) {
    return null;
  }

  const headers = splitTableLine(lines[0] || "").map((cell) => cell.trim());
  const alignments = parseDelimiterAlignments(lines[1] || "");
  if (!alignments) {
    return null;
  }

  const rows = lines
    .slice(2)
    .filter((line) => isTableRowLine(line))
    .map((line) => splitTableLine(line).map((cell) => cell.trim()));

  return { headers, alignments, rows };
}

/** Expands all rows so the parsed table has a consistent column count. */
export function normalizeParsedTable(parsed: ParsedTable): ParsedTable {
  const columnCount = Math.max(
    parsed.headers.length,
    parsed.alignments.length,
    ...parsed.rows.map((row) => row.length),
    1
  );

  const headers = Array.from({ length: columnCount }, (_, index) => normalizeCellContent(parsed.headers[index] || ""));
  const alignments = Array.from({ length: columnCount }, (_, index) => parsed.alignments[index] || "left");
  const rows = parsed.rows.map((row) =>
    Array.from({ length: columnCount }, (_, index) => normalizeCellContent(row[index] || ""))
  );

  return { headers, alignments, rows };
}

/** Formats a parsed table back into normalized GFM markdown. */
export function formatTableMarkdown(parsed: ParsedTable): string {
  const normalized = normalizeParsedTable(parsed);
  const widths = normalized.headers.map((header, index) =>
    Math.max(renderWidth(header), ...normalized.rows.map((row) => renderWidth(row[index] || "")), 3)
  );

  const formatRow = (cells: string[]) =>
    `| ${cells.map((cell, index) => padCell(cell, widths[index] || 3, normalized.alignments[index] || "left")).join(" | ")} |`;

  const headerLine = formatRow(normalized.headers);
  const delimiterLine = `| ${normalized.alignments
    .map((alignment, index) => delimiterCell(widths[index] || 3, alignment))
    .join(" | ")} |`;
  const bodyLines = normalized.rows.map((row) => formatRow(row));

  return [headerLine, delimiterLine, ...bodyLines].join("\n");
}

/** Creates a blank row with the requested number of columns. */
export function buildEmptyRow(columnCount: number): string[] {
  return Array.from({ length: columnCount }, () => "");
}

/** Finds the visible content bounds inside a raw table cell span. */
export function getVisibleBounds(rawCellText: string): { startOffset: number; endOffset: number } {
  const leading = rawCellText.length - rawCellText.trimStart().length;
  const trailing = rawCellText.length - rawCellText.trimEnd().length;
  const trimmedLength = rawCellText.trim().length;

  if (trimmedLength === 0) {
    const placeholderOffset = Math.min(Math.floor(rawCellText.length / 2), Math.max(rawCellText.length - 1, 0));
    return {
      startOffset: placeholderOffset,
      endOffset: Math.min(placeholderOffset + 1, rawCellText.length),
    };
  }

  return {
    startOffset: leading,
    endOffset: rawCellText.length - trailing,
  };
}

/** Returns whether every cell in a body row is empty. */
export function isBodyRowEmpty(row: TableCellInfo[]): boolean {
  return row.every((cell) => normalizeCellContent(cell.rawText) === "");
}

/** Converts the live editor table model into a serializable table structure. */
export function buildTableFromInfo(tableInfo: TableInfo): ParsedTable {
  return {
    headers: tableInfo.headerCells.map((cell) => normalizeCellContent(cell.rawText)),
    alignments: [...tableInfo.alignments],
    rows: tableInfo.bodyCells.map((row) => row.map((cell) => normalizeCellContent(cell.rawText))),
  };
}

/** Maps a logical row index to its physical line index in formatted markdown. */
export function getRowLineIndex(rowIndex: number): number {
  return rowIndex === 0 ? 0 : rowIndex + 1;
}

/** Resolves the caret anchor for a cell inside normalized table markdown. */
export function getCellAnchorInFormattedTable(
  formattedTable: string,
  rowIndex: number,
  columnIndex: number,
  offset = 0
): number {
  const lines = formattedTable.split("\n");
  const lineIndex = getRowLineIndex(rowIndex);
  const lineText = lines[lineIndex] || "";
  const pipes = getPipePositions(lineText);

  if (pipes.length < columnIndex + 2) {
    return formattedTable.length;
  }

  const rawFrom = pipes[columnIndex]! + 1;
  const rawTo = pipes[columnIndex + 1]!;
  const visible = getVisibleBounds(lineText.slice(rawFrom, rawTo));
  const lineOffset = lines.slice(0, lineIndex).reduce((sum, line) => sum + line.length + 1, 0);
  return (
    lineOffset +
    Math.min(rawFrom + visible.startOffset + offset, rawFrom + Math.max(visible.endOffset - 1, visible.startOffset))
  );
}

/** Wraps a table replacement with the required blank spacer lines. */
export function createTableInsert(state: EditorState, from: number, to: number, tableMarkdown: string) {
  let insert = tableMarkdown;
  let prefixLength = 0;

  const startLine = state.doc.lineAt(from);
  if (startLine.number === 1 || state.doc.line(startLine.number - 1).text.trim() !== "") {
    insert = "\n" + insert;
    prefixLength = 1;
  }

  const endLine = state.doc.lineAt(Math.max(from, to));
  if (endLine.number === state.doc.lines || state.doc.line(endLine.number + 1).text.trim() !== "") {
    insert += "\n";
  }

  return { from, to, insert, prefixLength };
}

/** Builds a live table model from the current editor document. */
export function readTableInfo(state: EditorState, nodeFrom: number, nodeTo: number): TableInfo | null {
  const startLine = state.doc.lineAt(nodeFrom);
  const endLine = state.doc.lineAt(nodeTo);
  const delimiterLineNumber = startLine.number + 1;
  if (delimiterLineNumber > endLine.number) {
    return null;
  }

  const delimiterLine = state.doc.line(delimiterLineNumber);
  const alignments = parseDelimiterAlignments(delimiterLine.text);
  if (!alignments) {
    return null;
  }

  let effectiveEndLineNumber = delimiterLineNumber;
  for (let lineNumber = delimiterLineNumber + 1; lineNumber <= endLine.number; lineNumber++) {
    const line = state.doc.line(lineNumber);
    if (!isTableRowLine(line.text)) {
      break;
    }
    effectiveEndLineNumber = lineNumber;
  }

  const cellsByRow: TableCellInfo[][] = [];
  for (let lineNumber = startLine.number; lineNumber <= effectiveEndLineNumber; lineNumber++) {
    if (lineNumber === delimiterLineNumber) {
      continue;
    }

    const line = state.doc.line(lineNumber);
    const pipes = getPipePositions(line.text);
    if (pipes.length < 2) {
      return null;
    }

    const isHeader = lineNumber === startLine.number;
    const rowIndex = isHeader ? 0 : cellsByRow.length;
    const cells: TableCellInfo[] = [];

    for (let columnIndex = 0; columnIndex < pipes.length - 1; columnIndex++) {
      const from = line.from + pipes[columnIndex]! + 1;
      const to = line.from + pipes[columnIndex + 1]!;
      const rawText = line.text.slice(pipes[columnIndex]! + 1, pipes[columnIndex + 1]);
      const visible = getVisibleBounds(rawText);

      cells.push({
        rowKind: isHeader ? "header" : "body",
        rowIndex,
        columnIndex,
        from,
        to,
        contentFrom: from + visible.startOffset,
        contentTo: from + visible.endOffset,
        lineFrom: line.from,
        lineNumber,
        rawText,
      });
    }

    cellsByRow.push(cells);
  }

  if (cellsByRow.length === 0) {
    return null;
  }

  return {
    from: startLine.from,
    to: state.doc.line(effectiveEndLineNumber).to,
    startLineNumber: startLine.number,
    delimiterLineNumber,
    endLineNumber: effectiveEndLineNumber,
    columnCount: cellsByRow[0]!.length,
    alignments: Array.from({ length: cellsByRow[0]!.length }, (_, index) => alignments[index] || "left"),
    cellsByRow,
    headerCells: cellsByRow[0]!,
    bodyCells: cellsByRow.slice(1),
  };
}

/** Finds the table model that contains the given document position. */
export function getTableInfoAtPosition(state: EditorState, position: number): TableInfo | null {
  let resolved: TableInfo | null = null;

  syntaxTree(state).iterate({
    enter: (node) => {
      if (resolved || node.name !== "Table") {
        return;
      }

      const info = readTableInfo(state, node.from, node.to);
      if (info && position >= info.from && position <= info.to) {
        resolved = info;
      }
    },
  });

  return resolved;
}

/** Returns the table cell containing the given cursor position. */
export function findCellAtPosition(tableInfo: TableInfo, position: number): TableCellInfo | null {
  for (const row of tableInfo.cellsByRow) {
    for (const cell of row) {
      if (position >= cell.from && position <= cell.to) {
        return cell;
      }
    }
  }

  for (const row of tableInfo.cellsByRow) {
    for (const cell of row) {
      if (position >= cell.from - 1 && position <= cell.to + 1) {
        return cell;
      }
    }
  }

  let nearestCell: TableCellInfo | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const row of tableInfo.cellsByRow) {
    for (const cell of row) {
      const distance = Math.min(Math.abs(position - cell.from), Math.abs(position - cell.to));
      if (distance < nearestDistance) {
        nearestCell = cell;
        nearestDistance = distance;
      }
    }
  }

  return nearestCell;
}

/** Clamps a document position into the editable content span of a cell. */
export function clampCellPosition(cell: TableCellInfo, position: number): number {
  const cellEnd = Math.max(cell.contentFrom, cell.contentTo);
  return Math.max(cell.contentFrom, Math.min(position, cellEnd));
}

/** Collects all `<br />` token ranges from the current table. */
export function collectBreakRanges(tableInfo: TableInfo): Array<{ from: number; to: number }> {
  const ranges: Array<{ from: number; to: number }> = [];

  for (const row of tableInfo.cellsByRow) {
    for (const cell of row) {
      let match: RegExpExecArray | null;
      const regex = new RegExp(BREAK_TAG_REGEX);
      while ((match = regex.exec(cell.rawText)) !== null) {
        ranges.push({
          from: cell.from + match.index,
          to: cell.from + match.index + match[0].length,
        });
      }
    }
  }

  return ranges;
}

export type InsertSide = "above" | "below";
export type HorizontalSide = "left" | "right";
export type MoveDirection = "up" | "down" | "left" | "right";

function bodyIndexFromRowIndex(rowIndex: number): number {
  return rowIndex - 1;
}

function columnArrayIndex(columnIndex: number): number {
  return columnIndex - 1;
}

function cloneParsedTable(parsed: ParsedTable): ParsedTable {
  const normalized = normalizeParsedTable(parsed);
  return {
    headers: [...normalized.headers],
    alignments: [...normalized.alignments],
    rows: normalized.rows.map((row) => [...row]),
  };
}

function swapArrayItems<T>(items: T[], left: number, right: number): void {
  const current = items[left]!;
  items[left] = items[right]!;
  items[right] = current;
}

export function insertTableRow(parsed: ParsedTable, rowIndex: number, side: InsertSide): ParsedTable {
  const next = cloneParsedTable(parsed);
  const bodyIndex = Math.max(0, Math.min(bodyIndexFromRowIndex(rowIndex), next.rows.length));
  const insertAt = side === "above" ? bodyIndex : bodyIndex + 1;
  next.rows.splice(Math.max(0, Math.min(insertAt, next.rows.length)), 0, buildEmptyRow(next.headers.length));
  return next;
}

export function moveTableRow(
  parsed: ParsedTable,
  rowIndex: number,
  direction: Extract<MoveDirection, "up" | "down">
): ParsedTable {
  const next = cloneParsedTable(parsed);
  const bodyIndex = bodyIndexFromRowIndex(rowIndex);
  const targetIndex = direction === "up" ? bodyIndex - 1 : bodyIndex + 1;
  if (bodyIndex < 0 || bodyIndex >= next.rows.length || targetIndex < 0 || targetIndex >= next.rows.length) {
    return next;
  }
  const current = next.rows[bodyIndex]!;
  next.rows[bodyIndex] = next.rows[targetIndex]!;
  next.rows[targetIndex] = current;
  return next;
}

export function copyTableRow(parsed: ParsedTable, rowIndex: number): ParsedTable {
  const next = cloneParsedTable(parsed);
  const bodyIndex = bodyIndexFromRowIndex(rowIndex);
  if (bodyIndex < 0 || bodyIndex >= next.rows.length) {
    return next;
  }
  next.rows.splice(bodyIndex + 1, 0, [...next.rows[bodyIndex]!]);
  return next;
}

export function deleteTableRow(parsed: ParsedTable, rowIndex: number): ParsedTable {
  const next = cloneParsedTable(parsed);
  const bodyIndex = bodyIndexFromRowIndex(rowIndex);
  if (bodyIndex < 0 || bodyIndex >= next.rows.length) {
    return next;
  }
  if (next.rows.length <= 1) {
    next.rows[0] = buildEmptyRow(next.headers.length);
    return next;
  }
  next.rows.splice(bodyIndex, 1);
  return next;
}

export function insertTableColumn(parsed: ParsedTable, columnIndex: number, side: HorizontalSide): ParsedTable {
  const next = cloneParsedTable(parsed);
  const currentIndex = Math.max(0, Math.min(columnArrayIndex(columnIndex), next.headers.length));
  const insertAt = side === "left" ? currentIndex : currentIndex + 1;
  const safeInsertAt = Math.max(0, Math.min(insertAt, next.headers.length));
  next.headers.splice(safeInsertAt, 0, "");
  next.alignments.splice(safeInsertAt, 0, "left");
  for (const row of next.rows) {
    row.splice(safeInsertAt, 0, "");
  }
  return next;
}

export function moveTableColumn(
  parsed: ParsedTable,
  columnIndex: number,
  direction: Extract<MoveDirection, "left" | "right">
): ParsedTable {
  const next = cloneParsedTable(parsed);
  const currentIndex = columnArrayIndex(columnIndex);
  const targetIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || currentIndex >= next.headers.length || targetIndex < 0 || targetIndex >= next.headers.length) {
    return next;
  }
  swapArrayItems(next.headers, currentIndex, targetIndex);
  swapArrayItems(next.alignments, currentIndex, targetIndex);
  for (const row of next.rows) {
    swapArrayItems(row, currentIndex, targetIndex);
  }
  return next;
}

export function copyTableColumn(parsed: ParsedTable, columnIndex: number): ParsedTable {
  const next = cloneParsedTable(parsed);
  const currentIndex = columnArrayIndex(columnIndex);
  if (currentIndex < 0 || currentIndex >= next.headers.length) {
    return next;
  }
  next.headers.splice(currentIndex + 1, 0, next.headers[currentIndex] || "");
  next.alignments.splice(currentIndex + 1, 0, next.alignments[currentIndex] || "left");
  for (const row of next.rows) {
    row.splice(currentIndex + 1, 0, row[currentIndex] || "");
  }
  return next;
}

export function deleteTableColumn(parsed: ParsedTable, columnIndex: number): ParsedTable {
  const next = cloneParsedTable(parsed);
  if (next.headers.length <= 1) {
    return next;
  }
  const currentIndex = columnArrayIndex(columnIndex);
  if (currentIndex < 0 || currentIndex >= next.headers.length) {
    return next;
  }
  next.headers.splice(currentIndex, 1);
  next.alignments.splice(currentIndex, 1);
  for (const row of next.rows) {
    row.splice(currentIndex, 1);
  }
  return next;
}
