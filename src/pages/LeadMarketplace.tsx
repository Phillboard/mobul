import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Home, Building, Car, TrendingUp } from "lucide-react";

type LeadVertical = 'roofing' | 'rei' | 'auto';

export default function LeadMarketplace() {
  const [selectedVertical, setSelectedVertical] = useState<LeadVertical>('roofing');
  const [quantity, setQuantity] = useState(5000);
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Mock presets until types regenerate
  const presets = [
    { id: '1', preset_name: 'High-Value Homeowners', filters_json: { homeAge: '20+', income: '100k+' } },
    { id: '2', preset_name: 'Storm Zone Targets', filters_json: { hailZone: true } },
  ];

  const pricePerLead = 0.15;
  const estimatedCost = (quantity * pricePerLead).toFixed(2);

  const renderRoofingFilters = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Home Age</Label>
        <select 
          className="w-full p-2 border rounded"
          value={filters.homeAge || ''}
          onChange={(e) => setFilters({ ...filters, homeAge: e.target.value })}
        >
          <option value="">Any</option>
          <option value="10+">10+ years</option>
          <option value="20+">20+ years</option>
          <option value="30+">30+ years</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Roof Age</Label>
        <select 
          className="w-full p-2 border rounded"
          value={filters.roofAge || ''}
          onChange={(e) => setFilters({ ...filters, roofAge: e.target.value })}
        >
          <option value="">Any</option>
          <option value="10+">10+ years</option>
          <option value="15+">15+ years</option>
          <option value="20+">20+ years</option>
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="hailZone"
          checked={filters.hailZone || false}
          onCheckedChange={(checked) => setFilters({ ...filters, hailZone: checked })}
        />
        <Label htmlFor="hailZone">Hail Zone</Label>
      </div>

      <div className="space-y-2">
        <Label>Income Band</Label>
        <select 
          className="w-full p-2 border rounded"
          value={filters.income || ''}
          onChange={(e) => setFilters({ ...filters, income: e.target.value })}
        >
          <option value="">Any</option>
          <option value="50k+">$50k+</option>
          <option value="75k+">$75k+</option>
          <option value="100k+">$100k+</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Credit Score</Label>
        <select 
          className="w-full p-2 border rounded"
          value={filters.creditScore || ''}
          onChange={(e) => setFilters({ ...filters, creditScore: e.target.value })}
        >
          <option value="">Any</option>
          <option value="650+">650+</option>
          <option value="700+">700+</option>
          <option value="750+">750+</option>
        </select>
      </div>
    </div>
  );

  const renderREIFilters = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="absenteeOwner"
          checked={filters.absenteeOwner || false}
          onCheckedChange={(checked) => setFilters({ ...filters, absenteeOwner: checked })}
        />
        <Label htmlFor="absenteeOwner">Absentee Owner</Label>
      </div>

      <div className="space-y-2">
        <Label>Equity Percentage</Label>
        <select 
          className="w-full p-2 border rounded"
          value={filters.equity || ''}
          onChange={(e) => setFilters({ ...filters, equity: e.target.value })}
        >
          <option value="">Any</option>
          <option value="50%+">50%+</option>
          <option value="70%+">70%+</option>
          <option value="90%+">90%+</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Ownership Length</Label>
        <select 
          className="w-full p-2 border rounded"
          value={filters.ownershipLength || ''}
          onChange={(e) => setFilters({ ...filters, ownershipLength: e.target.value })}
        >
          <option value="">Any</option>
          <option value="5+ years">5+ years</option>
          <option value="10+ years">10+ years</option>
          <option value="20+ years">20+ years</option>
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="distressed"
          checked={filters.distressed || false}
          onCheckedChange={(checked) => setFilters({ ...filters, distressed: checked })}
        />
        <Label htmlFor="distressed">Distressed Property</Label>
      </div>
    </div>
  );

  const renderAutoFilters = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Vehicle Make/Model</Label>
        <Input 
          placeholder="e.g., Toyota, Honda"
          value={filters.vehicleMake || ''}
          onChange={(e) => setFilters({ ...filters, vehicleMake: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label>Vehicle Age</Label>
        <select 
          className="w-full p-2 border rounded"
          value={filters.vehicleAge || ''}
          onChange={(e) => setFilters({ ...filters, vehicleAge: e.target.value })}
        >
          <option value="">Any</option>
          <option value="0-3 years">0-3 years</option>
          <option value="3-7 years">3-7 years</option>
          <option value="7+ years">7+ years</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Mileage Band</Label>
        <select 
          className="w-full p-2 border rounded"
          value={filters.mileage || ''}
          onChange={(e) => setFilters({ ...filters, mileage: e.target.value })}
        >
          <option value="">Any</option>
          <option value="0-50k">0-50k miles</option>
          <option value="50k-100k">50k-100k miles</option>
          <option value="100k+">100k+ miles</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Service Status</Label>
        <select 
          className="w-full p-2 border rounded"
          value={filters.serviceLapsed || ''}
          onChange={(e) => setFilters({ ...filters, serviceLapsed: e.target.value })}
        >
          <option value="">Any</option>
          <option value="3+ months">3+ months lapsed</option>
          <option value="6+ months">6+ months lapsed</option>
          <option value="12+ months">12+ months lapsed</option>
        </select>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Lead Marketplace</h1>
          <p className="text-muted-foreground">Purchase targeted lead lists for your campaigns</p>
        </div>

        <Tabs defaultValue="buy">
          <TabsList>
            <TabsTrigger value="buy">Buy Leads</TabsTrigger>
            <TabsTrigger value="history">Purchase History</TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="space-y-6">
            {/* Step 1: Select Vertical */}
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Select Industry Vertical</CardTitle>
                <CardDescription>Choose the type of leads you want to purchase</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant={selectedVertical === 'roofing' ? 'default' : 'outline'}
                    className="h-24 flex flex-col items-center justify-center gap-2"
                    onClick={() => setSelectedVertical('roofing')}
                  >
                    <Home className="h-8 w-8" />
                    <span>Roofing</span>
                  </Button>
                  <Button
                    variant={selectedVertical === 'rei' ? 'default' : 'outline'}
                    className="h-24 flex flex-col items-center justify-center gap-2"
                    onClick={() => setSelectedVertical('rei')}
                  >
                    <Building className="h-8 w-8" />
                    <span>Real Estate Investing</span>
                  </Button>
                  <Button
                    variant={selectedVertical === 'auto' ? 'default' : 'outline'}
                    className="h-24 flex flex-col items-center justify-center gap-2"
                    onClick={() => setSelectedVertical('auto')}
                  >
                    <Car className="h-8 w-8" />
                    <span>Auto Services</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Filter Presets */}
            {presets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Popular Filter Presets</CardTitle>
                  <CardDescription>Quick start with pre-configured filters</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {presets.map(preset => (
                      <Button
                        key={preset.id}
                        variant="outline"
                        onClick={() => setFilters(preset.filters_json as Record<string, any>)}
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        {preset.preset_name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 3: Custom Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Configure Filters</CardTitle>
                <CardDescription>Customize your lead criteria</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedVertical === 'roofing' && renderRoofingFilters()}
                {selectedVertical === 'rei' && renderREIFilters()}
                {selectedVertical === 'auto' && renderAutoFilters()}

                <div className="mt-6 space-y-2">
                  <Label>Geography (ZIP codes, comma-separated)</Label>
                  <Input 
                    placeholder="e.g., 10001, 10002, 10003"
                    value={filters.geography || ''}
                    onChange={(e) => setFilters({ ...filters, geography: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Step 4: Quantity */}
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Select Quantity</CardTitle>
                <CardDescription>How many leads do you want?</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Quantity: {quantity.toLocaleString()} leads</Label>
                    <Badge variant="secondary">${estimatedCost}</Badge>
                  </div>
                  <Slider
                    value={[quantity]}
                    onValueChange={([value]) => setQuantity(value)}
                    min={500}
                    max={50000}
                    step={500}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>500</span>
                    <span>50,000</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 5: Checkout Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Vertical:</span>
                  <Badge>{selectedVertical}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-medium">{quantity.toLocaleString()} leads</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Price per lead:</span>
                  <span className="font-medium">${pricePerLead.toFixed(2)}</span>
                </div>
                <div className="border-t pt-4 flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold">${estimatedCost}</span>
                </div>
                <Button className="w-full" size="lg" disabled>
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Proceed to Checkout (Coming Soon)
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Stripe integration will be added in the next phase
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Purchase History</CardTitle>
                <CardDescription>View your previous lead purchases</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  No purchases yet. Buy your first lead list to get started!
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
