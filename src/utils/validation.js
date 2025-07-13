// Input validation and sanitization utilities

export const validateInput = {
  // Text input validation
  text: (value, maxLength = 255) => {
    if (typeof value !== 'string') return false;
    if (value.length > maxLength) return false;
    if (value.trim().length === 0) return false;
    return true;
  },

  // Email validation
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  // URL validation
  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  // Array validation
  array: (value, maxLength = 100) => {
    if (!Array.isArray(value)) return false;
    if (value.length > maxLength) return false;
    return true;
  },

  // Required field validation
  required: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }
};

export const sanitizeInput = {
  // Basic text sanitization
  text: (value) => {
    if (typeof value !== 'string') return '';
    return value
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  },

  // HTML content sanitization (basic)
  html: (value) => {
    if (typeof value !== 'string') return '';
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '') // Remove event handlers
      .replace(/on\w+\s*=\s*'[^']*'/gi, '') // Remove event handlers
      .trim();
  },

  // Array sanitization
  array: (value) => {
    if (!Array.isArray(value)) return [];
    return value.map(item => sanitizeInput.text(String(item)));
  }
};

export const createValidator = (schema) => {
  return (data) => {
    const errors = {};
    
    Object.keys(schema).forEach(field => {
      const rules = schema[field];
      const value = data[field];
      
      if (rules.required && !validateInput.required(value)) {
        errors[field] = `${field} is required`;
        return;
      }
      
      if (value !== undefined && value !== null) {
        if (rules.type === 'text' && !validateInput.text(value, rules.maxLength)) {
          errors[field] = `${field} must be valid text${rules.maxLength ? ` (max ${rules.maxLength} characters)` : ''}`;
        }
        
        if (rules.type === 'email' && !validateInput.email(value)) {
          errors[field] = `${field} must be a valid email`;
        }
        
        if (rules.type === 'array' && !validateInput.array(value, rules.maxLength)) {
          errors[field] = `${field} must be a valid array${rules.maxLength ? ` (max ${rules.maxLength} items)` : ''}`;
        }
        
        if (rules.custom && !rules.custom(value)) {
          errors[field] = rules.message || `${field} is invalid`;
        }
      }
    });
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  };
};

// Common validation schemas
export const schemas = {
  task: {
    title: { required: true, type: 'text', maxLength: 255 },
    description: { type: 'text', maxLength: 1000 },
    type: { required: true, type: 'text' },
    status: { required: true, type: 'text' },
    priority: { required: true, type: 'text' },
    tags: { type: 'array', maxLength: 20 },
    stakeholders: { type: 'array', maxLength: 50 }
  },
  
  project: {
    name: { required: true, type: 'text', maxLength: 255 },
    description: { type: 'text', maxLength: 1000 },
    status: { required: true, type: 'text' },
    tags: { type: 'array', maxLength: 20 }
  },
  
  stakeholder: {
    name: { required: true, type: 'text', maxLength: 255 },
    email: { type: 'email' },
    role: { type: 'text', maxLength: 100 },
    organization: { type: 'text', maxLength: 255 }
  },
  
  teamMember: {
    name: { required: true, type: 'text', maxLength: 255 },
    email: { type: 'email' },
    role: { type: 'text', maxLength: 100 },
    skills: { type: 'array', maxLength: 30 }
  }
};