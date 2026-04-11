import { LegalLayout } from "@/components/layout/LegalLayout";

export function Refunds() {
  return (
    <LegalLayout title="Refund Policy" lastUpdated="January 2025">
      <p>
        This Refund Policy applies to purchases made on this website for ZeniPost software licenses,
        support services, and delivery services.
      </p>

      <h2>1. Software License (One-Time Purchase)</h2>
      <p>
        All software license purchases are <strong>non-refundable</strong>.
      </p>
      <p>
        ZeniPost is a self-hosted product. Users are encouraged to review features, documentation,
        and server requirements carefully before purchasing.
      </p>
      <p>We do not offer refunds for:</p>
      <ul>
        <li>Change of mind after purchase</li>
        <li>Lack of technical knowledge or experience</li>
        <li>Incompatibility with your specific server environment</li>
        <li>Failure to use or install the product</li>
      </ul>

      <h2>2. Exceptions (Limited Cases)</h2>
      <p>A refund may be considered only if all of the following are true:</p>
      <ul>
        <li>The product is completely non-functional on a supported server environment</li>
        <li>Our support team has been contacted and is unable to resolve the issue</li>
        <li>The request is made within <strong>7 days of purchase</strong></li>
      </ul>
      <p>
        Refund decisions in exceptional cases are made at our sole discretion and are not guaranteed.
      </p>

      <h2>3. Support Services</h2>
      <p>
        Support plans (monthly or one-time) are <strong>non-refundable</strong> once support has been:
      </p>
      <ul>
        <li>Provided in any form</li>
        <li>Initiated (e.g., first communication sent)</li>
        <li>Scheduled for a session</li>
      </ul>

      <h2>4. Managed Setup (One-Time Service)</h2>
      <p>
        Managed Setup fees are <strong>non-refundable once work has started</strong>. "Work started"
        includes any initial communication, planning, or configuration activity by our team.
      </p>
      <p>
        If no work has begun and you request a cancellation within 24 hours of purchase, a refund
        may be considered upon request.
      </p>

      <h2>5. Delivery Services (Email Infrastructure)</h2>
      <p>
        Delivery plans are billed monthly and are <strong>non-refundable</strong> for the current
        billing period.
      </p>
      <p>We do not guarantee:</p>
      <ul>
        <li>Inbox placement rates</li>
        <li>Open or click rates</li>
        <li>Third-party SMTP provider performance</li>
      </ul>
      <p>You may cancel future billing at any time from your account settings.</p>

      <h2>6. Chargebacks &amp; Disputes</h2>
      <p>
        Initiating a chargeback or payment dispute without first contacting us may result in:
      </p>
      <ul>
        <li>Immediate suspension of your support and delivery services</li>
        <li>Revocation of license access if fraud is confirmed</li>
      </ul>
      <p>
        We strongly encourage you to contact us first at{" "}
        <a href="mailto:support@zenipost.com" className="text-primary hover:underline">support@zenipost.com</a>{" "}
        to resolve any billing issues quickly.
      </p>

      <h2>7. Contact</h2>
      <p>
        For refund-related enquiries:<br />
        ZeniPost<br />
        Email:{" "}
        <a href="mailto:support@zenipost.com" className="text-primary hover:underline">support@zenipost.com</a>
      </p>
    </LegalLayout>
  );
}
