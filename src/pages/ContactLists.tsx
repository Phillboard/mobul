import { useState } from "react";
import { Plus, List, Filter } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ListBuilder } from "@/components/contacts/ListBuilder";
import { SegmentBuilder } from "@/components/contacts/SegmentBuilder";
import { useContactLists } from "@/hooks/useContactLists";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default function ContactLists() {
  const navigate = useNavigate();
  const { data: staticLists = [] } = useContactLists("static");
  const { data: segments = [] } = useContactLists("dynamic");
  const [listBuilderOpen, setListBuilderOpen] = useState(false);
  const [segmentBuilderOpen, setSegmentBuilderOpen] = useState(false);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Lists & Segments</h1>
            <p className="text-muted-foreground mt-1">
              Organize your contacts into targetable groups
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="lists" className="w-full">
          <TabsList>
            <TabsTrigger value="lists">
              <List className="h-4 w-4 mr-2" />
              Lists
            </TabsTrigger>
            <TabsTrigger value="segments">
              <Filter className="h-4 w-4 mr-2" />
              Segments
            </TabsTrigger>
          </TabsList>

          {/* Static Lists Tab */}
          <TabsContent value="lists" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setListBuilderOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New List
              </Button>
            </div>

            {staticLists.length === 0 ? (
              <EmptyState
                icon={List}
                title="No lists yet"
                description="Create your first static list to organize contacts manually."
                action={{
                  label: "Create List",
                  onClick: () => setListBuilderOpen(true),
                }}
              />
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Contacts</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staticLists.map((list) => (
                      <TableRow
                        key={list.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/contacts/lists/${list.id}`)}
                      >
                        <TableCell className="font-medium">{list.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {list.description || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{list.contact_count}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(list.updated_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/contacts/lists/${list.id}`);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Dynamic Segments Tab */}
          <TabsContent value="segments" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setSegmentBuilderOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Segment
              </Button>
            </div>

            {segments.length === 0 ? (
              <EmptyState
                icon={Filter}
                title="No segments yet"
                description="Create dynamic segments based on rules and filters."
                action={{
                  label: "Create Segment",
                  onClick: () => setSegmentBuilderOpen(true),
                }}
              />
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Contacts</TableHead>
                      <TableHead>Last Synced</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {segments.map((segment) => (
                      <TableRow
                        key={segment.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/contacts/segments/${segment.id}`)}
                      >
                        <TableCell className="font-medium">{segment.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {segment.description || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{segment.contact_count}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {segment.last_sync_at
                            ? new Date(segment.last_sync_at).toLocaleDateString()
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/contacts/segments/${segment.id}`);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <ListBuilder open={listBuilderOpen} onOpenChange={setListBuilderOpen} />
        <SegmentBuilder
          open={segmentBuilderOpen}
          onOpenChange={setSegmentBuilderOpen}
        />
      </div>
    </Layout>
  );
}
