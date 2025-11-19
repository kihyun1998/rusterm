import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
      <div className="flex items-center gap-4 p-4">
        {/* Left: Icon + Name + Details */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-semibold truncate">{profile.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{connectionDetails}</p>
          </div>
        </div>

        {/* Middle: Metadata (Type, Port, Auth, Last Used) */}
        <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
          <Badge variant="secondary" className="shrink-0">
            {profile.type.toUpperCase()}
          </Badge>
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
          <span>•</span>
          <span>{lastUsedLabel}</span>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={() => onConnect(profile.id)}>
            Connect
          </Button>
          <Button size="sm" variant="outline" onClick={() => onEdit(profile.id)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onDelete(profile.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
