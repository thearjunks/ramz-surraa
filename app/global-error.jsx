"use client";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#080a08", color: "#f4f5ee", fontFamily: "Arial, sans-serif" }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, boxSizing: "border-box" }}>
          <section style={{ width: "min(600px, 100%)", padding: 32, border: "1px solid #344035", borderRadius: 20, background: "#121a14", textAlign: "center" }}>
            <h1>We could not load this page</h1>
            <p style={{ color: "#b8c0b8", lineHeight: 1.6 }}>Please try again. If the problem continues, return to the SURRAA home page.</p>
            <button type="button" onClick={() => reset()} style={{ padding: "14px 24px", border: 0, borderRadius: 999, background: "#e9ec3a", fontWeight: 700, cursor: "pointer" }}>Try again</button>
            <p><a href="/" style={{ color: "#e9ec3a" }}>Return home</a></p>
          </section>
        </main>
      </body>
    </html>
  );
}
