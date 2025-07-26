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

    const response = await fetch('https://52c46ae1c48c.ngrok-free.app/v1/chat/completions', {
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
    const CHUNK_TIMEOUT = 1200; // Balanced timeout
    const MIN_SENTENCE_LENGTH = 15; // Allow shorter sentences for better flow
    
    // Process sentences with proper boundaries to avoid duplicates
    const processSentences = async () => {
      while (true) {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('chunk_timeout')), CHUNK_TIMEOUT)
        );
        
        try {
          const result = await Promise.race([
            reader.read(),
            timeoutPromise
          ]);
          
          if (result.done) {
            // Process remaining buffer
            if (sentenceBuffer.trim()) {
              sentences.push(sentenceBuffer.trim());
            }
            break;
          }
          
          lastChunkTime = Date.now();
          const chunk = decoder.decode(result.value, { stream: true });
          
          // Parse SSE format
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                if (sentenceBuffer.trim()) {
                  sentences.push(sentenceBuffer.trim());
                }
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  sentenceBuffer += content;
                  
                  // Only split on clear sentence boundaries
                  const sentenceEndRegex = /[.!?]+(?:\s|$)/;
                  let match;
                  
                  while ((match = sentenceEndRegex.exec(sentenceBuffer)) !== null) {
                    const sentence = sentenceBuffer.substring(0, match.index + match[0].length).trim();
                    if (sentence.length >= MIN_SENTENCE_LENGTH) {
                      sentences.push(sentence);
                      sentenceBuffer = sentenceBuffer.substring(match.index + match[0].length).trim();
                    }
                  }
                  
                  // Handle very long sentences without clear breaks
                  if (sentenceBuffer.length > 150) {
                    // Find last good break point
                    const lastSpace = sentenceBuffer.lastIndexOf(' ', 120);
                    if (lastSpace > MIN_SENTENCE_LENGTH) {
                      const sentence = sentenceBuffer.substring(0, lastSpace).trim();
                      sentences.push(sentence);
                      sentenceBuffer = sentenceBuffer.substring(lastSpace + 1).trim();
                    } else {
                      // Force break at 150 chars
                      const sentence = sentenceBuffer.substring(0, 150).trim();
                      sentences.push(sentence);
                      sentenceBuffer = sentenceBuffer.substring(150).trim();
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
            // Timeout reached, process remaining buffer
            sentences.push(sentenceBuffer.trim());
            sentenceBuffer = '';
            break;
          } else if (error.message !== 'chunk_timeout') {
            throw error;
          }
        }
      }
    };
    
    await processSentences();

    // Handle any remaining buffer
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