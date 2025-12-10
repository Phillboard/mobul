/**
 * RecordPurchase Page
 * 
 * Admin-only page for recording gift card inventory purchases
 * 
 * Converted from RecordPurchaseDialog to full page with purchase history
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { useToast } from '@/shared/hooks';
import { useGiftCardBrands } from '@/features/gift-cards/hooks';
import { Receipt, DollarSign, ArrowLeft, CheckCircle2, History } from "lucide-react";
import { useAuth } from "@core/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/shared/components/ui/breadcrumb";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";

export default function RecordPurchase() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: brands } = useGiftCardBrands();
  const { session } = useAuth();
  
  const [brandId, setBrandId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierRef, setSupplierRef] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPerCard, setCostPerCard] = useState("");
  const [notes, setNotes] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordComplete, setRecordComplete] = useState(false);

  const totalCost = parseInt(quantity || "0") * parseFloat(costPerCard || "0");

  // Fetch recent purchases
  const { data: recentPurchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ["admin-inventory-purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_gift_card_inventory")
        .select("*, gift_card_brands(brand_name)")
        .order("purchase_date", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const handleRecord = async () => {
    if (!brandId || !quantity || !costPerCard) {
      toast({
        title: "Missing Information",
        description: "Please fill in brand, quantity, and cost per card",
        variant: "destructive",
      });
      return;
    }

    setRecording(true);
    try {
      const { error } = await supabase.from("admin_gift_card_inventory").insert({
        brand_id: brandId,
        supplier_name: supplierName || null,
        supplier_reference: supplierRef || null,
        quantity: parseInt(quantity),
        cost_per_card: parseFloat(costPerCard),
        total_cost: totalCost,
        notes: notes || null,
        created_by_user_id: session?.user?.id,
        purchase_date: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Purchase Recorded!",
        description: `Recorded purchase of ${quantity} cards for ${totalCost.toFixed(2)}`,
      });

      queryClient.invalidateQueries({ queryKey: ["admin-inventory-purchases"] });
      
      setRecordComplete(true);
    } catch (error: any) {
      toast({
        title: "Failed to Record",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRecording(false);
    }
  };

  const resetForm = () => {
    setBrandId("");
    setSupplierName("");
    setSupplierRef("");
    setQuantity("");
    setCostPerCard("");
    setNotes("");
    setRecordComplete(false);
  };

  if (recordComplete) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-6 py-12">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-green-100 dark:bg-green-900 p-6 rounded-full">
                <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">Purchase Recorded!</h1>
            <p className="text-lg text-muted-foreground">
              Inventory purchase has been successfully logged
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Purchase Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Brand:</span>
                <span className="font-semibold">
                  {brands?.find(b => b.id === brandId)?.brand_name}
                </span>
              </div>
              {supplierName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supplier:</span>
                  <span className="font-semibold">{supplierName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="font-semibold">{quantity} cards</span>
              </div>
              <div className="flex justify-between border-t pt-4">
                <span className="font-semibold">Total Cost:</span>
                <span className="font-bold text-red-600">${totalCost.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-center">
            <Button onClick={resetForm} size="lg">
              Record Another Purchase
            </Button>
            <Button onClick={() => navigate('/gift-cards')} variant="outline" size="lg">
              View Gift Cards
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/gift-cards">Gift Cards</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/gift-card-marketplace">Admin</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Record Purchase</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/admin/gift-card-marketplace')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Record Inventory Purchase</h1>
            <p className="text-muted-foreground">
              Log a new gift card inventory purchase from a supplier
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Purchase Details</CardTitle>
                <CardDescription>Enter the details of your gift card purchase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="brand">Brand *</Label>
                  <Select value={brandId} onValueChange={setBrandId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands?.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.brand_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier Name</Label>
                    <Input
                      id="supplier"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="e.g. Tillo, CardCash"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference">Invoice/Order # </Label>
                    <Input
                      id="reference"
                      value={supplierRef}
                      onChange={(e) => setSupplierRef(e.target.value)}
                      placeholder="Order or invoice number"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Number of cards"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost Per Card ($) *</Label>
                    <Input
                      id="cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={costPerCard}
                      onChange={(e) => setCostPerCard(e.target.value)}
                      placeholder="Cost in dollars"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional details about this purchase..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleRecord}
                    disabled={!brandId || !quantity || !costPerCard || recording}
                    className="gap-2"
                    size="lg"
                  >
                    <Receipt className="h-4 w-4" />
                    {recording ? "Recording..." : "Record Purchase"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate('/admin/gift-card-marketplace')}
                    disabled={recording}
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Purchase Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {quantity && costPerCard ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Quantity:</span>
                        <span className="font-semibold">{quantity} cards</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cost per card:</span>
                        <span>${parseFloat(costPerCard).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-4">
                        <span>Total Cost:</span>
                        <span className="text-xl text-red-600">${totalCost.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Enter quantity and cost to see summary
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Recent Purchases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Purchases
            </CardTitle>
            <CardDescription>Last 10 inventory purchases</CardDescription>
          </CardHeader>
          <CardContent>
            {purchasesLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : !recentPurchases || recentPurchases.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No purchases recorded yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost/Card</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        {new Date(purchase.purchase_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{purchase.gift_card_brands?.brand_name}</TableCell>
                      <TableCell>
                        {purchase.supplier_name || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right">{purchase.quantity}</TableCell>
                      <TableCell className="text-right">
                        ${Number(purchase.cost_per_card).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${Number(purchase.total_cost).toFixed(2)}
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

