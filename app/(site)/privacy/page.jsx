import { PageHero } from "@/components/ui";

export const metadata = { title: "Privacy Policy | SURRAA Community Association", description: "Privacy policy for the SURRAA Community Association website." };

export default function Privacy() {
  return (
    <>
      <PageHero crumb="Privacy Policy" lead="How we handle the information you share with us."><h1>Privacy policy</h1></PageHero>
      <section className="section"><div className="wrap prose">
        <p><em>Template — please review with your legal adviser before publishing.</em></p>
        <h2>Information we collect</h2><p>When you create an account, request an entry pass or contact us, we collect the details you provide: name, mobile / WhatsApp number, email, nationality and — for entry pass requests — your Kuwait Civil ID number. We also record the date and time of your request and the page it was made from.</p>
        <h2>How we use it</h2><p>We use your information to manage your account and entry pass requests, verify identity at the entrance, contact you about your requests and events, and respond to your messages. We do not sell your personal information.</p>
        <h2>Civil ID</h2><p>Your Civil ID number is stored encrypted, is visible only to authorised staff, and never appears on entry passes, QR codes or links. It is used only to verify entry pass requests and prevent duplicates.</p>
        <h2>Third-party services</h2><p>This website uses Google Fonts, Google Maps. These services may collect technical data according to their own privacy policies.</p>
        <h2>Retention & your rights</h2><p>We keep request data only as long as needed for the event and legitimate records, and delete Civil ID numbers when they are no longer required. You can ask us to access, correct or delete your information, or unsubscribe at any time, by emailing <a href="mailto:info@surraa.com">info@surraa.com</a>.</p>
        <h2>Contact</h2><p>SURRAA Community Association, Kuwait — info@surraa.com</p>
      </div></section>
    </>
  );
}
