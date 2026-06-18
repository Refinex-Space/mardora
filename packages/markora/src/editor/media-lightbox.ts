import { createMarkoraIcon } from "./icons";

export type MediaLightboxContent =
  | {
      readonly kind: "image";
      readonly src: string;
      readonly alt: string;
      readonly title?: string;
    }
  | {
      readonly kind: "html";
      readonly html: string;
      readonly title?: string;
    };

export interface OpenMediaLightboxOptions {
  readonly content: MediaLightboxContent;
  readonly returnFocus?: HTMLElement | null;
}

export interface MediaLightboxHandle {
  readonly element: HTMLElement;
  close(): void;
}

export interface MediaPreviewButtonOptions {
  readonly label: string;
  readonly content: () => MediaLightboxContent | null;
}

export function consumeMediaLightboxTrigger(event: Pick<Event, "preventDefault" | "stopPropagation">): void {
  event.preventDefault();
  event.stopPropagation();
}

export function createMediaPreviewButton(
  ownerDocument: Document,
  options: MediaPreviewButtonOptions
): HTMLButtonElement {
  const button = ownerDocument.createElement("button");
  button.type = "button";
  button.className = "cm-markora-media-preview-button";
  button.setAttribute("aria-label", options.label);
  button.title = options.label;
  const icon = createMarkoraIcon("maximize-2");
  if (icon) button.appendChild(icon);
  button.addEventListener("click", (event) => {
    consumeMediaLightboxTrigger(event);
    const content = options.content();
    if (!content) return;
    openMediaLightbox(ownerDocument, { content, returnFocus: button });
  });
  return button;
}

export function openMediaLightbox(ownerDocument: Document, options: OpenMediaLightboxOptions): MediaLightboxHandle {
  ownerDocument.querySelector(".cm-markora-media-lightbox")?.remove();
  const mountPoint = options.returnFocus?.closest(".cm-editor") ?? ownerDocument.body;

  const root = ownerDocument.createElement("div");
  root.className = "cm-markora-media-lightbox";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  if (options.content.title) {
    root.setAttribute("aria-label", options.content.title);
  }

  const panel = ownerDocument.createElement("div");
  panel.className = "cm-markora-media-lightbox-panel";
  panel.addEventListener("click", (event) => event.stopPropagation());

  const closeButton = ownerDocument.createElement("button");
  closeButton.type = "button";
  closeButton.className = "cm-markora-media-lightbox-close";
  closeButton.setAttribute("aria-label", "关闭大图查看");
  closeButton.title = "关闭大图查看";
  const closeIcon = createMarkoraIcon("x");
  if (closeIcon) closeButton.appendChild(closeIcon);

  const body = ownerDocument.createElement("div");
  body.className = "cm-markora-media-lightbox-body";
  body.appendChild(createLightboxContent(ownerDocument, options.content));

  panel.appendChild(closeButton);
  panel.appendChild(body);
  root.appendChild(panel);

  const close = (): void => {
    root.remove();
    ownerDocument.removeEventListener("keydown", handleKeydown);
    options.returnFocus?.focus();
  };
  const handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      close();
    }
  };

  root.addEventListener("click", close);
  closeButton.addEventListener("click", (event) => {
    consumeMediaLightboxTrigger(event);
    close();
  });
  ownerDocument.addEventListener("keydown", handleKeydown);
  mountPoint.appendChild(root);
  closeButton.focus();

  return { element: root, close };
}

function createLightboxContent(ownerDocument: Document, content: MediaLightboxContent): HTMLElement {
  if (content.kind === "image") {
    const image = ownerDocument.createElement("img");
    image.className = "cm-markora-media-lightbox-image";
    image.src = content.src;
    image.alt = content.alt;
    if (content.title) image.title = content.title;
    return image;
  }

  const container = ownerDocument.createElement("div");
  container.className = "cm-markora-media-lightbox-html";
  container.innerHTML = content.html;
  return container;
}
