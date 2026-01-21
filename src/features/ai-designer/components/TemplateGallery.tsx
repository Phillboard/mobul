/**
 * TemplateGallery Component
 * 
 * Displays a gallery of template options for quick-start landing page generation.
 * Supports filtering by category and searching.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  Sparkles,
  Building2,
  Gift,
  Calendar,
  Heart,
  ShoppingBag,
  Briefcase,
  Star,
  Filter,
  X,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { cn } from '@/shared/utils/cn';
import type { Template, TemplateCategory } from '../types';

// ============================================================================
// Category Configuration
// ============================================================================

interface CategoryConfig {
  label: string;
  icon: typeof Sparkles;
  color: string;
}

const CATEGORY_CONFIG: Record<TemplateCategory, CategoryConfig> = {
  'saas': { label: 'SaaS', icon: Building2, color: 'bg-blue-500' },
  'lead-gen': { label: 'Lead Generation', icon: Sparkles, color: 'bg-green-500' },
  'gift-card': { label: 'Gift Card', icon: Gift, color: 'bg-purple-500' },
  'thank-you': { label: 'Thank You', icon: Heart, color: 'bg-pink-500' },
  'event': { label: 'Event', icon: Calendar, color: 'bg-orange-500' },
  'service': { label: 'Service', icon: Briefcase, color: 'bg-teal-500' },
  'product': { label: 'Product', icon: ShoppingBag, color: 'bg-indigo-500' },
  'portfolio': { label: 'Portfolio', icon: Star, color: 'bg-yellow-500' },
};

// ============================================================================
// Full Template Library
// ============================================================================

const TEMPLATES: Template[] = [
  // SaaS Templates
  {
    id: 'saas-product',
    name: 'SaaS Product Page',
    description: 'Modern product page with hero, features, and pricing tiers',
    category: 'saas',
    thumbnail: '',
    prompt: 'Create a modern SaaS product landing page with a hero section featuring a headline about productivity software, a subheadline with value proposition, a CTA button, a features section with 4 feature cards in a grid, a pricing section with 3 tiers (Basic, Pro, Enterprise), testimonials, and a footer with links.',
    tags: ['saas', 'product', 'pricing', 'features'],
    isPopular: true,
  },
  {
    id: 'saas-startup',
    name: 'Startup Launch',
    description: 'Bold landing page for new product launches',
    category: 'saas',
    thumbnail: '',
    prompt: 'Create a bold startup launch landing page with a gradient hero background, a large headline announcing the product, an animated CTA button, a "How it works" section with 3 steps, integration logos section, early access signup form, and social proof with user count.',
    tags: ['startup', 'launch', 'beta', 'signup'],
  },
  {
    id: 'saas-dashboard',
    name: 'Analytics Dashboard',
    description: 'Page showcasing dashboard/analytics product',
    category: 'saas',
    thumbnail: '',
    prompt: 'Create a landing page for an analytics dashboard product with a hero showing a dashboard screenshot mockup, key metrics highlights, feature comparison table, integration partners section, security badges, and a free trial CTA.',
    tags: ['analytics', 'dashboard', 'data'],
  },

  // Lead Generation Templates
  {
    id: 'lead-gen-ebook',
    name: 'E-book Download',
    description: 'Capture leads with free e-book offer',
    category: 'lead-gen',
    thumbnail: '',
    prompt: 'Create a lead generation landing page for a free e-book download with a compelling headline, book cover image mockup, 5 bullet points of what readers will learn, author bio section, a simple form (name, email), and social proof with download count.',
    tags: ['ebook', 'download', 'lead-magnet'],
    isPopular: true,
  },
  {
    id: 'lead-gen-webinar',
    name: 'Webinar Registration',
    description: 'Drive signups for your webinar',
    category: 'lead-gen',
    thumbnail: '',
    prompt: 'Create a webinar registration landing page with date and time prominently displayed, webinar title and description, speaker headshots and bios, 3 key takeaways, registration form (name, email, company), and a countdown timer.',
    tags: ['webinar', 'registration', 'event'],
  },
  {
    id: 'lead-gen-consultation',
    name: 'Free Consultation',
    description: 'Book free consultation appointments',
    category: 'lead-gen',
    thumbnail: '',
    prompt: 'Create a free consultation booking page with a professional hero, benefits of the consultation, consultant profile, testimonials from past clients, a booking form with name, email, phone, and preferred time, and trust badges.',
    tags: ['consultation', 'booking', 'services'],
  },

  // Gift Card Templates
  {
    id: 'gift-card-redemption',
    name: 'Gift Card Redemption',
    description: 'Branded gift card claim page',
    category: 'gift-card',
    thumbnail: '',
    prompt: 'Create a celebratory gift card redemption page with a confetti animation, gift card value display, code entry form, clear redemption instructions, terms and conditions link, and customer support contact.',
    tags: ['gift-card', 'redemption', 'reward'],
    isPopular: true,
  },
  {
    id: 'gift-card-purchase',
    name: 'Gift Card Purchase',
    description: 'Buy gift cards for loved ones',
    category: 'gift-card',
    thumbnail: '',
    prompt: 'Create a gift card purchase page with value selection buttons ($25, $50, $100, custom), recipient details form, personalized message input, delivery options (email or print), and secure payment badges.',
    tags: ['gift-card', 'purchase', 'e-commerce'],
  },

  // Thank You Templates
  {
    id: 'thank-you-purchase',
    name: 'Purchase Confirmation',
    description: 'Post-purchase thank you page',
    category: 'thank-you',
    thumbnail: '',
    prompt: 'Create a purchase thank you page with a success checkmark animation, order summary, estimated delivery information, what happens next section, social sharing buttons, and recommended products section.',
    tags: ['thank-you', 'confirmation', 'order'],
  },
  {
    id: 'thank-you-signup',
    name: 'Signup Confirmation',
    description: 'Welcome new subscribers',
    category: 'thank-you',
    thumbnail: '',
    prompt: 'Create a signup thank you page with a welcome message, what to expect next, immediate value (download link or access button), social media follow buttons, and referral program invitation.',
    tags: ['thank-you', 'welcome', 'onboarding'],
  },

  // Event Templates
  {
    id: 'event-conference',
    name: 'Conference Page',
    description: 'Multi-day conference or summit',
    category: 'event',
    thumbnail: '',
    prompt: 'Create a conference landing page with event name and dates, venue location with map, agenda/schedule by day, keynote speaker showcases, ticket tiers (Early Bird, Standard, VIP), sponsor logos, and FAQ section.',
    tags: ['conference', 'summit', 'tickets'],
  },
  {
    id: 'event-workshop',
    name: 'Workshop Registration',
    description: 'Single-day workshop or training',
    category: 'event',
    thumbnail: '',
    prompt: 'Create a workshop registration page with workshop title and date, instructor bio, curriculum outline, who should attend section, pricing with early bird discount, testimonials from past attendees, and registration form.',
    tags: ['workshop', 'training', 'education'],
  },

  // Service Templates
  {
    id: 'service-agency',
    name: 'Agency Services',
    description: 'Marketing or creative agency page',
    category: 'service',
    thumbnail: '',
    prompt: 'Create an agency services landing page with a bold hero headline, services offered grid, portfolio/case studies section, client logos, team section with photos, awards and recognition, and contact form.',
    tags: ['agency', 'services', 'portfolio'],
  },
  {
    id: 'service-local',
    name: 'Local Business',
    description: 'Local service provider page',
    category: 'service',
    thumbnail: '',
    prompt: 'Create a local service business page (like plumbing or landscaping) with service area coverage, services list with icons, before/after photo gallery, customer reviews, business hours, phone number prominently displayed, and contact form.',
    tags: ['local', 'service', 'small-business'],
  },
  {
    id: 'service-freelancer',
    name: 'Freelancer Portfolio',
    description: 'Personal freelance services page',
    category: 'service',
    thumbnail: '',
    prompt: 'Create a freelancer portfolio page with a personal intro and photo, skills section, featured projects with descriptions, testimonials, pricing packages, availability status, and contact form.',
    tags: ['freelancer', 'portfolio', 'personal'],
  },

  // Product Templates
  {
    id: 'product-physical',
    name: 'Physical Product',
    description: 'Single product showcase page',
    category: 'product',
    thumbnail: '',
    prompt: 'Create a product landing page for a physical product with hero product image, key features with icons, technical specifications, product video placeholder, customer reviews, pricing with buy button, and satisfaction guarantee badge.',
    tags: ['product', 'e-commerce', 'physical'],
  },
  {
    id: 'product-app',
    name: 'Mobile App',
    description: 'App download landing page',
    category: 'product',
    thumbnail: '',
    prompt: 'Create a mobile app landing page with phone mockups showing the app, key features list, app store badges (iOS and Android), user statistics, press mentions, and email signup for updates.',
    tags: ['app', 'mobile', 'download'],
  },

  // Portfolio Templates
  {
    id: 'portfolio-creative',
    name: 'Creative Portfolio',
    description: 'Designer or artist portfolio',
    category: 'portfolio',
    thumbnail: '',
    prompt: 'Create a creative portfolio page with a minimalist hero, masonry-style project gallery, about me section, skills and tools, client list, and contact information.',
    tags: ['portfolio', 'creative', 'designer'],
  },
];

// ============================================================================
// Component Props
// ============================================================================

interface TemplateGalleryProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Template) => Promise<void>;
  isLoading?: boolean;
}

// ============================================================================
// Template Card Component
// ============================================================================

function TemplateCard({
  template,
  onSelect,
  isLoading,
}: {
  template: Template;
  onSelect: () => void;
  isLoading?: boolean;
}) {
  const config = CATEGORY_CONFIG[template.category];
  const Icon = config.icon;

  return (
    <button
      onClick={onSelect}
      disabled={isLoading}
      className={cn(
        'group w-full p-4 rounded-lg border text-left transition-all',
        'hover:border-primary hover:shadow-md hover:bg-primary/5',
        'disabled:opacity-50 disabled:pointer-events-none',
        template.isPopular && 'border-primary/30 bg-primary/5'
      )}
    >
      {/* Thumbnail placeholder */}
      <div className={cn(
        'w-full h-24 rounded-md mb-3 flex items-center justify-center',
        config.color + '/10'
      )}>
        <Icon className={cn('h-8 w-8', config.color.replace('bg-', 'text-').replace('-500', '-600'))} />
      </div>

      {/* Content */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm group-hover:text-primary transition-colors">
            {template.name}
          </h4>
          {template.isPopular && (
            <Badge variant="secondary" className="text-[10px] px-1">
              <Star className="h-2 w-2 mr-0.5 fill-current" />
              Popular
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {template.description}
        </p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mt-2">
        {template.tags.slice(0, 3).map((tag) => (
          <Badge key={tag} variant="outline" className="text-[10px] px-1">
            {tag}
          </Badge>
        ))}
      </div>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TemplateGallery({
  open,
  onClose,
  onSelectTemplate,
  isLoading,
}: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((template) => {
      const matchesSearch = searchQuery === '' ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const handleSelectTemplate = useCallback(async (template: Template) => {
    await onSelectTemplate(template);
    onClose();
  }, [onSelectTemplate, onClose]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
  }, []);

  const hasFilters = searchQuery !== '' || selectedCategory !== 'all';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Template Gallery
          </DialogTitle>
          <DialogDescription>
            Choose a template to get started quickly. AI will generate a customized version for you.
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 py-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="flex-shrink-0"
          >
            All
          </Button>
          {(Object.keys(CATEGORY_CONFIG) as TemplateCategory[]).map((category) => {
            const config = CATEGORY_CONFIG[category];
            const Icon = config.icon;
            return (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="flex-shrink-0"
              >
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Button>
            );
          })}
        </div>

        {/* Template Grid */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-medium mb-1">No templates found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filters
              </p>
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Clear all filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => handleSelectTemplate(template)}
                  isLoading={isLoading}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export { TEMPLATES };
