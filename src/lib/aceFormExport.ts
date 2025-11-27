import { FormConfig, ExportOptions } from "@/types/aceForms";

/**
 * Export form configurations to various formats
 */

export function generateHTMLExport(
  formId: string,
  config: FormConfig,
  options: ExportOptions
): string {
  const { primaryColor = '#6366f1', customDomain } = options;
  // Use custom domain or Supabase URL from environment
  // Note: For exported HTML files, the API URL is embedded and won't update with env changes
  const apiUrl = customDomain || import.meta.env.VITE_SUPABASE_URL || 'https://arzthloosvnasokxygfo.supabase.co';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.settings?.title || 'Form'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; padding: 2rem; background: #f9fafb; }
    .form-container { max-width: 500px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; color: #111827; }
    p { color: #6b7280; margin-bottom: 1.5rem; }
    .field { margin-bottom: 1rem; }
    label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.5rem; }
    input, textarea, select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem; }
    input:focus, textarea:focus, select:focus { outline: none; border-color: ${primaryColor}; ring: 2px solid ${primaryColor}20; }
    button { width: 100%; background: ${primaryColor}; color: white; padding: 0.625rem 1rem; border: none; border-radius: 6px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: opacity 0.2s; }
    button:hover { opacity: 0.9; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .error { color: #dc2626; font-size: 0.75rem; margin-top: 0.25rem; }
    .success { background: #10b981; color: white; padding: 1rem; border-radius: 6px; text-align: center; }
  </style>
</head>
<body>
  <div class="form-container">
    <h1>${config.settings?.title || 'Form'}</h1>
    ${config.settings?.description ? `<p>${config.settings.description}</p>` : ''}
    <form id="aceForm">
      ${config.fields.map(field => generateFieldHTML(field)).join('\n')}
      <button type="submit">${config.settings?.submitButtonText || 'Submit'}</button>
    </form>
    <div id="result"></div>
  </div>

  <script>
    document.getElementById('aceForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());
      
      try {
        const response = await fetch('${apiUrl}/functions/v1/submit-ace-form', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ formId: '${formId}', data })
        });
        
        const result = await response.json();
        
        if (result.success) {
          const resultDiv = document.getElementById('result');
          if (resultDiv) {
            resultDiv.innerHTML = '<div class="success">${config.settings?.successMessage || 'Success!'}</div>';
          }
          if (result.giftCard) {
            window.location.href = result.redemptionUrl;
          }
        } else {
          const resultDiv = document.getElementById('result');
          if (resultDiv) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = result.error || 'An error occurred';
            resultDiv.innerHTML = '';
            resultDiv.appendChild(errorDiv);
          }
        }
      } catch (error) {
        const resultDiv = document.getElementById('result');
        if (resultDiv) {
          const errorDiv = document.createElement('div');
          errorDiv.className = 'error';
          errorDiv.textContent = 'Submission failed. Please try again.';
          resultDiv.innerHTML = '';
          resultDiv.appendChild(errorDiv);
        }
      }
    });
  </script>
</body>
</html>`;
}

function generateFieldHTML(field: any): string {
  const required = field.required ? 'required' : '';
  
  switch (field.type) {
    case 'textarea':
      return `
        <div class="field">
          <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
          <textarea id="${field.id}" name="${field.id}" placeholder="${field.placeholder || ''}" ${required}></textarea>
        </div>`;
    case 'select':
      return `
        <div class="field">
          <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
          <select id="${field.id}" name="${field.id}" ${required}>
            <option value="">Select...</option>
            ${field.options?.map((opt: string) => `<option value="${opt}">${opt}</option>`).join('')}
          </select>
        </div>`;
    default:
      return `
        <div class="field">
          <label for="${field.id}">${field.label}${field.required ? ' *' : ''}</label>
          <input type="${field.type === 'gift-card-code' ? 'text' : field.type}" id="${field.id}" name="${field.id}" placeholder="${field.placeholder || ''}" ${required} />
        </div>`;
  }
}

export function generateJavaScriptEmbed(
  formId: string,
  options: ExportOptions
): string {
  const { primaryColor = '#6366f1', customDomain } = options;
  // Use app URL for iframe embeds (frontend route), not Supabase URL
  const appUrl = customDomain || (typeof window !== 'undefined' ? window.location.origin : import.meta.env.VITE_APP_URL || '');

  return `<div id="ace-form-${formId}"></div>
<script>
  (function() {
    const iframe = document.createElement('iframe');
    iframe.src = '${appUrl}/forms/${formId}?primaryColor=${encodeURIComponent(primaryColor)}';
    iframe.style.width = '100%';
    iframe.style.border = 'none';
    iframe.style.minHeight = '500px';
    document.getElementById('ace-form-${formId}').appendChild(iframe);
  })();
</script>`;
}

export function generateIframeEmbed(
  formId: string,
  options: ExportOptions
): string {
  const { primaryColor = '#6366f1', customDomain } = options;
  // Use app URL for iframe embeds (frontend route), not Supabase URL
  const appUrl = customDomain || (typeof window !== 'undefined' ? window.location.origin : import.meta.env.VITE_APP_URL || '');

  return `<iframe 
  src="${appUrl}/forms/${formId}?primaryColor=${encodeURIComponent(primaryColor)}" 
  width="100%" 
  height="600" 
  frameborder="0"
  style="border: none; max-width: 600px;">
</iframe>`;
}

export function generateReactComponent(
  formId: string,
  config: FormConfig
): string {
  return `import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function AceForm() {
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('submit-ace-form', {
        body: { formId: '${formId}', data: formData }
      });
      
      if (error) throw error;
      
      // Handle success
      console.log('Form submitted:', data);
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-2xl font-bold">${config.settings?.title || 'Form'}</h1>
      ${config.fields.map(field => `
      <div>
        <label className="block text-sm font-medium mb-1">
          ${field.label}${field.required ? ' *' : ''}
        </label>
        <input
          type="${field.type === 'gift-card-code' ? 'text' : field.type}"
          name="${field.id}"
          placeholder="${field.placeholder || ''}"
          ${field.required ? 'required' : ''}
          onChange={(e) => setFormData({ ...formData, ${field.id}: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        />
      </div>`).join('\n')}
      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-primary text-white py-2 rounded-md"
      >
        {loading ? 'Submitting...' : '${config.settings?.submitButtonText || 'Submit'}'}
      </button>
    </form>
  );
}`;
}
