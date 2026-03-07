import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

// Station-specific metadata configuration
const stationMetaData = {
  raichur: {
    title: 'Passengers Feedback Form - Raichur Station',
    description: 'Railway Station Housekeeping Feedback System - Raichur Station',
    image: 'https://railway-feedback-system.vercel.app/Raichurimage.jpg',
    url: 'https://railway-feedback-system.vercel.app/raichur',
    stationName: 'Raichur Railway Station'
  },
  yadgir: {
    title: 'Passengers Feedback Form - Yadgir Station',
    description: 'Railway Station Housekeeping Feedback System - Yadgir Station',
    image: 'https://railway-feedback-system.vercel.app/Yadgirimage.jpg',
    url: 'https://railway-feedback-system.vercel.app/yadgir',
    stationName: 'Yadgir Railway Station'
  },
  default: {
    title: 'Passengers Feedback Form - Railway Station',
    description: 'Railway Station Housekeeping Feedback System',
    image: 'https://railway-feedback-system.vercel.app/railwaylogo.png',
    url: 'https://railway-feedback-system.vercel.app',
    stationName: 'Railway Station'
  }
};

function SEOHelmet() {
  const location = useLocation();
  
  // Determine which station based on the URL path
  const path = location.pathname.toLowerCase();
  
  let metaData = stationMetaData.default;
  
  if (path.includes('raichur')) {
    metaData = stationMetaData.raichur;
  } else if (path.includes('yadgir')) {
    metaData = stationMetaData.yadgir;
  }
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{metaData.title}</title>
      <meta name="title" content={metaData.title} />
      <meta name="description" content={metaData.description} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={metaData.url} />
      <meta property="og:title" content={metaData.title} />
      <meta property="og:description" content={metaData.description} />
      <meta property="og:image" content={metaData.image} />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={metaData.url} />
      <meta property="twitter:title" content={metaData.title} />
      <meta property="twitter:description" content={metaData.description} />
      <meta property="twitter:image" content={metaData.image} />
      
      {/* Additional Meta Tags for WhatsApp */}
      <meta property="og:site_name" content="Railway Station Feedback System" />
      <meta property="og:image:alt" content={metaData.stationName} />
    </Helmet>
  );
}

export default SEOHelmet;
