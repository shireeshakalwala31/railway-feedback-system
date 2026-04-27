import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import './AdminDashboard.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'https://railway-feedback-backend.onrender.com/api';

const ratingLabel = (n) => {
  switch (n) {
    case 5: return 'Very Good';
    case 4: return 'Good';
    case 3: return 'Satisfactory';
    case 2: return 'Poor';
    case 1: return 'Very Poor';
    default: return 'Not Attended';
  }
};

function AdminDashboard() {
  const { user, logout } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchText, setSearchText] = useState('');
  const [viewItem, setViewItem] = useState(null);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData({});
  }, []);

  const handleSearch = () => {
    fetchData({ location, date, from, to });
  };

  const resetFilters = () => {
    setLocation('');
    setDate('');
    setFrom('');
    setTo('');
    setSearchText('');
    fetchData({});
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

  const openPrintFor = (item) => {
    const w = window.open('', '_blank');
    if (!w) return;
    const rows = [
      ['1. Platform surface cleaning', ratingLabel(item.areas?.appearancePlatform)],
      ['2. Platform taps cleaning', ratingLabel(item.areas?.taps)],
      ['3. Tracks cleaning', ratingLabel(item.areas?.tracks)],
      ['4. Waiting hall cleaning', ratingLabel(item.areas?.waitingHall)],
      ['5. Toilets cleaning', ratingLabel(item.areas?.toilets)],
      ['6. Retiring rooms cleaning', ratingLabel(item.areas?.retiringRooms)],
      ['7. Staff behavior', ratingLabel(item.areas?.staffBehavior)],
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

  const getRatingColor = (r) => { 
    switch(r) { 
      case 5: return '#16a34a'; 
      case 4: return '#22c55e'; 
      case 3: return '#eab308'; 
      case 2: return '#f97316'; 
      case 1: return '#dc2626'; 
      default: return '#6b7280'; 
    } 
  };
  
  const getRatingBg = (r) => { 
    switch(r) { 
      case 5: case 4: return '#dcfce7'; 
      case 3: return '#fef9c3'; 
      case 2: return '#ffedd5'; 
      case 1: return '#fee2e2'; 
      default: return '#f3f4f6'; 
    } 
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="logo-section">
            <img 
              src="/rrb-official-logo.png" 
              alt="Indian Railways Logo" 
              className="railway-logo"
              onError={(e) => { 
                e.target.src = 'data:image/svg+xml,' + encodeURIComponent(
                  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="%23FF9933"/><circle cx="50" cy="50" r="30" fill="white"/><circle cx="50" cy="50" r="20" fill="%231388CE"/><text x="50" y="55" text-anchor="middle" font-size="12" fill="white" font-weight="bold">IR</text></svg>'
                ); 
              }}
            />
            <div className="header-title">
              <h1>Ministry of Railways - Feedback Management System</h1>
              <p>Computerized Housekeeping Monitoring Cell (CMCC)</p>
            </div>
          </div>
          <div className="user-section">
            <div className="user-info">
              <span className="user-label">Logged in as</span>
              <span className="user-name">{user?.name || user?.username}</span>
              <span className="user-role">{user?.role}</span>
            </div>
            <button className="logout-btn" onClick={logout}>
              <i className="fa-solid fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Search Panel */}
      <div className="search-panel">
        <div className="search-bar">
          <input 
            type="text" 
            placeholder="Search by Passenger Name / PNR / Mobile / ID" 
            value={searchText} 
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters">
          <select value={location} onChange={(e) => setLocation(e.target.value)} className="filter-select">
            <option value="">All Locations</option>
            {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="filter-input" />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="filter-input" placeholder="From" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="filter-input" placeholder="To" />
          <button className="search-btn" onClick={handleSearch}>Search</button>
          <button className="reset-btn" onClick={resetFilters}>Reset</button>
        </div>
      </div>

      {/* Results Panel */}
      <div className="results-panel">
        <div className="results-header">
          <h2>Feedback Records</h2>
          <span className="total-count">Total: {filteredData.length}</span>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ID</th>
                  <th>Passenger</th>
                  <th>Location</th>
                  <th>Date</th>
                  <th>PNR</th>
                  <th>Mobile</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr><td colSpan={8} className="no-data">No records found</td></tr>
                ) : filteredData.map((row, idx) => (
                  <tr key={row.id}>
                    <td>{idx + 1}</td>
                    <td className="id-cell">{row.id}</td>
                    <td>{row.passengerName}</td>
                    <td><span className="location-badge">{row.location}</span></td>
                    <td>{row.date}</td>
                    <td className="mono">{row.pnrOrUts}</td>
                    <td className="mono">{row.mobile}</td>
                    <td>
                      <button className="view-btn" onClick={() => setViewItem(row)}>View</button>
                      <button className="download-btn" onClick={() => openPrintFor(row)}>Download</button>
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
        <div className="modal-backdrop" onClick={() => setViewItem(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Feedback Details</h2>
              <button className="close-btn" onClick={() => setViewItem(null)}>×</button>
            </div>
            
            <div className="modal-grid">
              <div className="modal-card primary"><span>ID</span><strong>{viewItem.id}</strong></div>
              <div className="modal-card"><span>Location</span><strong>{viewItem.location}</strong></div>
              <div className="modal-card"><span>Date</span><strong>{viewItem.date}</strong></div>
              <div className="modal-card"><span>Passenger</span><strong>{viewItem.passengerName}</strong></div>
              <div className="modal-card"><span>PNR/UTS</span><strong>{viewItem.pnrOrUts}</strong></div>
              <div className="modal-card"><span>Mobile</span><strong>{viewItem.mobile}</strong></div>
            </div>
            
            <div className="ratings-section">
              <h3>Ratings</h3>
              <table className="ratings-table">
                <thead>
                  <tr><th>#</th><th>Service Area</th><th>Rating</th></tr>
                </thead>
                <tbody>
                  {[
                    ['Platform surface', viewItem.areas?.appearancePlatform],
                    ['Platform taps', viewItem.areas?.taps],
                    ['Tracks', viewItem.areas?.tracks],
                    ['Waiting hall', viewItem.areas?.waitingHall],
                    ['Toilets', viewItem.areas?.toilets],
                    ['Retiring rooms', viewItem.areas?.retiringRooms],
                    ['Staff behavior', viewItem.areas?.staffBehavior],
                  ].map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{r[0]}</td>
                      <td>
                        <span 
                          className="rating-badge" 
                          style={{ background: getRatingBg(r[1]), color: getRatingColor(r[1]) }}
                        >
                          {ratingLabel(r[1])}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="remarks-section">
              <strong>Remarks:</strong> {viewItem.remarks || 'No remarks'}
            </div>
            
            <div className="modal-footer">
              <button className="download-btn large" onClick={() => openPrintFor(viewItem)}>Download PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
