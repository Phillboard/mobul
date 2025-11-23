export default function PrivacyPolicy() {
  return (
    <div className="container max-w-4xl py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
          <p>
            Mobul ACE ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you use our direct
            mail marketing platform and related services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
          
          <h3 className="text-xl font-semibold mb-2 mt-4">Personal Information</h3>
          <p>We collect information that you provide directly to us, including:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Name, email address, and contact information</li>
            <li>Company information and business details</li>
            <li>Payment and billing information</li>
            <li>Marketing campaign data and audience lists</li>
            <li>Communication preferences</li>
          </ul>

          <h3 className="text-xl font-semibold mb-2 mt-4">Automatically Collected Information</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li>Device information and IP addresses</li>
            <li>Browser type and operating system</li>
            <li>Usage data and analytics</li>
            <li>Cookies and similar tracking technologies</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, maintain, and improve our services</li>
            <li>Process your transactions and send related information</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Detect, prevent, and address fraud and security issues</li>
            <li>Comply with legal obligations</li>
            <li>Analyze usage patterns to improve user experience</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Data Sharing and Disclosure</h2>
          <p>We may share your information in the following circumstances:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf</li>
            <li><strong>Business Transfers:</strong> In connection with any merger, sale, or acquisition</li>
            <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            <li><strong>With Your Consent:</strong> When you explicitly authorize us to share information</li>
          </ul>
          <p className="mt-4">
            We do not sell your personal information to third parties.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your information,
            including:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Encryption of data in transit and at rest</li>
            <li>Regular security assessments and updates</li>
            <li>Access controls and authentication mechanisms</li>
            <li>Secure data backup and recovery procedures</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Your Rights and Choices</h2>
          <p>You have the following rights regarding your personal information:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Access:</strong> Request access to your personal information</li>
            <li><strong>Correction:</strong> Request correction of inaccurate information</li>
            <li><strong>Deletion:</strong> Request deletion of your personal information</li>
            <li><strong>Opt-out:</strong> Opt out of marketing communications</li>
            <li><strong>Data Portability:</strong> Request a copy of your data in a portable format</li>
          </ul>
          <p className="mt-4">
            To exercise these rights, please contact us at privacy@mobulace.com
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Cookies and Tracking</h2>
          <p>
            We use cookies and similar tracking technologies to collect information about your browsing
            activities. You can control cookies through your browser settings.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Data Retention</h2>
          <p>
            We retain your information for as long as necessary to provide our services and comply with
            legal obligations. When information is no longer needed, we securely delete or anonymize it.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
          <p>
            Our services are not intended for children under 13 years of age. We do not knowingly collect
            personal information from children under 13.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your country of
            residence. We ensure appropriate safeguards are in place for such transfers.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material changes
            by posting the new policy on this page and updating the "Last updated" date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us at:</p>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="font-medium">Mobul ACE</p>
            <p>Email: privacy@mobulace.com</p>
            <p>Address: [Your Business Address]</p>
          </div>
        </section>
      </div>
    </div>
  );
}
