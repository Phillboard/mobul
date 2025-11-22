import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, MapPin, Building2, Trash2, ArrowLeft, MessageSquare, Calendar, DollarSign } from "lucide-react";
import { useContact, useDeleteContact } from "@/hooks/useContacts";
import { useActivities } from "@/hooks/useActivities";
import { useTasks } from "@/hooks/useTasks";
import { useDeals } from "@/hooks/useDeals";
import { useTenant } from "@/contexts/TenantContext";
import { Skeleton } from "@/components/ui/skeleton";
import { UniversalActivityFeed } from "@/components/activities/UniversalActivityFeed";
import { ActivityLogger } from "@/components/activities/ActivityLogger";
import { TaskForm } from "@/components/activities/TaskForm";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const { data: contact, isLoading } = useContact(id || null);
  const deleteContact = useDeleteContact();
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  
  const { data: activities } = useActivities(contact?.client_id || null, {
    contactId: id,
  });
  
  const { data: tasks } = useTasks(contact?.client_id || null, {
    contactId: id,
  });
  
  const { data: deals } = useDeals(contact?.client_id || null);
  
  const contactDeals = deals?.filter((d: any) => d.primary_contact_id === id) || [];

  const handleDelete = async () => {
    if (!id || !window.confirm("Are you sure you want to delete this contact?")) return;
    
    try {
      await deleteContact.mutateAsync(id);
      toast.success("Contact deleted");
      navigate("/contacts");
    } catch (error) {
      toast.error("Failed to delete contact");
    }
  };

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
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {contact.first_name} {contact.last_name}
            </h1>
            <p className="text-muted-foreground">Contact Details</p>
          </div>
        </div>

        {/* Contact Card */}
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
                  <h2 className="text-2xl font-bold">
                    {contact.first_name} {contact.last_name}
                  </h2>
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
                <Button variant="outline" size="sm" onClick={() => setShowActivityDialog(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Log Activity
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowTaskDialog(true)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
                <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleteContact.isPending}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Info Sidebar */}
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

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="activity" className="space-y-4">
              <TabsList>
                <TabsTrigger value="activity">
                  Activity ({activities?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="tasks">
                  Tasks ({tasks?.filter((t: any) => t.status !== "completed").length || 0})
                </TabsTrigger>
                <TabsTrigger value="deals">
                  Deals ({contactDeals.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activity">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {activities && activities.length > 0 ? (
                      <UniversalActivityFeed activities={activities} isLoading={false} />
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No activities yet. Log your first activity above.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tasks">
                <Card>
                  <CardHeader>
                    <CardTitle>Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {tasks && tasks.length > 0 ? (
                      <div className="space-y-3">
                        {tasks.map((task: any) => (
                          <div
                            key={task.id}
                            className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                            onClick={() => navigate(`/tasks`)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{task.title}</h4>
                                <Badge variant={task.status === "completed" ? "default" : "secondary"}>
                                  {task.status}
                                </Badge>
                                <Badge variant="outline">{task.priority}</Badge>
                              </div>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {task.description}
                                </p>
                              )}
                              {task.due_date && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No tasks yet. Create a task above.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deals">
                <Card>
                  <CardHeader>
                    <CardTitle>Associated Deals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {contactDeals.length > 0 ? (
                      <div className="space-y-3">
                        {contactDeals.map((deal: any) => (
                          <div
                            key={deal.id}
                            className="flex items-start justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/deals/${deal.id}`)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                                <h4 className="font-medium">{deal.deal_name}</h4>
                                <Badge>{deal.status}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Value: ${deal.deal_value.toLocaleString()}
                              </p>
                              {deal.close_date && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Close Date: {new Date(deal.close_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No deals associated with this contact.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {currentClient && (
        <>
          <ActivityLogger
            open={showActivityDialog}
            onOpenChange={setShowActivityDialog}
            clientId={currentClient.id}
            contactId={id}
          />
          <TaskForm
            open={showTaskDialog}
            onOpenChange={setShowTaskDialog}
            clientId={currentClient.id}
            contactId={id}
          />
        </>
      )}
    </Layout>
  );
}
