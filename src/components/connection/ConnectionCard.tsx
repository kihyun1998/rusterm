import { Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CONNECTION_ICONS } from '@/constants/connection-icons';
import type { StoredConnectionProfile } from '@/types/connection';
import { isSSHConfig } from '@/types/connection';
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

  const connectionDetails = getConnectionDetails();
  const lastUsedLabel = getLastUsedLabel();

  return (
    <Card className="py-2 gap-2 hover:border-primary/50 transition-colors group cursor-pointer max-w-md">
      <div className="flex flex-col gap-2 px-3">
        {/* Top Row: Icon + Name + Type Badge */}
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h3 className="font-semibold text-sm truncate flex-1">{profile.name}</h3>
          <Badge variant="secondary" className="text-xs shrink-0">
            {profile.type.toUpperCase()}
          </Badge>
        </div>

        {/* Bottom Row: Connection details + Time */}
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground min-w-0">
          <span className="truncate">{connectionDetails}</span>
          <span className="shrink-0">{lastUsedLabel}</span>
        </div>

        {/* Hover Action Buttons - Show on hover */}
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => onConnect(profile.id)}>
            Connect
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => onEdit(profile.id)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={() => onDelete(profile.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
