import React, { useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, FileText, Wrench, Package, X } from 'lucide-react';
import { useFleet } from '../../context/FleetContext';

export const NotificationCenter: React.FC = () => {
  const { notifications, markNotificationRead } = useFleet();
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'WORK_ORDER': return <Wrench className="w-4 h-4 text-emerald-400" />;
      case 'DOCUMENT': return <FileText className="w-4 h-4 text-amber-400" />;
      case 'STOCK': return <Package className="w-4 h-4 text-rose-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 z-50 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold text-slate-100">System Alerts</h4>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-300 rounded-full">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No system notifications currently.
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`p-3.5 hover:bg-slate-800/50 transition cursor-pointer flex gap-3 ${
                      !n.is_read ? 'bg-slate-800/20' : 'opacity-70'
                    }`}
                  >
                    <div className="mt-0.5 p-2 bg-slate-800 rounded-lg shrink-0">
                      {getCategoryIcon(n.category)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-200">{n.title}</p>
                        {!n.is_read && (
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
