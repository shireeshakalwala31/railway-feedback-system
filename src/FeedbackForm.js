import React, { useState } from 'react';
import './FeedbackForm.css';

const API_BASE = "https://railway-feedback-system-production.up.railway.app/api";

// Rating questions matching the original form
const questions = [
  { key: 'platformCleanliness', label: 'Platform cleanliness & disinfection' },
  { key: 'tapsCleanliness', label: 'Cleanliness around taps' },
  { key: 'tracksCleanliness', label: 'Cleanliness of tracks' },
  { key: 'waitingHall', label: 'Waiting hall cleanliness' },
  { key: 'toilets', label: 'Toilets & wash basins' },
  { key: 'retiringRoom', label: 'Retiring room cleanliness' },
  { key: 'staffBehavior', label: 'Staff behavior & appearance' }
];

// Rating options matching HTML
const ratingOptions = [
  { value: 'Excellent', label: 'Excellent' },
  { value: 'Good', label: 'Good' },
  { value: 'Needs Improvement', label: 'Needs Improvement' },
  { value: 'Not Applicable', label: 'Not Attended' }
];

// Star rating options
const starRatings = [
  { value: 5, label: '5 Stars' },
  { value: 4, label: '4 Stars' },
  { value: 3, label: '3 Stars' },
  { value: 2, label: '2 Stars' },
  { value: 1, label: '1 Star' }
];

function FeedbackForm({ onBack }) {
  // Passenger details state
  const [passengerName, setPassengerName] = useState('');
  const [dateOfJourney, setDateOfJourney] = useState('');
  const [fromStation, setFromStation] = useState('');
  const [toStation, setToStation] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  // Feedback state
  const [stations, setStations] = useState(['RAICHUR']);
  const [currentStep, setCurrentStep] = useState(1);
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [currentStation, setCurrentStation] = useState('RAICHUR');
  const [currentRatings, setCurrentRatings] = useState({});
  const [overallRating, setOverallRating] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  // Validation functions
  const validateName = (name) => /^[A-Za-z\s]+$/.test(name);
  const validateMobile = (mobile) => /^[6-9]\d{9}$/.test(mobile);
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validateStation = (station) => /^[A-Za-z\s]+$/.test(station);
  const validateTicket = (ticket) => /^[A-Za-z0-9]+$/.test(ticket);

  // Handle passenger details submission
  const handleProceedToFeedback = () => {
    setError('');

    if (!passengerName) {
      setError('Passenger Name is required');
      return;
    }
    if (!validateName(passengerName)) {
      setError('Name should contain only alphabets');
      return;
    }
    if (!dateOfJourney) {
      setError('Please select Date of Journey');
      return;
    }
    if (!fromStation) {
      setError('From Station is required');
      return;
    }
    if (!validateStation(fromStation)) {
      setError('From Station should contain only alphabets');
      return;
    }
    if (!toStation) {
      setError('To Station is required');
      return;
    }
    if (!validateStation(toStation)) {
      setError('To Station should contain only alphabets');
      return;
    }
    if (fromStation.toLowerCase() === toStation.toLowerCase()) {
      setError('From and To stations cannot be same');
      return;
    }
    if (!ticketNumber) {
      setError('Ticket Number is required');
      return;
    }
    if (!validateTicket(ticketNumber)) {
      setError('Ticket Number should not contain special characters');
      return;
    }
    if (!mobile) {
      setError('Mobile Number is required');
      return;
    }
    if (!validateMobile(mobile)) {
      setError('Enter valid 10-digit Indian mobile number');
      return;
    }
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Set stations for feedback - fixed to Raichur
    setStations(['RAICHUR']);
    setCurrentStation('RAICHUR');
    setCurrentStep(2);
  };

  // Handle rating change
  const handleRatingChange = (questionKey, value) => {
    setCurrentRatings(prev => ({
      ...prev,
      [questionKey]: value
    }));
  };

  // Handle star click
  const handleStarClick = (rating) => {
    setOverallRating(rating);
  };

  // Add station feedback
  const handleAddStationFeedback = () => {
    // Check all ratings are filled
    const unfilledQuestions = questions.filter(q => !currentRatings[q.key]);
    if (unfilledQuestions.length > 0) {
      setError('Please rate all categories');
      return;
    }

    if (overallRating === 0) {
      setError('Please give overall rating');
      return;
    }

    // Add current station feedback
    setFeedbackEntries(prev => [
      ...prev,
      {
        station: currentStation,
        ratings: { ...currentRatings },
        overallRating,
        remarks
      }
    ]);

    // Submit feedback
    submitFeedback([...feedbackEntries, { station: currentStation, ratings: { ...currentRatings }, overallRating, remarks }]);
  };

  // Submit feedback to backend
  const submitFeedback = async (entries) => {
    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        passengerName,
        dateOfJourney,
        fromStation,
        toStation,
        ticketNumber,
        mobile,
        email,
        feedbackEntries: entries
      };

      const response = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      const result = await response.json();
      console.log('Feedback submitted:', result);
      setSubmitSuccess(true);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setPassengerName('');
    setDateOfJourney('');
    setFromStation('');
    setToStation('');
    setTicketNumber('');
    setMobile('');
    setEmail('');
    setStations(['RAICHUR']);
    setFeedbackEntries([]);
    setCurrentStation('RAICHUR');
    setCurrentRatings({});
    setOverallRating(0);
    setRemarks('');
    setCurrentStep(1);
    setSubmitSuccess(false);
    setError('');
  };

  // If submitted successfully
  if (submitSuccess) {
    return (
      <div className="feedback-form-container">
        <div className="thankyou-page active">
          <div className="thankyou-box">
            <h2><i className="fa-solid fa-circle-check"></i> Thank You For Your Feedback!</h2>
            <p>Your valuable feedback has been successfully submitted.</p>
            <p>We appreciate your time in helping us improve cleanliness services.</p>
            <button className="back-btn" onClick={handleReset}>
              <i className="fa-solid fa-arrow-left"></i> Submit Another Feedback
            </button>
            {onBack && (
              <button className="back-btn dashboard-btn" onClick={onBack}>
                <i className="fa-solid fa-home"></i> Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-form-container">
      {/* Notice Box */}
      <div className="notice-box">
        <h2><i className="fa-solid fa-bullhorn"></i> Passenger Notice</h2>
        <p><strong>Dear Passenger,</strong></p>
        <p>
          Our endeavor is to provide you the most hygienic services under 
          <strong> Railway Station Housekeeping</strong> round the clock at Raichur station.
        </p>
        <p>
          <strong>Feedback:</strong> Passengers are requested to give feedback regarding services 
          provided by housekeeping staff, in the forms available with station staff. 
          Based on your feedback, payment to the contractor will be made and 
          it will help us to serve you better.
        </p>
      </div>

      <div className="title-container">
        <i className="fa-solid fa-train moving-train"></i>
        <h1>PASSENGER FEEDBACK FORM FOR RAICHUR RAILWAY STATION</h1>
      </div>

      {error && (
        <div className="error-message">
          <i className="fa-solid fa-triangle-exclamation"></i> {error}
        </div>
      )}

      {currentStep === 1 && (
        <div className="passenger-details">
          <div className="section-title">
            <i className="fa-solid fa-user"></i> Passenger Details
          </div>

          <div className="form-group">
            <label>Passenger Name *</label>
            <input 
              type="text" 
              value={passengerName}
              onChange={(e) => setPassengerName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div className="form-group">
            <label>Date of Journey *</label>
            <input 
              type="date" 
              value={dateOfJourney}
              onChange={(e) => setDateOfJourney(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>From Station *</label>
              <input 
                type="text" 
                value={fromStation}
                onChange={(e) => setFromStation(e.target.value.toUpperCase())}
                placeholder="Departure station"
              />
            </div>

            <div className="form-group">
              <label>To Station *</label>
              <input 
                type="text" 
                value={toStation}
                onChange={(e) => setToStation(e.target.value.toUpperCase())}
                placeholder="Arrival station"
              />
            </div>
          </div>

          <div className="form-group">
            <label>PNR / UTS Ticket No *</label>
            <input 
              type="text" 
              value={ticketNumber}
              onChange={(e) => setTicketNumber(e.target.value)}
              placeholder="Enter PNR or ticket number"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Mobile Number *</label>
              <input 
                type="tel" 
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile number"
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@gmail.com"
              />
            </div>
          </div>

          <button 
            className="primary-btn" 
            onClick={handleProceedToFeedback}
          >
            <i className="fa-solid fa-arrow-right"></i> Proceed to Feedback
          </button>
        </div>
      )}

      {currentStep === 2 && (
        <div className="feedback-section">
          <div className="section-title">
            <i className="fa-solid fa-building"></i> Feedback for: RAICHUR STATION
          </div>

          <div className="rating-cards">
            {questions.map((q, i) => (
              <div className="rating-card" key={q.key}>
                <div className="rating-card-header">
                  <span className="rating-serial">{i + 1}</span>
                  <span className="rating-label">{q.label}</span>
                </div>
                <div className="rating-select-wrapper">
                  <select
                    value={currentRatings[q.key] || ''}
                    onChange={(e) => handleRatingChange(q.key, e.target.value)}
                    className="rating-select"
                  >
                    <option value="" disabled>Select Rating</option>
                    {ratingOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="select-arrow">
                    <i className="fa-solid fa-chevron-down"></i>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Overall Rating with Stars */}
          <div className="overall-rating-section">
            <div className="section-title">
              <i className="fa-solid fa-star"></i> Overall Rating
            </div>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${star <= overallRating ? 'active' : ''}`}
                  onClick={() => handleStarClick(star)}
                  style={{
                    fontSize: '32px',
                    cursor: 'pointer',
                    color: star <= overallRating ? '#ffc107' : '#ddd',
                    transition: 'color 0.2s'
                  }}
                >
                  <i className={`fa-solid fa-star`}></i>
                </span>
              ))}
            </div>
            <p className="rating-text">
              {overallRating === 0 ? 'Click to rate' : 
               overallRating === 5 ? 'Excellent!' :
               overallRating === 4 ? 'Very Good' :
               overallRating === 3 ? 'Good' :
               overallRating === 2 ? 'Fair' : 'Poor'}
            </p>
          </div>

          {/* Remarks Section */}
          <div className="remarks-section">
            <div className="section-title">
              <i className="fa-solid fa-comment"></i> Remarks / Suggestions
            </div>
            <textarea
              className="remarks-textarea"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter your suggestions or feedback here..."
              rows="4"
            ></textarea>
          </div>

          <button 
            className="add-btn" 
            onClick={handleAddStationFeedback}
            disabled={isSubmitting}
          >
            <i className="fa-solid fa-paper-plane"></i> 
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      )}

      {onBack && (
        <button className="back-btn-small" onClick={onBack}>
          <i className="fa-solid fa-arrow-left"></i> Back to Dashboard
        </button>
      )}
    </div>
  );
}

export default FeedbackForm;
