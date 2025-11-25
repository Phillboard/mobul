import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Trash2, UserPlus } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContactList, useListMembers, useRemoveContactFromList, useDeleteContactList } from "@/hooks/useContactLists";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function ListDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: list, isLoading: listLoading } = useContactList(id);
  const { data: members = [], isLoading: membersLoading } = useListMembers(id);
  const removeContact = useRemoveContactFromList();
  const deleteList = useDeleteContactList();

  const handleRemoveContact = (contactId: string) => {
    if (!id) return;
    removeContact.mutate({ listId: id, contactId });
  };

  const handleDeleteList = () => {
    if (!id) return;
    deleteList.mutate(id, {
      onSuccess: () => {
        navigate("/contacts/lists");
      },
    });
  };

  if (listLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
        </div>
      </Layout>
    );
  }

  if (!list) {
    return (
      <Layout>
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">List not found</h2>
            <p className="text-muted-foreground mt-2">The list you're looking for doesn't exist.</p>
            <Button onClick={() => navigate("/contacts/lists")} className="mt-4">
              Back to Lists
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/contacts/lists")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{list.name}</h1>
              {list.description && (
                <p className="text-muted-foreground mt-1">{list.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/contacts")}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Contacts
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete List
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete List?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete "{list.name}" and remove all contact associations.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteList} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              List Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Contacts</div>
                <div className="text-2xl font-bold">{members.length}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Created</div>
                <div className="text-2xl font-bold">
                  {new Date(list.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Last Updated</div>
                <div className="text-2xl font-bold">
                  {new Date(list.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Table */}
        <Card>
          <CardHeader>
            <CardTitle>Contacts in List</CardTitle>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No contacts in this list yet. Add contacts from the main contacts page.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.contacts?.first_name} {member.contacts?.last_name}
                      </TableCell>
                      <TableCell>{member.contacts?.email || "—"}</TableCell>
                      <TableCell>{member.contacts?.phone || "—"}</TableCell>
                      <TableCell>{member.contacts?.company || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(member.added_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveContact(member.contact_id)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
