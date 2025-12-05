import { z } from "zod";
import { FormField, ValidationRule } from "@/types/aceForms";
import {
  emailSchema,
  phoneSchema,
  giftCardCodeSchema,
  validateGiftCardCode,
  formatPhone,
  sanitizeInput,
} from "./validationSchemas";

/**
 * Form validation utilities using Zod
 */

export function createFieldSchema(field: FormField): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  // Base schema by field type - use centralized schemas
  switch (field.type) {
    case 'email':
      schema = emailSchema;
      break;
    case 'phone':
      schema = phoneSchema;
      break;
    case 'gift-card-code':
      schema = giftCardCodeSchema;
      break;
    case 'date':
      schema = z.string().datetime();
      break;
    case 'checkbox':
      schema = z.boolean();
      break;
    default:
      schema = z.string();
  }

  // Apply custom validation rules
  if (field.validation) {
    field.validation.forEach((rule: ValidationRule) => {
      switch (rule.type) {
        case 'minLength':
          if (schema instanceof z.ZodString) {
            schema = schema.min(rule.value as number, { message: rule.message });
          }
          break;
        case 'maxLength':
          if (schema instanceof z.ZodString) {
            schema = schema.max(rule.value as number, { message: rule.message });
          }
          break;
        case 'pattern':
          if (schema instanceof z.ZodString) {
            schema = schema.regex(new RegExp(rule.value as string), { message: rule.message });
          }
          break;
      }
    });
  }

  // Handle required/optional
  if (!field.required) {
    schema = schema.optional();
  }

  return schema;
}

export function createFormSchema(fields: FormField[]): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};
  
  fields.forEach(field => {
    shape[field.id] = createFieldSchema(field);
  });

  return z.object(shape);
}

// Re-export validation utilities from central schemas
export { validateGiftCardCode, formatPhone, sanitizeInput };
