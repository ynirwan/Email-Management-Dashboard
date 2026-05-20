import { LegalLayout } from "@/components/layout/LegalLayout";

export function Legal() {
  return (
    <LegalLayout title="Legal" lastUpdated="January 2025">
      <p>
        This website and ZeniPost software are operated by ZeniPost.<br />
        Email:{" "}
        <a href="mailto:legal@zenipost.com" className="text-primary hover:underline">legal@zenipost.com</a>
      </p>

      <h2>Product Summary</h2>
      <p>ZeniPost is a <strong>self-hosted email marketing platform</strong>.</p>
      <ul>
        <li>Software is installed on <strong>user-controlled servers</strong></li>
        <li>We do not host, access, or process your subscriber data or email content</li>
        <li>Support and delivery services are optional and sold separately</li>
      </ul>

      <h2>Disclaimer</h2>
      <p>We do not guarantee:</p>
      <ul>
        <li>Email deliverability or inbox placement rates</li>
        <li>Third-party SMTP provider performance or uptime</li>
        <li>Specific open rates, click rates, or campaign outcomes</li>
      </ul>
      <p>Users are responsible for:</p>
      <ul>
        <li>Managing and maintaining their own server infrastructure</li>
        <li>Compliance with applicable laws (GDPR, CAN-SPAM, CASL, etc.)</li>
        <li>Proper and lawful use of the software</li>
      </ul>

      <h2>Intellectual Property</h2>
      <p>
        All rights to ZeniPost software, branding, documentation, and website content are owned
        by ZeniPost. Unauthorized copying, redistribution, or resale is strictly prohibited except
        where expressly permitted by the applicable license tier.
      </p>

      <h2>Governing Law</h2>
      <p>
        These terms and all related matters are governed by applicable law. Any disputes shall be
        resolved in good faith before pursuing legal action.
      </p>

      <h2>Contact</h2>
      <p>
        For all legal enquiries:<br />
        ZeniPost<br />
        Email:{" "}
        <a href="mailto:legal@zenipost.com" className="text-primary hover:underline">legal@zenipost.com</a>
      </p>
    </LegalLayout>
  );
}
