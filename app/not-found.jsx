import Link from "next/link";

export const metadata = { title: "Page not found | SURRAA Community Association", description: "The page you're looking for could not be found." };

export default function NotFound() {
  return (
    <section className="vision" style={{ minHeight: "80vh", display: "grid", placeItems: "center" }}><div className="wrap">
      <span className="kicker">Error 404</span>
      <h2 style={{ fontSize: "clamp(80px,16vw,200px)" }}><span className="sun">404</span></h2>
      <p className="lead">This page has left the stage. Try the homepage.</p>
      <div className="btn-row" style={{ justifyContent: "center", marginTop: 28 }}><Link className="btn btn-primary" href="/">Back to home</Link></div>
    </div></section>
  );
}
