/**
 * API Secrets Manager Component
 * Allows users to create, view, and revoke API secrets for the public debt API
 */

import { useState, useEffect } from 'react'
import { useHaptics } from '@/hooks/use-haptics'
import { Copy, Eye, EyeOff, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { debtApiClient } from '@/utility/debt-api-client'
import type { ApiSecret, CreateApiSecretResponse } from '@/types/api-debt'

export function ApiSecretsManager() {
  const { tap, success, warning } = useHaptics()
  const [secrets, setSecrets] = useState<ApiSecret[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newSecretLabel, setNewSecretLabel] = useState('')
  const [showSecretValue, setShowSecretValue] = useState<Record<string, boolean>>({})
  const [createdSecret, setCreatedSecret] = useState<CreateApiSecretResponse | null>(null)
  useEffect(() => {
    loadSecrets()
  }, [])

  const loadSecrets = async () => {
    setLoading(true)
    const result = await debtApiClient.listSecrets()

    if (Array.isArray(result)) {
      setSecrets(result)
    } else {
      toast.error(result.message)
    }
    setLoading(false)
  }

  const handleCreateSecret = async () => {
    const result = await debtApiClient.createSecret(newSecretLabel || undefined)

    if ('secret_token' in result) {
      success()
      setCreatedSecret(result as CreateApiSecretResponse)
      toast.success('API secret created. Copy it now - you won\'t see it again!')
      setNewSecretLabel('')
      await loadSecrets()
      // Keep dialog open to show the secret
    } else {
      toast.error(result.message)
    }
  }

  const handleRevokeSecret = async (secretId: string) => {
    warning()
    if (!confirm('Are you sure you want to revoke this API secret? Any applications using it will stop working.')) {
      return
    }

    const result = await debtApiClient.revokeSecret(secretId)

    if ('success' in result && result.success) {
      toast.success('API secret revoked')
      await loadSecrets()
    } else {
      toast.error(result.message)
    }
  }

  const copyToClipboard = async (text: string, label: string) => {
    success()
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const toggleSecretVisibility = (secretId: string) => {
    setShowSecretValue((prev) => ({
      ...prev,
      [secretId]: !prev[secretId]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Secrets</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage tokens for public access to your debt data
          </p>
        </div>
        <Button onClick={() => { tap(); setShowCreateDialog(true); }} className="gap-2">
          <Plus size={18} />
          Create Secret
        </Button>
      </div>

      {/* Secrets List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading secrets...</p>
        </div>
      ) : secrets.length === 0 ? (
        <div className="border rounded-lg p-8 text-center bg-gray-50">
          <p className="text-gray-500 mb-4">No API secrets yet</p>
          <Button onClick={() => { tap(); setShowCreateDialog(true); }} variant="outline">
            Create your first secret
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {secrets.map((secret) => (
            <div
              key={secret.id}
              className="border rounded-lg p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium">{secret.label || 'Unnamed Secret'}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Created {new Date(secret.created_at).toLocaleDateString()}
                      {secret.last_used_at && ` • Last used ${new Date(secret.last_used_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  {secret.expires_at && (
                    <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Expires {new Date(secret.expires_at).toLocaleDateString()}
                    </div>
                  )}
                  {!secret.is_active && (
                    <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                      Revoked
                    </div>
                  )}
                </div>
              </div>
              {secret.is_active && (
                <Button
                  onClick={() => handleRevokeSecret(secret.id)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Secret Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create API Secret</DialogTitle>
            <DialogDescription>
              Generate a new token for accessing your debt data publicly
            </DialogDescription>
          </DialogHeader>

          {!createdSecret ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Label (optional)</label>
                <Input
                  placeholder="e.g., Mobile App, Dashboard, Slack Bot"
                  value={newSecretLabel}
                  onChange={(e) => setNewSecretLabel(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                💡 Use meaningful labels to track where each secret is used
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    tap()
                    setShowCreateDialog(false)
                    setNewSecretLabel('')
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateSecret}>
                  Create Secret
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 p-4 rounded text-sm">
                ✅ API secret created successfully!
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Secret Token</label>
                <div className="flex gap-2">
                  <Input
                    type={showSecretValue['token'] ? 'text' : 'password'}
                    value={createdSecret.secret_token}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { tap(); toggleSecretVisibility('token'); }}
                  >
                    {showSecretValue['token'] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(createdSecret.secret_token, 'Secret')}
                  >
                    <Copy size={16} />
                  </Button>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded text-sm space-y-2">
                <p className="font-medium">⚠️ Important</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Save this token now - you won't see it again</li>
                  <li>Treat it like a password</li>
                  <li>Don't commit it to version control</li>
                  <li>Revoke it if it's leaked</li>
                </ul>
              </div>

              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded space-y-2">
                <p className="font-medium">API Usage:</p>
                <code className="text-xs block bg-white p-2 rounded border font-mono break-all">
                  /functions/v1/get-user-debt?user_id=YOUR_ID&secret=TOKEN
                </code>
              </div>

              <Button
                onClick={() => {
                  tap()
                  setShowCreateDialog(false)
                  setCreatedSecret(null)
                }}
                className="w-full"
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
