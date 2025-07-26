// netlify/functions/synthesizeAudio.js
// Use native fetch in Node.js 18+

export async function handler(event, context) {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const body = JSON.parse(event.body);
    const text = body.text;
    const emotion = body.emotion || 'neutral'; // Default emotion
    const voice = body.voice || 'nova'; // Allow voice selection

    if (!text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Text is required' })
      };
    }

    const response = await fetch('https://2dd6f43b5fff.ngrok-free.app /v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        messages: [{ role: 'user', content: text }],
        voice: voice
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.text();
    
    // Extract audio path from response
    const audioPathMatch = result.match(/\/media\/[^\"]+\.wav/);
    if (!audioPathMatch) {
      throw new Error('No audio path found in response');
    }

    const audioPath = audioPathMatch[0];
    const fullUrl = `https://2dd6f43b5fff.ngrok-free.app ${audioPath}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ audioUrl: fullUrl })
    };

  } catch (error) {
    console.error('Error in synthesizeAudio:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to synthesize audio' })
    };
  }
}