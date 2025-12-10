/**
 * Unified Admin Gift Cards Page
 * 
 * Consolidated page for managing:
 * - Gift card brands and denominations
 * - Master inventory pools
 * - Sales and analytics
 */

import { Layout } from "@/shared/components/layout/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Package, ShoppingBag, BarChart3 } from "lucide-react";
import { GiftCardBrandsTab } from "@/features/gift-cards/components/GiftCardBrandsTab";
import { GiftCardInventoryTab } from "@/features/gift-cards/components/GiftCardInventoryTab";
import { useState } from "react";

export default function AdminGiftCards() {
  const [activeTab, setActiveTab] = useState("brands");

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gift Card Administration</h1>
          <p className="text-muted-foreground mt-2">
            Manage brands, inventory, and marketplace
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="brands">
              <Package className="h-4 w-4 mr-2" />
              Brands & Denominations
            </TabsTrigger>
            <TabsTrigger value="inventory">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Master Inventory
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Sales & Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="brands" className="space-y-4">
            <GiftCardBrandsTab />
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <GiftCardInventoryTab />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="text-center text-muted-foreground py-12">
              Analytics coming soon
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

