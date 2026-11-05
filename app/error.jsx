"use client";

export default function ErrorPage({ reset }) {
  return (
    <main className="section" style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <section className="card" style={{ width: "min(620px, calc(100% - 32px))", textAlign: "center" }}>
        <span className="kicker">Please try again</span>
        <h1 style={{ marginTop: 10 }}>Something went wrong</h1>
        <p className="muted">Your information is safe. Refresh this page or return home and try again.</p>
        <div className="btn-row" style={{ justifyContent: "center", marginTop: 22 }}>
          <button className="btn btn-primary" type="button" onClick={() => reset()}>Try again</button>
          <a className="btn btn-ghost" href="/">Return home</a>
        </div>
      </section>
    </main>
  );
}
