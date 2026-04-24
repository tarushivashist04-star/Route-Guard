import React, { useState } from 'react';
import { Shield, Truck, Eye, EyeOff, ArrowLeft, AlertCircle, ChevronRight } from 'lucide-react';
import { managerLogin, managerRegister, driverLogin } from '../api/client';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

/* ── Truck SVG illustration (inline, CDW-PRO style) ── */
function TruckIllustration() {
  return (
    <svg viewBox="0 0 420 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 420, height: 'auto' }}>
      {/* Road */}
      <rect x="0" y="160" width="420" height="8" rx="4" fill="rgba(255,255,255,0.15)" />
      {/* Trailer */}
      <rect x="60" y="90" width="220" height="75" rx="10" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      {/* Cab */}
      <rect x="280" y="110" width="100" height="55" rx="10" fill="rgba(255,255,255,0.28)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      {/* Cab roof */}
      <path d="M285 110 L310 80 L375 80 L380 110Z" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
      {/* Windshield */}
      <path d="M292 110 L312 88 L365 88 L370 110Z" fill="rgba(255,255,255,0.35)" />
      {/* Wheels */}
      <circle cx="110" cy="168" r="16" fill="rgba(26,28,58,0.7)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <circle cx="110" cy="168" r="7" fill="rgba(255,255,255,0.2)" />
      <circle cx="210" cy="168" r="16" fill="rgba(26,28,58,0.7)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <circle cx="210" cy="168" r="7" fill="rgba(255,255,255,0.2)" />
      <circle cx="310" cy="168" r="16" fill="rgba(26,28,58,0.7)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <circle cx="310" cy="168" r="7" fill="rgba(255,255,255,0.2)" />
      <circle cx="360" cy="168" r="14" fill="rgba(26,28,58,0.7)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <circle cx="360" cy="168" r="6" fill="rgba(255,255,255,0.2)" />
      {/* Headlight */}
      <ellipse cx="382" cy="138" rx="8" ry="5" fill="var(--gold-400)" opacity="0.9" />
      {/* Trailer lines */}
      <line x1="140" y1="90" x2="140" y2="165" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1="180" y1="90" x2="180" y2="165" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1="220" y1="90" x2="220" y2="165" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {/* Stars / sparkles */}
      <circle cx="30" cy="40" r="3" fill="rgba(255,255,255,0.4)" />
      <circle cx="50" cy="20" r="2" fill="rgba(255,255,255,0.3)" />
      <circle cx="15" cy="70" r="2" fill="rgba(255,255,255,0.25)" />
      {/* Speed lines */}
      <line x1="20" y1="130" x2="55" y2="130" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="143" x2="50" y2="143" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" />
      <line x1="25" y1="118" x2="55" y2="118" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ── SunBurst (like CDW PRO's sun icon) ── */
function SunBurst() {
  return (
    <svg width="70" height="70" viewBox="0 0 70 70" fill="none" style={{ position: 'absolute', top: 20, right: 60, opacity: 0.7 }}>
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((angle, i) => (
        <line key={i} x1="35" y1="35"
          x2={35 + 30 * Math.cos(angle * Math.PI/180)}
          y2={35 + 30 * Math.sin(angle * Math.PI/180)}
          stroke="var(--gold-400)" strokeWidth={i % 3 === 0 ? 2.5 : 1.5} strokeLinecap="round" opacity={i%3===0?1:0.6} />
      ))}
      <circle cx="35" cy="35" r="8" fill="var(--gold-400)" />
    </svg>
  );
}

export default function LoginPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState('select');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const upd = (k, v) => { setForm(p => ({ ...p, [k]: v })); setError(''); };

  const handleManagerLogin = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const { data } = await managerLogin({ email: form.email, password: form.password });
      login({ ...data.manager, role: 'manager' }, data.token);
      toast.success(`Welcome back, ${data.manager.name}!`);
    } catch (err) { setError(err.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  };

  const handleManagerRegister = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const { data } = await managerRegister({ name: form.name, email: form.email, password: form.password });
      login({ ...data.manager, role: 'manager' }, data.token);
      toast.success(`Account created! Welcome, ${data.manager.name}!`);
    } catch (err) { setError(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const handleDriverLogin = async e => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const { data } = await driverLogin({ driver_id: form.driver_id, password: form.password });
      login({ ...data.driver, role: 'driver' }, data.token);
      toast.success(`Welcome, ${data.driver.name}!`);
    } catch (err) { setError(err.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-hero)' }} className="hero-bg">
      {/* Top nav */}
      <nav className="topnav">
        <div className="topnav-logo">
          <div style={s.logoIcon}><Truck size={18} color="var(--gold-400)" /></div>
          RouteGuard <span style={{ color: 'var(--gold-400)' }}>AI</span>
        </div>
        <div className="topnav-links">
          <span className="topnav-link">For Companies</span>
          <span className="topnav-link">Fleet Plans</span>
          <span className="topnav-link">Safety</span>
        </div>
      </nav>

      {/* Hero section */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
        {/* Left: Hero text + illustration */}
        <div style={{ flex: 1, padding: '40px 48px 0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
          <SunBurst />
          <div style={{ maxWidth: 520, paddingBottom: 40 }}>
            {mode === 'select' && (
              <>
                <div style={{ ...s.eyebrow }}>Fleet Intelligence Platform</div>
                <h1 className="heading-xl" style={{ marginBottom: 20, maxWidth: 480 }}>
                  Smart Logistics.<br />Real-Time Routes.
                </h1>
                <p style={{ color: 'var(--text-on-hero-muted)', fontSize: '1rem', lineHeight: 1.6, marginBottom: 32, maxWidth: 400 }}>
                  Manager-controlled fleet management with privacy-first real-time alerts, AI risk analysis, and driver trust scoring.
                </p>
                {/* CDW-style pill tags */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {['Route Monitoring', 'Live Alerts', 'Risk Analysis', 'Driver Points'].map(t => (
                    <span key={t} style={s.featureTag}>{t}</span>
                  ))}
                </div>
              </>
            )}
            {mode !== 'select' && (
              <div>
                <h1 className="heading-xl" style={{ marginBottom: 12, fontSize: 'clamp(2rem,4vw,3rem)' }}>
                  {mode.includes('manager') ? 'Manager Portal' : 'Driver Portal'}
                </h1>
                <p style={{ color: 'var(--text-on-hero-muted)', fontSize: '0.95rem', maxWidth: 380 }}>
                  {mode === 'driver-login'
                    ? 'Sign in with your company-assigned Driver ID. Only manager-created accounts are allowed.'
                    : 'Manage your fleet, monitor routes, and keep your drivers safe.'}
                </p>
              </div>
            )}
          </div>
          {/* Illustration at the bottom */}
          <div style={{ marginBottom: -8, opacity: 0.9 }}>
            <TruckIllustration />
          </div>
        </div>

        {/* Right: Form card strip (CDW-style bottom-right card) */}
        <div style={s.rightPanel}>
          <div style={s.formCard}>
            {/* SELECT */}
            {mode === 'select' && (
              <>
                <div style={s.formCardHead}>
                  <div style={s.formLabel2}>Get Started</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'var(--font-heading)', letterSpacing: '-0.3px', marginTop: 4 }}>
                    Choose Your Role
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
                  <button style={s.roleCard} onClick={() => { setMode('manager-login'); setForm({}); }}>
                    <div style={{ ...s.roleIcon, background: 'linear-gradient(135deg,var(--indigo-700),var(--indigo-900))' }}>
                      <Shield size={20} color="var(--gold-400)" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.94rem', fontFamily: 'var(--font-heading)' }}>Manager Login</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>Fleet control & dashboard</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </button>

                  <button style={s.roleCard} onClick={() => { setMode('driver-login'); setForm({}); }}>
                    <div style={{ ...s.roleIcon, background: 'linear-gradient(135deg,#1e40af,#1d4ed8)' }}>
                      <Truck size={20} color="#93c5fd" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.94rem', fontFamily: 'var(--font-heading)' }}>Driver Login</div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>Sign in with Driver ID</div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </button>
                </div>

                {/* Stats strip */}
                <div style={s.statsStrip}>
                  {[['600+', 'Routes Tracked'], ['99.9%', 'Uptime'], ['10 km', 'Alert Radius']].map(([v, l]) => (
                    <div key={l} style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 900, fontFamily: 'var(--font-heading)', fontSize: '1.25rem', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{v}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* MANAGER LOGIN */}
            {mode === 'manager-login' && (
              <form onSubmit={handleManagerLogin}>
                <BackRow onBack={() => setMode('select')} label="Manager" color="var(--indigo-700)" />
                <div style={s.formTitle}>Sign In</div>
                <div style={s.formSubtitle}>Access your fleet management dashboard</div>
                <div style={s.fields}>
                  <FG label="Email Address">
                    <input className="form-input" type="email" placeholder="manager@company.com" required
                      value={form.email||''} onChange={e => upd('email',e.target.value)} />
                  </FG>
                  <FG label="Password">
                    <PwField value={form.password||''} onChange={v=>upd('password',v)} show={showPw} onToggle={()=>setShowPw(x=>!x)} />
                  </FG>
                  <ErrBox msg={error} />
                  <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
                    {loading?<><span className="spinner" style={{borderColor:'rgba(26,28,58,0.2)',borderTopColor:'var(--indigo-900)'}}/>Signing in...</>:'Sign In →'}
                  </button>
                  <p style={s.switchText}>New manager? <button type="button" style={s.switchBtn} onClick={()=>{setMode('manager-register');setForm({})}}>Create account</button></p>
                </div>
              </form>
            )}

            {/* MANAGER REGISTER */}
            {mode === 'manager-register' && (
              <form onSubmit={handleManagerRegister}>
                <BackRow onBack={() => setMode('manager-login')} label="Manager" color="var(--indigo-700)" />
                <div style={s.formTitle}>Create Account</div>
                <div style={s.formSubtitle}>Set up your fleet management account</div>
                <div style={s.fields}>
                  <FG label="Full Name"><input className="form-input" placeholder="John Smith" required value={form.name||''} onChange={e=>upd('name',e.target.value)} /></FG>
                  <FG label="Email Address"><input className="form-input" type="email" placeholder="manager@company.com" required value={form.email||''} onChange={e=>upd('email',e.target.value)} /></FG>
                  <FG label="Password"><PwField value={form.password||''} onChange={v=>upd('password',v)} show={showPw} onToggle={()=>setShowPw(x=>!x)} /></FG>
                  <ErrBox msg={error} />
                  <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
                    {loading?<><span className="spinner" style={{borderColor:'rgba(26,28,58,0.2)',borderTopColor:'var(--indigo-900)'}}/>Creating...</>:'Create Account →'}
                  </button>
                </div>
              </form>
            )}

            {/* DRIVER LOGIN */}
            {mode === 'driver-login' && (
              <form onSubmit={handleDriverLogin}>
                <BackRow onBack={() => setMode('select')} label="Driver" color="#1e40af" />
                <div style={s.formTitle}>Driver Sign In</div>
                <div style={s.formSubtitle}>Use your company-issued Driver ID</div>
                <div style={s.fields}>
                  <FG label="Driver ID">
                    <input className="form-input" placeholder="DRV-001" required value={form.driver_id||''}
                      onChange={e=>upd('driver_id',e.target.value.toUpperCase())}
                      style={{fontFamily:'monospace',letterSpacing:'2px',fontWeight:700,fontSize:'0.95rem'}} />
                  </FG>
                  <FG label="Password"><PwField value={form.password||''} onChange={v=>upd('password',v)} show={showPw} onToggle={()=>setShowPw(x=>!x)} /></FG>
                  <div style={s.infoBox}>
                    🔒 Self-registration is disabled. Your account is created by your fleet manager.
                  </div>
                  <ErrBox msg={error} />
                  <button className="btn btn-indigo btn-lg btn-full" type="submit" disabled={loading}>
                    {loading?<><span className="spinner" style={{borderColor:'rgba(255,255,255,0.3)',borderTopColor:'white'}}/>Signing in...</>:'Sign In as Driver →'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BackRow({ onBack, label, color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
      <button type="button" onClick={onBack} style={{ display:'flex',alignItems:'center',gap:5,background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',fontWeight:700,fontSize:'0.84rem',fontFamily:'var(--font-body)' }}>
        <ArrowLeft size={15}/> Back
      </button>
      <span style={{ padding:'3px 12px',borderRadius:'999px',background:color,color:'white',fontSize:'0.7rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.5px' }}>{label}</span>
    </div>
  );
}
function FG({ label, children }) { return <div className="form-group"><label className="form-label">{label}</label>{children}</div>; }
function PwField({ value, onChange, show, onToggle }) {
  return (
    <div style={{position:'relative'}}>
      <input className="form-input" type={show?'text':'password'} placeholder="Your password" required value={value} onChange={e=>onChange(e.target.value)} style={{paddingRight:44}}/>
      <button type="button" onClick={onToggle} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',color:'var(--text-muted)',cursor:'pointer',display:'flex',padding:4}}>
        {show?<EyeOff size={16}/>:<Eye size={16}/>}
      </button>
    </div>
  );
}
function ErrBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,background:'#fef2f2',border:'1.5px solid #fecaca',borderRadius:10,padding:'10px 14px',fontSize:'0.84rem',color:'#dc2626'}}>
      <AlertCircle size={14}/>{msg}
    </div>
  );
}

const s = {
  logoIcon: { width:34,height:34,borderRadius:8,background:'rgba(255,255,255,0.15)',border:'1px solid rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center' },
  eyebrow: { fontSize:'0.72rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'1.5px',color:'var(--gold-400)',marginBottom:16 },
  featureTag: { padding:'6px 14px',borderRadius:'999px',background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',color:'white',fontSize:'0.78rem',fontWeight:700 },
  rightPanel: { width:420,flexShrink:0,background:'var(--bg-sheet)',display:'flex',flexDirection:'column',justifyContent:'center',padding:40,borderLeft:'1px solid rgba(255,255,255,0.1)' },
  formCard: { background:'white',borderRadius:24,padding:32,boxShadow:'0 8px 40px rgba(26,28,58,0.15)' },
  formCardHead: { marginBottom:0 },
  formLabel2: { fontSize:'0.7rem',fontWeight:800,textTransform:'uppercase',letterSpacing:'1px',color:'var(--text-muted)' },
  formTitle: { fontSize:'1.5rem',fontWeight:900,fontFamily:'var(--font-heading)',letterSpacing:'-0.5px',color:'var(--text-primary)',marginBottom:4,marginTop:2 },
  formSubtitle: { fontSize:'0.84rem',color:'var(--text-muted)',marginBottom:24 },
  fields: { display:'flex',flexDirection:'column',gap:14 },
  roleCard: { display:'flex',alignItems:'center',gap:14,padding:16,borderRadius:14,background:'var(--bg-soft)',border:'1.5px solid var(--border-subtle)',cursor:'pointer',width:'100%',textAlign:'left',transition:'all 0.2s',color:'var(--text-primary)',boxShadow:'var(--shadow-xs)',fontFamily:'var(--font-body)' },
  roleIcon: { width:46,height:46,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 },
  statsStrip: { display:'flex',justifyContent:'space-around',marginTop:28,paddingTop:20,borderTop:'1px solid var(--border-subtle)' },
  switchText: { textAlign:'center',fontSize:'0.84rem',color:'var(--text-muted)',fontWeight:500 },
  switchBtn: { background:'none',border:'none',color:'var(--indigo-600)',cursor:'pointer',fontWeight:800,fontSize:'inherit',fontFamily:'var(--font-body)' },
  infoBox: { background:'#eff6ff',border:'1.5px solid #bfdbfe',borderRadius:10,padding:'10px 14px',fontSize:'0.8rem',color:'#1e40af',fontWeight:600,lineHeight:1.5 },
};
