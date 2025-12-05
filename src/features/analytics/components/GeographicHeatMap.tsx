import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { scaleLinear } from "d3-scale";

const geoUrl = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

interface GeographicHeatMapProps {
  campaignId: string;
  metric?: 'response_rate' | 'conversion_rate' | 'volume';
}

export function GeographicHeatMap({ campaignId, metric = 'response_rate' }: GeographicHeatMapProps) {
  const { data: geoData, isLoading } = useQuery({
    queryKey: ['geographic-analytics', campaignId, metric],
    queryFn: async () => {
      // Get recipients by state
      const { data: campaign } = await supabase
        .from('campaigns')
        .select(`
          id,
          audiences!inner(
            id,
            recipients(id, state, approval_status)
          ),
          events(recipient_id, event_type)
        `)
        .eq('id', campaignId)
        .single();

      if (!campaign) return null;

      // Aggregate by state
      const stateData = new Map<string, any>();
      
      campaign.audiences?.recipients?.forEach((r: any) => {
        const state = r.state?.toUpperCase();
        if (!state) return;

        if (!stateData.has(state)) {
          stateData.set(state, {
            state,
            total: 0,
            responses: 0,
            conversions: 0,
          });
        }

        const data = stateData.get(state);
        data.total++;
        
        // Count responses
        const hasResponse = campaign.events?.some(
          (e: any) => e.recipient_id === r.id && 
            (e.event_type === 'purl_viewed' || e.event_type === 'qr_scanned')
        );
        if (hasResponse) data.responses++;

        // Count conversions
        if (r.approval_status === 'redeemed') data.conversions++;
      });

      // Calculate rates
      const result = Array.from(stateData.values()).map(d => ({
        ...d,
        response_rate: d.total > 0 ? (d.responses / d.total * 100) : 0,
        conversion_rate: d.responses > 0 ? (d.conversions / d.responses * 100) : 0,
      }));

      return result;
    },
  });

  if (isLoading || !geoData) {
    return <div>Loading geographic data...</div>;
  }

  // Create color scale based on metric
  const maxValue = Math.max(...geoData.map((d: any) => {
    switch (metric) {
      case 'response_rate': return d.response_rate;
      case 'conversion_rate': return d.conversion_rate;
      case 'volume': return d.total;
      default: return 0;
    }
  }));

  const colorScale = scaleLinear<string>()
    .domain([0, maxValue])
    .range(["#f0f9ff", "#0ea5e9"]);

  const getStateValue = (stateCode: string) => {
    const stateData = geoData.find((d: any) => d.state === stateCode);
    if (!stateData) return 0;

    switch (metric) {
      case 'response_rate': return stateData.response_rate;
      case 'conversion_rate': return stateData.conversion_rate;
      case 'volume': return stateData.total;
      default: return 0;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Geographic Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: '500px' }}>
          <ComposableMap projection="geoAlbersUsa">
            <ZoomableGroup>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const stateCode = geo.properties.name; // Or use postal code
                    const value = getStateValue(stateCode);
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={value > 0 ? colorScale(value) : "#e5e7eb"}
                        stroke="#fff"
                        strokeWidth={0.5}
                        style={{
                          hover: {
                            fill: "#0284c7",
                            outline: "none",
                          },
                          pressed: {
                            fill: "#0c4a6e",
                            outline: "none",
                          },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {/* Legend & Stats */}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {geoData.slice(0, 5).map((state: any) => (
            <div key={state.state} className="p-3 border rounded">
              <div className="font-medium">{state.state}</div>
              <div className="text-sm text-muted-foreground">
                {state.total} recipients
              </div>
              <div className="text-sm">
                Response: {state.response_rate.toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

