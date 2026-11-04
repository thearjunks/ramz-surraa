"use client";
import { useEffect, useRef, useState } from "react";
import { verifyAction, checkInAction } from "@/lib/admin-actions";

const LOOK = {
  valid: ["ok", "VALID PASS", "Admit after check-in."],
  checked_in: ["ok", "CHECKED IN", "Welcome! Entry recorded."],
  used: ["warn", "ALREADY USED", "This pass has already been checked in."],
  already_used: ["warn", "ALREADY USED", "This pass has already been checked in."],
  invalid: ["err", "INVALID PASS", "No pass found for this code."],
  revoked: ["err", "ACCESS DENIED", "This pass is cancelled, revoked or not confirmed."],
  denied: ["err", "ACCESS DENIED", "This pass can't be checked in."],
};

// Camera scanning uses the browser's BarcodeDetector (Chrome on Android/desktop). Elsewhere: type the code or serial.
export default function Scanner() {
  const video = useRef(null);
  const [cam, setCam] = useState("off");
  const [res, setRes] = useState(null);
  const [code, setCode] = useState("");
  const [auto, setAuto] = useState(true);
  const busy = useRef(false), last = useRef("");
  const [hasDetector, setHasDetector] = useState(false);
  useEffect(() => setHasDetector("BarcodeDetector" in window), []);

  async function handle(raw) {
    if (busy.current || !raw) return;
    busy.current = true;
    try {
      let r = await verifyAction(raw);
      if (r.result === "valid" && auto && !r.wrongDay) r = { ...r, result: (await checkInAction(r.pass.id)).result };
      setRes(r);
      try { navigator.vibrate?.(r.result === "checked_in" || r.result === "valid" ? 80 : [60, 60, 60]); } catch {}
    } finally { setTimeout(() => (busy.current = false), 1200); }
  }

  useEffect(() => {
    if (cam !== "on") return;
    let stream, timer, stop = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.current.srcObject = stream; await video.current.play();
        const det = new window.BarcodeDetector({ formats: ["qr_code"] });
        const tick = async () => {
          if (stop) return;
          try { const c = await det.detect(video.current); if (c[0] && c[0].rawValue !== last.current) { last.current = c[0].rawValue; handle(c[0].rawValue); setTimeout(() => (last.current = ""), 4000); } } catch {}
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch { setCam("error"); }
    })();
    return () => { stop = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, [cam]); // eslint-disable-line react-hooks/exhaustive-deps

  const look = res && LOOK[res.result];
  return (
    <div className="k-scanner">
      <div className="k-scan-cam">
        {cam === "on" ? <video ref={video} playsInline muted /> : <div className="scan-ph">
          {hasDetector ? <div><p style={{ marginBottom: 12 }}>Point the camera at the QR code on the entry pass.</p><button className="btn btn-primary btn-lg" onClick={() => setCam("on")}>Start camera scanner</button></div> : <p>Camera scanning works in Chrome on Android or a laptop. You can always type the pass serial below.</p>}
          {cam === "error" && <p className="muted">Camera unavailable — allow camera access, or type the code.</p>}</div>}
      </div>
      <form className="k-scan-form" onSubmit={(e) => { e.preventDefault(); handle(code.trim()); setCode(""); }}>
        <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Type pass serial, e.g. SCA-EVT001-2026-0001" aria-label="Pass code or serial" autoFocus />
        <button className="btn btn-primary">Check pass</button>
      </form>
      <label className="consent"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Check in automatically when valid</label>
      {look && (
        <div className={"k-scan-res " + look[0]} role="status" aria-live="assertive">
          <b>{look[1]}</b><span>{look[2]}</span>
          {res.pass && <dl><dt>Name</dt><dd>{res.pass.holder}</dd><dt>Pass</dt><dd>{res.pass.serial}</dd><dt>Event</dt><dd>{res.pass.event}</dd><dt>Booking</dt><dd>{res.pass.ref}</dd></dl>}
          {res.wrongDay && res.result === "valid" && <p><b>Heads up:</b> today is not this event’s date ({res.pass.date}).</p>}
          {res.result === "valid" && <button className="btn btn-primary" onClick={async () => setRes({ ...res, result: (await checkInAction(res.pass.id)).result })}>Check in now</button>}
        </div>
      )}
    </div>
  );
}
