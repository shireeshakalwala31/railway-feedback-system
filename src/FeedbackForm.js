import React, { useState } from 'react';
import './FeedbackForm.css';

// Always point to the live obhs Render backend directly
const API_BASE = process.env.REACT_APP_API_BASE || 'https://railway-feedback-backend.onrender.com/api';

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

// Rating options
const ratingOptions = [
  { value: 5, label: 'Very Good' },
  { value: 4, label: 'Satisfactory' },
  { value: 2, label: 'Poor' },
  { value: 0, label: 'Not Attended' }
];

function FeedbackForm({ onBack, predefinedStation }) {
  // Passenger details state
  const [passengerName, setPassengerName] = useState('');
  const [dateOfJourney, setDateOfJourney] = useState('');
  const [fromStation, setFromStation] = useState(predefinedStation || '');
  const [toStation, setToStation] = useState(predefinedStation || '');
  const [ticketNumber, setTicketNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  // Feedback state
  const [stations, setStations] = useState([]);
  const [currentStep, setCurrentStep] = useState(1); // 1: passenger details, 2: feedback
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [currentStation, setCurrentStation] = useState('');
  const [currentRatings, setCurrentRatings] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');

  // Validation functions
  const validateName = (name) => /^[A-Za-z\s]+$/.test(name);
  const validateMobile = (mobile) => /^[6-9]\d{9}$/.test(mobile);
  const validateEmail = (email) => /^[A-Za-z0-9]+@gmail\.com$/.test(email);
  const validateStation = (station) => /^[A-Za-z\s]+$/.test(station);

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
    if (!predefinedStation) {
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
    }
    if (!ticketNumber) {
      setError('Ticket Number is required');
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
      setError('Please enter a valid Gmail address');
      return;
    }

    // Set stations for feedback
    const targetStations = predefinedStation ? [predefinedStation] : [fromStation, toStation];
    setStations(targetStations);
    setCurrentStation(targetStations[0]);
    setCurrentStep(2);
  };

  // Handle rating change
  const handleRatingChange = (questionKey, value) => {
    setCurrentRatings(prev => ({
      ...prev,
      [questionKey]: value
    }));
  };

  // Submit feedback — receives the final complete entries list directly to avoid stale-state race condition
  const handleSubmitFeedback = async (allEntries) => {
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          passengerName,
          dateOfJourney,
          fromStation,
          toStation,
          ticketNumber,
          mobile,
          email,
          feedbackEntries: allEntries
        })
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

  // Add station feedback — builds the complete entries list synchronously to avoid React stale-state bug
  const handleAddStationFeedback = () => {
    // Check all ratings are filled
    const unfilledQuestions = questions.filter(q => currentRatings[q.key] === undefined || currentRatings[q.key] === null);
    if (unfilledQuestions.length > 0) {
      setError('Please rate all categories');
      return;
    }
    setError('');

    // Build the new entry for the current station
    const newEntry = {
      station: currentStation,
      ratings: { ...currentRatings }
    };

    // Build complete entries list synchronously — do NOT rely on state that hasn't updated yet
    const allEntries = [...feedbackEntries, newEntry];

    // Find next station
    const currentIndex = stations.indexOf(currentStation);
    if (currentIndex < stations.length - 1) {
      // More stations to rate — update state and move to next station
      setFeedbackEntries(allEntries);
      setCurrentRatings({});
      setCurrentStation(stations[currentIndex + 1]);
    } else {
      // Last (or only) station done — submit immediately with the complete synchronized list
      handleSubmitFeedback(allEntries);
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
    setStations([]);
    setFeedbackEntries([]);
    setCurrentStation('');
    setCurrentRatings({});
    setCurrentStep(1);
    setSubmitSuccess(false);
    setError('');
  };

  // If submitted successfully
  if (submitSuccess) {
    return (
      <div className="feedback-form-container">
        <div className="thankyou-page">
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
          <strong> CMCC Housekeeping</strong> round the clock at RC station.
        </p>
        <p>
          <strong>Feedback:</strong> Passengers are requested to give feedback regarding services 
          provided by CMCC staff, in the forms available with CMCC staff. 
          Based on your feedback, payment to the contractor will be made and 
          it will help us to serve you better.
        </p>
      </div>

      <h1>FEEDBACK FORM FOR CMCC HOUSEKEEPING {predefinedStation ? `- ${predefinedStation}` : ''}</h1>

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

          {!predefinedStation && (
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
          )}

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
            <i className="fa-solid fa-building"></i> Feedback for: {currentStation}
          </div>

          <div className="stations-progress">
            {stations.map((station, index) => (
              <span 
                key={station} 
                className={`station-badge ${station === currentStation ? 'active' : ''} ${
                  feedbackEntries.find(e => e.station === station) ? 'completed' : ''
                }`}
              >
                {station}
              </span>
            ))}
          </div>

          <table className="rating-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Area</th>
                <th>Very Good</th>
                <th>Satisfactory</th>
                <th>Poor</th>
                <th>Not Attended</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, i) => (
                <tr key={q.key}>
                  <td>{i + 1}</td>
                  <td style={{ textAlign: 'left' }}>{q.label}</td>
                  {ratingOptions.map(option => (
                    <td key={option.value}>
                      <input
                        type="radio"
                        name={`rating-${q.key}`}
                        checked={currentRatings[q.key] === option.value}
                        onChange={() => handleRatingChange(q.key, option.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <button 
            className="add-btn" 
            onClick={handleAddStationFeedback}
            disabled={isSubmitting}
          >
            <i className="fa-solid fa-plus"></i> 
            {feedbackEntries.length < stations.length - 1 
              ? `Add ${stations[feedbackEntries.length + 1]} Feedback` 
              : 'Submit Feedback'}
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
