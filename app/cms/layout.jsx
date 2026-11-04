import "./cms.css";

export const metadata = { title: { default: "CMS | SURRAA Community Association", template: "%s · SURRAA CMS" }, robots: { index: false, follow: false } };

export default function CmsRoot({ children }) {
  return <div className="cms">{children}</div>;
}
