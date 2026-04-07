import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './FeedbackForm.css';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5001/api';

// Rating questions
const questions = [
  { key: 'appearancePlatform', label: 'Platform cleanliness & disinfection' },
  { key: 'taps', label: 'Cleanliness around taps' },
  { key: 'tracks', label: 'Cleanliness of tracks' },
  { key: 'waitingHall', label: 'Waiting hall cleanliness' },
  { key: 'toilets', label: 'Toilets & wash basins' },
  { key: 'retiringRooms', label: 'Retiring room cleanliness' },
  { key: 'staffBehavior', label: 'Staff behavior & appearance' }
];

// Rating options matching the form
const ratingOptions = [
  { value: 'Excellent', label: 'Excellent', color: '#22c55e' },
  { value: 'Good', label: 'Good', color: '#3b82f6' },
  { value: 'Needs Improvement', label: 'Needs Improvement', color: '#f59e0b' },
  { value: 'Not Applicable', label: 'Not Attended', color: '#6b7280' }
];

// Convert rating to label
const getRatingLabel = (value) => {
  if (!value) return 'Not Attended';
  const option = ratingOptions.find(opt => opt.value === value);
  return option ? option.label : value;
};

// Convert rating to color
const getRatingColor = (value) => {
  if (!value) return '#6b7280';
  const option = ratingOptions.find(opt => opt.value === value);
  return option ? option.color : '#6b7280';
};

function StationFeedback() {
  const { station } = useParams();
  const stationName = station ? station.toUpperCase() : 'RAICHUR';
  
  const [feedbackData, setFeedbackData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    fetchFeedback();
  }, [stationName]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch feedback for this station (public endpoint - no auth required)
      const response = await fetch(`${API_BASE}/feedback/public?location=${stationName}`);
      
      if (!response.ok) {
        // If public endpoint doesn't exist, try the protected one with a demo token or fallback
        throw new Error('Failed to fetch feedback');
      }
      
      const data = await response.json();
      setFeedbackData(data);
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError('Unable to load feedback data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    if (feedbackData.length === 0) return null;
    
    const stats = {};
    
    questions.forEach(q => {
      const counts = { 'Excellent': 0, 'Good': 0, 'Needs Improvement': 0, 'Not Applicable': 0 };
      let total = 0;
      
      feedbackData.forEach(entry => {
        const value = entry.areas?.[q.key];
        if (value && value !== 0) {
          counts[value] = (counts[value] || 0) + 1;
          total++;
        }
      });
      
      stats[q.key] = { counts, total };
    });
    
    return stats;
  };

  const stats = calculateStats();

  return (
    <div className="feedback-form-container">
      {/* Header with station image */}
      <div className="notice-box-with-image">
        <img 
          src={stationName === 'YADGIR' ? require('./assests/Yadgirimage.jpg') : require('./assests/Raichurimage.jpg')} 
          alt={`${stationName} Railway Station`} 
          className="notice-station-image"
        />
        <div className="notice-box-feedback">
          <h2><i className="fa-solid fa-bullhorn"></i> Station Feedback Records</h2>
          <p><strong>Viewing feedback for: {stationName} Railway Station</strong></p>
          <p>Total submissions: {feedbackData.length}</p>
        </div>
      </div>

      <div className="title-container">
        <i className="fa-solid fa-train"></i>
        <h1>{stationName} RAILWAY STATION - FEEDBACK RECORDS</h1>
      </div>

      {error && (
        <div className="error-message">
          <i className="fa-solid fa-triangle-exclamation"></i> {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            border: '4px solid #e5e7eb', 
            borderTop: '4px solid #1e3c72', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite', 
            margin: '0 auto' 
          }}></div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p>Loading feedback data...</p>
        </div>
      ) : (
        <>
          {/* Statistics Summary */}
          {stats && feedbackData.length > 0 && (
            <div className="stats-section">
              <div className="section-title">
                <i className="fa-solid fa-chart-pie"></i> Rating Statistics
              </div>
              <div className="stats-grid">
                {questions.map((q, i) => (
                  <div key={q.key} className="stat-card">
                    <div className="stat-header">
                      <span className="stat-number">{i + 1}</span>
                      <span className="stat-label">{q.label}</span>
                    </div>
                    <div className="stat-bars">
                      {ratingOptions.slice(0, 3).map(opt => {
                        const count = stats[q.key]?.counts[opt.value] || 0;
                        const percentage = stats[q.key]?.total > 0 
                          ? (count / stats[q.key].total * 100).toFixed(0) 
                          : 0;
                        return (
                          <div key={opt.value} className="stat-bar-container">
                            <div className="stat-bar-label">{opt.label}</div>
                            <div className="stat-bar-wrapper">
                              <div 
                                className="stat-bar-fill" 
                                style={{ 
                                  width: `${percentage}%`,
                                  backgroundColor: opt.color
                                }}
                              ></div>
                            </div>
                            <div className="stat-bar-value">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback Records Table */}
          <div className="section-title">
            <i className="fa-solid fa-list"></i> Feedback Submissions ({feedbackData.length})
          </div>

          {feedbackData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
              <i className="fa-solid fa-inbox" style={{ fontSize: 48, marginBottom: 16 }}></i>
              <p>No feedback submissions found for this station.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #1e3c72, #2a5298)' }}>
                    <th style={{ ...th, color: 'white' }}>#</th>
                    <th style={{ ...th, color: 'white' }}>Date</th>
                    <th style={{ ...th, color: 'white' }}>Passenger</th>
                    <th style={{ ...th, color: 'white' }}>Mobile</th>
                    <th style={{ ...th, color: 'white', textAlign: 'center' }}>Ratings</th>
                    <th style={{ ...th, color: 'white' }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbackData.map((entry, idx) => (
                    <tr key={entry.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                      <td style={{ ...td, fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ ...td }}>{entry.date}</td>
                      <td style={{ ...td, fontWeight: 600 }}>{entry.passengerName}</td>
                      <td style={{ ...td, fontFamily: 'monospace' }}>{entry.mobile}</td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <button 
                          onClick={() => setSelectedEntry(entry)}
                          style={{ 
                            padding: '4px 12px', 
                            background: '#3b82f6', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: 4, 
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          View
                        </button>
                      </td>
                      <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selectedEntry && (
        <div style={modalBackdrop} onClick={() => setSelectedEntry(null)}>
          <div style={modalBody} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #e5e7eb' }}>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: 18, fontWeight: 700 }}>
                <i className="fa-solid fa-clipboard-check"></i> Feedback Details
              </h2>
              <button 
                onClick={() => setSelectedEntry(null)} 
                style={{ padding: '8px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                ✕ Close
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 16 }}>
              <div style={{ padding: 12, background: 'linear-gradient(135deg, #1e3c72, #0f172a)', color: 'white', borderRadius: 8 }}>
                <div style={{ fontSize: 10, opacity: 0.8 }}>ID</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedEntry.id}</div>
              </div>
              <div style={{ padding: 12, background: '#f1f5f9', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Date</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedEntry.date}</div>
              </div>
              <div style={{ padding: 12, background: '#f1f5f9', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Passenger</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedEntry.passengerName}</div>
              </div>
              <div style={{ padding: 12, background: '#f1f5f9', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Mobile</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedEntry.mobile}</div>
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#374151', fontWeight: 700 }}>
                <i className="fa-solid fa-star"></i> Ratings
              </h3>
              <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ ...th, fontSize: 11, width: 40 }}>#</th>
                      <th style={{ ...th, fontSize: 11 }}>Service Area</th>
                      <th style={{ ...th, fontSize: 11, textAlign: 'center' }}>Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, i) => {
                      const rating = selectedEntry.areas?.[q.key];
                      return (
                        <tr key={q.key} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                          <td style={{ ...td, textAlign: 'center', fontWeight: 600 }}>{i + 1}</td>
                          <td style={{ ...td, fontSize: 12 }}>{q.label}</td>
                          <td style={{ ...td, textAlign: 'center' }}>
                            <span style={{ 
                              background: `${getRatingColor(rating)}20`,
                              color: getRatingColor(rating),
                              padding: '2px 10px',
                              borderRadius: 10,
                              fontSize: 11,
                              fontWeight: 700
                            }}>
                              {getRatingLabel(rating)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            
            {selectedEntry.remarks && (
              <div style={{ padding: 12, background: '#fefce8', borderRadius: 8, border: '1px solid #fef08a' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>
                  <i className="fa-solid fa-comment"></i> Remarks
                </div>
                <div style={{ color: '#92400e', fontSize: 13 }}>{selectedEntry.remarks}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Back to Home Link */}
      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <a 
          href="/" 
          style={{ 
            display: 'inline-block',
            padding: '10px 20px', 
            background: '#1e3c72', 
            color: 'white', 
            textDecoration: 'none', 
            borderRadius: 8,
            fontWeight: 600
          }}
        >
          <i className="fa-solid fa-home"></i> Back to Home
        </a>
      </div>
    </div>
  );
}

const th = { textAlign: 'left', padding: '12px', borderBottom: '1px solid #eee', fontSize: 12, fontWeight: 600 };
const td = { padding: '10px', borderBottom: '1px solid #f3f4f6', fontSize: 12 };

const modalBackdrop = { 
  position: 'fixed', 
  inset: 0, 
  background: 'rgba(0,0,0,0.6)', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'center', 
  zIndex: 1000, 
  padding: 12, 
  overflow: 'auto' 
};

const modalBody = { 
  width: '100%', 
  maxWidth: 600, 
  maxHeight: '95vh', 
  overflow: 'auto', 
  background: '#fff', 
  borderRadius: 12, 
  padding: 20, 
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
};

export default StationFeedback;
