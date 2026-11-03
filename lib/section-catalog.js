import { HOME_LABELS, homeVersions } from "./home-cms";
import { routeTreeVersions, ROUTE_TREE_SLUGS } from "./route-tree";
import { SITE_ROUTES } from "./cms";

export function sectionCatalog() {
  const result = homeVersions().published.map((s) => ({
    value: "home/" + s.id, name: HOME_LABELS[s.id], page: "Home", visible: s.visible, editor: "/cms/home/",
  }));
  for (const slug of ROUTE_TREE_SLUGS) {
    const route = SITE_ROUTES.find((r) => r[2] === slug);
    for (const s of routeTreeVersions(slug).published) {
      result.push({ value: slug + "/" + s.id, name: s.label, page: route[0], visible: s.visible, editor: "/cms/routes/" + slug + "/" });
    }
  }
  return result;
}
