import { Server } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useConnectionProfileStore } from '@/stores/use-connection-profile-store';
import type { ConnectionProfile, SSHConfig } from '@/types/connection';

/**
 * Props for SSHConnectionDialog component
 */
interface SSHConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect?: (config: SSHConfig, profileId: string) => void;
  initialConfig?: Partial<SSHConfig>;
}

/**
 * Auth method type for UI state
 */
type AuthMethodType = 'password' | 'privateKey';

/**
 * Form state interface
 */
interface FormState {
  host: string;
  port: number;
  username: string;
  authMethod: AuthMethodType;
  password: string;
  privateKeyPath: string;
  passphrase: string;
  profileName: string; // Default: host (auto-save enabled)
}

/**
 * Validation errors interface
 */
interface ValidationErrors {
  host?: string;
  port?: string;
  username?: string;
  password?: string;
  privateKeyPath?: string;
  profileName?: string;
}

/**
 * SSH Connection Dialog Component
 *
 * Provides a UI for connecting to SSH servers with password or private key authentication.
 * Supports saving connections as profiles for reuse.
 */
export function SSHConnectionDialog({
  open,
  onOpenChange,
  onConnect,
  initialConfig,
}: SSHConnectionDialogProps) {
  // Form state
  const [formState, setFormState] = useState<FormState>({
    host: initialConfig?.host || '',
    port: initialConfig?.port || 22,
    username: initialConfig?.username || '',
    authMethod: initialConfig?.privateKey ? 'privateKey' : 'password',
    password: '', // Never pre-fill for security
    privateKeyPath: initialConfig?.privateKey || '',
    passphrase: '',
    profileName: initialConfig?.host || '', // Default to host address
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isConnecting, setIsConnecting] = useState(false);

  // Store
  const addProfile = useConnectionProfileStore((state) => state.addProfile);

  /**
   * Handle field change
   */
  const handleFieldChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((prev) => {
      const updates: Partial<FormState> = { [field]: value };

      // Auto-update profileName when host changes (if profileName was auto-generated)
      if (field === 'host' && typeof value === 'string') {
        // Only auto-update if current profileName matches previous host or is empty
        if (!prev.profileName || prev.profileName === prev.host) {
          updates.profileName = value;
        }
      }

      return { ...prev, ...updates };
    });

    // Clear error for this field
    if (errors[field as keyof ValidationErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof ValidationErrors];
        return newErrors;
      });
    }
  };

  /**
   * Handle auth method change
   */
  const handleAuthMethodChange = (method: AuthMethodType) => {
    setFormState((prev) => ({
      ...prev,
      authMethod: method,
      // Clear opposite method fields
      password: method === 'password' ? prev.password : '',
      privateKeyPath: method === 'privateKey' ? prev.privateKeyPath : '',
      passphrase: method === 'privateKey' ? prev.passphrase : '',
    }));

    // Clear related errors
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.password;
      delete newErrors.privateKeyPath;
      return newErrors;
    });
  };

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Host validation
    if (!formState.host.trim()) {
      newErrors.host = 'Host is required';
    }

    // Port validation
    if (formState.port < 1 || formState.port > 65535) {
      newErrors.port = 'Port must be between 1 and 65535';
    }

    // Username validation
    if (!formState.username.trim()) {
      newErrors.username = 'Username is required';
    }

    // Auth method validation (optional - allows keyboard-interactive authentication)
    // No validation for password/privateKey - they are optional

    // No profile name validation needed - auto-save with host as default

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle connect button click
   */
  const handleConnect = async () => {
    // Validate
    if (!validateForm()) {
      toast.error('Validation Error', {
        description: 'Please check all required fields',
      });
      return;
    }

    setIsConnecting(true);

    try {
      // 1. Create UI config
      const uiConfig: SSHConfig = {
        host: formState.host,
        port: formState.port,
        username: formState.username,
        password: formState.authMethod === 'password' ? formState.password : undefined,
        privateKey: formState.authMethod === 'privateKey' ? formState.privateKeyPath : undefined,
        passphrase: formState.passphrase || undefined,
      };

      // 2. Auto-save profile (always create new profile)
      const newProfile: ConnectionProfile = {
        id: crypto.randomUUID(),
        name: formState.profileName.trim() || formState.host, // Default to host if empty
        type: 'ssh',
        config: {
          host: formState.host,
          port: formState.port,
          username: formState.username,
          // Don't include credentials in the profile - will save to keyring separately
        },
        createdAt: Date.now(),
      };

      // Create new profile
      const profileId = await addProfile(newProfile);

      console.log('New profile created with ID:', profileId);

      // Save credentials to keyring using the correct profile ID
      try {
        const { saveCredential } = await import('@/lib/keyring');

        if (formState.authMethod === 'password' && formState.password) {
          await saveCredential(profileId, 'ssh', 'password', formState.password);
          console.log('Saved password to keyring');
        }

        if (formState.authMethod === 'privateKey' && formState.privateKeyPath) {
          await saveCredential(profileId, 'ssh', 'privatekey', formState.privateKeyPath);
          console.log('Saved private key to keyring');
        }

        if (formState.passphrase) {
          await saveCredential(profileId, 'ssh', 'passphrase', formState.passphrase);
          console.log('Saved passphrase to keyring');
        }
      } catch (error) {
        console.error('Failed to save credentials to keyring:', error);
        // Continue anyway - profile is saved even if credentials fail
      }

      // 3. Notify parent with config and profileId
      onConnect?.(uiConfig, profileId);

      // 4. Close dialog
      onOpenChange(false);

      toast.success('Connecting...', {
        description: `Connecting to ${formState.username}@${formState.host}`,
      });
    } catch (error) {
      console.error('SSH connection error:', error);
      toast.error('Connection Failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Reset form when dialog closes
   */
  const resetForm = useCallback(() => {
    setFormState({
      host: initialConfig?.host || '',
      port: initialConfig?.port || 22,
      username: initialConfig?.username || '',
      authMethod: initialConfig?.privateKey ? 'privateKey' : 'password',
      password: '',
      privateKeyPath: initialConfig?.privateKey || '',
      passphrase: '',
      profileName: initialConfig?.host || '', // Default to host address
    });
    setErrors({});
    setIsConnecting(false);
  }, [initialConfig]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            SSH Connection
          </DialogTitle>
          <DialogDescription>Connect to a remote server via SSH</DialogDescription>
        </DialogHeader>

        {/* Form Fields */}
        <div className="space-y-4 py-4">
          {/* Host */}
          <div className="space-y-2">
            <Label htmlFor="host">
              Host <span className="text-destructive">*</span>
            </Label>
            <Input
              id="host"
              placeholder="192.168.1.100 or example.com"
              value={formState.host}
              onChange={(e) => handleFieldChange('host', e.target.value)}
              className={errors.host ? 'border-destructive' : ''}
              autoComplete="off"
            />
            {errors.host && <p className="text-sm text-destructive">{errors.host}</p>}
          </div>

          {/* Port & Username (Grid) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="port">
                Port <span className="text-destructive">*</span>
              </Label>
              <Input
                id="port"
                type="number"
                min="1"
                max="65535"
                value={formState.port}
                onChange={(e) => handleFieldChange('port', parseInt(e.target.value, 10) || 22)}
                className={`[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${errors.port ? 'border-destructive' : ''}`}
                autoComplete="off"
              />
              {errors.port && <p className="text-sm text-destructive">{errors.port}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                placeholder="user"
                value={formState.username}
                onChange={(e) => handleFieldChange('username', e.target.value)}
                className={errors.username ? 'border-destructive' : ''}
                autoComplete="off"
              />
              {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
            </div>
          </div>

          {/* Auth Method Selector */}
          <div className="space-y-2">
            <Label htmlFor="authMethod">
              Authentication Method <span className="text-destructive">*</span>
            </Label>
            <Select value={formState.authMethod} onValueChange={handleAuthMethodChange}>
              <SelectTrigger id="authMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="password">Password</SelectItem>
                <SelectItem value="privateKey">Private Key</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional: Password */}
          {formState.authMethod === 'password' && (
            <div className="space-y-2">
              <Label htmlFor="password">Password (Optional)</Label>
              <Input
                id="password"
                type="password"
                value={formState.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                className={errors.password ? 'border-destructive' : ''}
                autoComplete="off"
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
          )}

          {/* Conditional: Private Key */}
          {formState.authMethod === 'privateKey' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="privateKeyPath">Private Key Path (Optional)</Label>
                <Input
                  id="privateKeyPath"
                  placeholder="/home/user/.ssh/id_rsa"
                  value={formState.privateKeyPath}
                  onChange={(e) => handleFieldChange('privateKeyPath', e.target.value)}
                  className={errors.privateKeyPath ? 'border-destructive' : ''}
                  autoComplete="off"
                />
                {errors.privateKeyPath && (
                  <p className="text-sm text-destructive">{errors.privateKeyPath}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="passphrase">Passphrase (Optional)</Label>
                <Input
                  id="passphrase"
                  type="password"
                  placeholder="Leave empty if no passphrase"
                  value={formState.passphrase}
                  onChange={(e) => handleFieldChange('passphrase', e.target.value)}
                  autoComplete="off"
                />
              </div>
            </>
          )}

          {/* Separator */}
          <Separator />

          {/* Profile Name (Auto-save enabled) */}
          <div className="space-y-2">
            <Label htmlFor="profileName">Profile Name</Label>
            <Input
              id="profileName"
              placeholder={formState.host || 'Host address will be used'}
              value={formState.profileName}
              onChange={(e) => handleFieldChange('profileName', e.target.value)}
              className={errors.profileName ? 'border-destructive' : ''}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Default: host address. Customize to identify this connection easily.
            </p>
            {errors.profileName && <p className="text-sm text-destructive">{errors.profileName}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isConnecting}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
