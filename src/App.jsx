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
  const [lockedEmotion, setLockedEmotion] = useState('neutral');
  const [lockedVoice, setLockedVoice] = useState('nova');
  const [conversationStarted, setConversationStarted] = useState(false);
  
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  // Audio playback management with preloading for continuous speech
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
      
      // Preload next audio while current is playing
      if (audioQueueRef.current.length > 0) {
        const nextAudio = new Audio(audioQueueRef.current[0]);
        nextAudio.load(); // Preload next audio
      }
      
      audio.onended = () => {
        isPlayingRef.current = false;
        setIsPlaying(false);
        
        if (audioQueueRef.current.length > 0) {
          setTimeout(() => playNextAudio(), 150); // Small delay for audio continuity
        }
      };

      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        isPlayingRef.current = false;
        setIsPlaying(false);
        playNextAudio();
      };

      // Reduce initial load delay
      audio.preload = 'auto';
      await audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      isPlayingRef.current = false;
      setIsPlaying(false);
      playNextAudio();
    }
  };

  // Add audio to queue and start immediate playback
  const addToAudioQueue = (url) => {
    audioQueueRef.current.push(url);
    setAudioQueue(prev => [...prev, url]);
    
    // Start playing immediately with first sentence (buffer line)
    if (!isPlayingRef.current) {
      playNextAudio();
    }
  };

  // Handle text generation and audio synthesis with emotion locking
  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    // Lock emotion and voice when conversation starts
    if (!conversationStarted) {
      setConversationStarted(true);
    }

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
      
      // Process each sentence for TTS with locked emotion/voice
      for (const sentence of data.sentences) {
        setCurrentSentence(sentence);
        
        // Synthesize audio for this sentence with locked parameters
        const ttsRes = await fetch('/.netlify/functions/synthesizeAudio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: sentence,
            voice: lockedVoice,
            emotion: lockedEmotion
          })
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
          <div className="controls-section">
            <div className="voice-emotion-controls">
              <div className="control-group">
                <label>Voice:</label>
                <select
                  value={lockedVoice}
                  onChange={(e) => setLockedVoice(e.target.value)}
                  disabled={conversationStarted || isProcessing}
                >
                  <option value="alloy">Alloy</option>
                  <option value="echo">Echo</option>
                  <option value="fable">Fable</option>
                  <option value="onyx">Onyx</option>
                  <option value="nova">Nova</option>
                  <option value="shimmer">Shimmer</option>
                </select>
              </div>
              
              <div className="control-group">
                <label>Emotion:</label>
                <select
                  value={lockedEmotion}
                  onChange={(e) => setLockedEmotion(e.target.value)}
                  disabled={conversationStarted || isProcessing}
                >
                  <option value="neutral">Neutral</option>
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="calm">Calm</option>
                  <option value="empathetic">Empathetic</option>
                </select>
              </div>
              
              {conversationStarted && (
                <div className="locked-indicator">
                  🔒 Settings locked for this conversation
                </div>
              )}
            </div>
          </div>
          
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