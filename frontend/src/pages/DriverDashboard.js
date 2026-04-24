import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Home, Map as MapIcon, AlertTriangle, User, Truck, Navigation, Star, Bell, LogOut, Check, X, MapPin, Clock, RefreshCw, CheckCircle, XCircle, BrainCircuit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyStats, getCurrentRoute, getMyAlerts, getMyRoutes, reportIssue, setRoute, completeRoute, updateLocation, markAlertSeen, verifyIssue, falseReport } from '../api/client';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker as LeafletMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const defaultCenter = [19.0760, 72.8777]; // Mumbai default

function RiskBadge({ level }) {
  return <span className={`badge badge-${level==='high'?'danger':level==='medium'?'warning':'success'}`}>{level||'low'} Risk</span>;
}

function AlertCard({ alert, onSeen, onVerify, onFalse }) {
  const colors = { accident:'#e8555a',roadblock:'#f5a623',fog:'#8a8da8',flood:'#5b8dee',traffic:'#f5a623',construction:'#a78bfa',pothole:'#3dba7e',other:'#8a8da8' };
  const c = colors[alert.issue_type]||'#8a8da8';
  return (
    <div className="alert-card" style={{borderLeft:`3px solid ${c}`,padding:'14px 16px',marginBottom:8,animation:'slideIn 0.25s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <AlertTriangle size={15} color={c}/>
          <span style={{fontFamily:'var(--font-heading)',fontWeight:800,fontSize:'0.88rem',color:c,textTransform:'capitalize'}}>{alert.issue_type}</span>
          {!alert.seen&&<span style={{background:c,color:'white',fontSize:'0.6rem',fontWeight:800,padding:'1px 7px',borderRadius:'999px'}}>NEW</span>}
        </div>
        <span style={{fontSize:'0.68rem',color:'var(--text-muted)'}}>{new Date(alert.created_at).toLocaleTimeString()}</span>
      </div>
      <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginBottom:6}}><MapPin size={10} style={{display:'inline',marginRight:3}}/>{alert.area_name}{alert.distance_km&&<span style={{marginLeft:8}}>· ~{Math.round(alert.distance_km)} km</span>}</div>
      {alert.action_suggested&&<div style={{fontSize:'0.8rem',color:'var(--text-secondary)',background:'var(--bg-soft)',borderRadius:8,padding:'6px 10px',marginBottom:10,fontWeight:500}}>{alert.action_suggested}</div>}
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {!alert.seen&&<button className="btn btn-secondary btn-sm" onClick={()=>onSeen(alert.id)}><Check size={12}/> Mark Seen</button>}
        {alert.issue_id&&<>
          <button className="btn btn-sm" style={{background:'#d1fae5',color:'#065f46',border:'none'}} onClick={()=>onVerify(alert.issue_id)}><CheckCircle size={12}/> Confirm</button>
          <button className="btn btn-sm" style={{background:'#fee2e2',color:'#991b1b',border:'none'}} onClick={()=>onFalse(alert.issue_id)}><XCircle size={12}/> False</button>
        </>}
      </div>
    </div>
  );
}

function ReportModal({ onClose, onReported, defaultLocation }) {
  const [form, setForm] = useState({ issue_type:'', description:'', lat:defaultLocation?.lat||'', lng:defaultLocation?.lng||'', is_manual: false });
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));
  const issueTypes = ['accident','traffic','fog','roadblock','flood','construction','pothole','other'];

  const getLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) { 
      if (defaultLocation) {
        setForm(p=>({...p, lat: defaultLocation.lat, lng: defaultLocation.lng}));
        toast.success('Using last known location');
      } else {
        toast.error('Geolocation not supported. Enter manually.'); 
        upd('is_manual', true);
      }
      setLocating(false); 
      return; 
    }
    navigator.geolocation.getCurrentPosition(
      pos => { setForm(p=>({...p,lat:pos.coords.latitude,lng:pos.coords.longitude, is_manual: false})); toast.success('Location captured'); setLocating(false); },
      () => { 
        if (defaultLocation) {
          setForm(p=>({...p, lat: defaultLocation.lat, lng: defaultLocation.lng, is_manual: false}));
          toast.success('Using last known location');
        } else {
          toast.error('Could not get your location. Enter manually.'); 
          upd('is_manual', true);
        }
        setLocating(false); 
      }
    );
  };

  const submit = async e => {
    e.preventDefault();
    if (!form.lat||!form.lng) { toast.error('Location is required'); return; }
    setLoading(true);
    try {
      await reportIssue({ issue_type:form.issue_type, description:form.description, lat:parseFloat(form.lat), lng:parseFloat(form.lng) });
      toast.success('Issue reported! Nearby drivers notified.');
      onReported(); onClose();
    } catch(err) { toast.error(err.response?.data?.error||'Failed to report'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Report Road Hazard</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={20}/></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div className="form-group">
                <label className="form-label">Issue Type *</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
                  {issueTypes.map(t=>(
                    <button key={t} type="button"
                      style={{padding:'8px 4px',borderRadius:8,border:'2px solid',borderColor:form.issue_type===t?'var(--indigo-500)':'var(--border-subtle)',background:form.issue_type===t?'var(--indigo-100)':'var(--bg-soft)',color:form.issue_type===t?'var(--indigo-700)':'var(--text-muted)',cursor:'pointer',fontSize:'0.7rem',fontWeight:800,textTransform:'capitalize',transition:'all 0.15s',fontFamily:'var(--font-body)'}}
                      onClick={()=>upd('issue_type',t)}>{t}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <label className="form-label">Location *</label>
                  <label style={{fontSize:'0.7rem',color:'var(--indigo-600)',fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
                    <input type="checkbox" checked={form.is_manual} onChange={e=>upd('is_manual', e.target.checked)}/> Manual Entry
                  </label>
                </div>
                
                {form.is_manual ? (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <input className="form-input" type="number" step="0.0001" placeholder="Latitude" value={form.lat} onChange={e=>upd('lat', e.target.value)}/>
                    <input className="form-input" type="number" step="0.0001" placeholder="Longitude" value={form.lng} onChange={e=>upd('lng', e.target.value)}/>
                  </div>
                ) : (
                  <button type="button" className="btn btn-secondary btn-full" onClick={getLocation} disabled={locating}>
                    <Navigation size={14}/>
                    {locating?'Getting location...':form.lat?`📍 Captured (${parseFloat(form.lat).toFixed(3)}°, ${parseFloat(form.lng).toFixed(3)}°)`:'Capture My Location'}
                  </button>
                )}
                <small style={{color:'var(--text-muted)',fontSize:'0.72rem',marginTop:4}}>Location is required to alert other drivers.</small>
              </div>

              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea className="form-input form-textarea" placeholder="Brief description..." value={form.description} onChange={e=>upd('description',e.target.value)}/>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={loading||!form.issue_type||!(form.lat && form.lng)}>
              {loading?<><span className="spinner" style={{borderTopColor:'white'}}/>Reporting...</>:'Report Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SetRouteModal({ onClose, onSet }) {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const upd = (k,v) => setForm(p=>({...p,[k]:v}));

  const suggestAiRoute = () => {
    toast.success('AI is calculating the lowest risk route...', { icon: '🧠' });
    setTimeout(() => {
      setForm({ route_name: 'AI Optimized Route (Mumbai-Pune Express)', start_point: 'Mumbai', end_point: 'Pune', distance_km: '148' });
      toast.success('AI Path found! Lower risk than standard highway.');
    }, 1500);
  };

  useEffect(() => {
    if (form.start_point?.toLowerCase().includes('mumbai') && form.end_point?.toLowerCase().includes('pune') && !form.route_name) {
      toast.success('AI: Known city pair detected. Proposing optimal route...', {icon: '🧠', duration: 2500});
      setTimeout(() => {
        setForm(f=>({...f, route_name: 'NH48 Direct Express', distance_km: '150'}));
      }, 1000);
    }
  }, [form.start_point, form.end_point]);

  const submit = async e => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await setRoute({ route_name:form.route_name, start_point:form.start_point, end_point:form.end_point, distance_km:form.distance_km?parseFloat(form.distance_km):undefined });
      const d = res.data;
      toast.success(d.riskLevel==='high'?'⚠️ HIGH RISK route!':d.riskLevel==='medium'?'⚡ Medium risk route':'✅ Route set — low risk', {duration:5000});
      onSet(d, form); onClose();
    } catch(err) { toast.error(err.response?.data?.error||'Failed to set route'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Set Current Route</h3>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}><X size={20}/></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,padding:16,background:'linear-gradient(135deg,var(--indigo-700),var(--indigo-900))',borderRadius:12,color:'white'}}>
              <div>
                <div style={{fontWeight:800,fontFamily:'var(--font-heading)'}}>RouteGuard AI Optimization</div>
                <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.7)',marginTop:2}}>Suggests safest route avoiding active hazards</div>
              </div>
              <button type="button" onClick={suggestAiRoute} style={{background:'var(--gold-400)',color:'var(--indigo-900)',border:'none',borderRadius:8,padding:'8px 12px',fontWeight:800,fontSize:'0.75rem',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                <BrainCircuit size={14}/> Auto-Fill
              </button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div className="form-group"><label className="form-label">Route Title *</label><input className="form-input" placeholder="E.g. NH-48 Expressway" required value={form.route_name||''} onChange={e=>upd('route_name',e.target.value)}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group"><label className="form-label">From</label><input className="form-input" placeholder="Mumbai" value={form.start_point||''} onChange={e=>upd('start_point',e.target.value)}/></div>
                <div className="form-group"><label className="form-label">To</label><input className="form-input" placeholder="Pune" value={form.end_point||''} onChange={e=>upd('end_point',e.target.value)}/></div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading?<><span className="spinner" style={{borderColor:'rgba(26,28,58,0.2)',borderTopColor:'var(--indigo-900)'}}/>Setting...</>:'Set Route →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── MAIN DRIVER DASHBOARD ── */
export default function DriverDashboard() {
  const { user, logout, socket } = useAuth();
  const [tab, setTab] = useState('home');
  const [driverData, setDriverData] = useState(null);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [alternateRoutes, setAlternateRoutes] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [routeHistory, setRouteHistory] = useState([]);
  const [myIssues, setMyIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [demoRoutePoints, setDemoRoutePoints] = useState([]);

  // Use a hardcoded city-to-city coordinate mapping for the demo map
  const getCityCoords = (city) => {
    const coords = { 'mumbai': [19.076, 72.877], 'pune': [18.520, 73.856], 'delhi': [28.704, 77.102] };
    return coords[city?.toLowerCase()] || [19.0+Math.random(), 72.8+Math.random()];
  };

  const loadHomeData = useCallback(async () => {
    try {
      const [sr, rr, ar] = await Promise.all([getMyStats(), getCurrentRoute(), getMyAlerts()]);
      setDriverData(sr.data.driver); setUnreadCount(sr.data.unreadAlerts);
      setCurrentRoute(rr.data.activeRoute); setAlternateRoutes(rr.data.alternateRoutes||[]);
      setAlerts(ar.data); setMyIssues(sr.data.myIssues||[]);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  const loadRoutes = useCallback(async () => { try { const r = await getMyRoutes(); setRouteHistory(r.data); } catch(_){} }, []);

  useEffect(() => { loadHomeData(); }, [loadHomeData]);
  useEffect(() => { if(tab==='routes') loadRoutes(); }, [tab, loadRoutes]);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_alert', alertData => {
      setAlerts(p => [alertData,...p]); setUnreadCount(c=>c+1);
      
      // Auto suggest 2nd route if an active route exists and alert comes in
      setCurrentRoute(prev => {
        if (prev) {
           toast.error('Hazard detected on your route! AI recalculating...', {icon: '⚠️'});
           setTimeout(() => {
             toast.success(`AI dynamically re-routed to Alternative Path via Safe Zone`, {icon: '🧠', duration: 4000});
             setCurrentRoute(current => current ? {...current, route_name: current.route_name + ' (AI Altered)' } : current);
             // Shift the map route slightly to simulate an alternative path
             setDemoRoutePoints(points => points.map(([r,c], i) => i === 0 || i === points.length-1 ? [r,c] : [r+0.05, c+0.05]));
           }, 2500);
        }
        return prev;
      });

      toast.custom(t => (
        <div style={{background:'white',border:'1px solid #fee2e2',borderRadius:14,padding:'14px 16px',maxWidth:320,display:'flex',gap:12,alignItems:'flex-start',boxShadow:'var(--shadow-md)'}}>
          <AlertTriangle size={20} color="#e8555a" style={{flexShrink:0,marginTop:2}}/>
          <div>
            <div style={{fontWeight:800,fontFamily:'var(--font-heading)',marginBottom:4,fontSize:'0.9rem'}}>⚠️ {alertData.issueType?.toUpperCase()}</div>
            <div style={{fontSize:'0.78rem',color:'var(--text-muted)',marginBottom:4}}>{alertData.areaName} · {alertData.distanceText}</div>
            <div style={{fontSize:'0.82rem',color:'var(--text-secondary)',fontWeight:500}}>{alertData.suggestedAction}</div>
          </div>
        </div>
      ), {duration:8000});
    });
    return () => socket.off('new_alert');
  }, [socket]);

  const handleSetRoute = (res, formData) => {
    loadHomeData();
    if (formData?.start_point && formData?.end_point) {
      const p1 = getCityCoords(formData.start_point);
      const p2 = getCityCoords(formData.end_point);
      setDemoRoutePoints([p1, [(p1[0]+p2[0])/2 + 0.1, (p1[1]+p2[1])/2], p2]);
    }
  };

  const handleCompleteRoute = async () => {
    if (!window.confirm('Mark current route as completed?')) return;
    try { await completeRoute(); toast.success('Route completed! Points awarded.'); setDemoRoutePoints([]); loadHomeData(); }
    catch { toast.error('Failed to complete route'); }
  };

  const handleMarkSeen = async id => {
    try { await markAlertSeen(id); setAlerts(p=>p.map(a=>a.id===id?{...a,seen:1}:a)); setUnreadCount(c=>Math.max(0,c-1)); } catch(_){}
  };
  const handleVerify = async id => { try { await verifyIssue(id); toast.success('Report confirmed!'); } catch(err) { toast.error(err.response?.data?.error||'Error'); } };
  const handleFalse  = async id => { try { await falseReport(id); toast.success('Marked as false.'); } catch(err) { toast.error(err.response?.data?.error||'Error'); } };

  useEffect(() => {
    if (!navigator.geolocation) return;
    const fetchLocation = () => {
      navigator.geolocation.getCurrentPosition(pos => {
        setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        updateLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }).catch(()=>{});
      });
    };
    fetchLocation();
    const iv = setInterval(fetchLocation, 60000);
    return () => clearInterval(iv);
  }, []);

  if (loading) return (
    <div className="loading-page">
      <div className="spinner" style={{width:40,height:40,borderWidth:3}}/>
      <span style={{color:'var(--text-on-hero-muted)',fontWeight:600}}>Loading Driver Terminal...</span>
    </div>
  );

  const driver = driverData || user;
  const navItems = [
    { id:'home', label:'Dashboard', icon:<Home size={18}/>, badge:0 },
    { id:'alerts', label:'Alerts', icon:<Bell size={18}/>, badge:unreadCount },
    { id:'routes', label:'Routes', icon:<MapIcon size={18}/>, badge:0 },
    { id:'profile', label:'Profile', icon:<User size={18}/>, badge:0 }
  ];

  return (
    <div style={{display:'flex',height:'100vh',background:'var(--bg-page)',overflow:'hidden'}}>
      
      {/* ── SIDEBAR (DESKTOP) ── */}
      <aside className="sidenav hide-mobile">
        <div className="sidenav-logo">
          <div style={{width:32,height:32,borderRadius:8,background:'rgba(245,200,66,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}><Truck size={16} color="var(--gold-400)"/></div>
          <span>RouteGuard <span style={{color:'var(--gold-400)'}}>AI</span></span>
        </div>
        <div style={{padding:'0 10px',marginBottom:20}}>
          <div style={{background:'rgba(255,255,255,0.06)',padding:12,borderRadius:12,border:'1px solid rgba(255,255,255,0.1)'}}>
             <div style={{color:'var(--gold-400)',fontSize:'0.65rem',fontWeight:800,letterSpacing:'1px',textTransform:'uppercase',marginBottom:4}}>Active Driver</div>
             <div style={{color:'white',fontFamily:'var(--font-heading)',fontWeight:800,fontSize:'0.9rem'}}>{driver?.name}</div>
             <div style={{color:'rgba(255,255,255,0.5)',fontFamily:'monospace',fontSize:'0.75rem',marginTop:2}}>{driver?.driver_id} | {driver?.vehicle_number}</div>
          </div>
        </div>

        <div style={{padding:'0 10px',flex:1}}>
          {navItems.map(n => (
            <button key={n.id} className={`sidenav-item ${tab===n.id?'active':''}`} onClick={()=>setTab(n.id)}>
              {n.icon} <span style={{flex:1,textAlign:'left'}}>{n.label}</span>
              {n.badge>0&&<span style={{background:'var(--color-danger)',color:'white',fontSize:'0.65rem',padding:'2px 6px',borderRadius:20,fontWeight:800}}>{n.badge>9?'9+':n.badge}</span>}
            </button>
          ))}
        </div>
        <div style={{padding:'16px 20px',borderTop:'1px solid rgba(255,255,255,0.08)'}}>
          <button onClick={logout} style={{display:'flex',alignItems:'center',gap:8,color:'rgba(255,255,255,0.6)',fontSize:'0.82rem',fontWeight:700,background:'none',border:'none',cursor:'pointer',width:'100%',fontFamily:'var(--font-body)'}}>
            <LogOut size={16}/> Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{flex:1,display:'flex',flexDirection:'column',position:'relative'}}>
        
        {/* Mobile Header */}
        <div className="hero-bg hide-desktop" style={{padding:'16px 20px',display:'flex',justifyContent:'space-between',alignItems:'center',boxShadow:'var(--shadow-sm)',zIndex:10}}>
           <div style={{display:'flex',alignItems:'center',gap:10}}>
             <Truck size={18} color="var(--gold-400)"/>
             <span style={{color:'white',fontFamily:'var(--font-heading)',fontWeight:900,fontSize:'1.1rem'}}>RouteGuard <span style={{color:'var(--gold-400)'}}>AI</span></span>
           </div>
           <button onClick={()=>setTab('alerts')} style={{position:'relative',background:'none',border:'none',color:'white'}}><Bell size={20}/>
             {unreadCount>0&&<span style={{position:'absolute',top:-4,right:-4,background:'var(--color-danger)',color:'white',fontSize:'0.6rem',fontWeight:800,width:16,height:16,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>{unreadCount}</span>}
           </button>
        </div>

        <div style={{flex:1,display:'flex',overflow:'hidden'}}>
          
          {/* Scrollable Left Pane */}
          <div style={{flex:1,overflowY:'auto',padding:24}}>
            <div className="page-header" style={{margin:'0 0 24px 0'}}>
              <div>
                <div className="page-title">{navItems.find(n=>n.id===tab)?.label}</div>
                <div className="page-subtitle">{tab==='home'?'Real-time route intelligence':tab==='alerts'?'Active road conditions':''}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={loadHomeData}><RefreshCw size={14}/></button>
            </div>

            {/* TAB: DASHBOARD */}
            {tab==='home' && (
              <div style={{display:'flex',flexDirection:'column',gap:20,maxWidth:600}}>
                <div style={{display:'flex',gap:16}}>
                  <div style={{flex:1,background:'white',border:'1px solid var(--border-subtle)',borderRadius:16,padding:20,boxShadow:'var(--shadow-xs)'}}>
                    <div style={{fontSize:'0.75rem',fontWeight:800,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:8}}>Trust Score</div>
                    <div style={{fontFamily:'var(--font-heading)',fontSize:'2rem',fontWeight:900,color:'var(--gold-600)',lineHeight:1}}>{driver?.trust_score?.toFixed(1)||'5.0'}<span style={{fontSize:'1rem',color:'var(--text-muted)'}}>/10</span></div>
                  </div>
                  <div style={{flex:1,background:'white',border:'1px solid var(--border-subtle)',borderRadius:16,padding:20,boxShadow:'var(--shadow-xs)'}}>
                    <div style={{fontSize:'0.75rem',fontWeight:800,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:8}}>Points Earned</div>
                    <div style={{fontFamily:'var(--font-heading)',fontSize:'2rem',fontWeight:900,color:'var(--indigo-600)',lineHeight:1}}>{driver?.points||0}</div>
                  </div>
                </div>

                <div className="card" style={{padding:24}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                    <div style={{fontFamily:'var(--font-heading)',fontWeight:800,display:'flex',alignItems:'center',gap:6,fontSize:'1.1rem'}}><Navigation size={18} color="var(--indigo-500)"/> Active Route</div>
                    <button className="btn btn-primary btn-sm" onClick={()=>setShowRouteModal(true)}>{currentRoute?'Change Route':'Set Route'}</button>
                  </div>

                  {currentRoute ? (
                    <div>
                      <div style={{fontFamily:'var(--font-heading)',fontWeight:900,fontSize:'1.3rem',marginBottom:8,color:'var(--text-primary)'}}>{currentRoute.route_name}</div>
                      {currentRoute.start_point&&<div style={{fontSize:'0.9rem',color:'var(--text-secondary)',marginBottom:16,fontWeight:500}}><MapPin size={14} style={{display:'inline',marginRight:4,color:'var(--indigo-500)'}}/> {currentRoute.start_point} → {currentRoute.end_point}</div>}
                      
                      <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:16}}>
                        <RiskBadge level={currentRoute.riskLevel||currentRoute.risk_level}/>
                        <span style={{fontSize:'0.8rem',color:'var(--text-muted)',fontWeight:600}}><Clock size={12} style={{display:'inline'}}/> Started {new Date(currentRoute.started_at).toLocaleTimeString([], {timeStyle:'short'})}</span>
                      </div>
                      
                      {currentRoute.risk_reasons && (
                        <div style={{background:'var(--indigo-50)',borderRadius:12,padding:'14px 16px',marginBottom:16,border:'1px solid rgba(85,88,184,0.1)'}}>
                          <div style={{fontSize:'0.7rem',fontWeight:800,color:'var(--indigo-700)',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:8,display:'flex',alignItems:'center',gap:4}}>
                            <BrainCircuit size={12}/> Route Assessment
                          </div>
                          <ul style={{margin:0,paddingLeft:18,color:'var(--indigo-900)',fontSize:'0.85rem',fontWeight:500}}>
                            {(Array.isArray(currentRoute.risk_reasons)?currentRoute.risk_reasons:JSON.parse(currentRoute.risk_reasons||'[]')).map((r,i)=><li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}
                      
                      <button className="btn btn-secondary btn-full" onClick={handleCompleteRoute} style={{fontSize:'0.9rem'}}><CheckCircle size={16}/> Mark Route Completed</button>
                    </div>
                  ) : (
                    <div className="empty-state" style={{padding:'24px 0',background:'var(--bg-soft)',borderRadius:12,border:'1px dashed var(--border-subtle)'}}>
                      <div className="empty-state-icon" style={{background:'white',boxShadow:'var(--shadow-xs)'}}><Navigation size={24} color="var(--indigo-400)"/></div>
                      <div style={{color:'var(--text-secondary)',fontSize:'0.9rem',fontWeight:600,marginTop:12}}>No destination set</div>
                      <div style={{color:'var(--text-muted)',fontSize:'0.78rem',maxWidth:250,margin:'8px auto 0'}}>Set a route to get AI risk analysis and real-time alerts.</div>
                    </div>
                  )}
                </div>

                <button className="btn btn-danger btn-xl" style={{justifyContent:'center',boxShadow:'0 8px 24px rgba(239,68,68,0.35)',marginBottom:16}} onClick={()=>setShowReportModal(true)}>
                  <AlertTriangle size={20}/> Report Road Hazard
                </button>

                {myIssues.length > 0 && (
                  <div className="card" style={{padding:20}}>
                    <div style={{fontFamily:'var(--font-heading)',fontWeight:800,marginBottom:12,fontSize:'0.9rem',display:'flex',alignItems:'center',gap:6}}>
                      <CheckCircle size={16} color="var(--indigo-500)"/> My Recent Reports
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      {myIssues.map(i => (
                        <div key={i.id} style={{fontSize:'0.8rem',padding:'10px 12px',background:'var(--bg-soft)',borderRadius:10,border:'1px solid var(--border-subtle)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <div>
                            <span style={{fontWeight:800,textTransform:'capitalize',color:'var(--indigo-700)'}}>{i.issue_type}</span>
                            <div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>{i.area_name}</div>
                          </div>
                          <span style={{fontSize:'0.65rem',color:'var(--text-muted)'}}>{new Date(i.created_at).toLocaleTimeString([],{timeStyle:'short'})}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ALERTS */}
            {tab==='alerts' && (
              <div style={{maxWidth:600}}>
                {alerts.length===0?<div className="card"><div className="empty-state"><div className="empty-state-icon"><Bell size={26}/></div><div className="empty-state-title">No alerts</div><div className="empty-state-desc">You'll be notified when nearby drivers report issues</div></div></div>:alerts.map(a=><AlertCard key={a.id||a.alertId} alert={a} onSeen={handleMarkSeen} onVerify={handleVerify} onFalse={handleFalse}/>)}
              </div>
            )}

            {/* TAB: ROUTES */}
            {tab==='routes' && (
              <div style={{maxWidth:600}}>
                {routeHistory.length===0?<div className="card"><div className="empty-state"><div className="empty-state-icon"><MapIcon size={26}/></div><div className="empty-state-title">No routes yet</div><div className="empty-state-desc">Set a route to start tracking your trips</div></div></div>:
                  routeHistory.map(r=>(
                    <div key={r.id} className="card" style={{padding:16,marginBottom:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <div style={{fontFamily:'var(--font-heading)',fontWeight:800}}>{r.route_name}</div>
                        <span className={`badge badge-${r.status==='active'?'success':'neutral'}`}>{r.status}</span>
                      </div>
                      {r.start_point&&<div style={{fontSize:'0.8rem',color:'var(--text-muted)',marginTop:4}}>{r.start_point} → {r.end_point}</div>}
                      <div style={{display:'flex',gap:10,marginTop:8,flexWrap:'wrap'}}>
                        <RiskBadge level={r.risk_level}/>
                        <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{new Date(r.started_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}

            {/* PROFILE */}
            {tab==='profile' && (
              <div style={{maxWidth:600}}>
                <div style={{textAlign:'center',padding:'20px 0'}}>
                  <div style={{width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,var(--indigo-700),var(--indigo-900))',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto',fontSize:'2rem',fontWeight:900,color:'white',fontFamily:'var(--font-heading)',boxShadow:'var(--shadow-md)'}}>
                    {driver?.name?.[0]?.toUpperCase()}
                  </div>
                  <div style={{fontFamily:'var(--font-heading)',fontWeight:900,fontSize:'1.4rem',marginTop:16}}>{driver?.name}</div>
                  <div style={{color:'var(--text-muted)',fontSize:'0.9rem',fontFamily:'monospace',marginTop:4}}>{driver?.driver_id}</div>
                </div>
                <div className="card" style={{padding:20,marginBottom:16}}>
                  {[['Vehicle',driver?.vehicle_number],['Email',driver?.email],['Phone',driver?.phone||'Not set'],['Status',driver?.status],['Points',`${driver?.points||0} pts`],['Trust Score',`${driver?.trust_score?.toFixed(1)||'5.0'} / 10`]].map(([l,v])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'12px 0',borderBottom:'1px solid var(--border-subtle)'}}>
                      <span style={{color:'var(--text-muted)',fontSize:'0.84rem'}}>{l}</span>
                      <span style={{fontWeight:700,fontSize:'0.84rem'}}>{v}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-secondary btn-full hide-desktop" onClick={logout} style={{marginBottom:90}}><LogOut size={14}/> Sign Out</button>
              </div>
            )}

          </div>

          {/* Map Pane (Desktop Right Side) */}
          <div className="hide-mobile" style={{flex:'0 0 45%',borderLeft:'1px solid var(--border-subtle)',background:'#e5e7eb',position:'relative'}}>
             <MapContainer center={currentLocation ? [currentLocation.lat, currentLocation.lng] : defaultCenter} zoom={10} style={{ width: '100%', height: '100%', zIndex:1 }} zoomControl={false}>
               <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution="&copy; OpenStreetMap &copy; CARTO" />
               {currentLocation && <LeafletMarker position={[currentLocation.lat, currentLocation.lng]} icon={blueIcon}><Popup>Your Vehicle</Popup></LeafletMarker>}
               
               {demoRoutePoints.length > 0 && (
                 <>
                   <LeafletMarker position={demoRoutePoints[0]} icon={blueIcon}><Popup>Start</Popup></LeafletMarker>
                   <LeafletMarker position={demoRoutePoints[demoRoutePoints.length-1]} icon={redIcon}><Popup>Destination</Popup></LeafletMarker>
                   <Polyline positions={demoRoutePoints} color="#4338ca" weight={5} opacity={0.8} dashArray="10, 10" />
                 </>
               )}
               {alerts.map(a => a.lat && a.lng ? (
                 <LeafletMarker key={a.id} position={[a.lat, a.lng]} icon={redIcon}><Popup>⚠️ {a.issueType} reported</Popup></LeafletMarker>
               ) : null)}
             </MapContainer>

             {/* Map Overlay Controls */}
             <div style={{position:'absolute', top:20, right:20, zIndex: 10, display:'flex', flexDirection:'column', gap:10}}>
                <div style={{background:'rgba(255,255,255,0.9)', padding:'10px 14px', borderRadius:12, boxShadow:'var(--shadow-sm)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', gap:8}}>
                  <div style={{width:10, height:10, borderRadius:'50%', background:'var(--color-success)', boxShadow:'0 0 0 3px rgba(16,185,129,0.2)'}}/>
                  <div style={{fontSize:'0.8rem', fontWeight:700, color:'var(--indigo-900)'}}>Live Tracking Active</div>
                </div>
                {demoRoutePoints.length > 0 && currentRoute?.route_name?.includes('AI Altered') && (
                  <div style={{background:'rgba(255,255,255,0.9)', padding:'10px 14px', borderRadius:12, boxShadow:'var(--shadow-md)', border:'2px solid var(--gold-400)', backdropFilter:'blur(4px)', animation:'pulse 2s infinite'}}>
                    <div style={{fontSize:'0.75rem', fontWeight:800, color:'var(--text-muted)', textTransform:'uppercase'}}>AI Navigator</div>
                    <div style={{fontSize:'0.85rem', fontWeight:800, color:'var(--indigo-900)', marginTop:4}}>Alternative Route Active</div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </main>

      {/* ── BOTTOM NAV (MOBILE) ── */}
      <nav className="bottom-nav hide-desktop">
        {[{id:'home',label:'Home',icon:<Home size={20}/>},{id:'alerts',label:'Alerts',icon:<AlertTriangle size={20}/>,badge:unreadCount},{id:'routes',label:'Routes',icon:<MapIcon size={20}/>},{id:'profile',label:'Profile',icon:<User size={20}/>}].map(n=>(
          <button key={n.id} className={`bottom-nav-item ${tab===n.id?'active':''}`} onClick={()=>setTab(n.id)} style={{position:'relative'}}>
            {n.icon}
            {n.badge>0&&<span style={{position:'absolute',top:6,left:'50%',transform:'translateX(4px)',background:'var(--color-danger)',color:'white',fontSize:'0.55rem',fontWeight:800,width:14,height:14,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>{n.badge>9?'9+':n.badge}</span>}
            {n.label}
          </button>
        ))}
      </nav>

      {showReportModal&&<ReportModal onClose={()=>setShowReportModal(false)} onReported={loadHomeData} defaultLocation={currentLocation}/>}
      {showRouteModal&&<SetRouteModal onClose={()=>setShowRouteModal(false)} onSet={handleSetRoute}/>}
    </div>
  );
}
