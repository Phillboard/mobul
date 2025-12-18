/**
 * SMS Provider Settings Panel
 * 
 * Manage SMS provider priority and fallback configuration.
 * Allows drag-and-drop reordering of fallback providers.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Switch } from '@/shared/components/ui/switch';
import { Label } from '@/shared/components/ui/label';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { 
  GripVertical, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  Settings2,
  ArrowDown,
  Info
} from 'lucide-react';
import { useSMSProviderSettings, useUpdateSMSProviderSettings, SMSProvider } from '@/features/admin/hooks/useSMSProviderSettings';
import { Skeleton } from '@/shared/components/ui/skeleton';

const PROVIDERS: Array<{ value: SMSProvider; label: string; description: string }> = [
  { 
    value: 'notificationapi', 
    label: 'NotificationAPI', 
    description: 'Recommended primary provider with reliable delivery' 
  },
  { 
    value: 'infobip', 
    label: 'Infobip', 
    description: 'Enterprise SMS gateway with global coverage' 
  },
  { 
    value: 'twilio', 
    label: 'Twilio', 
    description: 'Popular SMS provider with extensive features' 
  },
  { 
    value: 'eztexting', 
    label: 'EZTexting', 
    description: 'Simple SMS platform for North America' 
  },
];

export function SMSProviderSettingsPanel() {
  const { data: settings, isLoading, refetch } = useSMSProviderSettings();
  const updateSettings = useUpdateSMSProviderSettings();

  // Local state for editing
  const [primaryProvider, setPrimaryProvider] = useState<SMSProvider>('notificationapi');
  const [enableFallback, setEnableFallback] = useState(true);
  const [fallbackOnError, setFallbackOnError] = useState(true);
  const [fallbackProviders, setFallbackProviders] = useState<(SMSProvider | null)[]>([null, null, null]);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Initialize local state when settings load
  if (settings && !initialized) {
    setPrimaryProvider(settings.primary_provider);
    setEnableFallback(settings.enable_fallback);
    setFallbackOnError(settings.fallback_on_error);
    setFallbackProviders([
      settings.fallback_provider_1,
      settings.fallback_provider_2,
      settings.fallback_provider_3,
    ]);
    setInitialized(true);
  }

  // Get available providers for each fallback slot (exclude already selected)
  const getAvailableProviders = (slotIndex: number) => {
    const selected = new Set([primaryProvider]);
    fallbackProviders.forEach((p, i) => {
      if (p && i !== slotIndex) selected.add(p);
    });
    return PROVIDERS.filter(p => !selected.has(p.value));
  };

  const handlePrimaryChange = (value: SMSProvider) => {
    setPrimaryProvider(value);
    
    // Remove from fallbacks if it was there
    setFallbackProviders(prev => 
      prev.map(p => p === value ? null : p)
    );
    
    setHasChanges(true);
  };

  const handleFallbackChange = (index: number, value: SMSProvider | 'none') => {
    setFallbackProviders(prev => {
      const updated = [...prev];
      updated[index] = value === 'none' ? null : value;
      return updated;
    });
    setHasChanges(true);
  };

  const moveFallbackUp = (index: number) => {
    if (index === 0) return;
    setFallbackProviders(prev => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
    setHasChanges(true);
  };

  const moveFallbackDown = (index: number) => {
    if (index === fallbackProviders.length - 1) return;
    setFallbackProviders(prev => {
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated;
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings.mutate({
      primary_provider: primaryProvider,
      enable_fallback: enableFallback,
      fallback_on_error: fallbackOnError,
      fallback_provider_1: fallbackProviders[0],
      fallback_provider_2: fallbackProviders[1],
      fallback_provider_3: fallbackProviders[2],
    }, {
      onSuccess: () => {
        setHasChanges(false);
      },
    });
  };

  const handleReset = () => {
    if (settings) {
      setPrimaryProvider(settings.primary_provider);
      setEnableFallback(settings.enable_fallback);
      setFallbackOnError(settings.fallback_on_error);
      setFallbackProviders([
        settings.fallback_provider_1,
        settings.fallback_provider_2,
        settings.fallback_provider_3,
      ]);
      setHasChanges(false);
    }
  };

  const getProviderLabel = (value: SMSProvider | null) => {
    if (!value) return 'None';
    return PROVIDERS.find(p => p.value === value)?.label || value;
  };

  const getProviderConfig = (provider: SMSProvider) => {
    if (!settings) return null;
    const key = `${provider}_enabled` as keyof typeof settings;
    return settings[key] as boolean;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Provider Priority Settings</CardTitle>
          <CardDescription>Configure SMS provider order and fallback behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Provider Priority Settings
            </CardTitle>
            <CardDescription>
              Configure SMS provider order and fallback behavior
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            The system will try providers in order from top to bottom. If the primary provider fails and fallback is enabled, 
            it will automatically try the next available provider.
          </AlertDescription>
        </Alert>

        {/* Primary Provider */}
        <div className="space-y-3">
          <div>
            <Label className="text-base font-semibold">Primary Provider</Label>
            <p className="text-sm text-muted-foreground">
              This provider will be tried first for all SMS messages
            </p>
          </div>
          
          <div className="grid gap-3">
            <Select value={primaryProvider} onValueChange={handlePrimaryChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium">{provider.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {provider.description}
                        </div>
                      </div>
                      {getProviderConfig(provider.value) ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-300">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not Configured
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {getProviderLabel(primaryProvider)}
                </span>
                <Badge>Primary</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Fallback Settings */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enable-fallback" className="text-base font-semibold">
                Enable Fallback
              </Label>
              <p className="text-sm text-muted-foreground">
                Automatically try backup providers if primary fails
              </p>
            </div>
            <Switch
              id="enable-fallback"
              checked={enableFallback}
              onCheckedChange={(checked) => {
                setEnableFallback(checked);
                setHasChanges(true);
              }}
            />
          </div>

          {enableFallback && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="fallback-on-error" className="text-sm font-medium">
                    Fallback on Error
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Use fallback providers when primary returns an error
                  </p>
                </div>
                <Switch
                  id="fallback-on-error"
                  checked={fallbackOnError}
                  onCheckedChange={(checked) => {
                    setFallbackOnError(checked);
                    setHasChanges(true);
                  }}
                />
              </div>

              {/* Fallback Chain */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Fallback Priority Order</Label>
                
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 p-0 hover:bg-transparent"
                        onClick={() => moveFallbackUp(index)}
                        disabled={index === 0 || !fallbackProviders[index]}
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 p-0 hover:bg-transparent"
                        onClick={() => moveFallbackDown(index)}
                        disabled={index === 2 || !fallbackProviders[index]}
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>

                    <div className="flex-1">
                      <Select
                        value={fallbackProviders[index] || 'none'}
                        onValueChange={(value) => handleFallbackChange(index, value as SMSProvider | 'none')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {getAvailableProviders(index).map((provider) => (
                            <SelectItem key={provider.value} value={provider.value}>
                              <div className="flex items-center gap-2">
                                {provider.label}
                                {getProviderConfig(provider.value) ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 text-amber-600" />
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-24">
                      <Badge variant="secondary" className="justify-center w-full">
                        Fallback {index + 1}
                      </Badge>
                    </div>
                  </div>
                ))}

                {/* Visual Flow */}
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-xs font-medium text-muted-foreground mb-3">
                    Message Flow:
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Badge>1</Badge>
                      <span className="text-sm font-medium">{getProviderLabel(primaryProvider)}</span>
                      <span className="text-xs text-muted-foreground">(Primary)</span>
                    </div>
                    {enableFallback && fallbackProviders.map((provider, index) => (
                      provider && (
                        <div key={index} className="flex items-center gap-2">
                          <ArrowDown className="h-4 w-4 text-muted-foreground ml-3" />
                          <Badge variant="outline">{index + 2}</Badge>
                          <span className="text-sm">{getProviderLabel(provider)}</span>
                          <span className="text-xs text-muted-foreground">(Fallback {index + 1})</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Save/Reset Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {hasChanges && (
              <p className="text-sm text-amber-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                You have unsaved changes
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={!hasChanges || updateSettings.isPending}
            >
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateSettings.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateSettings.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
