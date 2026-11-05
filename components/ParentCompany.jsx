export default function ParentCompany() {
  return (
    <section className="parent-company" aria-labelledby="parent-company-title">
      <img src="/images/unit-trust-logo.png" alt="Unit Trust General Trading Co logo" loading="lazy" />
      <div>
        <span className="kicker">Parent company</span>
        <h2 id="parent-company-title">Unit Trust General Trading Co</h2>
        <div className="parent-addresses">
          <p><b>English address</b><br />Shop 13/25, Floor M1, Wafi Complex / Kuwait Investment Authority, Plot 10, Muscat Street, Block 7, Khaitan, Farwaniya Governorate, Kuwait.<br /><strong>PACI Address Number: 18205282</strong></p>
          <p lang="ar" dir="rtl"><b>العنوان</b><br />خيطان، قطعة 7، شارع مسقط، قسيمة 10، مجمع وافي / الهيئة العامة للاستثمار، الدور M1، محل رقم 13/25، محافظة الفروانية، الكويت.<br /><strong>الرقم الآلي للعنوان: 18205282</strong></p>
        </div>
      </div>
    </section>
  );
}
