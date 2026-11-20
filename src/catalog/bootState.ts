export let usedCachedCatalogOnBoot = false;

export function markUsedCachedCatalogOnBoot(): void {
  usedCachedCatalogOnBoot = true;
}

export function consumeCachedCatalogBootFlag(): boolean {
  const value = usedCachedCatalogOnBoot;
  usedCachedCatalogOnBoot = false;
  return value;
}
