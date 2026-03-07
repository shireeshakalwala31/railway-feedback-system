export const config = {
  runtime: 'edge',
};

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
    image: 'https://railway-feedback-system.vercel.app/rrb-logo.png',
    url: 'https://railway-feedback-system.vercel.app',
    stationName: 'Railway Station'
  }
};

function getHTML(metaData) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#6366f1" />
  <meta name="description" content="${metaData.description}" />
  <link rel="icon" href="https://railway-feedback-system.vercel.app/rrb-logo.png" type="image/png" />
  <link rel="apple-touch-icon" href="https://railway-feedback-system.vercel.app/logo192.png" />
  <link rel="manifest" href="https://railway-feedback-system.vercel.app/manifest.json" />
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${metaData.url}" />
  <meta property="og:title" content="${metaData.title}" />
  <meta property="og:description" content="${metaData.description}" />
  <meta property="og:image" content="${metaData.image}" />
  <meta property="og:site_name" content="Railway Station Feedback System" />
  <meta property="og:image:alt" content="${metaData.stationName}" />
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image" />
  <meta property="twitter:url" content="${metaData.url}" />
  <meta property="twitter:title" content="${metaData.title}" />
  <meta property="twitter:description" content="${metaData.description}" />
  <meta property="twitter:image" content="${metaData.image}" />
  
  <title>${metaData.title}</title>
  
  <style>
    body { margin: 0; font-family: 'Poppins', sans-serif; }
    #root:empty {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    }
    #root:empty::after {
      content: '';
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
  
  <!-- Preconnect for fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  
  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
</head>
<body>
  <noscript>You need to enable JavaScript to run this app.</noscript>
  <div id="root"></div>
  <script>
    // Redirect to the main app after setting the correct meta tags
    window.location.href = '${metaData.url}';
  </script>
</body>
</html>`;
}

export default function handler(request) {
  const url = new URL(request.url);
  const path = url.pathname.toLowerCase();
  
  let metaData = stationMetaData.default;
  
  if (path.includes('raichur')) {
    metaData = stationMetaData.raichur;
  } else if (path.includes('yadgir')) {
    metaData = stationMetaData.yadgir;
  }
  
  const html = getHTML(metaData);
  
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
