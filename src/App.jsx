import React, { useState, useRef, useEffect } from 'react';
import './App.css';

export default function App() {
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentSentence, setCurrentSentence] = useState('');
  const [audioQueue, setAudioQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [messages, setMessages] = useState([]);
  
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // Audio playback management
  const playNextAudio = async () => {
    if (audioQueueRef.current.length === 0 || isPlayingRef.current) {
      return;
    }

    isPlayingRef.current = true;
    setIsPlaying(true);
    
    const audioUrl = audioQueueRef.current.shift();
    setAudioQueue(prev => prev.slice(1));

    try {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        
        if (audioQueueRef.current.length > 0) {
          setTimeout(() => playNextAudio(), 500); // Small delay between sentences
        }
      };

      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        isPlayingRef.current = false;
        setIsPlaying(false);
        playNextAudio(); // Try next audio
      };

      await audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      isPlayingRef.current = false;
      setIsPlaying(false);
      playNextAudio();
    }
  };

  // Add audio to queue
  const addToAudioQueue = (url) => {
    audioQueueRef.current.push(url);
    setAudioQueue(prev => [...prev, url]);
    
    // Start playing if we have enough buffer (2+ audio files)
    if (!isPlayingRef.current && audioQueueRef.current.length >= 2) {
      playNextAudio();
    }
  };

  // Handle text generation and audio synthesis
  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    setIsProcessing(true);
    setMessages(prev => [...prev, { type: 'user', text: message }]);
    
    try {
      // Generate text stream
      const res = await fetch('/.netlify/functions/generateTextStream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message })
      });

      if (!res.ok) {
        throw new Error('Failed to generate text');
      }

      const data = await res.json();
      
      // Process each sentence for TTS
      for (const sentence of data.sentences) {
        setCurrentSentence(sentence);
        
        // Synthesize audio for this sentence
        const ttsRes = await fetch('/.netlify/functions/synthesizeAudio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: sentence })
        });

        if (ttsRes.ok) {
          const ttsData = await ttsRes.json();
          addToAudioQueue(ttsData.audioUrl);
          
          // Add to messages
          setMessages(prev => [...prev, { type: 'assistant', text: sentence }]);
        }
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { type: 'error', text: 'Failed to process message' }]);
    } finally {
      setIsProcessing(false);
      setCurrentSentence('');
    }
  };

  // Web Speech API setup
  const setupSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Speech recognition not supported');
      return null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setInput(finalTranscript);
        handleSendMessage(finalTranscript);
        setInput('');
      } else {
        setInput(interimTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  };

  // Toggle voice input
  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (!recognitionRef.current) {
        recognitionRef.current = setupSpeechRecognition();
      }
      recognitionRef.current?.start();
    }
  };

  // Handle text input submission
  const handleSubmit = () => {
    if (input.trim()) {
      handleSendMessage(input);
      setInput('');
    }
  };

  // Handle enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="app">
      <div className="chat-container">
        <h1>🎤 Streaming Voice Chat</h1>
        
        <div className="messages-container">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.type}`}>
              <div className="message-content">{message.text}</div>
            </div>
          ))}
          
          {isProcessing && currentSentence && (
            <div className="message assistant processing">
              <div className="message-content">{currentSentence}</div>
              <div className="typing-indicator">...</div>
            </div>
          )}
          
          {isProcessing && !currentSentence && (
            <div className="message assistant processing">
              <div className="message-content">Generating response...</div>
            </div>
          )}
        </div>

        <div className="input-container">
          <div className="input-group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... or use voice input"
              rows={3}
              disabled={isProcessing}
            />
            
            <div className="controls">
              <button 
                className={`voice-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleVoiceInput}
                disabled={isProcessing}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? '🛑' : '🎤'}
              </button>
              
              <button 
                className="send-btn"
                onClick={handleSubmit}
                disabled={isProcessing || !input.trim()}
              >
                {isProcessing ? '⏳' : 'Send'}
              </button>
            </div>
          </div>
          
          {audioQueue.length > 0 && (
            <div className="audio-queue-info">
              Audio queue: {audioQueue.length} sentence{audioQueue.length !== 1 ? 's' : ''}
              {isPlaying && ' (playing...)'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}