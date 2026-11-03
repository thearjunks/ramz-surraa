import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm, can } from "@/lib/auth";
import { db } from "@/lib/db";
import { eventEditorial } from "@/lib/event-editorial";
import { saveEventEditorial } from "@/lib/event-editorial-actions";
import { Head } from "@/components/admin/ui";
import ActionForm from "@/components/ActionForm";
import CmsEntryFields from "@/components/admin/CmsEntryFields";
import { src } from "@/lib/site";

export default async function EventEditorialEditor({params,searchParams}) {
  const user = await requirePerm("content"), sp = await searchParams;
  const event = eventEditorial((await params).id);
  if (!event) notFound();
  const {live,draft,values} = event;
  const fields = [{key:"name",label:"Event name",type:"text",required:true},{key:"category",label:"Category",type:"text"},{key:"description",label:"Description",type:"richtext"},{key:"poster",label:"Event poster",type:"media"}];
  const media = db.prepare("SELECT url,filename,mime,alt_text FROM cms_media WHERE mime LIKE 'image/%' ORDER BY filename").all().map((m)=>({...m}));
  return <><Head title={live.name} sub={sp.preview ? "Saved content preview" : "Event content"}><Link className="btn btn-ghost" href="/cms/collections/events/">Events</Link>
    {can(user,"events") && <Link className="btn btn-ghost" href={`/admin/events/${live.id}/`}>Event settings in Admin</Link>}</Head>
    {sp.saved && <p className="notice ok" style={{display:"block"}}>{sp.saved === "draft" ? "Draft saved." : "Event content published."}</p>}
    {sp.preview ? <article className="a-card"><h2>{values.name}</h2>{values.poster && <img src={src(values.poster)} alt={values.name} style={{maxWidth:300}}/>}<p>{values.category}</p><p style={{whiteSpace:"pre-line"}}>{values.description}</p><Link href={`/cms/collections/events/${live.id}/`}>Return to editor</Link></article>
    : <section className="a-card"><Link href={`/cms/collections/events/${live.id}/?preview=1`} target="_blank">Preview saved content ↗</Link>
      <ActionForm action={saveEventEditorial} submit="Save event content" className="form a-form3" hidden={{id:live.id,updated_at:live.updated_at,draft_at:draft?.at || ""}} fields={[{name:"intent",type:"select",label:"Save action",noEmpty:true,defaultValue:"draft",options:[["draft","Save draft"],["published","Publish content"]]}]}>
        <CmsEntryFields fields={fields} initial={Object.fromEntries(fields.map((f)=>[f.key,values[f.key] || ""]))} media={media}/></ActionForm></section>}</>;
}
