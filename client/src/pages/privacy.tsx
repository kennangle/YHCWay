export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="prose prose-lg max-w-none">
            <h1>Privacy Policy for The YHC Way</h1>
            <p><strong>Effective Date: January 2026</strong></p>
            
            <h2>1. Introduction</h2>
            <p>Yoga Health Center ("we," "us," or "our") operates The YHC Way application. This Privacy Policy describes how we collect, use, and handle your personal information when you use our internal operational and training platform.</p>
            
            <h2>2. Information We Collect</h2>
            <p>To provide the features within The YHC Way, we collect the following:</p>
            <ul>
              <li><strong>Authentication Data:</strong> Email address and profile information provided via Google OAuth to verify your identity as an authorized team member.</li>
              <li><strong>Communication Data:</strong> If you use the Unified Inbox or Slack features, we temporarily process email content and direct messages to display them within the app.</li>
              <li><strong>Usage Activity:</strong> We track engagement with training materials, manuals, and task completion to ensure operational standards are met.</li>
              <li><strong>AI Processing:</strong> When using the AI Email Summarizer, relevant email text is processed by our AI integration to generate summaries. This data is not used to train external models.</li>
            </ul>
            
            <h2>3. How We Use Your Information</h2>
            <p>We use the collected data solely for business operations, including:</p>
            <ul>
              <li>Facilitating internal communication via Slack and Gmail integrations.</li>
              <li>Managing studio tasks and project dependencies.</li>
              <li>Monitoring training progress and compliance with "The YHC Way" standards.</li>
              <li>Improving application performance and troubleshooting technical issues.</li>
            </ul>
            
            <h2>4. Third-Party Integrations</h2>
            <p>The YHC Way connects to several third-party services to function. Each service handles your data according to its own privacy policy:</p>
            <ul>
              <li><strong>Google Services:</strong> Used for email, calendar, and document access.</li>
              <li><strong>Slack:</strong> Used for direct messaging and channel notifications.</li>
              <li><strong>Mindbody/NetGym:</strong> Used for studio scheduling and metrics.</li>
              <li><strong>OpenAI:</strong> Used specifically for the email summarization feature.</li>
            </ul>
            
            <h2>5. Data Security & Retention</h2>
            <p>We implement industry-standard security measures to protect your proprietary business data. Access to your data is revoked immediately upon the termination of your employment or contract with Yoga Health Center.</p>
            
            <h2>6. Your Rights</h2>
            <p>As an internal user, you may request to review the data associated with your profile or report technical inaccuracies in your time tracking or training logs by contacting the administrator.</p>
            
            <h2>Contact Information</h2>
            <p>For questions regarding this Privacy Policy:</p>
            <p><strong>Administrator:</strong> Ken<br/>
            <strong>Email:</strong> ken@yogahealthcenter.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
