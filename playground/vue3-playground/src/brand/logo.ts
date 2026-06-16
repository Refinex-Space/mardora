// Markora brand logo as inline SVG markup for the Vue 3 playground.
const base = (fill: string, title: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Markora" width="100%" height="100%">` +
  `<title>${title}</title>` +
  `<g fill="${fill}">` +
  `<path d="M138 182H333C308 188 299 221 312 255L486 674L414 828L172 267C161 241 151 212 138 182Z"/>` +
  `<path d="M402 182H607C581 188 573 220 587 254L750 669L674 831L437 262C426 236 417 209 402 182Z"/>` +
  `<path d="M769 182H915C876 212 846 252 829 307C828 262 808 218 769 182Z"/>` +
  `</g></svg>`;

// Dark-mode variant: white logo (for dark backgrounds).
export const LOGO_DARK_SVG = base("#FFFFFF", "Markora");

// Light-mode variant: near-black logo (for light backgrounds).
export const LOGO_LIGHT_SVG = base("#111111", "Markora");
