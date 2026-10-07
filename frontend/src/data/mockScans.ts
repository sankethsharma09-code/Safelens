import type { ScanResult } from '../types';

export interface Scenario {
  id: string;
  title: string;
  category: 'QR Code Scanner' | 'Text Analyzer' | 'Verified Safe';
  inputType: 'qr' | 'text';
  previewText: string;
  description: string;
  result: ScanResult;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'qr-phish',
    title: 'Deceptive Phishing QR Code',
    category: 'QR Code Scanner',
    inputType: 'qr',
    previewText: 'SCAN QR: Claim $500 Gift Voucher. Points expire today. Scan to unlock bonus portal.',
    description: 'Deceptive QR code encoding a deceptive credential harvesting website disguised as a reward portal.',
    result: {
      scan_id: 'scan-qr-9102',
      timestamp: 'Just now',
      overall: {
        verdict: 'Dangerous',
        score: 94,
      },
      partial: false,
      latency_ms: 540,
      explanation: 'Critical Phishing QR: The QR code decodes to a malicious lookalike domain flagged in threat intelligence feeds for harvesting user credentials.',
      recommendedAction: 'Do NOT open the decoded URL. Never enter login credentials or personal information on sites reached via unverified QR codes.',
      items: [
        {
          id: 'item-qr-1',
          kind: 'qr',
          value: 'https://login-verify-account.xyz/gift-auth?session=claim99',
          verdict: 'Dangerous',
          score: 95,
          flags: [
            { label: 'Phishing domain detected', detail: 'Flagged on URLhaus and threat feed database' },
            { label: 'Deceptive credential harvest', detail: 'Impersonates authentic single-sign-on login page' },
            { label: 'Suspicious TLD (.xyz)', detail: 'Domain registered recently with hidden whois identity' },
          ],
          explanation: 'The decoded QR payload points directly to an active phishing portal.',
        },
      ],
    },
  },
  {
    id: 'text-phish',
    title: 'Urgent Account Suspension SMS',
    category: 'Text Analyzer',
    inputType: 'text',
    previewText: 'URGENT NOTICE: Your online access has been locked due to unauthorized activity. Verify your identity at http://secure-update-notice.net within 12 hours or account will be permanently deactivated.',
    description: 'High-urgency phishing text applying psychological coercion to panic the victim into entering credentials.',
    result: {
      scan_id: 'scan-txt-4819',
      timestamp: '1 min ago',
      overall: {
        verdict: 'Dangerous',
        score: 88,
      },
      partial: false,
      latency_ms: 610,
      explanation: 'Scam Text Detected: This message triggers high-risk urgency and account suspension rules, linking to an unverified third-party domain.',
      recommendedAction: 'Do not click the link or disclose any sensitive information. Authentic services do not threaten permanent deactivation via random SMS links.',
      items: [
        {
          id: 'item-txt-1',
          kind: 'text',
          value: 'Your online access has been locked... Verify identity within 12 hours',
          verdict: 'Dangerous',
          score: 85,
          flags: [
            { label: 'Artificial urgency coercion', detail: 'Imposes strict 12-hour penalty window to prevent deliberation' },
            { label: 'Account suspension threat', detail: 'Matches signature social-engineering credential extraction patterns' },
          ],
          explanation: 'Message text employs classic phishing urgency patterns.',
        },
        {
          id: 'item-url-1',
          kind: 'url',
          value: 'http://secure-update-notice.net',
          verdict: 'Dangerous',
          score: 92,
          flags: [
            { label: 'Unverified lookalike domain', detail: 'Not associated with any verified banking or provider infrastructure' },
            { label: 'Insecure protocol (HTTP)', detail: 'Transmits credentials in plaintext without valid SSL certificate' },
          ],
          explanation: 'Embedded URL found in text leads to an insecure credential harvesting page.',
        },
      ],
    },
  },
  {
    id: 'verified-clean',
    title: 'Official Documentation QR & Text',
    category: 'Verified Safe',
    inputType: 'qr',
    previewText: 'Tesseract OCR Open Source Project: https://github.com/tesseract-ocr/tesseract - High accuracy on-device optical character recognition.',
    description: 'Legitimate open-source repository link and clean informational text with zero scam signals.',
    result: {
      scan_id: 'scan-safe-1022',
      timestamp: '3 mins ago',
      overall: {
        verdict: 'Safe',
        score: 4,
      },
      partial: false,
      latency_ms: 380,
      explanation: 'Verified Clean: No phishing patterns, malicious URLs, or social-engineering signals detected. The link points to verified official GitHub infrastructure.',
      recommendedAction: 'Safe to proceed. This item contains verified clean content.',
      items: [
        {
          id: 'item-safe-1',
          kind: 'qr',
          value: 'https://github.com/tesseract-ocr/tesseract',
          verdict: 'Safe',
          score: 4,
          flags: [
            { label: 'Verified domain', detail: 'Belongs to verified github.com official infrastructure' },
            { label: 'Clean threat history', detail: 'Zero detections across all integrated threat intelligence feeds' },
          ],
          explanation: 'Decoded QR points to a verified official repository.',
        },
      ],
    },
  },
];
