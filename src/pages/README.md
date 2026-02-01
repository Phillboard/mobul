# Pages Directory

> Route page components for the Mobul platform. Each page corresponds to a route in the application.

## Route Map

### Public Routes (No Auth)

| Route | Page | Purpose |
|-------|------|---------|
| `/auth` | `Auth.tsx` | Login/signup |
| `/auth/callback` | `AuthCallback.tsx` | OAuth callback |
| `/privacy` | `PrivacyPolicy.tsx` | Privacy policy |
| `/terms` | `TermsOfService.tsx` | Terms of service |
| `/f/:formSlug` | `FormPublic.tsx` | Public form view |
| `/redeem/:campaignId/:token` | `GiftCardReveal.tsx` | Gift card reveal |
| `/c/:campaignId/:token` | `PURLLandingPage.tsx` | Personalized URL |
| `/:clientSlug/p/:pageSlug` | `PublicLandingPage.tsx` | Public landing page |

### Dashboard & Main

| Route | Page | Purpose |
|-------|------|---------|
| `/` | `Index.tsx` | Root (redirects to dashboard) |
| `/dashboard` | `Dashboard.tsx` | Main dashboard |
| `/platform` | `PlatformDashboard.tsx` | Admin platform overview |
| `/activity` | `Activity.tsx` | Unified activity log |

### Campaigns

| Route | Page | Purpose |
|-------|------|---------|
| `/campaigns` | `Campaigns.tsx` | Campaign list |
| `/campaigns/new` | `CampaignCreate.tsx` | Create campaign |
| `/campaigns/:id` | `CampaignDetail.tsx` | Campaign detail |
| `/campaigns/:id/edit` | `CampaignCreate.tsx` | Edit campaign |
| `/analytics/campaigns/:id` | `CampaignAnalytics.tsx` | Campaign analytics |

### Contacts & CRM

| Route | Page | Purpose |
|-------|------|---------|
| `/contacts` | `Contacts.tsx` | Contact list |
| `/contacts/:id` | `ContactDetail.tsx` | Contact detail |
| `/contacts/lists` | `ContactLists.tsx` | Contact lists |
| `/contacts/lists/:id` | `contacts/ListDetail.tsx` | List detail |
| `/contacts/import` | `ContactImport.tsx` | CSV import |
| `/audiences/:id` | `AudienceDetail.tsx` | Audience detail |
| `/recipients/:id` | `RecipientDetail.tsx` | Recipient detail |

### Gift Cards

| Route | Page | Purpose |
|-------|------|---------|
| `/gift-cards` | `GiftCards.tsx` | Gift card manager |
| `/gift-cards/manager` | `GiftCardManager.tsx` | Simplified view |
| `/gift-cards/pools/:poolId` | `PoolDetail.tsx` | Pool detail |
| `/gift-cards/purchase/:poolId` | `PurchaseGiftCard.tsx` | Purchase flow |
| `/gift-cards/marketplace` | `AdminGiftCardMarketplace.tsx` | Admin marketplace |
| `/client/gift-cards` | `ClientGiftCards.tsx` | Client view |
| `/embed/gift-card` | `EmbedGiftCard.tsx` | Embeddable widget |

### Design & Content

| Route | Page | Purpose |
|-------|------|---------|
| `/mail` | `Mail.tsx` | Mail piece library |
| `/mail-designer/:id` | `NewMailDesigner.tsx` | Mail designer |
| `/landing-pages` | `LandingPages.tsx` | Landing page library |
| `/landing-pages/new` | `NewLandingPageDesigner.tsx` | Landing page designer |
| `/landing-pages/:id` | `NewLandingPageDesigner.tsx` | Edit landing page |
| `/landing-pages-ai/new` | `AILandingPageDesigner.tsx` | AI landing page |
| `/email-designer/:id` | `NewEmailDesigner.tsx` | Email designer |

### Forms

| Route | Page | Purpose |
|-------|------|---------|
| `/forms` | `Forms.tsx` | Forms library |
| `/forms/new` | `FormBuilder.tsx` | Create form |
| `/forms/:formId/builder` | `FormBuilder.tsx` | Edit form |
| `/forms/:formId/analytics` | `FormAnalytics.tsx` | Form analytics |
| `/forms/docs` | `FormsDocumentation.tsx` | Forms documentation |

### Marketing

| Route | Page | Purpose |
|-------|------|---------|
| `/marketing` | `marketing/MarketingHub.tsx` | Marketing hub |
| `/marketing/broadcasts` | `marketing/Broadcasts.tsx` | Broadcast list |
| `/marketing/broadcasts/new` | `marketing/BroadcastCreate.tsx` | Create broadcast |
| `/marketing/broadcasts/:id` | `marketing/BroadcastDetail.tsx` | Broadcast detail |
| `/marketing/automations` | `marketing/Automations.tsx` | Automation list |
| `/marketing/automations/new` | `marketing/AutomationCreate.tsx` | Create automation |
| `/marketing/automations/:id` | `marketing/AutomationDetail.tsx` | Automation detail |
| `/marketing/content` | `marketing/ContentLibrary.tsx` | Template library |

### Call Center

| Route | Page | Purpose |
|-------|------|---------|
| `/call-center` | `CallCenterRedemption.tsx` | Redemption workflow |
| `/call-center/scripts` | `CallCenterScripts.tsx` | Script management |
| `/call-center/logs` | `RedemptionLogs.tsx` | Redemption logs |

### Settings & Admin

| Route | Page | Purpose |
|-------|------|---------|
| `/settings` | `Settings.tsx` | Settings hub |
| `/settings/:tab` | `Settings.tsx` | Settings tab |
| `/users` | `UserManagement.tsx` | User management |
| `/credits-billing` | `CreditsBilling.tsx` | Credits & billing |
| `/client/billing` | `ClientBillingDashboard.tsx` | Client billing |
| `/accept-invite` | `AcceptInvite.tsx` | Accept invitation |

### Admin Pages

| Route | Page | Purpose |
|-------|------|---------|
| `/admin/gift-cards` | `AdminGiftCardBrands.tsx` | Gift card brands |
| `/admin/organizations` | `AdminOrganizationManagement.tsx` | Organizations |
| `/admin/financial-reports` | `AdminFinancialReports.tsx` | Financial reports |
| `/admin/audit-log` | `AdminAuditLog.tsx` | Audit log |
| `/admin/messaging-test` | `AdminMessagingTest.tsx` | SMS/Email testing |
| `/admin/system-health` | `SystemHealth.tsx` | System health |
| `/admin/error-logs` | `ErrorLogs.tsx` | Error logs |
| `/admin/demo-data` | `admin/DemoDataGenerator.tsx` | Demo data |
| `/admin/integrations` | `Integrations.tsx` | Integrations |

### Documentation

| Route | Page | Purpose |
|-------|------|---------|
| `/docs` | `Documentation.tsx` | Documentation viewer |
| `/docs/:category` | `Documentation.tsx` | Category view |
| `/docs/:category/:slug` | `Documentation.tsx` | Article view |
| `/docs/:category/:slug/edit` | `DocEditorPage.tsx` | Edit docs (admin) |
| `/api-docs` | `APIDocumentation.tsx` | API documentation |

---

## Page Conventions

### Protected Routes

Most pages are wrapped with `ProtectedRoute`:

```typescript
<ProtectedRoute requiredRole="admin">
  <AdminPage />
</ProtectedRoute>
```

### Page Structure

```typescript
export default function MyPage() {
  // 1. Hooks at top
  const { data, isLoading } = useMyData();
  
  // 2. Loading state
  if (isLoading) return <LoadingPage />;
  
  // 3. Main content
  return (
    <Layout>
      <PageHeader title="My Page" />
      <PageContent />
    </Layout>
  );
}
```

### Subdirectories

Some pages are organized in subdirectories:
- `marketing/` - Marketing-related pages
- `contacts/` - Contact-related pages
- `admin/` - Admin-specific pages

---

## Adding a New Page

1. Create page file in `src/pages/`
2. Add route in `src/App.tsx`:
   ```typescript
   <Route 
     path="/my-page" 
     element={
       <ProtectedRoute requiredRole="user">
         <MyPage />
       </ProtectedRoute>
     } 
   />
   ```
3. Add to sidebar in `src/shared/components/layout/Sidebar.tsx`
