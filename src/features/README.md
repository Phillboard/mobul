# Features Directory

> Feature-based architecture for the Mobul platform. Each feature is a self-contained module with its own components, hooks, utilities, and types.

## Feature Catalog

| Feature | Purpose | Files |
|---------|---------|-------|
| [activity](#activity) | Unified audit logging | 22 |
| [admin](#admin) | Platform administration | 28 |
| [agency](#agency) | Agency management | 5 |
| [agent](#agent) | Call center agent UI | 9 |
| [ai-designer](#ai-designer) | AI landing page builder | 12 |
| [analytics](#analytics) | Reporting & ROI | 7 |
| [audiences](#audiences) | Audience management | 10 |
| [billing](#billing) | Credit management | 4 |
| [call-center](#call-center) | Redemption workflows | 34 |
| [campaigns](#campaigns) | Campaign management | 68 |
| [contacts](#contacts) | CRM & contact lists | 24 |
| [dashboard](#dashboard) | Main dashboard | 7 |
| [designer](#designer) | Mail/landing designer | 78 |
| [documentation](#documentation) | In-app docs | 7 |
| [email](#email) | Email templates | 7 |
| [forms](#forms) | Form builder | 42 |
| [gift-cards](#gift-cards) | Gift card system | 70 |
| [landing-pages](#landing-pages) | Landing pages | 14 |
| [mail-designer](#mail-designer) | Mail piece designer | 13 |
| [marketing](#marketing) | Email/SMS marketing | 35 |
| [onboarding](#onboarding) | User onboarding | 2 |
| [settings](#settings) | Platform settings | 58 |

---

## Feature Structure

Each feature follows this structure:

```
feature-name/
├── components/       # React components
│   └── index.ts      # Component exports
├── hooks/            # Custom hooks
│   └── index.ts      # Hook exports
├── types/            # TypeScript types
│   └── index.ts      # Type exports
├── utils/            # Utilities
│   └── index.ts      # Utility exports
└── index.ts          # Public API
```

---

## Feature Details

### activity
**Purpose:** Unified activity and audit logging for compliance-ready tracking.

**Key Components:**
- `ActivityTable` - Main activity log table
- `ActivityDetailModal` - Detailed view of entries
- `ActivityFilters` - Filter controls

**Key Hooks:**
- `useActivityLogs` - Fetch activity entries
- `useActivityExport` - Export to CSV/Excel

---

### admin
**Purpose:** Platform administration tools for monitoring, testing, and demo data.

**Key Components:**
- `AdminGiftCardInventory` - Platform-wide inventory
- `MVPDataSeeder` - MVP data seeding
- `ImpersonateUserDialog` - User impersonation

**Key Utilities:**
- `demo/demo-orchestrator.ts` - Demo data generation

---

### call-center
**Purpose:** Call center redemption workflow for gift card provisioning.

**Key Components:**
- `CallCenterRedemptionPanelV2` - Main redemption interface
- `ScriptPanel` - Call scripts
- `steps/*` - Redemption workflow steps

**Key Hooks:**
- `useRedemptionWorkflow` - Workflow orchestration
- `useCallTracking` - Call tracking

---

### campaigns
**Purpose:** Direct mail campaign management with conditions, rewards, and tracking.

**Key Components:**
- `CreateCampaignWizard` - Multi-step wizard
- `CampaignsList` - Campaign list view
- `wizard/*` - 20+ wizard step components

**Key Hooks:**
- `useCampaignConditions` - Condition management
- `useCampaignValidation` - Validation logic
- `useCampaignGiftCardConfig` - Gift card configuration

---

### contacts
**Purpose:** Contact/CRM management with lists, segments, and import.

**Key Components:**
- `ContactsTable` - Main contacts table
- `SmartCSVImporter` - Intelligent CSV import
- `ListBuilder` - List creation

**Key Hooks:**
- `useContacts` - Contact CRUD
- `useContactLists` - List management
- `useSmartCSVParser` - CSV parsing

---

### designer
**Purpose:** Unified design system for mail pieces and landing pages.

**Key Components:**
- `DesignerCanvas` - Main canvas (DOM-based)
- `DesignerAIChat` - AI chat interface
- `ElementLibrary` - Element library
- `PropertiesPanel` - Property editor

**Key Hooks:**
- `useDesignerState` - State management
- `useDesignerAI` - AI generation
- `useDesignerHistory` - Undo/redo

---

### forms
**Purpose:** Form builder with conditional logic, gift card reveal, and analytics.

**Key Components:**
- `FormBuilder` - Main builder interface
- `GiftCardReveal` - Gift card reveal animation
- `ConditionalLogicBuilder` - Conditional logic

**Key Hooks:**
- `useForms` - Form CRUD
- `useFormBuilderRHF` - React Hook Form integration

---

### gift-cards
**Purpose:** Gift card management: brands, pools, inventory, provisioning.

**Key Components:**
- `ClientMarketplace` - Client marketplace
- `GiftCardInventory` - Inventory management
- `SimpleBrandDenominationSelector` - Brand/denomination selection

**Key Hooks:**
- `useGiftCardProvisioning` - Provisioning workflow
- `useGiftCardBrands` - Brand management
- `usePoolInventory` - Pool inventory

---

### marketing
**Purpose:** Email & SMS marketing: broadcasts, automations, content library.

**Key Components:**
- `BroadcastBuilderWizard` - Broadcast creation
- `AutomationBuilder` - Automation workflows
- `ContentLibrary/*` - Template library

**Key Hooks:**
- `useMarketingCampaigns` - Campaign CRUD
- `useMarketingAutomations` - Automation management

---

### settings
**Purpose:** Platform settings: account, team, integrations, communications.

**Key Components:**
- `TwilioConfigForm` - Twilio configuration
- `APISettings` - API key management
- `IntegrationsSettings` - Integration hub

**Key Hooks:**
- `useTwilioConfig` - Twilio settings
- `useAPIKeys` - API key management
- `useMessageTemplates` - SMS templates

---

## Adding a New Feature

1. Create folder: `src/features/my-feature/`
2. Add structure:
   ```
   my-feature/
   ├── components/
   │   └── index.ts
   ├── hooks/
   │   └── index.ts
   ├── types/
   │   └── index.ts
   └── index.ts
   ```
3. Export public API from `index.ts`
4. Import in pages: `import { MyComponent } from '@/features/my-feature'`

---

## Dependencies

Features may depend on other features. Common patterns:

- **campaigns** → `gift-cards`, `contacts`, `call-center`, `settings`
- **marketing** → `contacts`, `settings`
- **designer** → `campaigns`, `landing-pages`
- **call-center** → `settings`, `gift-cards`, `campaigns`

Avoid circular dependencies. If needed, use shared utilities in `src/shared/`.
