const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidEmail = (value) => EMAIL_REGEX.test(String(value).trim());

export const isRequired = (value) => String(value ?? '').trim().length > 0;

export const hasMinLength = (value, min) => String(value ?? '').trim().length >= min;

/**
 * Corre un objeto { campo: valor } contra un objeto { campo: [validadores] }
 * y devuelve { campo: 'mensaje' } solo para los campos que fallaron.
 * Se reutiliza en cualquier formulario de la app en vez de repetir ifs sueltos.
 */
export const validateFields = (values, rules) => {
  const errors = {};

  Object.entries(rules).forEach(([field, fieldRules]) => {
    for (const rule of fieldRules) {
      const result = rule(values[field]);
      if (result !== true) {
        errors[field] = result;
        break;
      }
    }
  });

  return errors;
};
