import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGroupJoinRequests } from '../hooks/use-join-request';
import {
  CheckIcon,
  XIcon,
  Loader2Icon,
  LogInIcon,
} from '@/components/ui/icons';
import { dateUtils } from '@/lib/date-utils';
import { useState } from 'react';
import { useHaptics } from '@/hooks/use-haptics';

interface JoinRequestsListProps {
  groupId: string;
  onRequestProcessed?: () => void;
}

export function JoinRequestsList({ groupId, onRequestProcessed }: JoinRequestsListProps) {
  const { pendingRequests, approveRequest, rejectRequest, isLoading } =
    useGroupJoinRequests(groupId);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { success, warning } = useHaptics();

  if (isLoading) return null;
  if (pendingRequests.length === 0) return null;

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const handleApprove = async (requestId: string) => {
    success();
    setProcessingId(requestId);
    await approveRequest(requestId);
    setProcessingId(null);
    onRequestProcessed?.();
  };

  const handleReject = async (requestId: string) => {
    warning();
    setProcessingId(requestId);
    await rejectRequest(requestId);
    setProcessingId(null);
  };

  return (
    <Card className="rounded-xl border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <LogInIcon className="h-4 w-4 text-blue-600" />
          <CardTitle className="text-sm font-medium text-blue-900">
            Join Requests
          </CardTitle>
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
            {pendingRequests.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingRequests.map((request: any) => {
          const profile = request.profiles;
          const isProcessing = processingId === request.id;

          return (
            <div
              key={request.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-background"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(profile?.full_name || 'Unknown')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name || 'Unknown'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dateUtils.formatRelative(request.created_at)}
                </p>
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleApprove(request.id)}
                  disabled={isProcessing}
                  title="Approve"
                >
                  {isProcessing ? (
                    <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckIcon className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleReject(request.id)}
                  disabled={isProcessing}
                  title="Decline"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
