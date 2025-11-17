import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateDeal, Deal } from "@/hooks/useDeals";
import { usePipelines } from "@/hooks/usePipelines";
import { useContacts } from "@/hooks/useContacts";
import { useCompanies } from "@/hooks/useCompanies";

interface DealFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  pipelineId?: string;
  deal?: Deal;
}

export function DealForm({ open, onOpenChange, clientId, pipelineId, deal }: DealFormProps) {
  const createDeal = useCreateDeal();
  const { data: pipelines } = usePipelines(clientId);
  const { data: contacts } = useContacts(clientId, {});
  const { data: companies } = useCompanies(clientId);

  const { register, handleSubmit, setValue, watch, reset } = useForm({
    defaultValues: {
      deal_name: deal?.deal_name || "",
      amount: deal?.amount || 0,
      pipeline_id: deal?.pipeline_id || pipelineId || "",
      stage_id: deal?.stage_id || "",
      primary_contact_id: deal?.primary_contact_id || "",
      company_id: deal?.company_id || "",
      expected_close_date: deal?.expected_close_date || "",
    },
  });

  const selectedPipeline = pipelines?.find(p => p.id === watch("pipeline_id"));
  const stages = selectedPipeline?.stages || [];

  const onSubmit = async (data: any) => {
    const stageIndex = stages.findIndex((s: any) => s.id === data.stage_id);
    const stage = stages[stageIndex];

    await createDeal.mutateAsync({
      ...data,
      client_id: clientId,
      stage_order: stageIndex,
      probability: stage?.probability || 0,
      status: 'open',
    });

    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{deal ? "Edit Deal" : "Create New Deal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="deal_name">Deal Name *</Label>
              <Input id="deal_name" {...register("deal_name", { required: true })} />
            </div>

            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="expected_close_date">Expected Close Date</Label>
              <Input id="expected_close_date" type="date" {...register("expected_close_date")} />
            </div>

            <div>
              <Label>Pipeline *</Label>
              <Select
                value={watch("pipeline_id")}
                onValueChange={(value) => {
                  setValue("pipeline_id", value);
                  setValue("stage_id", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines?.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.pipeline_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Stage *</Label>
              <Select value={watch("stage_id")} onValueChange={(value) => setValue("stage_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage: any) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name} ({stage.probability}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Contact</Label>
              <Select
                value={watch("primary_contact_id")}
                onValueChange={(value) => setValue("primary_contact_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts?.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Company</Label>
              <Select value={watch("company_id")} onValueChange={(value) => setValue("company_id", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                  {companies?.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{deal ? "Update" : "Create"} Deal</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
