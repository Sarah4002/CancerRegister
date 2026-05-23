import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services/notificationService';

const TYPE_ICONS = {
  rcp_invite:    'M',   // meeting
  rcp_demarre:   'D',
  rcp_terminee:  'T',
  nouveau_msg:   'C',   // chat
  new_decision:  'D',
  dossier_ajoute:'F',   // file
};

const TYPE_COLORS = {
  rcp_invite:    '#2563eb',
  rcp_demarre:   '#16a34a',
  rcp_terminee:  '#6b7280',
  nouveau_msg:   '#7c3aed',
  new_decision:  '#d97706',
  dossier_ajoute:'#0891b2',
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)  return 'à l\'instant';
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return `il y a ${Math.floor(diff / 86400)} j`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen]               = useState(false);
  const [count, setCount]             = useState(0);
  const [notifications, setNotifs]    = useState([]);
  const [loading, setLoading]         = useState(false);
  const panelRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const { data } = await notificationService.nonLues();
      setCount(data.count || 0);
      setNotifs(data.notifications || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchCount();
    // Poll toutes les 30 secondes
    intervalRef.current = setInterval(fetchCount, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchCount]);

  // Fermer si clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen(o => !o);
  };

  const handleMarquerLue = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationService.marquerLue(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, lue: true } : n));
      setCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleToutLire = async () => {
    try {
      await notificationService.toutMarquerLues();
      setNotifs(prev => prev.map(n => ({ ...n, lue: true })));
      setCount(0);
    } catch {}
  };

  const handleClickNotif = async (notif) => {
    if (!notif.lue) {
      await notificationService.marquerLue(notif.id).catch(() => {});
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, lue: true } : n));
      setCount(prev => Math.max(0, prev - 1));
    }
    setOpen(false);
    if (notif.reunion_id) {
      navigate(`/rcp/${notif.reunion_id}`);
    }
  };

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        title="Notifications"
        style={{
          position: 'relative',
          width: 36,
          height: 36,
          borderRadius: 8,
          background: open ? 'rgba(37,99,235,0.1)' : 'transparent',
          border: `1px solid ${open ? 'rgba(37,99,235,0.25)' : 'transparent'}`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(37,99,235,0.07)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <BellIcon active={count > 0} />
        {count > 0 && (
          <span style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            background: '#dc2626',
            color: '#fff',
            fontSize: 9,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            lineHeight: 1,
            border: '1.5px solid var(--bg-card, #fff)',
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 360,
          maxHeight: 480,
          background: '#ffffff',
          border: '1px solid rgba(37,99,235,0.12)',
          borderRadius: 14,
          boxShadow: '0 12px 40px rgba(15,23,42,0.18)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(37,99,235,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', fontFamily: 'var(--font-display)' }}>
                Notifications
              </div>
              {count > 0 && (
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                  {count} non lue{count > 1 ? 's' : ''}
                </div>
              )}
            </div>
            {count > 0 && (
              <button
                onClick={handleToutLire}
                style={{
                  padding: '4px 10px',
                  background: 'rgba(37,99,235,0.07)',
                  border: '1px solid rgba(37,99,235,0.15)',
                  borderRadius: 8,
                  color: '#2563eb',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Tout lire
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Aucune notification
              </div>
            ) : (
              notifications.map(notif => {
                const color = TYPE_COLORS[notif.type] || '#64748b';
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClickNotif(notif)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid rgba(37,99,235,0.07)',
                      cursor: 'pointer',
                      background: notif.lue ? 'transparent' : 'rgba(37,99,235,0.03)',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = notif.lue ? 'transparent' : 'rgba(37,99,235,0.03)'}
                  >
                    {/* Icon dot */}
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: color + '15',
                      border: `1px solid ${color}25`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 1,
                    }}>
                      <NotifTypeIcon type={notif.type} color={color} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12.5,
                        fontWeight: notif.lue ? 500 : 700,
                        color: '#0f172a',
                        lineHeight: 1.4,
                        marginBottom: 3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {notif.titre}
                      </div>
                      {notif.message && (
                        <div style={{
                          fontSize: 11,
                          color: '#64748b',
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {notif.message}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                        {timeAgo(notif.date_envoi)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      {!notif.lue && (
                        <span style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: '#2563eb',
                          flexShrink: 0,
                          marginTop: 3,
                        }} />
                      )}
                      {!notif.lue && (
                        <button
                          onClick={(e) => handleMarquerLue(notif.id, e)}
                          style={{
                            padding: '2px 6px',
                            background: 'transparent',
                            border: '1px solid rgba(37,99,235,0.2)',
                            borderRadius: 4,
                            color: '#2563eb',
                            fontSize: 9,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Lu
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid rgba(37,99,235,0.1)',
              background: '#f8fafc',
              textAlign: 'center',
            }}>
              <button
                onClick={() => { setOpen(false); navigate('/rcp'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Voir toutes les reunions RCP
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BellIcon({ active }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke={active ? '#2563eb' : 'var(--text-muted, #64748b)'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function NotifTypeIcon({ type, color }) {
  switch (type) {
    case 'rcp_invite':
    case 'rcp_demarre':
    case 'rcp_terminee':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'nouveau_msg':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'new_decision':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case 'dossier_ajoute':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      );
  }
}