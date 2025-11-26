# Key Terminology

Essential terms and concepts for understanding the Mobul ACE Platform.

## Core Platform Terms

### ACE (Automated Campaign Engagement)
The platform name representing the combination of direct mail automation, digital tracking, and engagement measurement.

### Multi-Tenancy
The platform's architectural model supporting multiple organizations and clients with complete data isolation.

## Organizational Structure

### Organization (Org)
Top-level tenant in the platform. Can be:
- **Internal Org**: Platform administrators
- **Agency Org**: Marketing agency managing multiple clients
- **Direct Org**: Single business managing its own campaigns

### Client
A business unit within an organization. For agencies, each client is a separate business. For direct organizations, the client represents the business itself.

### User
Individual person with platform access. Users have roles (admin, agency owner, client user, call center, etc.) and permissions defining what they can access.

## Campaign Terms

### Campaign
A direct mail marketing initiative targeting a specific audience with mail pieces, tracking, and (optionally) gift card rewards.

### Campaign Status
The lifecycle stage of a campaign:
- **Draft**: Being configured
- **Ready**: Configuration complete, pending submission
- **In Production**: Submitted to print vendor
- **Mailed**: Mail pieces sent
- **Active**: Campaign running with tracking active
- **Completed**: Campaign finished

### Campaign Condition
A trigger event that qualifies a recipient for a gift card reward (e.g., "called and spoke with agent for 2+ minutes").

## Audience & Contact Terms

### Audience
Legacy term for a collection of recipients targeted by a campaign. Being replaced by "Contact Lists."

### Contact
A person or business in your master CRM database. Contacts persist across campaigns and can be added to multiple lists.

### Contact List
A static or dynamic group of contacts used for campaign targeting:
- **Static List**: Manually selected contacts
- **Dynamic Segment**: Contacts matching filter rules

### Recipient
A specific instance of a contact receiving a particular campaign. Each recipient gets unique tracking tokens.

### Hygiene / Validation
Process of cleaning and validating contact data (address verification, duplicate detection, etc.).

## Mail Piece Terms

### Template (Mail Template)
The design for a mail piece (postcard, letter, etc.). Templates can include merge fields for personalization.

### Mail Size
Physical dimensions of the mail piece:
- **4x6**: Standard postcard
- **6x9**: Large postcard
- **6x11**: Jumbo postcard
- **Letter**: 8.5x11 letter format

### Postage Class
USPS mailing rate:
- **Standard**: Bulk mail (slower, cheaper)
- **First Class**: Priority mail (faster, more expensive)

### Print Vendor
Third-party service that prints and mails the physical mail pieces (e.g., PostGrid, Lob, Stannp).

## Tracking & Attribution Terms

### PURL (Personalized URL)
A unique web address assigned to each recipient, typically in the format: `yourdomain.com/r/{token}`

### Token (Recipient Token)
A unique alphanumeric code identifying each recipient, used in PURLs and QR codes.

### QR Code
Quick Response code printed on mail pieces that recipients scan with smartphones to visit their personalized landing page.

### IMb (Intelligent Mail Barcode)
USPS barcode printed on mail pieces for tracking delivery status. Provides "Informed Delivery" data.

### Attribution
The process of connecting recipient actions (page visits, calls, conversions) back to specific campaigns and mail pieces.

### UTM Parameters
URL tracking parameters used in Google Analytics:
- `utm_source=direct-mail`
- `utm_medium=postcard`
- `utm_campaign=spring-2024-roofing`

## Landing Page Terms

### Bridge Page
A personalized landing page that recipients see when visiting their PURL or scanning their QR code. Acts as a "bridge" between physical mail and digital engagement.

### Landing Page Mode
How the PURL behaves:
- **Bridge**: Shows custom landing page
- **Redirect**: Forwards directly to external URL

### Lead Form
Form on bridge page for capturing contact information and qualifying leads.

### Form Submission
When a recipient completes and submits a lead form on the bridge page.

## Gift Card Terms

### Gift Card Pool
A collection of gift cards from a specific brand (e.g., "Amazon $10 Pool") reserved for campaign rewards.

### Gift Card Brand
The retailer or brand of the gift card (Amazon, Visa, Target, Starbucks, etc.).

### Gift Card Code
The unique alphanumeric code used to redeem a gift card at the brand's website or in-store.

### Provisioning
The process of assigning a gift card from a pool to a specific recipient when they meet a campaign condition.

### Redemption
When a recipient claims and uses their gift card code.

### Gift Card Status
Lifecycle of a gift card:
- **Available**: In pool, not assigned
- **Reserved**: Set aside for campaign but not yet assigned
- **Claimed**: Assigned to recipient
- **Delivered**: Code sent via SMS or email
- **Redeemed**: Recipient used the code

### Delivery Method
How gift card codes are sent to recipients:
- **SMS**: Text message to phone number
- **Email**: Email to email address

## Call Tracking Terms

### Tracked Phone Number
A dedicated phone number assigned to a campaign for tracking which recipients call and measuring call volume.

### Call Session
A single inbound phone call tracked by the system, including caller ID, duration, recording, and disposition.

### Call Disposition
The outcome of a call (e.g., "qualified lead", "not interested", "no answer", "wrong number").

### Call Recording
Audio recording of the phone conversation, stored for quality assurance and training.

### Call Duration
Length of the phone call in seconds.

### Forward-To Number
The actual business phone number where tracked calls are forwarded after being answered by the system.

## Analytics Terms

### Response Rate
Percentage of recipients who engaged with the campaign (visited landing page, called, or redeemed).

### Conversion Rate
Percentage of recipients who completed the desired action (e.g., submitted lead form, scheduled appointment).

### Delivery Rate
Percentage of mail pieces successfully delivered (tracked via IMb barcodes).

### Engagement Score
Calculated metric (0-100) indicating how actively a contact interacts with campaigns based on recency, frequency, and types of engagement.

### Lifecycle Stage
Where a contact is in the customer journey:
- **Lead**: Initial contact
- **MQL** (Marketing Qualified Lead): Showed interest
- **SQL** (Sales Qualified Lead): Ready for sales conversation
- **Opportunity**: Active sales process
- **Customer**: Closed deal
- **Evangelist**: Loyal promoter

### Funnel
Visual representation of how recipients move through campaign stages (mailed → landed → called → converted).

### Heat Map
Geographic visualization showing campaign performance by ZIP code or region.

## Role & Permission Terms

### Role
A user's primary function in the platform:
- **Admin**: Full system access
- **Tech Support**: Support and troubleshooting
- **Agency Owner**: Agency-level management
- **Company Owner**: Client-level management
- **Developer**: API access
- **Call Center**: Call handling and gift card provisioning

### Permission
Granular access control defining specific actions a user can perform (e.g., `campaigns.create`, `giftcards.redeem`, `users.edit`).

### RLS (Row-Level Security)
Database-level security ensuring users can only access data belonging to their organization or clients.

## API & Integration Terms

### API (Application Programming Interface)
RESTful endpoints allowing external systems to interact with the platform programmatically.

### API Key
Secret token used to authenticate API requests.

### Webhook
HTTP callback sent from the platform to external systems when specific events occur (e.g., gift card redeemed, call received).

### Webhook Secret
Secret key used to verify webhook authenticity.

### Edge Function
Serverless backend function running business logic (e.g., gift card provisioning, PURL handling).

## Data Terms

### JSON (JavaScript Object Notation)
Data format used for API requests/responses and storing flexible data structures.

### JSONB
PostgreSQL data type for storing JSON with indexing and querying support.

### UUID (Universally Unique Identifier)
128-bit identifier used as primary keys in database tables (e.g., `550e8400-e29b-41d4-a716-446655440000`).

### RPC (Remote Procedure Call)
Database function callable via API for complex operations.

## Abbreviations

| Abbreviation | Full Term |
|--------------|-----------|
| ACE | Automated Campaign Engagement |
| PURL | Personalized URL |
| IMb | Intelligent Mail Barcode |
| QR | Quick Response |
| CTA | Call to Action |
| CRM | Customer Relationship Management |
| RLS | Row-Level Security |
| RPC | Remote Procedure Call |
| API | Application Programming Interface |
| UUID | Universally Unique Identifier |
| MQL | Marketing Qualified Lead |
| SQL | Sales Qualified Lead |
| KPI | Key Performance Indicator |
| ROI | Return on Investment |
| CSV | Comma-Separated Values |
| SMS | Short Message Service |
| UTM | Urchin Tracking Module |

## Related Documentation

- [Platform Overview →](/admin/docs/getting-started/overview)
- [Campaign Lifecycle →](/admin/docs/features/campaign-lifecycle)
- [Data Model →](/admin/docs/architecture/data-model)
- [API Reference →](/admin/docs/api-reference/rest-api)
