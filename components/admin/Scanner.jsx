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

// qr-scanner falls back to its QR decoder when BarcodeDetector is unavailable (including iPhone browsers).
export default function Scanner() {
  const video = useRef(null);
  const [cam, setCam] = useState("off");
  const [res, setRes] = useState(null);
  const [code, setCode] = useState("");
  const [auto, setAuto] = useState(true);
  const busy = useRef(false), last = useRef(""), autoRef = useRef(auto);
  const [canCamera, setCanCamera] = useState(false);
  useEffect(() => { autoRef.current = auto; }, [auto]);
  useEffect(() => setCanCamera(!!navigator.mediaDevices?.getUserMedia && window.isSecureContext), []);

  async function handle(raw) {
    if (busy.current || !raw) return;
    busy.current = true;
    try {
      let r = await verifyAction(raw);
      if (r.result === "valid" && autoRef.current && !r.wrongDay) r = { ...r, result: (await checkInAction(r.pass.id)).result };
      setRes(r);
      try { navigator.vibrate?.(r.result === "checked_in" || r.result === "valid" ? 80 : [60, 60, 60]); } catch {}
    } finally { setTimeout(() => (busy.current = false), 1200); }
  }

  useEffect(() => {
    if (cam !== "on") return;
    let scanner, stop = false;
    (async () => {
      try {
        const QrScanner = (await import("qr-scanner")).default;
        if (stop || !video.current) return;
        scanner = new QrScanner(video.current, (result) => {
          const raw = result.data;
          if (raw && raw !== last.current) { last.current = raw; handle(raw); setTimeout(() => (last.current = ""), 4000); }
        }, { preferredCamera: "environment", returnDetailedScanResult: true, maxScansPerSecond: 8 });
        await scanner.start();
      } catch { setCam("error"); }
    })();
    return () => { stop = true; scanner?.destroy(); };
  }, [cam]); // eslint-disable-line react-hooks/exhaustive-deps

  const look = res && LOOK[res.result];
  return (
    <div className="scanner">
      <div className="scan-cam">
        {cam === "on" ? <video ref={video} playsInline muted /> : <div className="scan-ph">
          {canCamera ? <button className="btn btn-primary" onClick={() => setCam("on")}>Start camera</button> : <p className="muted">Camera scanning needs HTTPS and camera permission. You can type the pass code or serial below.</p>}
          {cam === "error" && <p className="muted">Camera unavailable — allow camera access in your browser, or type the code.</p>}</div>}
      </div>
      <form className="a-inline" onSubmit={(e) => { e.preventDefault(); handle(code.trim()); setCode(""); }}>
        <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="QR code or pass serial (SCA-EVT001-2026-0001)" aria-label="Pass code or serial" />
        <button className="btn btn-primary">Verify</button>
      </form>
      <label className="consent"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Check in automatically when valid</label>
      {look && (
        <div className={"scan-res " + look[0]} role="status" aria-live="assertive">
          <b>{look[1]}</b><span>{look[2]}</span>
          {res.pass && <dl><div><dt>Serial</dt><dd>{res.pass.serial}</dd></div><div><dt>Holder</dt><dd>{res.pass.holder}</dd></div><div><dt>Event</dt><dd>{res.pass.code} · {res.pass.event}</dd></div><div><dt>Booking</dt><dd>{res.pass.ref}</dd></div></dl>}
          {res.wrongDay && res.result === "valid" && <p><b>Note:</b> today is not this event’s date ({res.pass.date}).</p>}
          {res.result === "valid" && <button className="btn btn-primary" onClick={async () => setRes({ ...res, result: (await checkInAction(res.pass.id)).result })}>Check in now</button>}
        </div>
      )}
    </div>
  );
}
