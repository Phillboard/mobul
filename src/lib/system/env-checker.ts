/**
 * Environment Variable Checker
 * 
 * Validates that all required environment variables are configured
 * and provides helpful error messages if they're missing
 */

export interface EnvVarCheck {
  name: string;
  required: boolean;
  description: string;
  isConfigured: boolean;
  value?: string;
  category: string;
}

export interface EnvCheckResult {
  allRequired: boolean;
  allOptional: boolean;
  checks: EnvVarCheck[];
  missingRequired: string[];
  missingOptional: string[];
}

const ENV_VARS = [
  // Supabase - Required
  {
    name: 'VITE_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    category: 'Supabase'
  },
  {
    name: 'VITE_SUPABASE_PUBLISHABLE_KEY',
    required: true,
    description: 'Supabase anon/public key',
    category: 'Supabase'
  },
  
  // Twilio - Required for SMS
  {
    name: 'VITE_TWILIO_ACCOUNT_SID',
    required: false,
    description: 'Twilio Account SID (required for SMS gift card delivery)',
    category: 'Twilio'
  },
  {
    name: 'VITE_TWILIO_AUTH_TOKEN',
    required: false,
    description: 'Twilio Auth Token (required for SMS gift card delivery)',
    category: 'Twilio'
  },
  {
    name: 'VITE_TWILIO_PHONE_NUMBER',
    required: false,
    description: 'Twilio Phone Number (required for SMS gift card delivery)',
    category: 'Twilio'
  },
  
  // Tillo API - Optional
  {
    name: 'VITE_TILLO_API_KEY',
    required: false,
    description: 'Tillo API Key (optional - for real-time gift card provisioning)',
    category: 'Tillo'
  },
  {
    name: 'VITE_TILLO_API_SECRET',
    required: false,
    description: 'Tillo API Secret (optional - for real-time gift card provisioning)',
    category: 'Tillo'
  },
  
  // AI Services - Optional
  {
    name: 'VITE_OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API Key (optional - for AI features)',
    category: 'AI'
  },
  {
    name: 'VITE_GEMINI_API_KEY',
    required: false,
    description: 'Google Gemini API Key (optional - for AI features)',
    category: 'AI'
  },
  
  // Analytics - Optional
  {
    name: 'VITE_GOOGLE_ANALYTICS_ID',
    required: false,
    description: 'Google Analytics Tracking ID (optional - for analytics)',
    category: 'Analytics'
  },
];

/**
 * Check all environment variables
 */
export function checkEnvironmentVariables(): EnvCheckResult {
  const checks: EnvVarCheck[] = ENV_VARS.map(envVar => {
    const value = import.meta.env[envVar.name];
    const isConfigured = Boolean(value && value !== '' && value !== 'undefined');
    
    return {
      ...envVar,
      isConfigured,
      value: isConfigured ? maskValue(value) : undefined,
    };
  });

  const missingRequired = checks
    .filter(check => check.required && !check.isConfigured)
    .map(check => check.name);

  const missingOptional = checks
    .filter(check => !check.required && !check.isConfigured)
    .map(check => check.name);

  const allRequired = missingRequired.length === 0;
  const allOptional = missingOptional.length === 0;

  return {
    allRequired,
    allOptional,
    checks,
    missingRequired,
    missingOptional,
  };
}

/**
 * Mask sensitive values for display
 */
function maskValue(value: string): string {
  if (!value || value.length < 8) {
    return '***';
  }
  
  // Show first 4 and last 4 characters
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}

/**
 * Get environment variables grouped by category
 */
export function getEnvVarsByCategory(): Record<string, EnvVarCheck[]> {
  const result = checkEnvironmentVariables();
  
  return result.checks.reduce((acc, check) => {
    if (!acc[check.category]) {
      acc[check.category] = [];
    }
    acc[check.category].push(check);
    return acc;
  }, {} as Record<string, EnvVarCheck[]>);
}

/**
 * Check if system is ready for MVP
 */
export function isMVPReady(): { ready: boolean; reason?: string } {
  const result = checkEnvironmentVariables();
  
  if (!result.allRequired) {
    return {
      ready: false,
      reason: `Missing required environment variables: ${result.missingRequired.join(', ')}`
    };
  }
  
  // Check for critical features
  const hasTwilio = result.checks
    .filter(c => c.category === 'Twilio')
    .every(c => c.isConfigured);
  
  if (!hasTwilio) {
    return {
      ready: false,
      reason: 'Twilio not configured - SMS gift card delivery will not work'
    };
  }
  
  return { ready: true };
}

/**
 * Generate .env template
 */
export function generateEnvTemplate(): string {
  let template = '# Environment Variables for ACE Engage Platform\n';
  template += '# Copy this file to .env and fill in your values\n\n';
  
  const byCategory = getEnvVarsByCategory();
  
  Object.entries(byCategory).forEach(([category, vars]) => {
    template += `# ${category}\n`;
    vars.forEach(v => {
      template += `# ${v.description}\n`;
      template += `${v.name}=${v.required ? '<REQUIRED>' : '<OPTIONAL>'}\n`;
      template += '\n';
    });
  });
  
  return template;
}

/**
 * Log environment check results to console
 */
export function logEnvironmentCheck(): void {
  const result = checkEnvironmentVariables();
  
  console.group('🔍 Environment Variable Check');
  
  if (result.allRequired && result.allOptional) {
    console.log('✅ All environment variables are configured');
  } else if (result.allRequired) {
    console.log('✅ All required variables configured');
    console.warn(`⚠️  ${result.missingOptional.length} optional variables missing:`, result.missingOptional);
  } else {
    console.error('❌ Missing required variables:', result.missingRequired);
  }
  
  const byCategory = getEnvVarsByCategory();
  
  Object.entries(byCategory).forEach(([category, vars]) => {
    console.group(`📁 ${category}`);
    vars.forEach(v => {
      const icon = v.isConfigured ? '✅' : v.required ? '❌' : '⚠️';
      const status = v.isConfigured ? `Configured (${v.value})` : 'Not configured';
      console.log(`${icon} ${v.name}: ${status}`);
    });
    console.groupEnd();
  });
  
  console.groupEnd();
  
  const mvpReady = isMVPReady();
  if (mvpReady.ready) {
    console.log('🎉 System is ready for MVP!');
  } else {
    console.warn(`⚠️  ${mvpReady.reason}`);
  }
}

// Auto-run in development
if (import.meta.env.DEV) {
  logEnvironmentCheck();
}

