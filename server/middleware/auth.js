import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Authentication middleware
 * Supports two modes:
 * 1. Development mode: Bypass XSUAA, use mock user
 * 2. Production mode: Validate JWT token from SAP BTP XSUAA
 */

function authMiddleware(req, res, next) {
  // Development mode: bypass authentication
  if (process.env.NODE_ENV === 'development' || process.env.AUTH_MODE === 'development') {
    req.user = {
      id: process.env.DEV_USER_ID || 'dev-user',
      name: process.env.DEV_USER_NAME || 'Development User',
      email: process.env.DEV_USER_EMAIL || 'dev@example.com'
    };
    return next();
  }

  // Production mode: XSUAA authentication
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Load XSUAA library
    const xssec = require('@sap/xssec');
    const xsenv = require('@sap/xsenv');

    // Get XSUAA service credentials from VCAP_SERVICES
    let xsuaaCredentials;
    try {
      const services = xsenv.getServices({ xsuaa: { tag: 'xsuaa' } });
      xsuaaCredentials = services.xsuaa;
    } catch (error) {
      console.error('Failed to get XSUAA credentials:', error);
      return res.status(500).json({
        error: 'Configuration Error',
        message: 'XSUAA service not configured'
      });
    }

    // Verify JWT token
    xssec.createSecurityContext(token, xsuaaCredentials, (error, securityContext) => {
      if (error) {
        console.error('Token validation failed:', error);
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        });
      }

      // Extract user information from security context
      req.user = {
        id: securityContext.getLogonName() || securityContext.getUniquePrincipalName(),
        name: securityContext.getGivenName()
          ? `${securityContext.getGivenName()} ${securityContext.getFamilyName()}`
          : securityContext.getLogonName(),
        email: securityContext.getEmail() || securityContext.getLogonName(),
        scopes: securityContext.getScope()
      };

      // Optional: Check for required scopes
      // if (!req.user.scopes.includes('pe-manager.read')) {
      //   return res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
      // }

      next();
    });

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed'
    });
  }
}

/**
 * Optional middleware to check specific scopes
 */
function requireScope(scope) {
  return (req, res, next) => {
    if (process.env.NODE_ENV === 'development' || process.env.AUTH_MODE === 'development') {
      return next(); // Skip scope check in development
    }

    if (!req.user || !req.user.scopes || !req.user.scopes.includes(scope)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Required scope: ${scope}`
      });
    }

    next();
  };
}

export { authMiddleware, requireScope };
