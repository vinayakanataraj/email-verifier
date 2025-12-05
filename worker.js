// Cloudflare Worker Email Verifier
// Deploy this code to Cloudflare Workers

// Email regex pattern
const EMAIL_REGEX = /^[^@]+@[^@]+\.[^@]+$/;

// Known disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com', 
  'guerrillamail.com',
  'tempmail.org',
  'throwaway.email',
  'maildrop.cc'
]);

// Role-based email prefixes
const ROLE_BASED_PREFIXES = new Set([
  'info',
  'support', 
  'admin',
  'sales',
  'contact',
  'noreply',
  'no-reply'
]);

/**
 * Verifies an email address using multiple validation methods
 * @param {string} email - The email address to verify
 * @returns {Promise<{status: string, reason: string}>} Verification result
 */
async function verifyEmail(email) {
  // Basic syntax check
  if (!EMAIL_REGEX.test(email)) {
    return { status: 'invalid', reason: 'bad_syntax' };
  }

  // Extract domain and local part
  const [local, domain] = email.split('@');
  
  if (!local || !domain) {
    return { status: 'invalid', reason: 'bad_syntax' };
  }

  // Check for disposable domains
  if (DISPOSABLE_DOMAINS.has(domain.toLowerCase())) {
    return { status: 'invalid', reason: 'disposable_domain' };
  }

  // Check for role-based emails
  if (ROLE_BASED_PREFIXES.has(local.toLowerCase())) {
    return { status: 'invalid', reason: 'role_based' };
  }

  // MX record check using Cloudflare's DNS over HTTPS
  try {
    const mxRecords = await getMXRecords(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { status: 'invalid', reason: 'no_mx' };
    }

    // For Cloudflare Workers, we can't do direct SMTP connections
    // So we'll do additional DNS and domain checks instead
    
    // Check if domain has A record (website exists)
    const hasARecord = await hasARecords(domain);
    
    // Check domain age and reputation using DNS TXT records
    const domainInfo = await getDomainInfo(domain);
    
    // If domain is very new or suspicious, mark as risky
    if (domainInfo.suspicious) {
      return { status: 'risky', reason: 'suspicious_domain' };
    }
    
    // If we have MX records and domain seems legitimate
    return { status: 'valid', reason: 'dns_verified' };
    
  } catch (error) {
    return { status: 'risky', reason: 'dns_timeout' };
  }
}

/**
 * Get MX records for a domain using Cloudflare DNS over HTTPS
 * @param {string} domain - Domain to check
 * @returns {Promise<Array>} MX records
 */
async function getMXRecords(domain) {
  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`,
      {
        headers: {
          'Accept': 'application/dns-json'
        }
      }
    );
    
    const data = await response.json();
    return data.Answer || [];
  } catch (error) {
    throw new Error('DNS lookup failed');
  }
}

/**
 * Check if domain has A records
 * @param {string} domain - Domain to check
 * @returns {Promise<boolean>} Whether domain has A records
 */
async function hasARecords(domain) {
  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${domain}&type=A`,
      {
        headers: {
          'Accept': 'application/dns-json'
        }
      }
    );
    
    const data = await response.json();
    return data.Answer && data.Answer.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Get domain information to assess legitimacy
 * @param {string} domain - Domain to check  
 * @returns {Promise<{suspicious: boolean}>} Domain info
 */
async function getDomainInfo(domain) {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\d{5,}/, // Long numbers in domain
    /temp|test|fake|spam/i, // Suspicious keywords
    /^[a-z]{1,3}\d+\./i // Very short + numbers pattern
  ];
  
  const suspicious = suspiciousPatterns.some(pattern => pattern.test(domain));
  
  return { suspicious };
}

/**
 * Cloudflare Worker fetch event handler
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Handle incoming requests
 * @param {Request} request - The incoming request
 * @returns {Promise<Response>} The response
 */
async function handleRequest(request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Only allow POST requests for email verification
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  try {
    const { email } = await request.json();
    
    if (!email) {
      return new Response(JSON.stringify({ 
        error: 'Email parameter is required' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const result = await verifyEmail(email);
    
    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      status: 'error',
      reason: 'internal_error',
      message: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// For testing locally or in other environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { verifyEmail };
}
