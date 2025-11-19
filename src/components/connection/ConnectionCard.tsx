import { Edit, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CONNECTION_ICONS } from '@/constants/connection-icons';
import type { StoredConnectionProfile } from '@/types/connection';
import { getAuthMethod, isSSHConfig } from '@/types/connection';
import { formatDistanceToNow } from 'date-fns';

interface ConnectionCardProps {
  profile: StoredConnectionProfile;
  onConnect: (profileId: string) => void;
  onEdit: (profileId: string) => void;
  onDelete: (profileId: string) => void;
}

/**
 * Connection Card Component
 *
 * Displays a connection profile with actions (connect, edit, delete)
 * Shows auth method, last used time, and connection details
 */
export function ConnectionCard({ profile, onConnect, onEdit, onDelete }: ConnectionCardProps) {
  const Icon = CONNECTION_ICONS[profile.type];

  // Get auth method label for SSH connections
  const getAuthMethodLabel = () => {
    if (profile.type === 'ssh' && isSSHConfig(profile.config)) {
      const authMethod = getAuthMethod(profile.config);
      switch (authMethod) {
        case 'password':
          return 'Password';
        case 'privateKey':
          return 'Private Key';
        case 'noAuth':
          return 'Interactive';
        default:
          return 'Unknown';
      }
    }
    return null;
  };

  // Get connection details based on type
  const getConnectionDetails = () => {
    if (profile.type === 'ssh' && isSSHConfig(profile.config)) {
      return `${profile.config.username}@${profile.config.host}`;
    }
    // Add other connection types here as needed
    return profile.name;
  };

  // Format last used time
  const getLastUsedLabel = () => {
    if (!profile.lastUsed) return 'Never';
    try {
      return formatDistanceToNow(new Date(profile.lastUsed), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  const authMethodLabel = getAuthMethodLabel();
  const connectionDetails = getConnectionDetails();
  const lastUsedLabel = getLastUsedLabel();

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
            <h3 className="font-semibold truncate">{profile.name}</h3>
          </div>
          <Badge variant="secondary" className="ml-2 shrink-0">
            {profile.type.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3 space-y-2">
        {/* Connection details */}
        <p className="text-sm text-muted-foreground truncate">{connectionDetails}</p>

        {/* Port and Auth Method */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {profile.type === 'ssh' && isSSHConfig(profile.config) && (
            <>
              <span>Port {profile.config.port}</span>
              {authMethodLabel && (
                <>
                  <span>•</span>
                  <span>{authMethodLabel}</span>
                </>
              )}
            </>
          )}
        </div>

        {/* Last used */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{lastUsedLabel}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-3 gap-2">
        <Button size="sm" className="flex-1" onClick={() => onConnect(profile.id)}>
          Connect
        </Button>
        <Button size="sm" variant="outline" onClick={() => onEdit(profile.id)}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => onDelete(profile.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
