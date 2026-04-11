import { LegalLayout } from "@/components/layout/LegalLayout";

export function Cookies() {
  return (
    <LegalLayout title="Cookie Policy" lastUpdated="January 2025">
      <p>
        This Cookie Policy explains how ZeniPost uses cookies and similar technologies when you
        visit this website.
      </p>

      <h2>1. What Are Cookies?</h2>
      <p>
        Cookies are small text files placed on your device by a website. They allow the site to
        remember information about your visit — such as your preferences or session state — making
        your next visit easier and the site more useful.
      </p>

      <h2>2. How We Use Cookies</h2>
      <p>We use cookies for the following purposes:</p>
      <ul>
        <li><strong>Essential functionality:</strong> Keeping you logged in and maintaining session state</li>
        <li><strong>Analytics:</strong> Understanding how visitors use the site so we can improve it (optional)</li>
      </ul>

      <h2>3. Types of Cookies We Use</h2>
      <h3 className="font-semibold mt-4 mb-2">Essential Cookies</h3>
      <p>
        These are required for the basic operation of the site. Without them, features like login
        and account access would not function. These cannot be disabled.
      </p>
      <h3 className="font-semibold mt-4 mb-2">Analytics Cookies</h3>
      <p>
        These help us understand how visitors interact with our pages (e.g., which pages are most
        visited). They are anonymized and do not identify you personally. You can opt out via your
        browser settings.
      </p>

      <h2>4. Third-Party Cookies</h2>
      <p>
        We may use third-party services (such as analytics providers or payment processors) that
        set their own cookies. These services are governed by their own cookie and privacy policies.
      </p>

      <h2>5. Managing Cookies</h2>
      <p>
        You can control and delete cookies via your browser settings. Most browsers allow you to:
      </p>
      <ul>
        <li>View cookies currently stored</li>
        <li>Block cookies from specific or all sites</li>
        <li>Delete cookies on exit or on demand</li>
      </ul>
      <p>
        Please note that disabling essential cookies may break core site functionality such as
        login and account access.
      </p>

      <h2>6. Changes to This Policy</h2>
      <p>
        We may update this Cookie Policy from time to time. Changes will be posted here with an
        updated date.
      </p>

      <h2>7. Contact</h2>
      <p>
        ZeniPost<br />
        Email:{" "}
        <a href="mailto:legal@zenipost.com" className="text-primary hover:underline">legal@zenipost.com</a>
      </p>
    </LegalLayout>
  );
}
