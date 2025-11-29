import { ConditionalLogic, FormField } from "@/types/aceForms";

/**
 * Evaluates whether a field should be shown based on its conditional logic
 * @param condition - The conditional logic configuration
 * @param formValues - Current form field values
 * @param allFields - All form fields (for reference)
 * @returns true if field should be shown, false if hidden
 */
export function evaluateCondition(
  condition: ConditionalLogic,
  formValues: Record<string, any>,
  allFields: FormField[]
): boolean {
  const { fieldId, operator, value } = condition.showIf;
  const fieldValue = formValues[fieldId];

  // If the dependent field doesn't exist or has no value, hide this field
  if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
    return false;
  }

  switch (operator) {
    case 'equals':
      return String(fieldValue).toLowerCase() === String(value).toLowerCase();
    
    case 'notEquals':
      return String(fieldValue).toLowerCase() !== String(value).toLowerCase();
    
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());
    
    default:
      // Unknown operator - show field by default
      return true;
  }
}

/**
 * Checks if a field should be visible based on conditional logic
 * @param field - The form field to check
 * @param formValues - Current form field values
 * @param allFields - All form fields
 * @returns true if field should be visible
 */
export function shouldShowField(
  field: FormField,
  formValues: Record<string, any>,
  allFields: FormField[]
): boolean {
  // If no conditional logic, always show
  if (!field.conditional) {
    return true;
  }

  // Evaluate the condition
  return evaluateCondition(field.conditional, formValues, allFields);
}
