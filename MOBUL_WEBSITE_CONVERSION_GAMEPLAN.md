# MOBUL WEBSITE CONVERSION OVERHAUL
## Complete Game Plan for Cursor Implementation

**Objective:** Transform the Mobul marketing website into a high-converting sales tool by putting the ROI calculator front and center, simplifying the user journey, and getting prospects to "WOW" in under 30 seconds.

**Core Principle:** Every visitor should immediately understand their potential ROI without friction. The calculator IS the hero, not a call-to-action TO a calculator.

---

## PHASE 1: HOMEPAGE HERO TRANSFORMATION

### Current State (To Remove)
- Hero with headline "Turn Direct Mail Into a 30% Response Machine"
- Generic value proposition
- CTA buttons that lead elsewhere
- Calculator hidden on separate page

### New Homepage Hero Structure

**ABOVE THE FOLD - Split Layout (Desktop)**

```
┌─────────────────────────────────────────────────────────────────────┐
│  [LOGO]   Home  |  For Whom  |  About  |  Contact    [Book a Demo]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   LEFT SIDE (40%)              │     RIGHT SIDE (60%)               │
│                                │                                    │
│   "What If Your Direct Mail    │    ┌─────────────────────────┐    │
│    Actually Worked?"           │    │   YOUR CAMPAIGN          │    │
│                                │    │   ─────────────────────  │    │
│   Most businesses waste        │    │   Mail/month    Cost/pc  │    │
│   money on mail that gets      │    │   [5000]        [$0.85]  │    │
│   ignored. See exactly what    │    │                          │    │
│   gift card incentives could   │    │   Revenue per sale       │    │
│   do for YOUR numbers.         │    │   [$3500]                │    │
│                                │    ├─────────────────────────┤    │
│   ✓ Only pay for responses     │    │   CURRENT RESULTS        │    │
│   ✓ 2-5x higher engagement     │    │   ─────────────────────  │    │
│   ✓ Track every conversion     │    │   Responses/mo  Sales/mo │    │
│                                │    │   [30]          [8]      │    │
│   [Scroll to see results ↓]    │    │   0.60% rate   26.7%     │    │
│                                │    ├─────────────────────────┤    │
│                                │    │   🎁 GIFT CARD VALUE     │    │
│                                │    │   [$10][$25][$50][$75]   │    │
│                                │    │   [$100][$200]           │    │
│                                │    │   $25 = 2.5x response    │    │
│                                │    ├─────────────────────────┤    │
│                                │    │   ☐ We do email/SMS      │    │
│                                │    │     follow-up (+15%)     │    │
│                                │    └─────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Implementation Task 1.1: New Hero Section

```markdown
**FILE TO MODIFY:** [homepage file - likely index.html, Home.tsx, or similar]

**REQUIREMENTS:**

1. LAYOUT
   - Two-column layout on desktop (40/60 split)
   - Stack vertically on mobile (headline first, then calculator)
   - Max container width: 1280px
   - Hero section min-height: 100vh on desktop, auto on mobile
   - Calculator must be FULLY visible without scrolling on 1080p screens

2. LEFT COLUMN - MESSAGING
   
   Primary Headline (H1):
   "What If Your Direct Mail Actually Worked?"
   
   Alternative Headlines to A/B Test:
   - "See Your Direct Mail ROI in 30 Seconds"
   - "Stop Guessing. Start Converting."
   - "Your Mail + Gift Cards = Real Results"
   
   Subheadline (p):
   "Most businesses waste money on mail that gets ignored. Enter your real numbers and see exactly what gift card incentives could do for YOUR response rates."
   
   Trust Bullets (ul):
   ✓ Only pay when customers respond
   ✓ 2-5x higher engagement than standard mail
   ✓ Track every scan, click, and conversion
   
   Micro-CTA (small text with arrow):
   "See your projected results below ↓"

3. RIGHT COLUMN - THE CALCULATOR
   
   See Phase 2 for full calculator specification.
   
   Key visual requirements:
   - White card with subtle shadow (shadow-lg)
   - Rounded corners (rounded-2xl)
   - Light gray/blue background behind to create contrast
   - Calculator header: "Calculate Your ROI" in brand blue

4. MOBILE LAYOUT
   - Headline and subhead: 2-3 lines max
   - Trust bullets: horizontal chips or hidden
   - Calculator: full width, may extend below fold (that's OK)
   - Sticky mini-results bar at bottom showing projected ROI

5. BACKGROUND
   - Subtle gradient from white to light blue-gray
   - OR subtle pattern/texture that doesn't distract
   - NO dark backgrounds (calculator needs contrast)
```

---

## PHASE 2: ROI CALCULATOR COMPONENT

### Calculator Input Fields (Exact Match to Current)

The calculator must include these exact inputs from the existing design:

```markdown
**CALCULATOR STRUCTURE:**

┌─────────────────────────────────────────┐
│  YOUR CAMPAIGN                          │
├─────────────────────────────────────────┤
│                                         │
│  Mail/month              Cost/piece     │
│  ┌──────────────┐       ┌──────────────┐│
│  │ 5000         │       │ $ 0.85       ││
│  └──────────────┘       └──────────────┘│
│                                         │
│  Revenue per sale                       │
│  ┌──────────────────────────────────┐  │
│  │ $ 3500                            │  │
│  └──────────────────────────────────┘  │
│                                         │
├─────────────────────────────────────────┤
│  CURRENT RESULTS                        │
├─────────────────────────────────────────┤
│                                         │
│  Responses/mo            Sales/mo       │
│  ┌──────────────┐       ┌──────────────┐│
│  │ 30           │       │ 8            ││
│  └──────────────┘       └──────────────┘│
│  0.60% rate              26.7% close    │
│  (auto-calculated)       (auto-calc)    │
│                                         │
├─────────────────────────────────────────┤
│  🎁 GIFT CARD VALUE                     │
├─────────────────────────────────────────┤
│                                         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌─────┐  │
│  │$10 │ │$25 │ │$50 │ │$75 │ │$100 │  │
│  └────┘ └────┘ └────┘ └────┘ └─────┘  │
│           ▲                            │
│        selected                        │
│  ┌────────────────────────────────┐   │
│  │           $200                 │   │
│  └────────────────────────────────┘   │
│                                         │
│  $25 = 2.5x response lift              │
│  (dynamic based on selection)          │
│                                         │
├─────────────────────────────────────────┤
│  ☐ We already do email/SMS follow-up   │
│    Mobul adds +15% revenue via         │
│    nurture sequences.                  │
│                                         │
└─────────────────────────────────────────┘
```

### Implementation Task 2.1: Calculator Component

```markdown
**FILE TO CREATE:** components/ROICalculator.tsx (or .jsx, .vue, etc.)

**INPUT FIELDS:**

1. YOUR CAMPAIGN Section
   - mail_per_month: number input, default 5000, placeholder "e.g., 5,000"
   - cost_per_piece: currency input, default 0.85, prefix "$"
   - revenue_per_sale: currency input, default 3500, prefix "$"

2. CURRENT RESULTS Section  
   - responses_per_month: number input, default 30
   - sales_per_month: number input, default 8
   - AUTO-DISPLAY (not inputs):
     - response_rate = (responses_per_month / mail_per_month) * 100
     - close_rate = (sales_per_month / responses_per_month) * 100

3. GIFT CARD VALUE Section
   - gift_card_value: button group selection
   - Options: $10, $25, $50, $75, $100, $200
   - Default selected: $25
   - Show multiplier text below: "{value} = {multiplier}x response lift"
   
   MULTIPLIER TABLE:
   | Value | Multiplier | Display Text        |
   |-------|------------|---------------------|
   | $10   | 1.5x       | "$10 = 1.5x lift"   |
   | $25   | 2.5x       | "$25 = 2.5x lift"   |
   | $50   | 3.0x       | "$50 = 3.0x lift"   |
   | $75   | 3.5x       | "$75 = 3.5x lift"   |
   | $100  | 4.0x       | "$100 = 4.0x lift"  |
   | $200  | 5.0x       | "$200 = 5.0x lift"  |

4. EMAIL/SMS CHECKBOX
   - has_followup: boolean checkbox
   - Label: "We already do email/SMS follow-up"
   - Helper text: "Mobul adds +15% revenue via nurture sequences."
   - If checked: apply 1.15x multiplier to final revenue

**STYLING:**
- Section headers: uppercase, small, gray, tracking-wide
- Input labels: small, medium weight
- Inputs: full rounded, gray border, focus:ring-blue
- Gift card buttons: pill shape, gray bg, selected = brand blue bg + white text
- Calculated rates: small text below inputs, gray color
```

### Implementation Task 2.2: Results Display Section

```markdown
**RESULTS SECTION - Appears below calculator inputs OR in a sticky panel**

This section updates in REAL-TIME as inputs change (debounce 150ms max).

┌─────────────────────────────────────────────────────────────────┐
│  WITH MOBUL                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  PROJECTED  │  │   NEW       │  │   YOUR      │            │
│  │  RESPONSES  │  │   REVENUE   │  │   ROI       │            │
│  │             │  │             │  │             │            │
│  │    75/mo    │  │  $26,250    │  │   312%      │            │
│  │             │  │   /month    │  │             │            │
│  │  ↑ 150%     │  │  ↑ $18,250  │  │             │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  vs. your current: 30 responses, $8,000/mo revenue             │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐│
│  │                                                           ││
│  │   [  Get Your Custom Campaign Plan  ] ← Primary CTA      ││
│  │                                                           ││
│  └───────────────────────────────────────────────────────────┘│
│                                                                 │
│  How we calculate this ▼ (expandable)                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

**CALCULATION LOGIC:**

// Inputs
const mailPerMonth = [user input]
const costPerPiece = [user input]
const revenuePerSale = [user input]
const currentResponses = [user input]
const currentSales = [user input]
const giftCardValue = [selected value]
const hasFollowup = [checkbox boolean]

// Current metrics
const currentResponseRate = currentResponses / mailPerMonth
const currentCloseRate = currentSales / currentResponses
const currentRevenue = currentSales * revenuePerSale

// Gift card multiplier lookup
const multipliers = { 10: 1.5, 25: 2.5, 50: 3.0, 75: 3.5, 100: 4.0, 200: 5.0 }
const responseMultiplier = multipliers[giftCardValue]

// Projected with Mobul
const projectedResponseRate = currentResponseRate * responseMultiplier
const projectedResponses = Math.round(mailPerMonth * projectedResponseRate)
const projectedSales = Math.round(projectedResponses * currentCloseRate)
let projectedRevenue = projectedSales * revenuePerSale

// Apply follow-up bonus if checked
if (hasFollowup) {
  projectedRevenue = projectedRevenue * 1.15
}

// Calculate costs
const mailCost = mailPerMonth * costPerPiece
const giftCardCost = projectedResponses * giftCardValue  // Only pay for responses!
const totalCost = mailCost + giftCardCost

// ROI
const additionalRevenue = projectedRevenue - currentRevenue
const roi = ((additionalRevenue - giftCardCost) / giftCardCost) * 100

**DISPLAY FORMATTING:**
- Large numbers: animate count-up on change
- Currency: format with commas ($26,250)
- Percentages: whole numbers (312%)
- Comparison: show delta from current (↑ 150% more responses)
- Colors: Green for positive metrics, brand blue for emphasis
```

### Implementation Task 2.3: Mobile Calculator Optimization

```markdown
**MOBILE-SPECIFIC REQUIREMENTS:**

1. Calculator Layout
   - Full width (100vw - padding)
   - Inputs stack vertically
   - Gift card buttons: 3 per row on small screens, wrap
   - Section headers: smaller, less padding
   
2. Sticky Results Bar (Mobile Only)
   - Fixed to bottom of screen
   - Shows: "Your ROI: 312% | $26,250/mo"
   - Tap to expand full results
   - Disappears when results section is in view
   
3. Touch Optimization
   - Input heights: min 48px
   - Button touch targets: min 44px
   - Sufficient spacing between interactive elements
   - Number inputs trigger numeric keyboard

4. Performance
   - Calculations should feel instant
   - No loading spinners for real-time updates
   - Debounce input changes at 100-150ms
```

---

## PHASE 3: RESULTS & CTA SECTION

### Implementation Task 3.1: Results Section Below Calculator

```markdown
**FULL RESULTS BREAKDOWN:**

After the hero with calculator, show expanded results (scrolls into view):

┌─────────────────────────────────────────────────────────────────┐
│  YOUR PROJECTED RESULTS WITH MOBUL                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    SIDE BY SIDE COMPARISON              │   │
│  │                                                         │   │
│  │  METRIC              NOW           WITH MOBUL           │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Mail pieces         5,000         5,000                │   │
│  │  Response rate       0.60%         1.50% ↑              │   │
│  │  Responses           30            75 (+45)             │   │
│  │  Close rate          26.7%         26.7%                │   │
│  │  New customers       8             20 (+12)             │   │
│  │  Monthly revenue     $28,000       $70,000 ↑            │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  Gift card cost      $0            $1,875 (for results) │   │
│  │  NET ADDITIONAL      —             $40,125/month ↑      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  "You only pay for gift cards when customers respond.          │
│   No response = no cost."                                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │   [  Book a Demo - See This For Your Business  ]         │ │
│  │                                                           │ │
│  │   or call us: (555) 123-4567                              │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Task 3.2: Methodology Expandable

```markdown
**"HOW WE CALCULATE THIS" ACCORDION:**

When expanded, show:

Our projections are based on:

1. **Response Rate Lift**: Gift card incentives consistently deliver 
   1.5x-5x higher response rates depending on value. These multipliers 
   are based on aggregate data from direct mail campaigns across 
   multiple industries.

2. **Your Close Rate**: We assume your sales team's close rate stays 
   the same. You're getting MORE qualified leads, not changing your 
   sales process.

3. **Pay-Per-Response Model**: Unlike traditional mail where you pay 
   upfront, you only pay for gift cards when someone actually responds. 
   This means your cost is tied directly to results.

4. **Conservative Estimates**: We use 25th percentile performance data, 
   meaning 75% of businesses see BETTER results than shown here.

[Edit assumptions] ← Link to adjust multipliers if power users want to
```

---

## PHASE 4: NAVIGATION & PAGE STRUCTURE UPDATES

### Implementation Task 4.1: Update Navigation

```markdown
**REMOVE FROM NAV:**
- "ROI Calculator" link (calculator is now on homepage)

**NEW NAV STRUCTURE:**
Home | For Whom | About | Contact | [Book a Demo]

**NAV BEHAVIOR:**
- "Home" scrolls to top if on homepage, navigates to / if elsewhere
- "Book a Demo" button: brand color, stands out
- Mobile: hamburger menu, "Book a Demo" always visible
```

### Implementation Task 4.2: Remove Old Calculator Page

```markdown
**DELETE OR REDIRECT:**
- /roi-calculator page → 301 redirect to homepage
- /calculator → 301 redirect to homepage

**SEARCH FOR AND UPDATE:**
- Any internal links to /roi-calculator → change to /#calculator or /
- Footer links referencing calculator page
- Any CTAs saying "Try our calculator" → "See your ROI" linking to homepage
```

### Implementation Task 4.3: For Whom Page Update

```markdown
**ADD CALCULATOR SECTION:**

After the industry descriptions, add:

## See What Mobul Could Do for Your Business

[Embed same ROI calculator component]

Note: If possible, pre-fill industry-appropriate defaults based on 
which industry section user scrolled from (optional enhancement).

**INDUSTRY DEFAULTS (if implementing auto-fill):**

| Industry           | Mail/mo | Cost/pc | Rev/sale | Responses | Sales |
|-------------------|---------|---------|----------|-----------|-------|
| Financial Services | 10000   | 0.95    | 5000     | 35        | 7     |
| Home Services      | 5000    | 0.75    | 2500     | 40        | 10    |
| Healthcare         | 8000    | 0.85    | 3000     | 30        | 8     |
| Automotive         | 6000    | 0.80    | 1500     | 50        | 15    |
| Real Estate        | 3000    | 1.20    | 15000    | 15        | 3     |
```

### Implementation Task 4.4: Contact Page (A2P Compliant - Already Done)

```markdown
**REFERENCE:** Contact form should now be A2P compliant with:
- Separate checkboxes (not radio buttons) for marketing and non-marketing SMS consent
- Checkboxes are OPTIONAL, not required
- Full disclosure text with HELP/STOP instructions
- Terms and Privacy links separate from checkbox text
```

---

## PHASE 5: SUPPORTING CONTENT SECTIONS (Homepage Below Fold)

### Implementation Task 5.1: How It Works Section

```markdown
**SECTION: HOW MOBUL WORKS**

Three-step horizontal layout (vertical on mobile):

[Icon: Form]              [Icon: Mail+Gift]         [Icon: Chart]
STEP 1                    STEP 2                    STEP 3
Tell us your numbers      We design your campaign   You only pay for results

Enter your current        Our team creates          Gift cards go out only
mail volume and           personalized mailers      when customers respond.
response rates.           with gift card offers     Track every redemption
                          that get opened.          and conversion.

[CTA: See your numbers now ↑] (scrolls back to calculator)
```

### Implementation Task 5.2: Why It Works Section

```markdown
**SECTION: WHY GIFT CARD INCENTIVES WORK**

Stat cards in a row:

┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│    2-5x     │  │    95%      │  │    100%     │  │    $0       │
│   Higher    │  │   Open      │  │   Trackable │  │   Wasted    │
│  Response   │  │   Rate      │  │   Results   │  │             │
│             │  │             │  │             │  │             │
│  vs standard│  │  People     │  │  Know who   │  │  No response│
│  direct mail│  │  open mail  │  │  responded  │  │  = no cost  │
│             │  │  with gifts │  │  and when   │  │             │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

### Implementation Task 5.3: Social Proof Section

```markdown
**SECTION: TRUSTED BY BUSINESSES LIKE YOURS**

If logos available:
[Logo] [Logo] [Logo] [Logo] [Logo]

If no logos yet, use industry list:
"Serving businesses in Financial Services • Healthcare • Home Services • 
Automotive • Real Estate • and more"

Optional testimonial:
"We were skeptical, but the numbers don't lie. Our response rate went 
from 0.5% to 2.1% in our first campaign."
— [Name], [Title], [Company]
```

### Implementation Task 5.4: Final CTA Section

```markdown
**SECTION: READY TO TRANSFORM YOUR DIRECT MAIL?**

Two-column CTA:

┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   Not sure yet?                    Ready to start?              │
│                                                                 │
│   [Calculate Your ROI]             [Book a Demo]                │
│   (scrolls to calculator)          (opens booking)              │
│                                                                 │
│   See your projected results       Get a custom campaign        │
│   in 30 seconds.                   plan from our team.          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PHASE 6: TECHNICAL REQUIREMENTS

### Implementation Task 6.1: Performance Optimization

```markdown
**REQUIREMENTS:**

1. Calculator JavaScript
   - Load immediately (not lazy loaded)
   - No external API calls for calculations
   - All calculation logic client-side
   - Debounce input handlers: 100-150ms
   
2. Page Load
   - Hero with calculator visible in < 2 seconds
   - No layout shift when calculator loads
   - Critical CSS inlined
   
3. Real-time Updates
   - Results update as user types
   - Smooth number animations (count-up effect)
   - No spinners or loading states for calculations
```

### Implementation Task 6.2: Analytics & Tracking

```markdown
**EVENTS TO TRACK:**

1. Calculator Interactions
   - calculator_input_changed: { field, value }
   - gift_card_selected: { value }
   - followup_checkbox_toggled: { checked }
   - calculator_results_viewed (when results section enters viewport)
   
2. CTA Clicks
   - book_demo_clicked: { source: 'hero' | 'results' | 'footer' }
   - scroll_to_calculator_clicked
   
3. Form Submissions
   - demo_form_submitted: { source, calculated_roi, calculated_revenue }
   
**STORE IN SESSION/URL:**
When user clicks "Book a Demo", pass their calculator inputs to the 
booking form or Calendly embed so we know their projected numbers.

Query params: ?mail=5000&responses=30&sales=8&gc=25&roi=312
```

### Implementation Task 6.3: SEO & Meta Tags

```markdown
**HOMEPAGE META:**

<title>Mobul - Direct Mail That Actually Converts | ROI Calculator</title>

<meta name="description" content="Stop wasting money on direct mail 
that gets ignored. See exactly what gift card incentives could do for 
your response rates. Calculate your ROI in 30 seconds.">

<meta property="og:title" content="What If Your Direct Mail Actually Worked?">
<meta property="og:description" content="Calculate your direct mail ROI 
with gift card incentives. See your projected results instantly.">
<meta property="og:image" content="[hero image or calculator screenshot]">

**STRUCTURED DATA:**
Add Calculator structured data if applicable for rich snippets.
```

---

## PHASE 7: COPY & MESSAGING GUIDELINES

### Headlines to Use

```markdown
**PRIMARY HEADLINES (rotate/test):**
1. "What If Your Direct Mail Actually Worked?"
2. "See Your Direct Mail ROI in 30 Seconds"
3. "Stop Guessing. Start Converting."
4. "Your Current Mail + Gift Cards = Real Results"
5. "Calculate What You're Leaving on the Table"

**AVOID:**
- "Turn Direct Mail Into a 30% Response Machine" (too salesy, unbelievable)
- Anything with specific percentages that seem too good
- Jargon like "performance-based" or "incentivized mail"
```

### Value Propositions

```markdown
**CORE VALUE PROPS (use consistently):**

1. "Only pay when customers respond"
   - This is the #1 differentiator
   - Mention early and often
   
2. "Know exactly who responded"
   - Trackability is huge vs traditional mail
   - Every QR scan, every redemption tracked
   
3. "2-5x higher response rates"
   - Based on gift card multiplier data
   - Always attribute: "based on aggregate campaign data"
   
4. "Real numbers, not promises"
   - The calculator proves this
   - Let them see their own projections

**AVOID:**
- Overpromising specific results
- Claiming "guaranteed" anything
- Competitor bashing
```

### Tone Guidelines

```markdown
**VOICE:**
- Confident but not arrogant
- Data-driven, show the math
- Empathetic: "We know mail is expensive"
- Direct: Get to the point fast

**READING LEVEL:**
- 8th grade or below
- Short sentences
- No jargon
- Numbers > adjectives

**EXAMPLES:**

GOOD: "You spend $4,250 on mail. You get 30 responses. What if you got 75?"

BAD: "Leverage our performance-based direct mail platform to optimize 
your customer acquisition funnel through incentivized engagement mechanisms."
```

---

## IMPLEMENTATION CHECKLIST

```markdown
**PHASE 1: Hero Section**
☐ Remove old hero content
☐ Create two-column layout
☐ Add left column messaging (headline, subhead, bullets)
☐ Integrate calculator component (right column)
☐ Test mobile stacking
☐ Verify above-fold visibility on common screens

**PHASE 2: Calculator Component**
☐ Create ROICalculator component
☐ Implement all input fields matching spec
☐ Add gift card button group with multipliers
☐ Add email/SMS checkbox with bonus
☐ Implement real-time calculation logic
☐ Add results display section
☐ Add count-up animation to result numbers
☐ Test all edge cases (zeros, large numbers)

**PHASE 3: Results & CTA**
☐ Create expanded results comparison table
☐ Add methodology expandable accordion
☐ Style primary CTA button prominently
☐ Add secondary CTA (phone number)

**PHASE 4: Navigation & Structure**
☐ Remove ROI Calculator from nav
☐ Set up redirects for old calculator URL
☐ Update all internal links
☐ Update footer if needed

**PHASE 5: Supporting Sections**
☐ Add "How It Works" 3-step section
☐ Add "Why It Works" stats section  
☐ Add social proof section
☐ Add final dual-CTA section

**PHASE 6: Technical**
☐ Verify page load performance
☐ Add analytics event tracking
☐ Update meta tags and SEO
☐ Test on mobile devices
☐ Test on various browsers

**PHASE 7: Final Review**
☐ Review all copy against guidelines
☐ Check for consistency in messaging
☐ Verify calculator accuracy
☐ Get stakeholder approval
☐ Launch to production
```

---

## QUICK REFERENCE: CALCULATOR MATH

```javascript
// ========================================
// ROI CALCULATOR - COMPLETE LOGIC
// ========================================

// Gift card response multipliers
const MULTIPLIERS = {
  10: 1.5,
  25: 2.5,
  50: 3.0,
  75: 3.5,
  100: 4.0,
  200: 5.0
};

// Follow-up bonus multiplier
const FOLLOWUP_BONUS = 1.15;

function calculateROI(inputs) {
  const {
    mailPerMonth,
    costPerPiece,
    revenuePerSale,
    currentResponses,
    currentSales,
    giftCardValue,
    hasFollowup
  } = inputs;
  
  // Current state
  const currentResponseRate = currentResponses / mailPerMonth;
  const currentCloseRate = currentSales / currentResponses;
  const currentRevenue = currentSales * revenuePerSale;
  
  // Get multiplier for selected gift card
  const multiplier = MULTIPLIERS[giftCardValue] || 2.5;
  
  // Projected with Mobul
  const projectedResponseRate = currentResponseRate * multiplier;
  const projectedResponses = Math.round(mailPerMonth * projectedResponseRate);
  const projectedSales = Math.round(projectedResponses * currentCloseRate);
  let projectedRevenue = projectedSales * revenuePerSale;
  
  // Apply follow-up bonus
  if (hasFollowup) {
    projectedRevenue = projectedRevenue * FOLLOWUP_BONUS;
  }
  
  // Costs (only pay for responses!)
  const mailCost = mailPerMonth * costPerPiece;
  const giftCardCost = projectedResponses * giftCardValue;
  const totalInvestment = giftCardCost; // Mail cost is existing spend
  
  // Calculate additional revenue and ROI
  const additionalRevenue = projectedRevenue - currentRevenue;
  const netGain = additionalRevenue - giftCardCost;
  const roi = totalInvestment > 0 
    ? Math.round((netGain / totalInvestment) * 100) 
    : 0;
  
  return {
    // Current metrics (for display)
    currentResponseRate: (currentResponseRate * 100).toFixed(2),
    currentCloseRate: (currentCloseRate * 100).toFixed(1),
    currentRevenue: Math.round(currentRevenue),
    
    // Projected metrics
    projectedResponseRate: (projectedResponseRate * 100).toFixed(2),
    projectedResponses,
    projectedSales,
    projectedRevenue: Math.round(projectedRevenue),
    
    // Comparison
    additionalResponses: projectedResponses - currentResponses,
    additionalSales: projectedSales - currentSales,
    additionalRevenue: Math.round(additionalRevenue),
    
    // Costs
    giftCardCost,
    
    // ROI
    roi,
    
    // Multiplier used
    responseMultiplier: multiplier
  };
}
```

---

## END OF GAME PLAN

**Remember:** The goal is WOW in 30 seconds. The calculator does the selling. 
Everything else supports getting them to interact with it and trust the results.

When in doubt, ask: "Does this help someone understand their potential ROI faster?"
