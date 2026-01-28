// SKU generation utilities

// Category code mapping for SKU generation
const CATEGORY_CODES: Record<string, string> = {
  'Tablet': 'TAB',
  'Capsule': 'CAP',
  'Syrup': 'SYR',
  'Drop': 'DRP',
  'Ointment': 'OIN',
  'Injection': 'INJ',
  'Device': 'DEV',
};

/**
 * Generate SKU based on category
 * Format: CAT-XXXX (e.g., TAB-0001, SYR-0002)
 */
export function generateSKU(categoryName: string, existingSKUs: string[]): string {
  const categoryCode = CATEGORY_CODES[categoryName] || 'GEN';
  
  // Find the highest existing number for this category
  const categoryPattern = new RegExp(`^${categoryCode}-(\\d+)$`);
  let maxNumber = 0;
  
  for (const sku of existingSKUs) {
    const match = sku.match(categoryPattern);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }
  
  const nextNumber = (maxNumber + 1).toString().padStart(4, '0');
  return `${categoryCode}-${nextNumber}`;
}

/**
 * Check if a category requires batch/expiry tracking
 */
export function requiresBatchTracking(categoryName: string): boolean {
  const noBatchCategories = ['Device'];
  return !noBatchCategories.includes(categoryName);
}
