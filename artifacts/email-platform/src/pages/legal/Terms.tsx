import { LegalLayout } from "@/components/layout/LegalLayout";

export function Terms() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="January 2025">
      <p>
        By purchasing or using ZeniPost, you agree to these Terms of Service. Please read them carefully
        before purchasing a license or using any ZeniPost service.
      </p>

      <h2>1. Product Nature</h2>
      <p>ZeniPost is a <strong>self-hosted software product</strong>.</p>
      <ul>
        <li>You install and run it on your own server</li>
        <li>You are responsible for your server infrastructure and usage</li>
        <li>We do not host your data or email campaigns</li>
      </ul>

      <h2>2. License</h2>
      <p>
        Upon purchase, you are granted a <strong>non-exclusive, non-transferable license</strong> to
        use the software according to the tier you purchased (Starter, Pro, or Agency).
      </p>
      <p>Restrictions:</p>
      <ul>
        <li>No resale of the software (except Agency license where client usage is permitted)</li>
        <li>No redistribution of source code</li>
        <li>No use for illegal purposes</li>
      </ul>
      <p>All licenses include <strong>lifetime software updates</strong>.</p>

      <h2>3. Payments</h2>
      <ul>
        <li>Software license is a <strong>one-time payment</strong></li>
        <li>Support plans are optional and billed separately (monthly or one-time)</li>
        <li>Delivery services are optional and billed monthly</li>
        <li>All payments are non-refundable unless required by law — see our <a href="/legal/refunds" className="text-primary hover:underline">Refund Policy</a></li>
      </ul>

      <h2>4. Support</h2>
      <p>
        <strong>Support is NOT included with the software license.</strong> The license gives you
        the right to use and self-host the software. If you need installation help, configuration
        assistance, or troubleshooting, a paid support plan is required.
      </p>
      <p>Support is available as:</p>
      <ul>
        <li>Monthly plans (Basic or Advanced)</li>
        <li>One-time Managed Setup</li>
      </ul>

      <h2>5. Delivery Services</h2>
      <p>
        Email delivery infrastructure is a <strong>separate paid service</strong>, billed monthly.
        We are not responsible for:
      </p>
      <ul>
        <li>Third-party SMTP provider performance or outages</li>
        <li>Email deliverability when using external providers you supply</li>
        <li>Inbox placement rates (see our delivery disclaimers)</li>
      </ul>

      <h2>6. User Responsibility</h2>
      <p>You agree NOT to use ZeniPost for:</p>
      <ul>
        <li>Sending spam or unsolicited email</li>
        <li>Distributing illegal or harmful content</li>
        <li>Unauthorized or deceptive email campaigns</li>
      </ul>
      <p>
        You are solely responsible for compliance with applicable laws, including but not limited to
        GDPR, CAN-SPAM, and CASL.
      </p>

      <h2>7. Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, ZeniPost is not liable for:</p>
      <ul>
        <li>Data loss or corruption on your server</li>
        <li>Deliverability issues or spam filtering</li>
        <li>Server failures or downtime</li>
        <li>Indirect, consequential, or special damages of any kind</li>
      </ul>

      <h2>8. Termination</h2>
      <p>We reserve the right to:</p>
      <ul>
        <li>Suspend or terminate support and delivery services for misuse or violation of these terms</li>
        <li>Refuse service at our reasonable discretion</li>
      </ul>
      <p>Software license access is not revoked unless fraudulent payment is detected.</p>

      <h2>9. Changes to These Terms</h2>
      <p>
        We may update these terms at any time. Continued use of ZeniPost services after changes
        constitutes acceptance of the updated terms.
      </p>

      <h2>10. Contact</h2>
      <p>
        ZeniPost<br />
        Email: <a href="mailto:legal@zenipost.com" className="text-primary hover:underline">legal@zenipost.com</a>
      </p>
    </LegalLayout>
  );
}
