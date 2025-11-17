import { useParams } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, MapPin, Building2, Edit, Trash2, ExternalLink } from "lucide-react";
import { useContact } from "@/hooks/useContacts";
import { Skeleton } from "@/components/ui/skeleton";

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: contact, isLoading } = useContact(id || null);

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  if (!contact) {
    return (
      <Layout>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Contact not found</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {contact.first_name?.[0]}{contact.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold">
                    {contact.first_name} {contact.last_name}
                  </h1>
                  {contact.job_title && (
                    <p className="text-muted-foreground mt-1">{contact.job_title}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge>{contact.lifecycle_stage.toUpperCase()}</Badge>
                    <Badge variant="outline">Score: {contact.lead_score}</Badge>
                    {contact.do_not_contact && (
                      <Badge variant="destructive">Do Not Contact</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="outline" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contact.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                        {contact.email}
                      </a>
                      {contact.email_opt_out && (
                        <Badge variant="outline" className="ml-2 text-xs">Opted Out</Badge>
                      )}
                    </div>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                        {contact.phone}
                      </a>
                      {contact.sms_opt_out && (
                        <Badge variant="outline" className="ml-2 text-xs">SMS Opted Out</Badge>
                      )}
                    </div>
                  </div>
                )}
                {contact.mobile_phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Mobile</p>
                      <a href={`tel:${contact.mobile_phone}`} className="text-primary hover:underline">
                        {contact.mobile_phone}
                      </a>
                    </div>
                  </div>
                )}
                {(contact.address1 || contact.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">
                        {contact.address1}<br />
                        {contact.address2 && <>{contact.address2}<br /></>}
                        {contact.city}, {contact.state} {contact.zip}
                      </p>
                    </div>
                  </div>
                )}
                {contact.companies && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Company</p>
                      <p className="text-sm text-muted-foreground">
                        {contact.companies.company_name}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sync Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Source</span>
                    <Badge variant="outline">{contact.sync_source}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Status</span>
                    <Badge>{contact.sync_status}</Badge>
                  </div>
                  {contact.external_crm_id && (
                    <div className="flex justify-between">
                      <span className="text-sm">External ID</span>
                      <code className="text-xs">{contact.external_crm_id}</code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Timeline */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="activity">
              <TabsList>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
                <TabsTrigger value="deals">Deals</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              <TabsContent value="activity" className="mt-6">
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">No activity yet</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="campaigns" className="mt-6">
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">No campaigns associated</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="deals" className="mt-6">
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">No deals yet</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="notes" className="mt-6">
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">No notes yet</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}
