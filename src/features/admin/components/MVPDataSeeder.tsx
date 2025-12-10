import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Loader2, Play, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from '@core/services/supabase';
import { toast } from "sonner";

interface SeedResult {
  step: string;
  status: 'success' | 'error' | 'skipped';
  message: string;
  data?: any;
}

export function MVPDataSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [results, setResults] = useState<SeedResult[]>([]);

  const seedTestData = async () => {
    setIsSeeding(true);
    setResults([]);
    const seedResults: SeedResult[] = [];

    try {
      // Step 1: Seed gift card brands
      const brandsResult = await seedGiftCardBrands();
      seedResults.push(brandsResult);

      // Step 2: Create test client
      const clientResult = await createTestClient();
      seedResults.push(clientResult);

      if (clientResult.status === 'error') {
        setResults(seedResults);
        setIsSeeding(false);
        return;
      }

      const clientId = clientResult.data?.id;

      // Step 3: Assign current user to client
      const userResult = await assignUserToClient(clientId);
      seedResults.push(userResult);

      // Step 4: Create test gift card pool
      const poolResult = await createTestGiftCardPool(clientId);
      seedResults.push(poolResult);

      // Step 5: Add cards to pool
      if (poolResult.status === 'success' && poolResult.data?.id) {
        const cardsResult = await seedGiftCards(poolResult.data.id, poolResult.data.brand_id);
        seedResults.push(cardsResult);
      }

      // Step 6: Create test contacts
      const contactsResult = await createTestContacts(clientId);
      seedResults.push(contactsResult);

      // Step 7: Create test contact list
      const listResult = await createTestContactList(clientId);
      seedResults.push(listResult);

      // Step 8: Create test template
      const templateResult = await createTestTemplate(clientId);
      seedResults.push(templateResult);

      setResults(seedResults);
      
      const hasErrors = seedResults.some(r => r.status === 'error');
      if (!hasErrors) {
        toast.success("✅ Test data seeded successfully!");
      } else {
        toast.warning("⚠️ Some steps failed. Check results below.");
      }
    } catch (error) {
      console.error("Seeding error:", error);
      toast.error("Failed to seed test data");
      seedResults.push({
        step: 'Fatal Error',
        status: 'error',
        message: String(error)
      });
      setResults(seedResults);
    } finally {
      setIsSeeding(false);
    }
  };

  const seedGiftCardBrands = async (): Promise<SeedResult> => {
    try {
      const brands = [
        { brand_name: 'Amazon', brand_code: 'amazon', provider: 'tillo', category: 'retail' },
        { brand_name: 'Starbucks', brand_code: 'starbucks', provider: 'tillo', category: 'food_beverage' },
        { brand_name: 'Target', brand_code: 'target', provider: 'tillo', category: 'retail' },
        { brand_name: 'Walmart', brand_code: 'walmart', provider: 'tillo', category: 'retail' },
        { brand_name: 'Visa', brand_code: 'visa', provider: 'tillo', category: 'prepaid' },
      ];

      const { data, error } = await supabase
        .from('gift_card_brands')
        .upsert(brands, { onConflict: 'brand_code', ignoreDuplicates: true })
        .select();

      if (error) throw error;

      return {
        step: 'Gift Card Brands',
        status: 'success',
        message: `Seeded ${brands.length} gift card brands`,
        data
      };
    } catch (error: any) {
      return {
        step: 'Gift Card Brands',
        status: 'error',
        message: error.message
      };
    }
  };

  const createTestClient = async (): Promise<SeedResult> => {
    try {
      // Check if test client exists
      const { data: existing } = await supabase
        .from('clients')
        .select('*')
        .eq('name', 'Test Client Co')
        .single();

      if (existing) {
        return {
          step: 'Test Client',
          status: 'skipped',
          message: 'Test client already exists',
          data: existing
        };
      }

      // Check if test org exists, create if not
      let orgId;
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('name', 'Test Agency')
        .single();

      if (existingOrg) {
        orgId = existingOrg.id;
      } else {
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert([{ name: 'Test Agency', org_type: 'agency' }])
          .select()
          .single();

        if (orgError) throw orgError;
        orgId = newOrg.id;
      }

      // Create test client
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          org_id: orgId,
          name: 'Test Client Co',
          industry: 'technology',
          timezone: 'America/New_York',
          credits: 1000
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        step: 'Test Client',
        status: 'success',
        message: 'Created test client',
        data
      };
    } catch (error: any) {
      return {
        step: 'Test Client',
        status: 'error',
        message: error.message
      };
    }
  };

  const assignUserToClient = async (clientId: string): Promise<SeedResult> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Check if already assigned
      const { data: existing } = await supabase
        .from('client_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('client_id', clientId)
        .single();

      if (existing) {
        return {
          step: 'User Assignment',
          status: 'skipped',
          message: 'User already assigned to client'
        };
      }

      // Assign user to client
      const { error } = await supabase
        .from('client_users')
        .insert([{ user_id: user.id, client_id: clientId }]);

      if (error) throw error;

      // Ensure user has a role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert([{ user_id: user.id, role: 'admin' }], { onConflict: 'user_id' });

      if (roleError) console.warn('Role assignment warning:', roleError);

      return {
        step: 'User Assignment',
        status: 'success',
        message: 'Assigned user to test client'
      };
    } catch (error: any) {
      return {
        step: 'User Assignment',
        status: 'error',
        message: error.message
      };
    }
  };

  const createTestGiftCardPool = async (clientId: string): Promise<SeedResult> => {
    try {
      // Get Amazon brand
      const { data: brand, error: brandError } = await supabase
        .from('gift_card_brands')
        .select('id')
        .eq('brand_code', 'amazon')
        .single();

      if (brandError || !brand) throw new Error('Amazon brand not found');

      // Check if pool exists
      const { data: existing } = await supabase
        .from('gift_card_pools')
        .select('*')
        .eq('client_id', clientId)
        .eq('pool_name', 'Test Amazon $25 Pool')
        .single();

      if (existing) {
        return {
          step: 'Gift Card Pool',
          status: 'skipped',
          message: 'Test pool already exists',
          data: existing
        };
      }

      // Create pool
      const { data, error } = await supabase
        .from('gift_card_pools')
        .insert([{
          client_id: clientId,
          pool_name: 'Test Amazon $25 Pool',
          brand_id: brand.id,
          card_value: 25.00,
          provider: 'tillo',
          total_cards: 20,
          available_cards: 20,
          purchase_method: 'csv_only',
          low_stock_threshold: 5
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        step: 'Gift Card Pool',
        status: 'success',
        message: 'Created test gift card pool',
        data: { ...data, brand_id: brand.id }
      };
    } catch (error: any) {
      return {
        step: 'Gift Card Pool',
        status: 'error',
        message: error.message
      };
    }
  };

  const seedGiftCards = async (poolId: string, brandId: string): Promise<SeedResult> => {
    try {
      const cards = [];
      for (let i = 1; i <= 20; i++) {
        const randomSuffix = Math.random().toString(36).substring(2, 10).toUpperCase();
        cards.push({
          pool_id: poolId,
          brand_id: brandId,
          card_code: `TEST-${String(i).padStart(4, '0')}-${randomSuffix}`,
          card_number: `6011${String(1000000000000 + i).padStart(12, '0')}`,
          pin: String(i).padStart(4, '0'),
          card_value: 25.00,
          status: 'available'
        });
      }

      const { data, error } = await supabase
        .from('gift_cards')
        .upsert(cards, { onConflict: 'card_code', ignoreDuplicates: true })
        .select();

      if (error) throw error;

      return {
        step: 'Gift Cards',
        status: 'success',
        message: `Added ${cards.length} test gift cards`,
        data
      };
    } catch (error: any) {
      return {
        step: 'Gift Cards',
        status: 'error',
        message: error.message
      };
    }
  };

  const createTestContacts = async (clientId: string): Promise<SeedResult> => {
    try {
      const contacts = [];
      for (let i = 1; i <= 10; i++) {
        contacts.push({
          client_id: clientId,
          first_name: `Test${i}`,
          last_name: `Contact${i}`,
          email: `test${i}@example.com`,
          phone: `+1555000${String(i).padStart(4, '0')}`,
          address: `${100 + i} Test St`,
          city: 'Austin',
          state: 'TX',
          zip: '78701',
          lifecycle_stage: 'lead'
        });
      }

      const { data, error } = await supabase
        .from('contacts')
        .upsert(contacts, { onConflict: 'email', ignoreDuplicates: true })
        .select();

      if (error) throw error;

      return {
        step: 'Test Contacts',
        status: 'success',
        message: `Created ${contacts.length} test contacts`,
        data
      };
    } catch (error: any) {
      return {
        step: 'Test Contacts',
        status: 'error',
        message: error.message
      };
    }
  };

  const createTestContactList = async (clientId: string): Promise<SeedResult> => {
    try {
      // Check if list exists
      const { data: existing } = await supabase
        .from('contact_lists')
        .select('*')
        .eq('client_id', clientId)
        .eq('name', 'Test Contact List')
        .single();

      if (existing) {
        return {
          step: 'Contact List',
          status: 'skipped',
          message: 'Test contact list already exists'
        };
      }

      // Create list
      const { data: list, error: listError } = await supabase
        .from('contact_lists')
        .insert([{
          client_id: clientId,
          name: 'Test Contact List',
          contact_count: 10
        }])
        .select()
        .single();

      if (listError) throw listError;

      // Get test contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .eq('client_id', clientId)
        .limit(10);

      if (contacts && contacts.length > 0) {
        // Add contacts to list
        const members = contacts.map(c => ({
          list_id: list.id,
          contact_id: c.id
        }));

        await supabase
          .from('contact_list_members')
          .upsert(members, { onConflict: 'list_id,contact_id', ignoreDuplicates: true });
      }

      return {
        step: 'Contact List',
        status: 'success',
        message: 'Created test contact list with members'
      };
    } catch (error: any) {
      return {
        step: 'Contact List',
        status: 'error',
        message: error.message
      };
    }
  };

  const createTestTemplate = async (clientId: string): Promise<SeedResult> => {
    try {
      // Check if template exists
      const { data: existing } = await supabase
        .from('templates')
        .select('*')
        .eq('client_id', clientId)
        .eq('name', 'Simple Test Template')
        .single();

      if (existing) {
        return {
          step: 'Template',
          status: 'skipped',
          message: 'Test template already exists'
        };
      }

      const { data, error } = await supabase
        .from('templates')
        .insert([{
          client_id: clientId,
          name: 'Simple Test Template',
          size: '4x6',
          is_starter_template: false,
          category: 'promotion',
          json_layers: {
            version: '1.0',
            canvasSize: { width: 1800, height: 1200 },
            backgroundColor: '#FFFFFF',
            layers: [
              {
                id: 'text-1',
                type: 'text',
                text: 'Hello {{first_name}}!',
                fontSize: 36,
                fontFamily: 'Arial',
                fill: '#000000',
                left: 100,
                top: 100
              }
            ]
          }
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        step: 'Template',
        status: 'success',
        message: 'Created test template'
      };
    } catch (error: any) {
      return {
        step: 'Template',
        status: 'error',
        message: error.message
      };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>MVP Test Data Seeder</CardTitle>
        <CardDescription>
          Seeds the database with test data for MVP verification
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            This will create:
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>5 gift card brands (Amazon, Starbucks, Target, Walmart, Visa)</li>
              <li>Test organization and client</li>
              <li>Gift card pool with 20 test cards ($25 Amazon)</li>
              <li>10 test contacts</li>
              <li>Test contact list</li>
              <li>Simple test template</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button
          onClick={seedTestData}
          disabled={isSeeding}
          size="lg"
          className="w-full"
        >
          {isSeeding ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Seeding Test Data...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Seed Test Data
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-2 mt-4">
            <h4 className="font-semibold">Results:</h4>
            {results.map((result, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-3 rounded-lg border bg-card"
              >
                {result.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                ) : result.status === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{result.step}</div>
                  <div className="text-sm text-muted-foreground">{result.message}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

