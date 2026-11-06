import type { ReactNode } from "react";

/**
 * Retained as a no-op seam for call sites. The product UI never exposes
 * demo/mock/backend messaging — the experience is presented as the real
 * Fluxeaze product.
 */
export function MockHint(_props: { children?: ReactNode }) {
  void _props;
  return null;
}
