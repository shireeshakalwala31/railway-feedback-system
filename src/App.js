import React, { useMemo, useState, useEffect } from 'react';
import './App.css';
import FeedbackForm from './FeedbackForm';
import Login from './Login';
import { AuthProvider, useAuth } from './AuthContext';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

const normalizeRating = (value) => {
  if (typeof value === 'string') {
    const cleaned = value.trim();
    if (!cleaned) return null;
    const lowered = cleaned.toLowerCase();
    if (lowered === 'excellent') return 5;
    if (lowered === 'very good') return 5;
    if (lowered === 'good') return 4;
    if (lowered === 'satisfactory') return 3;
    if (lowered === 'fair') return 3;
    if (lowered === 'needs improvement') return 2;
    if (lowered === 'poor') return 2;
    if (lowered === 'very poor') return 1;
    if (lowered === 'not applicable') return 0;
    if (lowered === 'not attended') return 0;
    const asNumber = Number(cleaned);
    return Number.isNaN(asNumber) ? null : asNumber;
  }

  if (typeof value === 'number') {
    return value;
  }

  return null;
};

// Rating label function
const ratingLabel = (value) => {
  const n = normalizeRating(value);
  switch (n) {
    case 5: return 'Very Good';
    case 4: return 'Good';
    case 3: return 'Satisfactory';
    case 2: return 'Poor';
    case 1: return 'Very Poor';
    default: return 'Not Attended';
  }
};

// Custom hook to fetch feedback data from backend with auth
function useFeedbackData() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.location) params.append('location', filters.location);
      if (filters.date) params.append('date', filters.date);
      if (filters.from) params.append('fromDate', filters.from);
      if (filters.to) params.append('toDate', filters.to);
      
      const queryString = params.toString();
      const url = queryString ? `${API_BASE}/feedback?${queryString}` : `${API_BASE}/feedback`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Authentication required');
        }
        throw new Error('Failed to fetch data');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      setData(demoData);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refetch: fetchData };
}

// Demo data for fallback
const demoData = [
  { id: 'FB-0001', location: 'GUNTAKAL', date: '2026-03-04', fromDate: '2026-03-04', toDate: '2026-03-04', passengerName: 'Ravi Kumar', pnrOrUts: '1234567890', mobile: '9999912345', areas: { appearancePlatform: 4, taps: 5, tracks: 4, waitingHall: 3, toilets: 2, retiringRooms: 4, staffBehavior: 5 }, remarks: 'Overall good, toilets need more cleaning in the evening hour.' },
  { id: 'FB-0002', location: 'HYDERABAD', date: '2026-03-02', fromDate: '2026-03-02', toDate: '2026-03-02', passengerName: 'Sita Devi', pnrOrUts: '9988776655', mobile: '8888877777', areas: { appearancePlatform: 5, taps: 4, tracks: 4, waitingHall: 5, toilets: 4, retiringRooms: 3, staffBehavior: 5 }, remarks: 'Very satisfied.' },
  { id: 'FB-0003', location: 'GUNTAKAL', date: '2026-03-01', fromDate: '2026-03-01', toDate: '2026-03-01', passengerName: 'Rahul', pnrOrUts: '7766554433', mobile: '7777700000', areas: { appearancePlatform: 2, taps: 3, tracks: 2, waitingHall: 2, toilets: 2, retiringRooms: 2, staffBehavior: 3 }, remarks: 'Crowded hour cleanliness can be better.' }
];

function Dashboard() {
  const { user, logout } = useAuth();
  const { data, loading, error, refetch } = useFeedbackData();
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchText, setSearchText] = useState('');
  const [viewItem, setViewItem] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const handleSearch = () => {
    refetch({ location, date, from, to });
  };

  useEffect(() => {
    refetch({});
  }, []);

  // Handle successful feedback submission
  const handleFeedbackSuccess = () => {
    setShowFeedbackForm(false);
    refetch({}); // Refresh the dashboard data
  };

  const locations = useMemo(() => Array.from(new Set(data.map((d) => d.location))).sort(), [data]);

  const filteredData = useMemo(() => {
    if (!searchText) return data;
    const search = searchText.toLowerCase();
    return data.filter(item => 
      item.passengerName?.toLowerCase().includes(search) ||
      item.pnrOrUts?.toLowerCase().includes(search) ||
      item.mobile?.toLowerCase().includes(search) ||
      item.id?.toLowerCase().includes(search)
    );
  }, [data, searchText]);

  const resetFilters = () => {
    setLocation('');
    setDate('');
    setFrom('');
    setTo('');
    setSearchText('');
    refetch({});
  };

  const openPrintFor = (item) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = [
      ['1. Platform surface cleaning', ratingLabel(item.areas.appearancePlatform)],
      ['2. Platform taps cleaning', ratingLabel(item.areas.taps)],
      ['3. Tracks cleaning', ratingLabel(item.areas.tracks)],
      ['4. Waiting hall cleaning', ratingLabel(item.areas.waitingHall)],
      ['5. Toilets cleaning', ratingLabel(item.areas.toilets)],
      ['6. Retiring rooms cleaning', ratingLabel(item.areas.retiringRooms)],
      ['7. Staff behavior', ratingLabel(item.areas.staffBehavior)],
    ].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('');
    
    w.document.write(`<html><head><title>${item.id}</title></head><body>
      <h2>FEEDBACK FORM - CMCC HOUSEKEEPING</h2>
      <p><strong>Location:</strong> ${item.location} | <strong>Date:</strong> ${item.date}</p>
      <p><strong>Passenger:</strong> ${item.passengerName} | <strong>PNR:</strong> ${item.pnrOrUts} | <strong>Mobile:</strong> ${item.mobile}</p>
      <table border="1" cellpadding="5"><thead><tr><th>Service</th><th>Rating</th></tr></thead><tbody>${rows}</tbody></table>
      <p><strong>Remarks:</strong> ${item.remarks || '-'}</p>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 250);
  };

  if (showFeedbackForm) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', padding: '12px' }}>
        <FeedbackForm onBack={() => setShowFeedbackForm(false)} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', padding: '12px' }}>
      {/* Header with Official Logo */}
      <div style={{ background: 'white', borderRadius: 12, padding: '16px', marginBottom: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Official Indian Railways Logo */}
            <img 
              src="/logo192.png" 
              alt="Indian Railways Logo" 
              style={{ height: 50, width: 'auto' }}
              onError={(e) => { e.target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23FF9933"/><circle cx="50" cy="50" r="30" fill="white"/><circle cx="50" cy="50" r="20" fill="%231388CE"/><text x="50" y="55" text-anchor="middle" font-size="12" fill="white" font-weight="bold">IR</text></svg>'); }}
            />
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ margin: 0, color: '#1e3a5f', fontSize: 'clamp(16px, 4vw, 24px)', fontWeight: 700 }}>
                Ministry of Railways - Feedback Management System
              </h1>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 'clamp(11px, 2.5vw, 13px)' }}>
                Computerized Housekeeping Monitoring Cell (CMCC)
              </p>
            </div>
          </div>
          {/* User Info & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right', padding: '8px 12px', background: '#f1f5f9', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: '#64748b' }}>Logged in as</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e3a5f' }}>{user?.name || user?.username}</div>
              <div style={{ fontSize: 11, color: '#10b981', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
            <button 
              onClick={logout}
              style={{ padding: '10px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="fa-solid fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Panel */}
      <div style={{ background: 'white', borderRadius: 12, padding: 'clamp(12px, 3vw, 20px)', marginBottom: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        {/* Search Bar */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#374151', fontWeight: 600, fontSize: 14 }}>🔍 Search</label>
          <input type="text" placeholder="Passenger Name / PNR / Mobile / ID" value={searchText} onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: 8, border: '2px solid #e5e7eb', fontSize: 14, boxSizing: 'border-box' }} />
        </div>

        {/* Mobile Menu Toggle */}
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={{ display: 'none', width: '100%', padding: 12, background: '#1e3a5f', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, marginBottom: 12 }}
          className="mobile-toggle">
          {isMobileMenuOpen ? '▲ Hide Filters' : '▼ Show Filters'}
        </button>

        {/* Filters */}
        <div className="filters-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#374151', fontWeight: 600, fontSize: 13 }}>📍 Location</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '2px solid #e5e7eb', fontSize: 13, background: 'white', boxSizing: 'border-box' }}>
              <option value="">All</option>
              {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#374151', fontWeight: 600, fontSize: 13 }}>📅 Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '2px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#374151', fontWeight: 600, fontSize: 13 }}>➡️ From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '2px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 6, color: '#374151', fontWeight: 600, fontSize: 13 }}>⬅️ To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '2px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={handleSearch} style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, flex: '1 1 auto', minWidth: '80px' }}>🔍 Search</button>
            <button onClick={resetFilters} style={{ padding: '10px 16px', background: '#64748b', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>↺ Reset</button>
          </div>
        </div>
      </div>

      {/* Results Panel */}
      <div style={{ background: 'white', borderRadius: 12, padding: 'clamp(12px, 3vw, 20px)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h2 style={{ margin: 0, color: '#1f2937', fontSize: 'clamp(16px, 3vw, 20px)', fontWeight: 700 }}>📋 Feedback Records</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button 
              onClick={() => setShowFeedbackForm(true)} 
              style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <i className="fa-solid fa-plus"></i> Add Feedback
            </button>
            <span style={{ background: '#dbeafe', color: '#1e40af', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>Total: {filteredData.length}</span>
          </div>
        </div>

        {error && <div style={{ padding: 12, marginBottom: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>⚠️ {error}</div>}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
            <div style={{ width: 40, height: 40, border: '4px solid #e5e7eb', borderTop: '4px solid #1e3a5f', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }}></div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' }}>
                  <th style={{ ...th, color: 'white' }}>#</th>
                  <th style={{ ...th, color: 'white' }}>ID</th>
                  <th style={{ ...th, color: 'white' }}>Passenger</th>
                  <th style={{ ...th, color: 'white' }}>Location</th>
                  <th style={{ ...th, color: 'white' }}>Date</th>
                  <th style={{ ...th, color: 'white' }}>PNR</th>
                  <th style={{ ...th, color: 'white' }}>Mobile</th>
                  <th style={{ ...th, color: 'white', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: 30, textAlign: 'center', color: '#9ca3af' }}>📭 No records found</td></tr>
                ) : filteredData.map((row, idx) => (
                  <tr key={row.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={{ ...td, fontWeight: 600 }}>{idx + 1}</td>
                    <td style={{ ...td, fontWeight: 600, color: '#1e3a5f' }}>{row.id}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{row.passengerName}</td>
                    <td style={{ ...td }}><span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{row.location}</span></td>
                    <td style={{ ...td }}>{row.date}</td>
                    <td style={{ ...td, fontFamily: 'monospace' }}>{row.pnrOrUts}</td>
                    <td style={{ ...td, fontFamily: 'monospace' }}>{row.mobile}</td>
                    <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <button onClick={() => setViewItem(row)} style={{ marginRight: 4, padding: '5px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>View</button>
                      <button onClick={() => openPrintFor(row)} style={{ padding: '5px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewItem && (
        <div style={modalBackdrop} onClick={() => setViewItem(null)}>
          <div style={modalBody} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: 18, fontWeight: 700 }}>📋 Feedback Details</h2>
              <button onClick={() => setViewItem(null)} style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>✕ Close</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: 12, background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', color: 'white', borderRadius: 8 }}><div style={{ fontSize: 10, opacity: 0.8 }}>ID</div><div style={{ fontSize: 14, fontWeight: 700 }}>{viewItem.id}</div></div>
              <div style={{ padding: 12, background: '#f1f5f9', borderRadius: 8 }}><div style={{ fontSize: 10, color: '#64748b' }}>Location</div><div style={{ fontSize: 14, fontWeight: 700 }}>{viewItem.location}</div></div>
              <div style={{ padding: 12, background: '#f1f5f9', borderRadius: 8 }}><div style={{ fontSize: 10, color: '#64748b' }}>Date</div><div style={{ fontSize: 14, fontWeight: 700 }}>{viewItem.date}</div></div>
              <div style={{ padding: 12, background: '#f1f5f9', borderRadius: 8 }}><div style={{ fontSize: 10, color: '#64748b' }}>Passenger</div><div style={{ fontSize: 14, fontWeight: 700 }}>{viewItem.passengerName}</div></div>
              <div style={{ padding: 12, background: '#f1f5f9', borderRadius: 8 }}><div style={{ fontSize: 10, color: '#64748b' }}>PNR/UTS</div><div style={{ fontSize: 14, fontWeight: 700 }}>{viewItem.pnrOrUts}</div></div>
              <div style={{ padding: 12, background: '#f1f5f9', borderRadius: 8 }}><div style={{ fontSize: 10, color: '#64748b' }}>Mobile</div><div style={{ fontSize: 14, fontWeight: 700 }}>{viewItem.mobile}</div></div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: 14, color: '#374151', fontWeight: 700 }}>⭐ Ratings</h3>
              <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#f1f5f9' }}><th style={{ ...th, fontSize: 11, width: 40 }}>#</th><th style={{ ...th, fontSize: 11 }}>Service Area</th><th style={{ ...th, fontSize: 11, textAlign: 'center' }}>Rating</th></tr></thead>
                  <tbody>
                    {[
                      ['Platform surface', viewItem.areas.appearancePlatform],
                      ['Platform taps', viewItem.areas.taps],
                      ['Tracks', viewItem.areas.tracks],
                      ['Waiting hall', viewItem.areas.waitingHall],
                      ['Toilets', viewItem.areas.toilets],
                      ['Retiring rooms', viewItem.areas.retiringRooms],
                      ['Staff behavior', viewItem.areas.staffBehavior],
                    ].map((r, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        <td style={{ ...td, textAlign: 'center', fontWeight: 600 }}>{i + 1}</td>
                        <td style={{ ...td, fontSize: 12 }}>{r[0]}</td>
                        <td style={{ ...td, textAlign: 'center' }}><span style={{ background: getRatingBg(r[1]), color: getRatingColor(r[1]), padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{ratingLabel(r[1])}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div style={{ padding: 12, background: '#fefce8', borderRadius: 8, border: '1px solid #fef08a', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>📝 Remarks</div>
              <div style={{ color: '#92400e', fontSize: 13 }}>{viewItem.remarks || 'No remarks'}</div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => openPrintFor(viewItem)} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>⬇️ Download PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Responsive Styles */}
      <style>{`
        @media (max-width: 768px) {
          .mobile-toggle { display: block !important; }
          .filters-container { display: none !important; }
          .filters-container.show { display: grid !important; }
        }
        @media (max-width: 480px) {
          div[style*="minHeight: 100vh"] { padding: 8px !important; }
          div[style*="borderRadius: 12"] { border-radius: 8px !important; }
        }
      `}</style>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState('login');

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        setCurrentView('dashboard');
      } else {
        setCurrentView('login');
      }
    }
  }, [isAuthenticated, loading]);

  const handleLoginSuccess = () => {
    setCurrentView('dashboard');
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)' 
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ width: 50, height: 50, border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (currentView === 'login') {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const getRatingColor = (value) => {
  const r = normalizeRating(value);
  switch(r) {
    case 5: return '#16a34a';
    case 4: return '#22c55e';
    case 3: return '#eab308';
    case 2: return '#f97316';
    case 1: return '#dc2626';
    default: return '#6b7280';
  }
};
const getRatingBg = (value) => {
  const r = normalizeRating(value);
  switch(r) {
    case 5:
    case 4:
      return '#dcfce7';
    case 3:
      return '#fef9c3';
    case 2:
      return '#ffedd5';
    case 1:
      return '#fee2e2';
    default:
      return '#f3f4f6';
  }
};

const th = { textAlign: 'left', padding: '12px', borderBottom: '1px solid #eee', fontSize: 12, fontWeight: 600 };
const td = { padding: '10px', borderBottom: '1px solid #f3f4f6', fontSize: 12 };

const modalBackdrop = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 12, overflow: 'auto' };
const modalBody = { width: '100%', maxWidth: 600, maxHeight: '95vh', overflow: 'auto', background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' };

export default App;
