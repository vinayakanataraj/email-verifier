# Email Verifier for Cloudflare Workers

A simple, fast email verification service that runs on Cloudflare's edge network. This tool helps you validate email addresses before accepting them in your applications.

## What It Does

This service checks if an email address is legitimate by performing several verification steps:

1. **Format Check** - Ensures the email follows the basic structure (username@domain.com)
2. **Disposable Email Detection** - Blocks temporary/throwaway email services like 10minutemail or guerrillamail
3. **Role-Based Email Detection** - Flags generic addresses like info@, support@, or admin@
4. **Domain Verification** - Checks if the email domain actually exists and can receive emails by looking up its mail server records

The service returns one of three statuses:
- ✅ **Valid** - Email appears legitimate and can receive mail
- ❌ **Invalid** - Email has clear problems (bad format, disposable domain, etc.)
- ⚠️ **Risky** - Email might be suspicious (new domain, timeout, etc.)

## Deployment Instructions

### Prerequisites

- A Cloudflare account (free tier works fine)
- Basic familiarity with command line/terminal

### Step 1: Install Wrangler CLI

Wrangler is Cloudflare's command-line tool for managing Workers.

```bash
npm install -g wrangler
```

### Step 2: Login to Cloudflare

```bash
wrangler login
```

This will open your browser to authenticate with your Cloudflare account.

### Step 3: Clone or Download This Repository

```bash
git clone github.com/vinayakanataraj/email-verifier/
cd email-verifier
```

### Step 4: Create wrangler.toml Configuration

Create a file named `wrangler.toml` in the project root with the following content:

```toml
name = "email-verifier"
main = "worker.js"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"
```

### Step 5: Deploy to Cloudflare Workers

```bash
wrangler deploy
```

After deployment, Wrangler will provide you with a URL like:
```
https://email-verifier.<your-subdomain>.workers.dev
```

This is your API endpoint!

## How to Use the API

Send a POST request to your Worker URL with a JSON body containing the email to verify:

**Request:**
```bash
curl -X POST https://email-verifier.<your-subdomain>.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

**Response:**
```json
{
  "status": "valid",
  "reason": "dns_verified"
}
```

### Response Codes

| Status | Reason | Meaning |
|--------|--------|---------|
| invalid | bad_syntax | Email format is incorrect |
| invalid | disposable_domain | Temporary email service detected |
| invalid | role_based | Generic role address (info@, support@) |
| invalid | no_mx | Domain cannot receive emails |
| risky | suspicious_domain | Domain appears suspicious |
| risky | dns_timeout | Couldn't verify domain in time |
| valid | dns_verified | Email appears legitimate |

## Customization

You can modify the code to add more disposable domains or adjust the verification rules:

- **Add disposable domains**: Edit the `DISPOSABLE_DOMAINS` set in the code
- **Adjust role-based prefixes**: Edit the `ROLE_BASED_PREFIXES` set
- **Modify suspicious patterns**: Update the `getDomainInfo` function

After making changes, run `wrangler deploy` again to update your Worker.

## Cost

Cloudflare Workers free tier includes:
- 100,000 requests per day
- No credit card required

This is typically more than enough for most small to medium applications.

## Troubleshooting

**"Command not found: wrangler"**
- Make sure Node.js and npm are installed on your system
- Try running `npm install -g wrangler` again

**"Authentication error"**
- Run `wrangler logout` then `wrangler login` again

**"Deployment failed"**
- Check that your `wrangler.toml` file exists and is properly formatted
- Ensure you're in the correct directory

## Support

For issues or questions, please open an issue in this repository.

## License

MIT License - feel free to use this in your projects!
