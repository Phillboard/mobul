import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Building2, Users, Trash2, ArrowLeft, MessageSquare, Calendar, DollarSign } from "lucide-react";
import { useCompany, useDeleteCompany } from "@/hooks/useCompanies";
import { useContacts } from "@/hooks/useContacts";
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

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentClient } = useTenant();
  const { data: company, isLoading } = useCompany(id || null);
  const deleteCompany = useDeleteCompany();
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  
  const { data: contacts } = useContacts(company?.client_id || null, {});
  const companyContacts = contacts?.filter((c: any) => c.company_id === id) || [];
  
  const { data: activities } = useActivities(company?.client_id || null, {
    companyId: id,
  });
  
  const { data: tasks } = useTasks(company?.client_id || null, {
    companyId: id,
  });
  
  const { data: deals } = useDeals(company?.client_id || null);
  const companyDeals = deals?.filter((d: any) => d.company_id === id) || [];

  const handleDelete = async () => {
    if (!id || !window.confirm("Are you sure you want to delete this company?")) return;
    
    try {
      await deleteCompany.mutateAsync(id);
      toast.success("Company deleted");
      navigate("/companies");
    } catch (error) {
      toast.error("Failed to delete company");
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

  if (!company) {
    return (
      <Layout>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Company not found</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/companies")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{company.company_name}</h1>
            <p className="text-muted-foreground">Company Details</p>
          </div>
        </div>

        {/* Company Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{company.company_name}</h2>
                  {company.industry && (
                    <p className="text-muted-foreground mt-1">{company.industry}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {company.annual_revenue && (
                      <Badge variant="outline">
                        Revenue: ${company.annual_revenue.toLocaleString()}
                      </Badge>
                    )}
                    {company.employee_count && (
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        {company.employee_count} employees
                      </Badge>
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
                <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleteCompany.isPending}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Company Info Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.website && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Website</p>
                      <a 
                        href={company.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        {company.website}
                      </a>
                    </div>
                  </div>
                )}
                {company.phone && (
                  <div>
                    <p className="text-sm font-medium">Phone</p>
                    <a href={`tel:${company.phone}`} className="text-primary hover:underline">
                      {company.phone}
                    </a>
                  </div>
                )}
                {company.industry && (
                  <div>
                    <p className="text-sm font-medium">Industry</p>
                    <p className="text-sm text-muted-foreground">{company.industry}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Contacts</span>
                  <Badge>{companyContacts.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Active Deals</span>
                  <Badge>{companyDeals.filter((d: any) => d.status === "open").length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Activities</span>
                  <Badge>{activities?.length || 0}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="contacts" className="space-y-4">
              <TabsList>
                <TabsTrigger value="contacts">
                  Contacts ({companyContacts.length})
                </TabsTrigger>
                <TabsTrigger value="deals">
                  Deals ({companyDeals.length})
                </TabsTrigger>
                <TabsTrigger value="activity">
                  Activity ({activities?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="tasks">
                  Tasks ({tasks?.filter((t: any) => t.status !== "completed").length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contacts">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Contacts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {companyContacts.length > 0 ? (
                      <div className="space-y-3">
                        {companyContacts.map((contact: any) => (
                          <div
                            key={contact.id}
                            className="flex items-start justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/contacts/${contact.id}`)}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">
                                  {contact.first_name} {contact.last_name}
                                </h4>
                                <Badge>{contact.lifecycle_stage}</Badge>
                              </div>
                              {contact.job_title && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {contact.job_title}
                                </p>
                              )}
                              {contact.email && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {contact.email}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No contacts associated with this company.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deals">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Deals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {companyDeals.length > 0 ? (
                      <div className="space-y-3">
                        {companyDeals.map((deal: any) => (
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
                        No deals associated with this company.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

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
            companyId={id}
          />
          <TaskForm
            open={showTaskDialog}
            onOpenChange={setShowTaskDialog}
            clientId={currentClient.id}
            companyId={id}
          />
        </>
      )}
    </Layout>
  );
}
