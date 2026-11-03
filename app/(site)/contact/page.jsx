import Icon from "@/components/Icon";
import ContactLink from "@/components/ContactLink";
import EnquiryForm, { Field } from "@/components/EnquiryForm";
import { PageHero } from "@/components/ui";
import { siteContent } from "@/lib/cms-site";

export const metadata = { title: "Contact | SURRAA Community Association Kuwait", description: "Contact SURRAA Community Association in Kuwait." };

export default function Contact() {
  const C = siteContent().company;
  return (
    <>
      <PageHero crumb="Contact"><h1>Contact <span className="grad">us</span></h1></PageHero>
      <section className="section" style={{ paddingTop: 40 }}><div className="wrap split" style={{ alignItems: "start" }}>
        <div className="stack">
          <ul className="contact-list">
            <li><span className="icon-disc"><Icon name="mail" /></span><div><small>Email</small><ContactLink k="email" /></div></li>
            <li><span className="icon-disc"><Icon name="phone" /></span><div><small>Phone</small><ContactLink k="phone" /></div></li>
            <li><span className="icon-disc"><Icon name="ticket" /></span><div><small>SUNDOWN enquiries</small><ContactLink k="passesPhone" /></div></li>
            <li><span className="icon-disc"><Icon name="pin" /></span><div><small>Location</small>{C.location}</div></li>
          </ul>
        </div>
        <div className="card" style={{ padding: "clamp(24px,4vw,44px)" }}>
          <h2 style={{ fontSize: 34, marginBottom: 22 }}>Send a message</h2>
          <EnquiryForm title="Website message">
            <Field id="f-name" label="Name *" name="name" required autoComplete="name" err="Please enter your name." full />
            <Field id="f-phone" label="Phone / WhatsApp *" type="tel" name="phone" required autoComplete="tel" placeholder="+965" err="Please enter a valid number." full />
            <Field id="f-msg" label="Message *" as="textarea" name="message" required full err="Please write a short message." />
          </EnquiryForm>
        </div>
      </div></section>
    </>
  );
}
