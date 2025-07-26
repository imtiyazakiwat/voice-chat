// netlify/functions/generateTextStream.js
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
    const prompt = body.prompt;

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Prompt is required' })
      };
    }

    console.log('Processing prompt:', prompt);
    
    // Use non-streaming mode for reliable response
    const response = await fetch('http://13.53.131.77:8080/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'kimi-k2',
        stream: false,  // Changed to false for reliable response
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Respond naturally and concisely.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const fullResponse = result.choices?.[0]?.message?.content || "I'm here to help!";
    
    // Split into sentences
    const sentences = [];
    const sentenceEndRegex = /[.!?]+(?:\s|$)/;
    let remainingText = fullResponse;
    
    let match;
    while ((match = sentenceEndRegex.exec(remainingText)) !== null) {
      const sentence = remainingText.substring(0, match.index + match[0].length).trim();
      if (sentence.length >= 5) {
        sentences.push(sentence);
      }
      remainingText = remainingText.substring(match.index + match[0].length).trim();
    }
    
    if (remainingText.trim()) {
      sentences.push(remainingText.trim());
    }
    
    // Fallback if no sentences
    if (sentences.length === 0) {
      sentences.push(fullResponse);
    }
    
    console.log('Response:', sentences);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sentences })
    };

  } catch (error) {
    console.error('Error:', error);
    
    // Return fallback sentences
    const fallbackSentences = [
      "Hello! I'm here to help you.",
      "Let me assist with your question.",
      "Feel free to ask me anything!"
    ];
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sentences: fallbackSentences })
    };
  }
}