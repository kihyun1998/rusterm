import { ChevronDown } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { getUniqueProfileName } from '@/lib/utils';
import { useConnectionProfileStore } from '@/stores/use-connection-profile-store';
import type { ConnectionProfile, SFTPConfig } from '@/types/connection';

/**
 * Props for SFTPSessionForm component
 */
interface SFTPSessionFormProps {
  onConnect?: (profileId: string) => void;
  onCancel?: () => void;
  initialConfig?: Partial<SFTPConfig>;
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
  profileName: string;
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
 * SFTP Session Form Component
 * Form for creating SFTP connections
 */
export function SFTPSessionForm({ onConnect, onCancel, initialConfig }: SFTPSessionFormProps) {
  // Form state
  const [formState, setFormState] = useState<FormState>({
    host: initialConfig?.host || '',
    port: initialConfig?.port || 22,
    username: initialConfig?.username || '',
    authMethod: initialConfig?.privateKey ? 'privateKey' : 'password',
    password: '',
    privateKeyPath: initialConfig?.privateKey || '',
    passphrase: '',
    profileName: initialConfig?.host || '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isConnecting, setIsConnecting] = useState(false);

  // Store
  const addProfile = useConnectionProfileStore((state) => state.addProfile);
  const getAllProfiles = useConnectionProfileStore((state) => state.getAllProfiles);

  /**
   * Handle field change
   */
  const handleFieldChange = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((prev) => {
      const updates: Partial<FormState> = { [field]: value };

      // Auto-update profileName when host changes
      if (field === 'host' && typeof value === 'string') {
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
      password: method === 'password' ? prev.password : '',
      privateKeyPath: method === 'privateKey' ? prev.privateKeyPath : '',
      passphrase: method === 'privateKey' ? prev.passphrase : '',
    }));

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

    if (!formState.host.trim()) {
      newErrors.host = 'Host is required';
    }

    if (formState.port < 1 || formState.port > 65535) {
      newErrors.port = 'Port must be between 1 and 65535';
    }

    if (!formState.username.trim()) {
      newErrors.username = 'Username is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle connect button click
   */
  const handleConnect = async () => {
    if (!validateForm()) {
      toast.error('Validation Error', {
        description: 'Please check all required fields',
      });
      return;
    }

    setIsConnecting(true);

    try {
      // Create profile
      const baseName = formState.profileName.trim() || formState.host;
      const uniqueName = getUniqueProfileName(baseName, getAllProfiles());

      const newProfile: ConnectionProfile = {
        id: crypto.randomUUID(),
        name: uniqueName,
        type: 'sftp',
        config: {
          host: formState.host,
          port: formState.port,
          username: formState.username,
        },
        savedAuthType: (() => {
          if (formState.authMethod === 'password' && formState.password) {
            return 'password';
          } else if (formState.authMethod === 'privateKey' && formState.privateKeyPath) {
            if (formState.passphrase) {
              return 'passphrase';
            } else {
              return 'privateKey';
            }
          } else {
            return 'interactive';
          }
        })(),
        createdAt: Date.now(),
      };

      const profileId = await addProfile(newProfile);

      // Save credentials to keyring
      try {
        const { saveCredential } = await import('@/lib/keyring');

        if (formState.authMethod === 'password' && formState.password) {
          await saveCredential(profileId, 'sftp', 'password', formState.password);
        }

        if (formState.authMethod === 'privateKey' && formState.privateKeyPath) {
          await saveCredential(profileId, 'sftp', 'privatekey', formState.privateKeyPath);
        }

        if (formState.passphrase) {
          await saveCredential(profileId, 'sftp', 'passphrase', formState.passphrase);
        }
      } catch (error) {
        console.error('Failed to save credentials to keyring:', error);
      }

      onConnect?.(profileId);

      toast.success('Connecting...', {
        description: `Connecting to ${formState.username}@${formState.host} via SFTP`,
      });
    } catch (error) {
      console.error('SFTP connection error:', error);
      toast.error('Connection Failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  /**
   * Reset form
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
      profileName: initialConfig?.host || '',
    });
    setErrors({});
    setIsConnecting(false);
  }, [initialConfig]);

  // Reset when initialConfig changes
  useEffect(() => {
    resetForm();
  }, [resetForm]);

  return (
    <div className="space-y-4 py-4">
      {/* Host & Port (Grid) */}
      <div className="grid grid-cols-[1fr_auto] gap-4">
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
        <div className="space-y-2 w-24">
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
      </div>

      {/* Username */}
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

      {/* Auth Method Selector */}
      <div className="space-y-2">
        <Label htmlFor="authMethod">Authentication Method</Label>
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

      {/* Profile Name (Collapsible) */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-foreground/80 transition-colors">
          <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
          Advanced Options
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
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
        </CollapsibleContent>
      </Collapsible>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isConnecting}>
          Cancel
        </Button>
        <Button onClick={handleConnect} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </Button>
      </div>
    </div>
  );
}
