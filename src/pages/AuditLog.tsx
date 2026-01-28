import { useState } from 'react';
import { Search, History, User, Clock, FileText, Package, Users, CreditCard, ClipboardList, RotateCcw, Tag, Download, Printer, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { useAuditLogs, DbAuditLog } from '@/hooks/useDatabase';
import { formatDate } from '@/lib/format';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

type EntityType = DbAuditLog['entity_type'];
type ActionType = DbAuditLog['action'];

const entityIcons: Record<EntityType, typeof Package> = {
  PRODUCT: Package,
  CATEGORY: Tag,
  BATCH: Package,
  CUSTOMER: Users,
  SELLER: Users,
  INVOICE: FileText,
  PAYMENT: CreditCard,
  QUOTATION: ClipboardList,
  ADJUSTMENT: RotateCcw,
};

const actionColors: Record<ActionType, string> = {
  CREATE: 'badge-success',
  UPDATE: 'badge-info',
  DELETE: 'badge-danger',
};

export default function AuditLog() {
  const { data: auditLogs = [], isLoading } = useAuditLogs();
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      (log.entity_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.user_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    return matchesSearch && matchesEntity && matchesAction;
  });

  const sortedLogs = [...filteredLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const exportToCSV = () => {
    const headers = ['Date & Time', 'User', 'Action', 'Entity Type', 'Entity Name'];
    const rows = sortedLogs.map((log) => [
      formatDate(new Date(log.timestamp)),
      log.user_name || 'System',
      log.action,
      log.entity_type,
      log.entity_name || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Downloaded',
      description: `Exported ${sortedLogs.length} audit log entries`,
    });
  };

  const printAuditLog = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Audit Log - Gazi Laboratories Ltd.</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e3a5f; padding-bottom: 15px; }
          .header h1 { color: #1e3a5f; font-size: 18px; margin-bottom: 5px; }
          .header p { color: #666; font-size: 11px; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; color: #666; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1e3a5f; color: white; padding: 8px; text-align: left; font-size: 11px; }
          td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
          tr:nth-child(even) { background: #f9f9f9; }
          .action-create { color: #16a34a; font-weight: 600; }
          .action-update { color: #0284c7; font-weight: 600; }
          .action-delete { color: #dc2626; font-weight: 600; }
          .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Gazi Laboratories Ltd.</h1>
          <p>Audit Log Report</p>
        </div>
        <div class="meta">
          <span>Generated: ${new Date().toLocaleString('en-BD')}</span>
          <span>Total Entries: ${sortedLogs.length}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity Type</th>
              <th>Entity Name</th>
            </tr>
          </thead>
          <tbody>
            ${sortedLogs.map((log) => `
              <tr>
                <td>${formatDate(new Date(log.timestamp))}</td>
                <td>${log.user_name || 'System'}</td>
                <td class="action-${log.action.toLowerCase()}">${log.action}</td>
                <td>${log.entity_type}</td>
                <td>${log.entity_name || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Mamtaj Center, Islamiahat, Hathazari, Chattogram | +880 1987-501700</p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="text-muted-foreground">Track all changes made in the system</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportToCSV} disabled={sortedLogs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={printAuditLog} disabled={sortedLogs.length === 0}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <History className="w-4 h-4" />
        <span>{sortedLogs.length} entries {entityFilter !== 'all' || actionFilter !== 'all' ? '(filtered)' : ''}</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Entity Type" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="PRODUCT">Product</SelectItem>
            <SelectItem value="CATEGORY">Category</SelectItem>
            <SelectItem value="BATCH">Batch</SelectItem>
            <SelectItem value="CUSTOMER">Customer</SelectItem>
            <SelectItem value="SELLER">Seller</SelectItem>
            <SelectItem value="INVOICE">Invoice</SelectItem>
            <SelectItem value="PAYMENT">Payment</SelectItem>
            <SelectItem value="QUOTATION">Quotation</SelectItem>
            <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="CREATE">Create</SelectItem>
            <SelectItem value="UPDATE">Update</SelectItem>
            <SelectItem value="DELETE">Delete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Audit Log Table */}
      <DataTable
        columns={[
          {
            key: 'timestamp',
            header: 'Date & Time',
            render: (log) => (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{formatDate(new Date(log.timestamp))}</span>
              </div>
            ),
          },
          {
            key: 'user',
            header: 'User',
            render: (log) => (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="font-medium">{log.user_name || 'System'}</span>
              </div>
            ),
          },
          {
            key: 'action',
            header: 'Action',
            render: (log) => (
              <span className={actionColors[log.action] || 'badge-info'}>
                {log.action}
              </span>
            ),
          },
          {
            key: 'entity',
            header: 'Entity',
            render: (log) => {
              const Icon = entityIcons[log.entity_type] || Package;
              return (
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{log.entity_name || 'N/A'}</p>
                    <p className="text-xs text-muted-foreground">{log.entity_type}</p>
                  </div>
                </div>
              );
            },
          },
        ]}
        data={sortedLogs}
        keyExtractor={(log) => log.id}
        emptyMessage="No audit logs yet. Changes will appear here."
      />
    </div>
  );
}
