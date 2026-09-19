// ponytail: replace APP_NAME placeholder with your product name via VITE_APP_NAME env var
const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'Our App';

export default function LegalPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-foreground bg-background prose prose-neutral dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p>Last updated: [Date]</p>

      <p>
        {APP_NAME} (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) provides this application to help
        users [describe your product purpose here]. This Privacy Policy explains
        how we collect, use, and protect your personal information.
      </p>

      <h2>Information We Collect</h2>
      <ul>
        <li>
          <strong>Account Information:</strong> Name and email address via
          email/password or Google sign-in.
        </li>
        <li>
          <strong>Usage Data:</strong> Your activity within the application is
          stored securely in our database.
        </li>
        <li>
          <strong>Analytics Information:</strong> We use analytics tools to
          understand usage and improve functionality.
        </li>
        <li>
          <strong>Device Information:</strong> Basic device and browser metadata.
        </li>
      </ul>

      <h2>How We Use Your Information</h2>
      <ul>
        <li>Provide and maintain the application</li>
        <li>Analyze and improve user experience</li>
        <li>Send transactional emails (account verification, password reset)</li>
      </ul>

      <p>
        We do <strong>not</strong> sell your personal data.
      </p>

      <h2>Data Storage and Deletion</h2>
      <p>Your data is stored securely on our servers.</p>
      <ul>
        <li>You can delete your account in app settings at any time.</li>
        <li>When you delete your account, your personal data is removed.</li>
      </ul>

      <h2>Third-Party Services</h2>
      <p>
        We use Google for authentication, Stripe for payments, and
        Cloudinary for media storage. Your use of these services is subject
        to their respective privacy policies.
      </p>

      <h2>Security</h2>
      <p>
        We implement reasonable technical safeguards to protect your information,
        but we cannot guarantee absolute security.
      </p>

      <h2>Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy periodically. Continued use of the
        application constitutes acceptance of the updated policy.
      </p>

      <hr />

      <h1>Terms and Conditions</h1>
      <p>Last updated: [Date]</p>

      <h2>Use of the Application</h2>
      <p>
        You may use {APP_NAME} for personal or commercial purposes in accordance
        with these terms. You agree not to misuse the application or attempt to
        interfere with its operation.
      </p>

      <h2>Accounts</h2>
      <p>
        You are responsible for maintaining the security of your account
        credentials.
      </p>

      <h2>Subscriptions and Billing</h2>
      <p>
        Paid plans are billed on a recurring basis. You may cancel at any time
        through the billing portal. Cancellations take effect at the end of the
        current billing period.
      </p>

      <h2>Intellectual Property</h2>
      <p>
        All trademarks, logos, and application design remain the property of
        {' '}{APP_NAME}.
      </p>

      <h2>Limitation of Liability</h2>
      <p>
        The application is provided &ldquo;as is&rdquo; without warranty of any kind.
        We are not liable for any indirect damages arising from your use of
        the application.
      </p>

      <h2>Changes to These Terms</h2>
      <p>
        We may update these terms. Continued use of the application means you
        agree to the updated terms.
      </p>
    </div>
  );
}
