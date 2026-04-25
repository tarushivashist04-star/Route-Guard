import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, Users, AlertTriangle, Route, LogOut, Plus, Edit2, Trash2, Star, Eye, RefreshCw, Activity, MapPin, Clock, X, Truck, TrendingUp, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getDrivers, createDriver, updateDriver, deleteDriver, getDashboardStats, getIssues, getAllRoutes } from '../api/client';
import toast from 'react-hot-toast';

/* ── STAT CARD ── */
function StatCard({ icon, label, value, color, bg }) {
  return (
    <div className="stat-card">
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
        <span className="stat-label">{label}</span>
        <div className="stat-icon" style={{ background:bg }}>{React.cloneElement(icon,{size:18,color})}</div>
      </div>
      <div className="stat-value">{value??'—'}</div>
    </div>
  );
}

/* ── RISK BADGE ── */
function RiskBadge({ level }) {
  return <span className={`badge badge-${level==='high'?'danger':level==='medium'?'warning':'success'}`}>{level||'—'}</span>;
}

/* ── DRIVER MODAL ── */
function DriverModal({ driver, onClose, onSave }) {
  const [form, setForm] = useState(driver ? { name:driver.name, email:driver.email, vehicle_number:driver.vehicle_number, phone:driver.phone||'', license_number:driver.license_number||'' } : {});
  const [loading, setLoading] = useState(false);
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));

  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      if (driver) { await updateDriver(driver.driver_id, form); toast.success('Driver updated'); }
      else { await createDriver(form); toast.success('Driver created'); }
      onSave(); onClose();
    } catch(err) { toast.error(err.response?.data?.error||'Operation failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>{driver?'Edit Driver':'Create New Driver'}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={20}/></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {!driver && (
                <>
                  <div className="form-group">
                    <label className="form-label">Driver ID *</label>
                    <input className="form-input" placeholder="DRV-001" required value={form.driver_id||''} onChange={e=>upd('driver_id',e.target.value.toUpperCase())} style={{fontFamily:'monospace',letterSpacing:'2px',fontWeight:700}}/>
                    <small style={{color:'var(--text-muted)',fontSize:'0.72rem'}}>Unique ID used for driver login. Cannot be changed.</small>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password *</label>
                    <input className="form-input" type="password" placeholder="Set initial password" required value={form.password||''} onChange={e=>upd('password',e.target.value)}/>
                  </div>
                </>
              )}
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" placeholder="Driver's name" required value={form.name||''} onChange={e=>upd('name',e.target.value)}/>
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" placeholder="driver@company.com" required value={form.email||''} onChange={e=>upd('email',e.target.value)}/>
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle Number *</label>
                <input className="form-input" placeholder="MH-12-AB-1234" required value={form.vehicle_number||''} onChange={e=>upd('vehicle_number',e.target.value.toUpperCase())}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="+91 98..." value={form.phone||''} onChange={e=>upd('phone',e.target.value)}/></div>
                <div className="form-group"><label className="form-label">License No.</label><input className="form-input" placeholder="DL-..." value={form.license_number||''} onChange={e=>upd('license_number',e.target.value)}/></div>
              </div>
              {driver && (
                <div className="form-group">
                  <label className="form-label">New Password (leave blank to keep)</label>
                  <input className="form-input" type="password" placeholder="Enter to change password" value={form.password||''} onChange={e=>upd('password',e.target.value)}/>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading?<><span className="spinner" style={{borderColor:'rgba(26,28,58,0.2)',borderTopColor:'var(--indigo-900)'}}/>Saving...</>:(driver?'Update Driver':'Create Driver')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── MAIN ── */
export default function ManagerDashboard() {
  const { user, logout, socket } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [viewDriver, setViewDriver] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [sr, dr] = await Promise.all([getDashboardStats(), getDrivers()]);
      setStats(sr.data); setDrivers(dr.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const loadIssues = useCallback(async () => { try { const r = await getIssues(); setIssues(r.data); } catch(_){} }, []);
  const loadRoutes = useCallback(async () => { try { const r = await getAllRoutes(); setRoutes(r.data); } catch(_){} }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if(tab==='issues') loadIssues(); if(tab==='routes') loadRoutes(); }, [tab, loadIssues, loadRoutes]);

  useEffect(() => {
    if (!socket) return;
    socket.on('dashboard_update', s => setStats(p => p ? { ...p, stats: s } : p));
    socket.on('new_issue', issue => { toast.error(`⚠️ ${issue.issue_type} at ${issue.area_name}`,{duration:5000}); setIssues(p=>[issue,...p]); loadData(); });
    socket.on('route_update', u => { toast.success(`🚛 ${u.driverName} → ${u.route_name}`); loadData(); });
    socket.on('route_completed', d => { toast.success(`✅ ${d.driverName} completed route`); loadData(); });
    return () => { socket.off('dashboard_update'); socket.off('new_issue'); socket.off('route_update'); socket.off('route_completed'); };
  }, [socket, loadData]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete driver ${name}?`)) return;
    try { await deleteDriver(id); toast.success('Driver deleted'); loadData(); }
    catch(err) { toast.error(err.response?.data?.error||'Delete failed'); }
  };

  if (loading) return (
    <div className="loading-page">
      <div className="spinner" style={{width:40,height:40,borderWidth:3}}/>
      <span style={{color:'var(--text-on-hero-muted)',fontWeight:600}}>Loading RouteGuard AI...</span>
    </div>
  );

  const s = stats?.stats || {};
  const navItems = [
    { id:'overview', label:'Overview',  icon:<LayoutDashboard size={18}/> },
    { id:'drivers',  label:'Drivers',   icon:<Users size={18}/> },
    { id:'issues',   label:'Issues',    icon:<AlertTriangle size={18}/> },
    { id:'routes',   label:'Routes',    icon:<Route size={18}/> },
  ];

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'var(--bg-page)'}}>
      {/* Sidebar */}
      <aside className="sidenav">
        <div className="sidenav-logo">
          <div style={{width:32,height:32,borderRadius:8,background:'rgba(245,200,66,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Truck size={16} color="var(--gold-400)"/>
          </div>
          <span>RouteGuard <span style={{color:'var(--gold-400)'}}>AI</span></span>
        </div>

        <div style={{padding:'0 10px',flex:1}}>
          {navItems.map(n => (
            <button key={n.id} className={`sidenav-item ${tab===n.id?'active':''}`} onClick={()=>setTab(n.id)}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>

        {/* User info at bottom */}
        <div style={{padding:'16px 20px',borderTop:'1px solid rgba(255,255,255,0.08)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
            <div style={{width:34,height:34,borderRadius:'50%',background:'rgba(245,200,66,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,color:'var(--gold-400)',fontSize:'0.875rem'}}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{fontWeight:700,fontSize:'0.84rem',color:'white',lineHeight:1.2}}>{user?.name}</div>
              <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.4)',marginTop:1}}>Fleet Manager</div>
            </div>
          </div>
          <button onClick={logout} style={{display:'flex',alignItems:'center',gap:8,color:'rgba(255,255,255,0.5)',fontSize:'0.8rem',fontWeight:600,background:'none',border:'none',cursor:'pointer',width:'100%',fontFamily:'var(--font-body)'}}>
            <LogOut size={14}/> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{flex:1,overflowY:'auto',minHeight:'100vh'}}>
        {/* Content header */}
        <div style={{padding:'24px 32px 0',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid var(--border-subtle)',paddingBottom:20,background:'white',position:'sticky',top:0,zIndex:10,boxShadow:'var(--shadow-xs)'}}>
          <div>
            <div style={{fontFamily:'var(--font-heading)',fontWeight:900,fontSize:'1.3rem',letterSpacing:'-0.4px'}}>{navItems.find(n=>n.id===tab)?.label}</div>
            <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:2}}>
              {tab==='overview'?`Fleet operational status · ${new Date().toLocaleDateString('en-IN',{weekday:'long',month:'long',day:'numeric'})}`:''}
              {tab==='drivers'?`${drivers.length} drivers registered`:''}
              {tab==='issues'?'All driver-reported road conditions':''}
              {tab==='routes'?'Live active routes':''}
            </div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-secondary btn-sm" onClick={()=>{setRefreshing(true);loadData();if(tab==='issues')loadIssues();if(tab==='routes')loadRoutes();}}>
              <RefreshCw size={14} style={{animation:refreshing?'spin 0.7s linear infinite':''}}/>
            </button>
            {tab==='drivers' && (
              <button className="btn btn-primary btn-sm" onClick={()=>{setEditDriver(null);setShowModal(true);}}>
                <Plus size={14}/> Add Driver
              </button>
            )}
          </div>
        </div>

        <div style={{padding:32}}>
          {/* ── OVERVIEW ── */}
          {tab==='overview' && (
            <div style={{display:'flex',flexDirection:'column',gap:24}}>
              <div className="stats-grid">
                <StatCard icon={<Users/>}        label="Total Drivers"  value={s.totalDrivers}     color="#5558b8" bg="var(--indigo-100)"/>
                <StatCard icon={<Activity/>}     label="Active Drivers" value={s.activeDrivers}    color="#3dba7e" bg="#d1fae5"/>
                <StatCard icon={<AlertTriangle/>}label="Active Issues"  value={s.activeIssues}     color="#e8555a" bg="#fee2e2"/>
                <StatCard icon={<Route/>}        label="Active Routes"  value={s.activeRoutes}     color="#5b8dee" bg="#dbeafe"/>
                <StatCard icon={<Bell/>}         label="Unread Alerts"  value={s.unresolvedAlerts} color="#f5a623" bg="#fef3c7"/>
                <StatCard icon={<TrendingUp/>}   label="High-Risk Routes" value={s.highRiskRoutes} color="#e8555a" bg="#fee2e2"/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
                {/* Recent Issues */}
                <div className="card" style={{padding:20}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <div style={{fontFamily:'var(--font-heading)',fontWeight:800,fontSize:'0.94rem'}}>Recent Issues</div>
                    <AlertTriangle size={16} color="var(--color-danger)"/>
                  </div>
                  {(stats?.recentIssues||[]).length===0 ? (
                    <div className="empty-state" style={{padding:'20px 0'}}>
                      <div style={{fontSize:'0.84rem',color:'var(--text-muted)'}}>No active issues</div>
                    </div>
                  ) : (
                    <div className="scrollable-list">
                      {(stats?.recentIssues||[]).map(i => (
                        <div key={i.id} className="alert-card" style={{padding:'12px 14px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                            <div>
                              <span className={`badge badge-${i.issue_type==='accident'?'danger':i.issue_type==='traffic'?'warning':'info'}`} style={{marginBottom:4,display:'inline-block'}}>{i.issue_type}</span>
                              <div style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{i.driver_name} · {i.area_name}</div>
                            </div>
                            <span style={{fontSize:'0.68rem',color:'var(--text-muted)',flexShrink:0}}>{new Date(i.created_at).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Drivers */}
                <div className="card" style={{padding:20}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <div style={{fontFamily:'var(--font-heading)',fontWeight:800,fontSize:'0.94rem'}}>Top Drivers</div>
                    <Star size={16} color="var(--gold-500)"/>
                  </div>
                  {(stats?.topDrivers||[]).length===0 ? (
                    <div className="empty-state" style={{padding:'20px 0'}}><div style={{fontSize:'0.84rem',color:'var(--text-muted)'}}>No driver data yet</div></div>
                  ) : (
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {(stats?.topDrivers||[]).map((d,i)=>(
                        <div key={d.driver_id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:10,background:'var(--bg-soft)',border:'1px solid var(--border-subtle)'}}>
                          <div style={{width:26,height:26,borderRadius:'50%',background:i===0?'var(--gold-400)':i===1?'#94a3b8':'#cd7c3d',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.7rem',fontWeight:900,color:i===0?'var(--indigo-900)':'white'}}>#{i+1}</div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:700,fontSize:'0.84rem'}}>{d.name}</div>
                            <div style={{fontSize:'0.7rem',color:'var(--text-muted)',fontFamily:'monospace'}}>{d.driver_id}</div>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontWeight:900,color:'var(--indigo-600)',fontFamily:'var(--font-heading)',fontSize:'0.94rem'}}>{d.points}pts</div>
                            <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}><Star size={10} style={{display:'inline'}}/> {d.trust_score?.toFixed(1)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Risk breakdown */}
              {stats?.riskBreakdown?.length > 0 && (
                <div className="card" style={{padding:20}}>
                  <div style={{fontFamily:'var(--font-heading)',fontWeight:800,marginBottom:14}}>Route Risk Breakdown</div>
                  <div className="stats-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
                    {stats.riskBreakdown.map(r=>(
                      <div key={r.risk_level} style={{textAlign:'center',padding:'16px',borderRadius:12,border:'1px solid var(--border-subtle)',background:r.risk_level==='high'?'#fff8f8':r.risk_level==='medium'?'#fffdf0':'#f0fff4'}}>
                        <div style={{fontSize:'2.5rem',fontWeight:900,fontFamily:'var(--font-heading)',letterSpacing:'-2px',color:r.risk_level==='high'?'#dc2626':r.risk_level==='medium'?'#92400e':'#065f46'}}>{r.count}</div>
                        <div style={{fontSize:'0.72rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.5px',marginTop:4,color:'var(--text-muted)'}}>{r.risk_level} Risk</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── DRIVERS ── */}
          {tab==='drivers' && (
            <div>
              {drivers.length===0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon"><Users size={28}/></div><div className="empty-state-title">No drivers yet</div><div className="empty-state-desc">Create your first driver account to get started</div><button className="btn btn-primary" onClick={()=>setShowModal(true)}><Plus size={14}/> Add Driver</button></div></div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>Driver</th><th>Vehicle</th><th>Status</th><th>Route</th><th>Points</th><th>Trust</th><th>Actions</th></tr></thead>
                    <tbody>
                      {drivers.map(d=>(
                        <tr key={d.driver_id}>
                          <td>
                            <div style={{fontWeight:700}}>{d.name}</div>
                            <div style={{fontSize:'0.72rem',color:'var(--text-muted)',fontFamily:'monospace',letterSpacing:'1px'}}>{d.driver_id}</div>
                          </td>
                          <td><span style={{fontFamily:'monospace',fontWeight:700,fontSize:'0.84rem'}}>{d.vehicle_number}</span></td>
                          <td><div style={{display:'flex',alignItems:'center',gap:6}}><span className={`status-dot ${d.status}`}/><span style={{textTransform:'capitalize',fontSize:'0.84rem'}}>{d.status}</span></div></td>
                          <td style={{fontSize:'0.84rem',color:d.current_route?'var(--text-primary)':'var(--text-muted)'}}>{d.current_route||'No active route'}</td>
                          <td><span style={{fontWeight:900,fontFamily:'var(--font-heading)',color:'var(--indigo-600)'}}>{d.points}</span></td>
                          <td><div style={{display:'flex',alignItems:'center',gap:4}}><Star size={12} color="var(--gold-500)"/><span style={{fontWeight:700}}>{d.trust_score?.toFixed(1)}</span></div></td>
                          <td>
                            <div style={{display:'flex',gap:6}}>
                              <button className="btn btn-secondary btn-sm" onClick={()=>setViewDriver(d)} title="View"><Eye size={13}/></button>
                              <button className="btn btn-secondary btn-sm" onClick={()=>{setEditDriver(d);setShowModal(true);}} title="Edit"><Edit2 size={13}/></button>
                              <button className="btn btn-danger btn-sm" onClick={()=>handleDelete(d.driver_id,d.name)} title="Delete"><Trash2 size={13}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── ISSUES ── */}
          {tab==='issues' && (
            <div>
              {issues.length===0 ? (
                <div className="card"><div className="empty-state"><div className="empty-state-icon"><AlertTriangle size={28}/></div><div className="empty-state-title">No issues reported</div><div className="empty-state-desc">Driver-submitted road reports will appear here</div></div></div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>Type</th><th>Driver</th><th>Location</th><th>Status</th><th>Verified</th><th>Time</th></tr></thead>
                    <tbody>
                      {issues.map(i=>(
                        <tr key={i.id}>
                          <td><span className={`badge badge-${i.issue_type==='accident'?'danger':i.issue_type==='traffic'?'warning':'info'}`}>{i.issue_type}</span></td>
                          <td><div style={{fontWeight:700,fontSize:'0.84rem'}}>{i.driver_name}</div><div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{i.vehicle_number}</div></td>
                          <td style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}><MapPin size={11} style={{display:'inline',marginRight:3}}/>{i.area_name}</td>
                          <td><span className={`badge badge-${i.status==='active'?'warning':'neutral'}`}>{i.status}</span></td>
                          <td><span style={{color:'var(--color-success)',fontWeight:700,marginRight:8}}>✓{i.verified_count}</span><span style={{color:'var(--color-danger)',fontWeight:700}}>✗{i.false_count}</span></td>
                          <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}><Clock size={11} style={{display:'inline',marginRight:3}}/>{new Date(i.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── ROUTES ── */}
          {tab==='routes' && (
            routes.length===0 ? (
              <div className="card"><div className="empty-state"><div className="empty-state-icon"><Route size={28}/></div><div className="empty-state-title">No active routes</div><div className="empty-state-desc">Routes set by drivers appear here</div></div></div>
            ) : (
              <div className="cards-grid">
                {routes.map(r=>(
                  <div key={r.id} className="card" style={{padding:20}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                      <div>
                        <div style={{fontFamily:'var(--font-heading)',fontWeight:800}}>{r.route_name}</div>
                        <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginTop:3}}><Truck size={11} style={{display:'inline'}}/> {r.driver_name} · {r.vehicle_number}</div>
                      </div>
                      <RiskBadge level={r.risk_level}/>
                    </div>
                    {r.start_point&&<div style={{fontSize:'0.82rem',color:'var(--text-secondary)',marginBottom:8}}><MapPin size={11} style={{display:'inline'}}/> {r.start_point} → {r.end_point}</div>}
                    <div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}><Clock size={11} style={{display:'inline'}}/> Started {new Date(r.started_at).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>

      {showModal && <DriverModal driver={editDriver} onClose={()=>{setShowModal(false);setEditDriver(null);}} onSave={loadData}/>}

      {viewDriver && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setViewDriver(null)}>
          <div className="modal-content">
            <div className="modal-header"><h3>Driver Details</h3><button onClick={()=>setViewDriver(null)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={20}/></button></div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                {[['Driver ID',viewDriver.driver_id],['Full Name',viewDriver.name],['Email',viewDriver.email],['Vehicle',viewDriver.vehicle_number],['Phone',viewDriver.phone||'N/A'],['License',viewDriver.license_number||'N/A'],['Status',viewDriver.status],['Current Route',viewDriver.current_route||'None'],['Points',viewDriver.points],['Trust Score',`${viewDriver.trust_score?.toFixed(1)} / 10`],['Active Issues',viewDriver.active_issues],['Joined',new Date(viewDriver.created_at).toLocaleDateString()]].map(([l,v])=>(
                  <div key={l}><div style={{fontSize:'0.68rem',fontWeight:800,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.6px'}}>{l}</div><div style={{fontSize:'0.9rem',fontWeight:700,marginTop:4}}>{v}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
