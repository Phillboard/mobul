import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContact, useDeleteContact } from "@/hooks/useContacts";
import { ArrowLeft, Mail, Phone, MapPin, Edit, Trash2, Tag } from "lucide-react";
import { useState } from "react";
import { ContactEditDialog } from "@/components/contacts/ContactEditDialog";
import { ContactCampaignsTab } from "@/components/contacts/ContactCampaignsTab";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contact, isLoading } = useContact(id);
  const deleteContact = useDeleteContact();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    await deleteContact.mutateAsync(id);
    navigate("/contacts");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6">Loading...</div>
      </Layout>
    );
  }

  if (!contact) {
    return (
      <Layout>
        <div className="p-6">Contact not found</div>
      </Layout>
    );
  }

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unnamed Contact";

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{fullName}</h1>
              {contact.company && (
                <p className="text-muted-foreground">{contact.company}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Contact Information */}
              <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.mobile_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contact.mobile_phone}`} className="text-primary hover:underline">
                    {contact.mobile_phone} (Mobile)
                  </a>
                </div>
              )}
              {(contact.address || contact.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    {contact.address && <div>{contact.address}</div>}
                    {contact.address2 && <div>{contact.address2}</div>}
                    {(contact.city || contact.state || contact.zip) && (
                      <div>
                        {[contact.city, contact.state, contact.zip].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Marketing Information */}
          <Card>
            <CardHeader>
              <CardTitle>Marketing Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Lifecycle Stage</label>
                <div className="mt-1">
                  <Badge variant="outline">{contact.lifecycle_stage}</Badge>
                </div>
              </div>
              {contact.lead_source && (
                <div>
                  <label className="text-sm text-muted-foreground">Lead Source</label>
                  <div className="mt-1">{contact.lead_source}</div>
                </div>
              )}
              {contact.lead_score !== null && (
                <div>
                  <label className="text-sm text-muted-foreground">Lead Score</label>
                  <div className="mt-1 text-2xl font-bold">{contact.lead_score}/100</div>
                </div>
              )}
              <Separator />
              <div className="space-y-2">
                {contact.do_not_contact && (
                  <Badge variant="destructive">Do Not Contact</Badge>
                )}
                {contact.email_opt_out && (
                  <Badge variant="secondary">Email Opt-Out</Badge>
                )}
                {contact.sms_opt_out && (
                  <Badge variant="secondary">SMS Opt-Out</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {contact.notes && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{contact.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Custom Fields */}
          {contact.custom_fields && Object.keys(contact.custom_fields).length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Custom Fields</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(contact.custom_fields as Record<string, any>).map(([key, value]) => (
                    <div key={key}>
                      <label className="text-sm text-muted-foreground">{key}</label>
                      <div className="mt-1">{String(value)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
            </div>
          </TabsContent>

          <TabsContent value="campaigns">
            <ContactCampaignsTab contactId={id!} />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        {id && (
          <ContactEditDialog
            contactId={id}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
          />
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Contact</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this contact? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
