import { installCatalog } from "./src/catalog/installCatalog";
import { buildFixtureCatalogPayload } from "./src/testSupport/buildFixtureCatalogPayload";

installCatalog(buildFixtureCatalogPayload());
