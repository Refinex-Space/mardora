import type { DraftlySlashCommand, DraftlySlashQuery } from "./types";

const slashLinePattern = /^\/([^\s]*)$/;

export function detectSlashQuery(documentText: string, cursorPosition: number): DraftlySlashQuery | null {
  const safeCursor = Math.max(0, Math.min(cursorPosition, documentText.length));
  const lineStart = documentText.lastIndexOf("\n", safeCursor - 1) + 1;
  const lineTextBeforeCursor = documentText.slice(lineStart, safeCursor);
  const match = lineTextBeforeCursor.match(slashLinePattern);

  if (!match) {
    return null;
  }

  return {
    from: lineStart,
    to: safeCursor,
    query: match[1] ?? "",
  };
}

export function filterSlashCommands(commands: readonly DraftlySlashCommand[], query: string): DraftlySlashCommand[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return [...commands];
  }

  return commands.filter((command) => {
    const searchable = [command.title, command.id, command.hint, ...command.aliases].join(" ").toLocaleLowerCase();
    return searchable.includes(normalizedQuery);
  });
}
