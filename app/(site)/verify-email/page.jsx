import Link from "next/link";
import { PageHero } from "@/components/ui";
import { noindex } from "@/components/blocks";
import { db, now, audit } from "@/lib/db";
import { sha256 } from "@/lib/security";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify Email | SURRAA Community Association", ...noindex };

export default async function Verify({ searchParams }) {
  const t = (await searchParams).t || "";
  const row = db.prepare("SELECT * FROM user_tokens WHERE token_hash = ? AND kind = 'verify' AND used = 0 AND expires_at > ?").get(sha256(t), now());
  if (row) {
    db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(row.user_id);
    db.prepare("UPDATE user_tokens SET used = 1 WHERE token_hash = ?").run(row.token_hash);
    audit(row.user_id, "user.email_verified", "user", row.user_id);
  }
  return (
    <>
      <PageHero crumb="Verify email" lead={row ? "Thank you — your email address is verified." : "This link is invalid or has expired. Sign in to request a new one."}>
        <h1>{row ? "Email verified" : "Link expired"}</h1></PageHero>
      <section className="section" style={{ paddingTop: 0 }}><div className="wrap"><Link className="btn btn-primary" href="/account/">My account</Link></div></section>
    </>
  );
}
