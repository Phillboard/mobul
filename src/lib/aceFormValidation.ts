import { z } from "zod";
import { FormField, ValidationRule } from "@/types/aceForms";

/**
 * Form validation utilities using Zod
 */

export function createFieldSchema(field: FormField): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  // Base schema by field type
  switch (field.type) {
    case 'email':
      schema = z.string().email({ message: "Invalid email address" });
      break;
    case 'phone':
      schema = z.string().regex(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/, {
        message: "Invalid phone number"
      });
      break;
    case 'gift-card-code':
      schema = z.string()
        .min(4, { message: "Code must be at least 4 characters" })
        .max(20, { message: "Code must be no more than 20 characters" })
        .regex(/^[A-Za-z0-9]+$/i, { message: "Code must contain only letters and numbers" });
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

export function validateGiftCardCode(code: string): boolean {
  return /^[A-Za-z0-9]{4,20}$/i.test(code);
}

export function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return value;
}

export function sanitizeInput(value: string): string {
  return value.trim().replace(/[<>]/g, '');
}
