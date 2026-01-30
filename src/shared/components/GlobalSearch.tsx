/**
 * GlobalSearch Component
 * 
 * Command palette style search (Cmd+K or Ctrl+K) for quick navigation
 * and searching across campaigns, contacts, forms, and more.
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/shared/components/ui/command";
import { 
  Megaphone, 
  Users, 
  FormInput, 
  Gift, 
  Settings, 
  FileText,
  Globe,
  Mail,
  Headphones,
  LayoutDashboard,
  Search,
  ArrowRight,
  Clock,
} from "lucide-react";
import { supabase } from '@core/services/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { Badge } from "@/shared/components/ui/badge";
import { useFeatureFlags } from '@shared/hooks';

interface SearchResult {
  id: string;
  type: 'campaign' | 'contact' | 'form' | 'page';
  title: string;
  subtitle?: string;
  href: string;
  icon: React.ReactNode;
}

// Quick navigation pages
const QUICK_PAGES = [
  { title: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-4 w-4" />, keywords: ['home', 'overview'] },
  { title: 'All Campaigns', href: '/campaigns', icon: <Megaphone className="h-4 w-4" />, keywords: ['mail', 'direct'] },
  { title: 'Contacts', href: '/contacts', icon: <Users className="h-4 w-4" />, keywords: ['people', 'crm'] },
  { title: 'ACE Forms', href: '/ace-forms', icon: <FormInput className="h-4 w-4" />, keywords: ['forms', 'lead'] },
  { title: 'Gift Cards', href: '/gift-cards', icon: <Gift className="h-4 w-4" />, keywords: ['rewards', 'inventory'] },
  { title: 'Landing Pages', href: '/landing-pages', icon: <Globe className="h-4 w-4" />, keywords: ['purl', 'web'] },
  { title: 'Mail Library', href: '/mail', icon: <Mail className="h-4 w-4" />, keywords: ['design', 'templates'] },
  { title: 'Call Center', href: '/call-center', icon: <Headphones className="h-4 w-4" />, keywords: ['redemption'] },
  { title: 'Settings', href: '/settings', icon: <Settings className="h-4 w-4" />, keywords: ['preferences', 'account'] },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const { isEnabled } = useFeatureFlags();

  // Keyboard shortcut to open search
  useEffect(() => {
    if (!isEnabled('global_search')) return;

    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isEnabled]);

  // Search campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ['search-campaigns', query, currentClient?.id],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      
      let searchQuery = supabase
        .from('campaigns')
        .select('id, name, status, mail_date')
        .ilike('name', `%${query}%`)
        .limit(5);

      if (currentClient) {
        searchQuery = searchQuery.eq('client_id', currentClient.id);
      }

      const { data, error } = await searchQuery;
      if (error) throw error;
      return data || [];
    },
    enabled: query.length >= 2,
  });

  // Search contacts
  const { data: contacts = [] } = useQuery({
    queryKey: ['search-contacts', query, currentClient?.id],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      
      let searchQuery = supabase
        .from('contacts')
        .select('id, email, first_name, last_name')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(5);

      if (currentClient) {
        searchQuery = searchQuery.eq('client_id', currentClient.id);
      }

      const { data, error } = await searchQuery;
      if (error) throw error;
      return data || [];
    },
    enabled: query.length >= 2,
  });

  // Search forms
  const { data: forms = [] } = useQuery({
    queryKey: ['search-forms', query, currentClient?.id],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      
      let searchQuery = supabase
        .from('ace_forms')
        .select('id, name, form_type')
        .ilike('name', `%${query}%`)
        .eq('is_draft', false) // Only show published forms in search
        .limit(5);

      if (currentClient) {
        searchQuery = searchQuery.eq('client_id', currentClient.id);
      }

      const { data, error } = await searchQuery;
      if (error) throw error;
      return data || [];
    },
    enabled: query.length >= 2,
  });

  // Filter pages by query
  const filteredPages = QUICK_PAGES.filter(page => 
    page.title.toLowerCase().includes(query.toLowerCase()) ||
    page.keywords.some(k => k.includes(query.toLowerCase()))
  );

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  if (!isEnabled('global_search')) return null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search campaigns, contacts, pages..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          <div className="py-6 text-center">
            <Search className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {query.length < 2 
                ? "Type at least 2 characters to search" 
                : "No results found"
              }
            </p>
          </div>
        </CommandEmpty>

        {/* Quick Navigation */}
        {filteredPages.length > 0 && (
          <CommandGroup heading="Quick Navigation">
            {filteredPages.map((page) => (
              <CommandItem
                key={page.href}
                onSelect={() => runCommand(() => navigate(page.href))}
              >
                {page.icon}
                <span className="ml-2">{page.title}</span>
                <CommandShortcut>
                  <ArrowRight className="h-3 w-3" />
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Campaign Results */}
        {campaigns.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Campaigns">
              {campaigns.map((campaign) => (
                <CommandItem
                  key={campaign.id}
                  onSelect={() => runCommand(() => navigate(`/campaigns/${campaign.id}`))}
                >
                  <Megaphone className="h-4 w-4" />
                  <span className="ml-2 flex-1">{campaign.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {campaign.status}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Contact Results */}
        {contacts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Contacts">
              {contacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  onSelect={() => runCommand(() => navigate(`/contacts/${contact.id}`))}
                >
                  <Users className="h-4 w-4" />
                  <span className="ml-2 flex-1">
                    {contact.first_name} {contact.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {contact.email}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Form Results */}
        {forms.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Forms">
              {forms.map((form) => (
                <CommandItem
                  key={form.id}
                  onSelect={() => runCommand(() => navigate(`/ace-forms/${form.id}`))}
                >
                  <FormInput className="h-4 w-4" />
                  <span className="ml-2 flex-1">{form.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {form.form_type}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

/**
 * Search trigger button for the header
 */
export function GlobalSearchTrigger() {
  const [open, setOpen] = useState(false);
  const { isEnabled } = useFeatureFlags();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!isEnabled('global_search')) return null;

  return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 hover:bg-muted rounded-md border transition-colors"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search...</span>
      <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}

