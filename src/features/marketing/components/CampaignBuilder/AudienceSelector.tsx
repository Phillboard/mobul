/**
 * Audience Selector Component
 * 
 * Select recipients for the marketing campaign.
 * Reuses existing contact/list hooks.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Users, List, Filter, UserPlus, Loader2 } from "lucide-react";
import { useContacts } from "@/features/contacts/hooks/useContacts";
import { useContactLists } from "@/features/contacts/hooks/useContactLists";
import type { AudienceType, AudienceConfig } from "../../types";

interface Props {
  audienceType: AudienceType;
  audienceConfig: AudienceConfig;
  onChange: (type: AudienceType, config: AudienceConfig) => void;
}

const audienceOptions: { type: AudienceType; icon: React.ReactNode; title: string; description: string }[] = [
  {
    type: 'all_contacts',
    icon: <Users className="h-5 w-5" />,
    title: 'All Contacts',
    description: 'Send to all contacts in your database',
  },
  {
    type: 'contact_list',
    icon: <List className="h-5 w-5" />,
    title: 'Contact Lists',
    description: 'Select specific contact lists',
  },
  {
    type: 'segment',
    icon: <Filter className="h-5 w-5" />,
    title: 'Segment',
    description: 'Use filters to target specific contacts',
  },
  {
    type: 'manual',
    icon: <UserPlus className="h-5 w-5" />,
    title: 'Manual Selection',
    description: 'Manually select individual contacts',
  },
];

export function AudienceSelector({ audienceType, audienceConfig, onChange }: Props) {
  const [selectedLists, setSelectedLists] = useState<string[]>(audienceConfig.listIds || []);
  const [selectedContacts, setSelectedContacts] = useState<string[]>(audienceConfig.contactIds || []);

  const { data: contacts, isLoading: contactsLoading } = useContacts({ limit: 100 });
  const { lists, isLoading: listsLoading } = useContactLists();

  // Calculate estimated recipients
  const estimatedRecipients = (() => {
    switch (audienceType) {
      case 'all_contacts':
        return contacts?.length || 0;
      case 'contact_list':
        return lists
          ?.filter(l => selectedLists.includes(l.id))
          .reduce((sum, l) => sum + (l.member_count || 0), 0) || 0;
      case 'manual':
        return selectedContacts.length;
      case 'segment':
        return '?'; // Would need to evaluate segment rules
      default:
        return 0;
    }
  })();

  const handleTypeChange = (type: AudienceType) => {
    onChange(type, audienceConfig);
  };

  const handleListToggle = (listId: string) => {
    const newLists = selectedLists.includes(listId)
      ? selectedLists.filter(id => id !== listId)
      : [...selectedLists, listId];
    setSelectedLists(newLists);
    onChange(audienceType, { ...audienceConfig, listIds: newLists });
  };

  const handleContactToggle = (contactId: string) => {
    const newContacts = selectedContacts.includes(contactId)
      ? selectedContacts.filter(id => id !== contactId)
      : [...selectedContacts, contactId];
    setSelectedContacts(newContacts);
    onChange(audienceType, { ...audienceConfig, contactIds: newContacts });
  };

  useEffect(() => {
    setSelectedLists(audienceConfig.listIds || []);
    setSelectedContacts(audienceConfig.contactIds || []);
  }, [audienceConfig.listIds, audienceConfig.contactIds]);

  return (
    <div className="space-y-6">
      {/* Audience Type Selection */}
      <RadioGroup value={audienceType} onValueChange={handleTypeChange as any}>
        <div className="grid gap-4 md:grid-cols-2">
          {audienceOptions.map((option) => (
            <div key={option.type}>
              <RadioGroupItem 
                value={option.type} 
                id={option.type}
                className="peer sr-only"
              />
              <Label
                htmlFor={option.type}
                className="flex items-start gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary/20"
              >
                <div className="p-2 rounded-full bg-muted">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{option.title}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                </div>
              </Label>
            </div>
          ))}
        </div>
      </RadioGroup>

      {/* Estimated Recipients */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Estimated Recipients</span>
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {estimatedRecipients} contacts
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Audience Configuration */}
      {audienceType === 'contact_list' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Lists</CardTitle>
            <CardDescription>Choose which contact lists to include</CardDescription>
          </CardHeader>
          <CardContent>
            {listsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : lists && lists.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {lists.map((list) => (
                    <div 
                      key={list.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`list-${list.id}`}
                          checked={selectedLists.includes(list.id)}
                          onCheckedChange={() => handleListToggle(list.id)}
                        />
                        <Label htmlFor={`list-${list.id}`} className="cursor-pointer">
                          <div className="font-medium">{list.name}</div>
                          {list.description && (
                            <div className="text-xs text-muted-foreground">{list.description}</div>
                          )}
                        </Label>
                      </div>
                      <Badge variant="outline">{list.member_count || 0} contacts</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-center text-muted-foreground py-8">No contact lists found</p>
            )}
          </CardContent>
        </Card>
      )}

      {audienceType === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Contacts</CardTitle>
            <CardDescription>Choose individual contacts to include</CardDescription>
          </CardHeader>
          <CardContent>
            {contactsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : contacts && contacts.length > 0 ? (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {contacts.map((contact) => (
                    <div 
                      key={contact.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`contact-${contact.id}`}
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={() => handleContactToggle(contact.id)}
                        />
                        <Label htmlFor={`contact-${contact.id}`} className="cursor-pointer">
                          <div className="font-medium">
                            {contact.first_name} {contact.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {contact.email || contact.phone}
                          </div>
                        </Label>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-center text-muted-foreground py-8">No contacts found</p>
            )}
          </CardContent>
        </Card>
      )}

      {audienceType === 'segment' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Segment Builder</CardTitle>
            <CardDescription>Create filter rules to target specific contacts</CardDescription>
          </CardHeader>
          <CardContent className="text-center py-8">
            <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Segment builder coming soon</p>
            <p className="text-sm text-muted-foreground mt-2">
              For now, use contact lists or manual selection
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
