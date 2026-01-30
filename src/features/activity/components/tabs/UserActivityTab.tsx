/**
 * UserActivityTab Component
 * 
 * Login activity, permission changes, and user management events.
 * Migrated from SecuritySettings audit log section.
 */

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Users, LogIn, Shield, UserPlus, Key, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { useActivityLogs } from '../../hooks';
import { ActivityTable, StatusBadge } from '../ActivityTable';
import { ActivityFiltersPanel } from '../ActivityFilters';
import { formatDate, DATE_FORMATS } from '@shared/utils/date';
import { UserActivityLog, ActivityFilters } from '../../types/activity.types';

const USER_EVENT_TYPES = [
  'login_success',
  'login_failed',
  'logout',
  'password_changed',
  'password_reset_requested',
  'user_created',
  'user_invited',
  'user_accepted_invite',
  'user_deactivated',
  'user_reactivated',
  'role_assigned',
  'role_removed',
  'permission_changed',
  'session_created',
  'session_expired',
];

function createUserColumns(): ColumnDef<UserActivityLog>[] {
  return [
    {
      accessorKey: 'timestamp',
      header: 'Timestamp',
      cell: ({ row }) => (
        <span className="font-mono text-xs whitespace-nowrap">
          {formatDate(row.getValue('timestamp'), DATE_FORMATS.DATETIME)}
        </span>
      ),
    },
    {
      accessorKey: 'event_type',
      header: 'Event',
      cell: ({ row }) => {
        const eventType = row.getValue('event_type') as string;
        const icons: Record<string, any> = {
          login_success: LogIn,
          login_failed: LogIn,
          user_invited: UserPlus,
          role_assigned: Shield,
          password_changed: Key,
        };
        const Icon = icons[eventType] || Users;
        
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="capitalize">
              {eventType.replace(/_/g, ' ')}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'user_email',
      header: 'User',
      cell: ({ row }) => {
        const email = row.original.user_email;
        const targetEmail = row.original.target_user_email;
        return (
          <div>
            <p className="font-medium">{email || 'System'}</p>
            {targetEmail && targetEmail !== email && (
              <p className="text-xs text-muted-foreground">Target: {targetEmail}</p>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'ip_address',
      header: 'IP Address',
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.ip_address || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) => {
        const location = row.original.location;
        if (!location) return <span className="text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{location}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.original.role;
        if (!role) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge variant="secondary" className="capitalize">
            {role.replace('_', ' ')}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];
}

interface UserActivityTabProps {
  filters: ActivityFilters;
  onFilterChange: (filters: Partial<ActivityFilters>) => void;
}

export function UserActivityTab({ filters, onFilterChange }: UserActivityTabProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useActivityLogs({
    category: 'user',
    filters,
    page,
    pageSize,
  });

  const userLogs = (data?.data || []) as UserActivityLog[];

  // Calculate stats
  const stats = {
    logins: userLogs.filter(l => l.event_type === 'login_success').length,
    failedLogins: userLogs.filter(l => l.event_type === 'login_failed').length,
    invites: userLogs.filter(l => l.event_type === 'user_invited').length,
    roleChanges: userLogs.filter(l => l.event_type === 'role_assigned' || l.event_type === 'role_removed').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Successful Logins</p>
                <p className="text-2xl font-bold text-green-500">{stats.logins}</p>
              </div>
              <LogIn className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Logins</p>
                <p className="text-2xl font-bold text-red-500">{stats.failedLogins}</p>
              </div>
              <LogIn className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Invitations Sent</p>
                <p className="text-2xl font-bold">{stats.invites}</p>
              </div>
              <UserPlus className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Role Changes</p>
                <p className="text-2xl font-bold">{stats.roleChanges}</p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User & Access Activity</CardTitle>
              <CardDescription>
                Login attempts, permission changes, and user management
              </CardDescription>
            </div>
            <ActivityFiltersPanel
              filters={filters}
              onFilterChange={onFilterChange}
              availableEventTypes={USER_EVENT_TYPES}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ActivityTable
            data={userLogs}
            columns={createUserColumns()}
            pagination={data?.pagination}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
            emptyMessage="No user activity"
            emptyDescription="Login attempts and user management events will appear here."
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default UserActivityTab;
