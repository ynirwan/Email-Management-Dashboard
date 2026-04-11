import { LegalLayout } from "@/components/layout/LegalLayout";

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="January 2025">
      <p>
        ZeniPost ("we", "our", "us") operates this website and the ZeniPost software. We respect your
        privacy and are committed to protecting your information.
      </p>

      <h2>1. Information We Collect</h2>
      <h3 className="font-semibold mt-4 mb-2">a) Website Information</h3>
      <ul>
        <li>Name, email (if you contact us or create an account)</li>
        <li>Payment details (processed via third-party providers — we never store raw card data)</li>
        <li>Usage data (IP address, browser, pages visited)</li>
      </ul>
      <h3 className="font-semibold mt-4 mb-2">b) ZeniPost Software</h3>
      <p>
        ZeniPost is <strong>self-hosted</strong>. We do <strong>not</strong> store your:
      </p>
      <ul>
        <li>Subscriber data</li>
        <li>Email content</li>
        <li>Campaign data</li>
      </ul>
      <p>All such data remains on your own server.</p>

      <h2>2. How We Use Information</h2>
      <p>We use collected data to:</p>
      <ul>
        <li>Provide and improve our website and services</li>
        <li>Process payments and issue licenses</li>
        <li>Respond to support requests</li>
        <li>Send important product updates</li>
      </ul>

      <h2>3. Cookies</h2>
      <p>We use cookies for:</p>
      <ul>
        <li>Basic site functionality</li>
        <li>Analytics (if enabled)</li>
      </ul>
      <p>See our <a href="/legal/cookies" className="text-primary hover:underline">Cookie Policy</a> for details.</p>

      <h2>4. Third-Party Services</h2>
      <p>We may use:</p>
      <ul>
        <li>Payment processors (e.g., Stripe) — governed by their own privacy policy</li>
        <li>Analytics tools — anonymized where possible</li>
      </ul>

      <h2>5. Data Security</h2>
      <p>
        We take reasonable technical and organisational measures to protect your data. However, no
        system is 100% secure and we cannot guarantee absolute security.
      </p>

      <h2>6. Your Rights</h2>
      <p>You may request:</p>
      <ul>
        <li>Access to personal data we hold about you</li>
        <li>Deletion of your data</li>
        <li>Correction of inaccurate data</li>
      </ul>
      <p>To exercise these rights, contact us at the address below.</p>

      <h2>7. Changes to This Policy</h2>
      <p>We may update this policy from time to time. Changes will be posted on this page with an updated date.</p>

      <h2>8. Contact</h2>
      <p>
        ZeniPost<br />
        Email: <a href="mailto:legal@zenipost.com" className="text-primary hover:underline">legal@zenipost.com</a>
      </p>
    </LegalLayout>
  );
}
