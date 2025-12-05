import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

interface ConversionFunnelProps {
  campaignId: string;
}

export function ConversionFunnelVisualization({ campaignId }: ConversionFunnelProps) {
  const { data: funnelData, isLoading } = useQuery({
    queryKey: ['campaign-funnel', campaignId],
    queryFn: async () => {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select(`
          id,
          audiences(total_count),
          events(event_type, occurred_at)
        `)
        .eq('id', campaignId)
        .single();

      if (!campaign) return null;

      const totalMailed = campaign.audiences?.total_count || 0;
      const events = campaign.events || [];

      const delivered = events.filter(e => e.event_type === 'imb_delivered').length;
      const landed = events.filter(e => 
        e.event_type === 'purl_viewed' || e.event_type === 'qr_scanned'
      ).length;
      const called = events.filter(e => e.event_type === 'call_started').length;
      const qualified = events.filter(e => e.event_type === 'condition_completed').length;
      const redeemed = events.filter(e => e.event_type === 'gift_card_redeemed').length;

      return [
        { 
          stage: 'Mailed', 
          count: totalMailed, 
          percentage: 100,
          dropRate: 0
        },
        { 
          stage: 'Delivered', 
          count: delivered, 
          percentage: totalMailed > 0 ? (delivered / totalMailed * 100) : 0,
          dropRate: totalMailed > 0 ? ((totalMailed - delivered) / totalMailed * 100) : 0
        },
        { 
          stage: 'Engaged', 
          count: landed, 
          percentage: delivered > 0 ? (landed / delivered * 100) : 0,
          dropRate: delivered > 0 ? ((delivered - landed) / delivered * 100) : 0
        },
        { 
          stage: 'Called', 
          count: called, 
          percentage: landed > 0 ? (called / landed * 100) : 0,
          dropRate: landed > 0 ? ((landed - called) / landed * 100) : 0
        },
        { 
          stage: 'Qualified', 
          count: qualified, 
          percentage: called > 0 ? (qualified / called * 100) : 0,
          dropRate: called > 0 ? ((called - qualified) / called * 100) : 0
        },
        { 
          stage: 'Redeemed', 
          count: redeemed, 
          percentage: qualified > 0 ? (redeemed / qualified * 100) : 0,
          dropRate: qualified > 0 ? ((qualified - redeemed) / qualified * 100) : 0
        },
      ];
    },
  });

  if (isLoading || !funnelData) {
    return <div>Loading funnel data...</div>;
  }

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={funnelData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="stage" type="category" width={100} />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <div className="font-medium">{data.stage}</div>
                      <div className="text-sm">Count: {data.count}</div>
                      <div className="text-sm">Conversion: {data.percentage.toFixed(1)}%</div>
                      {data.dropRate > 0 && (
                        <div className="text-sm text-red-600">Drop-off: {data.dropRate.toFixed(1)}%</div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {funnelData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Drop-off Analysis */}
        <div className="mt-6 space-y-2">
          <div className="text-sm font-medium">Drop-off Analysis:</div>
          {funnelData.slice(1).map((stage, idx) => {
            if (stage.dropRate === 0) return null;
            
            const severity = stage.dropRate > 50 ? 'high' : stage.dropRate > 30 ? 'medium' : 'low';
            const color = severity === 'high' ? 'text-red-600' : severity === 'medium' ? 'text-yellow-600' : 'text-muted-foreground';
            
            return (
              <div key={stage.stage} className="flex items-center justify-between text-sm p-2 border rounded">
                <span>{funnelData[idx].stage} → {stage.stage}</span>
                <span className={color}>{stage.dropRate.toFixed(1)}% drop-off</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

