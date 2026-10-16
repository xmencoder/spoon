/**
 * Unified helper for extracting product daily order limit
 * Supports both order_limit column and embedded BAKERY_META in product description.
 */
export function getProductOrderLimit(product: any): number | null {
  if (!product) return null;

  if (
    product.order_limit != null &&
    !isNaN(Number(product.order_limit)) &&
    Number(product.order_limit) > 0
  ) {
    return Number(product.order_limit);
  }

  if (
    product.description &&
    typeof product.description === "string" &&
    product.description.includes("<!-- BAKERY_META:")
  ) {
    try {
      const match = product.description.match(/<!-- BAKERY_META:([\s\S]*?) -->/);
      if (match && match[1]) {
        const meta = JSON.parse(match[1]);
        if (
          meta.order_limit != null &&
          !isNaN(Number(meta.order_limit)) &&
          Number(meta.order_limit) > 0
        ) {
          return Number(meta.order_limit);
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}
