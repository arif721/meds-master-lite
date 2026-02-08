import { Plus, FileText, BarChart3, FlaskConical, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DashboardQuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: 'Create Sale', icon: <Plus className="w-4 h-4" />, path: '/sales', color: 'text-primary' },
    { label: 'Create Sample', icon: <FlaskConical className="w-4 h-4" />, path: '/samples', color: 'text-info' },
    { label: 'Add Stock', icon: <Package className="w-4 h-4" />, path: '/inventory', color: 'text-success' },
    { label: 'View P&L', icon: <FileText className="w-4 h-4" />, path: '/reports', color: 'text-warning' },
    { label: 'Store Report', icon: <BarChart3 className="w-4 h-4" />, path: '/stores', color: 'text-muted-foreground' },
  ];

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">⚡ Quick Actions</h3>
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => navigate(action.path)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border hover:bg-muted/50 transition-colors text-left"
          >
            <span className={action.color}>{action.icon}</span>
            <span className="text-sm font-medium text-foreground">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
