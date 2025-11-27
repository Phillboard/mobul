import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, GripVertical, FileText } from "lucide-react";
import { useCallCenterScripts } from "@/hooks/useCallCenterScripts";
import { ScriptEditor } from "@/components/call-center/ScriptEditor";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

const SCRIPT_TYPE_LABELS = {
  greeting: 'Greeting',
  verification: 'Verification',
  explanation: 'Gift Card Explanation',
  objection_handling: 'Objection Handling',
  closing: 'Closing',
  escalation: 'Escalation',
};

const SCRIPT_TYPE_COLORS = {
  greeting: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  verification: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  explanation: 'bg-green-500/10 text-green-700 dark:text-green-300',
  objection_handling: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  closing: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
  escalation: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

export default function CallCenterScripts() {
  // Get client_id from client_users table
  const { data: clientData } = useQuery({
    queryKey: ['user-client'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_users')
        .select('client_id')
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });
  
  const clientId = clientData?.client_id;
  
  const { scripts, createScript, updateScript, deleteScript, reorderScripts } = useCallCenterScripts(clientId);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scriptToDelete, setScriptToDelete] = useState<string | null>(null);

  const handleCreateScript = () => {
    setEditingScript(null);
    setEditorOpen(true);
  };

  const handleEditScript = (script: any) => {
    setEditingScript(script);
    setEditorOpen(true);
  };

  const handleSaveScript = (scriptData: any) => {
    if (editingScript) {
      updateScript.mutate({ id: editingScript.id, updates: scriptData });
    } else {
      createScript.mutate(scriptData);
    }
  };

  const handleDeleteScript = (scriptId: string) => {
    setScriptToDelete(scriptId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (scriptToDelete) {
      deleteScript.mutate(scriptToDelete);
      setDeleteDialogOpen(false);
      setScriptToDelete(null);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const reordered = Array.from(scripts);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    const updates = reordered.map((script, index) => ({
      id: script.id,
      display_order: index,
    }));

    reorderScripts.mutate(updates);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Call Scripts</h1>
            <p className="text-muted-foreground">
              Manage scripts for your call center agents
            </p>
          </div>
          <Button onClick={handleCreateScript}>
            <Plus className="h-4 w-4 mr-2" />
            Create Script
          </Button>
        </div>

        {scripts.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">No scripts yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Create your first call script to help agents handle customer calls
                  </p>
                </div>
                <Button onClick={handleCreateScript}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Script
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="scripts">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  {scripts.map((script, index) => (
                    <Draggable key={script.id} draggableId={script.id} index={index}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={snapshot.isDragging ? "shadow-lg" : ""}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-1 cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <CardTitle className="text-base">{script.script_name}</CardTitle>
                                    <Badge className={SCRIPT_TYPE_COLORS[script.script_type]}>
                                      {SCRIPT_TYPE_LABELS[script.script_type]}
                                    </Badge>
                                    {!script.is_active && (
                                      <Badge variant="outline">Inactive</Badge>
                                    )}
                                  </div>
                                  <CardDescription className="text-sm line-clamp-2">
                                    {script.script_content}
                                  </CardDescription>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditScript(script)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteScript(script.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      <ScriptEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        script={editingScript}
        onSave={handleSaveScript}
        clientId={clientId || ''}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Script</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this script? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
