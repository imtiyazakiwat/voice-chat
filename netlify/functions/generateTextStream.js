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

    const response = await fetch('http://localhost:8080/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'kimi-k2',
        stream: true,
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Respond naturally and concisely.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let sentenceBuffer = '';
    const sentences = [];
    let lastChunkTime = Date.now();
    const CHUNK_TIMEOUT = 2000; // 2 seconds timeout for immediate conversion
    
    // Timeout handling for immediate conversion
    const processWithTimeout = async () => {
      while (true) {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('chunk_timeout')), CHUNK_TIMEOUT)
        );
        
        try {
          const result = await Promise.race([
            reader.read(),
            timeoutPromise
          ]);
          
          if (result.done) break;
          
          lastChunkTime = Date.now();
          const chunk = decoder.decode(result.value, { stream: true });
          
          // Parse SSE format
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  sentenceBuffer += content;
                  
                  // Check for sentence completion or buffer limit
                  if (/[.!?]\s*$/.test(sentenceBuffer) || sentenceBuffer.length > 150) {
                    const sentence = sentenceBuffer.trim();
                    if (sentence.length > 0) {
                      sentences.push(sentence);
                      sentenceBuffer = '';
                    }
                  }
                }
              } catch (e) {
                console.warn('Invalid JSON in stream:', data);
              }
            }
          }
        } catch (error) {
          if (error.message === 'chunk_timeout' && sentenceBuffer.trim()) {
            // Timeout reached, process remaining buffer immediately
            sentences.push(sentenceBuffer.trim());
            sentenceBuffer = '';
            break;
          } else if (error.message !== 'chunk_timeout') {
            throw error;
          }
        }
      }
    };
    
    await processWithTimeout();

    // Handle any remaining buffer as a final sentence
    if (sentenceBuffer.trim()) {
      sentences.push(sentenceBuffer.trim());
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ sentences })
    };

  } catch (error) {
    console.error('Error in generateTextStream:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate text stream' })
    };
  }
}