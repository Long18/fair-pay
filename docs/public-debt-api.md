# Public Debt API Documentation

## Overview

FairPay provides a **public secret API** that allows users to share their current debt information via a secure token-based system. This enables integration with external applications, dashboards, and services without requiring full authentication.

## Key Features

- ✅ **Public Access**: No authentication required (only valid user_id + secret)
- ✅ **Secure**: Token-based authentication with optional expiration
- ✅ **Comprehensive**: Returns total balance, per-person debts, group debts, and settlement details
- ✅ **JSON Response**: Structured data for easy integration
- ✅ **User-Managed**: Users can create, list, and revoke secrets anytime
- ✅ **Trackable**: API logs last usage timestamp for audit purposes

## How It Works

1. **User generates an API secret** in their FairPay settings
2. **Secret is never stored plaintext** - only hashed in the database
3. **User shares the endpoint URL** with user_id + secret
4. **External systems call the endpoint** to fetch current debt data
5. **No authentication needed** - the secret validates access

## Getting Started

### Step 1: Generate an API Secret

Users can generate API secrets in their account settings or via the API:

#### Via Frontend (React Hook)

```typescript
import { useAuth } from '@refinedev/core'
import { debtApiClient } from '@/utility/debt-api-client'

function ApiSecretManager() {
  const handleCreateSecret = async () => {
    const result = await debtApiClient.createSecret('My Mobile App')
    if ('id' in result && 'secret_token' in result) {
      console.log('Secret created:', result.secret_token)
    }
  }

  const handleListSecrets = async () => {
    const secrets = await debtApiClient.listSecrets()
    console.log('My secrets:', secrets)
  }

  return (
    <>
      <button onClick={handleCreateSecret}>Create Secret</button>
      <button onClick={handleListSecrets}>View Secrets</button>
    </>
  )
}
```

#### Via Direct API Call

```bash
# Create a secret (requires authentication)
curl -X POST 'https://your-supabase.supabase.co/rest/v1/rpc/create_api_secret' \
  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"p_label": "Mobile App"}'

# Response:
# {
#   "id": "550e8400-e29b-41d4-a716-446655440000",
#   "secret_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
#   "label": "Mobile App",
#   "created_at": "2026-02-06T10:00:00Z"
# }
```

### Step 2: Use the Public API

Once you have a user_id and secret_token, you can fetch debt data:

```bash
curl 'https://your-supabase.supabase.co/functions/v1/get-user-debt?user_id=550e8400-e29b-41d4-a716-446655440000&secret=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
```

## API Endpoint

### GET /functions/v1/get-user-debt

**Base URL**: `https://your-supabase-url.supabase.co`

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | UUID | Yes | The user's UUID |
| `secret` | String | Yes | The API secret token |

**Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "total_owed_to_me": 150.00,
    "total_i_owe": 75.50,
    "net_balance": 74.50,
    "currency": "USD",
    "debts_by_person": [
      {
        "counterparty_id": "660e8400-e29b-41d4-a716-446655440000",
        "counterparty_name": "Jane Smith",
        "amount": 100.00,
        "currency": "USD",
        "i_owe_them": false,
        "total_amount": 100.00,
        "settled_amount": 0,
        "remaining_amount": 100.00,
        "transaction_count": 1,
        "last_transaction_date": "2026-02-01T12:00:00Z"
      },
      {
        "counterparty_id": "770e8400-e29b-41d4-a716-446655440000",
        "counterparty_name": "Bob Johnson",
        "amount": 75.50,
        "currency": "USD",
        "i_owe_them": true,
        "total_amount": 75.50,
        "settled_amount": 0,
        "remaining_amount": 75.50,
        "transaction_count": 2,
        "last_transaction_date": "2026-02-03T15:30:00Z"
      }
    ],
    "debts_by_group": [
      {
        "group_id": "880e8400-e29b-41d4-a716-446655440000",
        "group_name": "Roommates",
        "group_avatar_url": "https://...",
        "total_owed_to_me": 50.00,
        "total_i_owe": 0,
        "net_balance": 50.00,
        "debts_in_group": [
          {
            "counterparty_id": "990e8400-e29b-41d4-a716-446655440000",
            "counterparty_name": "Alice Brown",
            "amount": 50.00,
            "currency": "USD",
            "i_owe_them": false
          }
        ]
      }
    ],
    "settlement_summary": {
      "total_expenses": 5,
      "total_settled_splits": 2,
      "total_unsettled_splits": 3,
      "total_settled_amount": 50.00,
      "total_unsettled_amount": 100.00
    }
  }
}
```

**Error Response** (401 Unauthorized):

```json
{
  "success": false,
  "error_message": "Invalid or expired API secret"
}
```

**Error Response** (400 Bad Request):

```json
{
  "success": false,
  "error_message": "Missing required parameter: user_id"
}
```

## Response Fields Explained

### Basic Fields

- **user_id**: Unique identifier of the user
- **user_name**: User's display name
- **user_email**: User's email address
- **currency**: Default currency code (USD)

### Balance Summary

- **total_owed_to_me**: Total amount others owe to this user
- **total_i_owe**: Total amount this user owes to others
- **net_balance**: Positive = owed to user, Negative = user owes

### Debts by Person

Array of individual debt relationships:

- **counterparty_id/name**: The other person
- **amount**: Current amount (same as remaining_amount)
- **i_owe_them**: Direction of debt
- **total_amount**: Original amount before any settlement
- **settled_amount**: How much has been settled
- **remaining_amount**: Outstanding amount
- **transaction_count**: Number of transactions (expenses) in relationship
- **last_transaction_date**: Most recent transaction

### Debts by Group

Array of group-level summaries:

- **group_id/name**: The group
- **group_avatar_url**: Group's profile image
- **total_owed_to_me**: Total owed within this group
- **total_i_owe**: Total owing within this group
- **net_balance**: Net balance in this group
- **debts_in_group**: Array of individuals in that group with debts

### Settlement Summary

- **total_expenses**: Number of expenses created by this user
- **total_settled_splits**: Number of expense splits that have been settled
- **total_unsettled_splits**: Number of unsettled splits
- **total_settled_amount**: Total amount settled
- **total_unsettled_amount**: Total outstanding

## Code Examples

### JavaScript/TypeScript (Frontend)

```typescript
import { usePublicDebtApi } from '@/hooks/usePublicDebtApi'

function DebtWidget() {
  const { data, loading, error, fetchDebt } = usePublicDebtApi()

  const loadDebt = async () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000'
    const secret = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
    await fetchDebt(userId, secret)
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <button onClick={loadDebt}>Fetch Debt</button>
      {data && (
        <div>
          <h2>{data.user_name}</h2>
          <p>Balance: ${data.net_balance}</p>
          <p>Owes: ${data.total_i_owe}</p>
          <p>Owed: ${data.total_owed_to_me}</p>
        </div>
      )}
    </div>
  )
}
```

### Using the Client Utility

```typescript
import { debtApiClient } from '@/utility/debt-api-client'

// Fetch debt data
const response = await debtApiClient.fetchDebtData(
  'user-uuid-here',
  'secret-token-here'
)

if (response.success && response.data) {
  // Format for display
  const { summary, details } = debtApiClient.formatDebtData(response.data)
  console.log(summary)
  details.forEach(line => console.log(line))
}

// Get shareable link
const link = debtApiClient.getPublicShareLink(
  'user-uuid-here',
  'secret-token-here',
  'https://fairpay.app'
)
```

### cURL

```bash
# Fetch debt data
curl 'https://your-supabase.supabase.co/functions/v1/get-user-debt?user_id=550e8400-e29b-41d4-a716-446655440000&secret=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'

# Pretty print the JSON response
curl 'https://your-supabase.supabase.co/functions/v1/get-user-debt?user_id=550e8400-e29b-41d4-a716-446655440000&secret=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6' | jq .
```

### Python

```python
import requests
import json

user_id = '550e8400-e29b-41d4-a716-446655440000'
secret = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
base_url = 'https://your-supabase.supabase.co'

url = f'{base_url}/functions/v1/get-user-debt'
params = {'user_id': user_id, 'secret': secret}

response = requests.get(url, params=params)
data = response.json()

if data['success']:
    debt = data['data']
    print(f"{debt['user_name']}: Net balance ${debt['net_balance']}")
    for person in debt['debts_by_person']:
        print(f"  {person['counterparty_name']}: {person['remaining_amount']}")
else:
    print(f"Error: {data['error_message']}")
```

## Managing API Secrets

### List All Secrets

```typescript
const secrets = await debtApiClient.listSecrets()
console.log(secrets)

// Output:
// [
//   {
//     "id": "550e8400-e29b-41d4-a716-446655440000",
//     "label": "Mobile App",
//     "is_active": true,
//     "last_used_at": "2026-02-06T10:30:00Z",
//     "expires_at": null,
//     "created_at": "2026-02-06T09:00:00Z"
//   }
// ]
```

### Revoke a Secret

```typescript
const result = await debtApiClient.revokeSecret('550e8400-e29b-41d4-a716-446655440000')
if ('success' in result && result.success) {
  console.log('Secret revoked')
}
```

## Security Considerations

### ✅ Best Practices

1. **Treat secrets like passwords**: Don't commit them to version control
2. **Rotate regularly**: Create new secrets periodically and revoke old ones
3. **Label appropriately**: Use descriptive labels to track where each secret is used
4. **Monitor usage**: Check last_used_at timestamp to detect inactive secrets
5. **Revoke immediately**: If a secret is leaked, revoke it right away
6. **Use expiration**: Set expiration dates for time-limited integrations
7. **HTTPS only**: Always use HTTPS endpoints (secrets in query params!)
8. **Limited scope**: Each secret is tied to a specific user

### ⚠️ Security Notes

- **Query parameters**: The secret is passed in the query string. Always use HTTPS.
- **No server-side sessions**: Each request is stateless and authenticated only by the secret
- **Public API**: The endpoint is public, but requires a valid secret to return data
- **Audit trail**: All secret usage is logged with timestamps
- **No token refresh**: Tokens don't expire unless explicitly set with `expires_at`

## API Rate Limiting

- No rate limiting enforced (can be added per deployment)
- Monitor bandwidth usage for high-volume integrations
- Consider caching responses on client side for better performance

## Integration Examples

### Dashboard Display

```html
<div id="fairpay-debt-widget">
  <p>Loading debt information...</p>
</div>

<script>
  const userId = 'user-uuid-here'
  const secret = 'secret-token-here'
  
  fetch(`https://fairpay.supabase.co/functions/v1/get-user-debt?user_id=${userId}&secret=${secret}`)
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        document.getElementById('fairpay-debt-widget').innerHTML = `
          <div class="debt-summary">
            <h3>${data.data.user_name}</h3>
            <p>Balance: $${data.data.net_balance.toFixed(2)}</p>
            <p class="debts">
              Owes: $${data.data.total_i_owe.toFixed(2)} |
              Owed: $${data.data.total_owed_to_me.toFixed(2)}
            </p>
          </div>
        `
      }
    })
</script>
```

### Slack Integration

```python
import requests
from slack_sdk import WebClient

def post_fairpay_summary_to_slack(user_id, secret, slack_token, channel):
    # Fetch debt
    response = requests.get(
        'https://fairpay.supabase.co/functions/v1/get-user-debt',
        params={'user_id': user_id, 'secret': secret}
    )
    
    data = response.json()
    
    if data['success']:
        debt = data['data']
        
        # Post to Slack
        client = WebClient(token=slack_token)
        client.chat_postMessage(
            channel=channel,
            text=f"💰 {debt['user_name']}'s FairPay Summary",
            blocks=[
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Net Balance*: ${debt['net_balance']}\n*Owes*: ${debt['total_i_owe']}\n*Owed*: ${debt['total_owed_to_me']}"
                    }
                }
            ]
        )
```

## Troubleshooting

### Invalid API Secret Error

```json
{
  "success": false,
  "error_message": "Invalid or expired API secret"
}
```

**Solutions**:
- Verify the secret token is correct (copy-paste carefully)
- Check if the secret has been revoked
- Confirm the secret hasn't expired
- Ensure you're using the correct user_id

### Missing Required Parameters

```json
{
  "success": false,
  "error_message": "Missing required parameter: user_id"
}
```

**Solutions**:
- Include both `user_id` and `secret` in query parameters
- Verify both parameters are properly URL-encoded

### HTTP 500 Errors

Indicates a server-side issue. Check:
- Is Supabase running?
- Are the migrations applied correctly?
- Check Supabase logs for errors

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify your setup matches the documentation
3. Review example code in the repo
4. Contact support with error messages and user_id
