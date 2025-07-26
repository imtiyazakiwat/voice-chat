import React, { useState, useRef, useEffect } from 'react';
import AIAnimation from './components/AIAnimation';
import AIControls from './components/AIControls';
import './App.css';

export default function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [animationState, setAnimationState] = useState('idle');
  const [lockedEmotion, setLockedEmotion] = useState('neutral');
  const [lockedVoice, setLockedVoice] = useState('nova');
  const [conversationStarted, setConversationStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  const playNextAudio = async () => {
    if (audioQueueRef.current.length === 0 || isPlayingRef.current) return;

    isPlayingRef.current = true;
    setIsSpeaking(true);
    setAnimationState('speaking');
    
    const audioUrl = audioQueueRef.current.shift();
    
    try {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        isPlayingRef.current = false;
        setIsSpeaking(false);
        setAnimationState('idle');
        
        if (audioQueueRef.current.length > 0) {
          setTimeout(() => playNextAudio(), 150);
        }
      };

      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        isPlayingRef.current = false;
        setIsSpeaking(false);
        setAnimationState('idle');
      };

      audio.volume = isMuted ? 0 : 1;
      await audio.play();

    } catch (error) {
      console.error('Failed to play audio:', error);
      isPlayingRef.current = false;
      setIsSpeaking(false);
      setAnimationState('idle');
    }
  };

  const addToAudioQueue = (url) => {
    audioQueueRef.current.push(url);
    if (!isPlayingRef.current) playNextAudio();
  };

  const handleSendMessage = async (message) => {
    if (!message.trim()) return;

    if (!conversationStarted) {
      setConversationStarted(true);
    }

    setIsProcessing(true);
    setAnimationState('thinking');
    
    try {
      const res = await fetch('/.netlify/functions/generateTextStream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: message })
      });

      if (!res.ok) throw new Error('Failed to generate text');

      const data = await res.json();
      
      for (const sentence of data.sentences) {
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
        }
      }

    } catch (error) {
      console.error('Error:', error);
      setAnimationState('idle');
    } finally {
      setIsProcessing(false);
    }
  };

  const setupSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.log('Speech recognition not supported');
      return null;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setAnimationState('listening');
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        handleSendMessage(finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setAnimationState('idle');
    };

    recognition.onend = () => {
      setIsListening(false);
      setTimeout(() => {
        if (!isProcessing && !isPlayingRef.current) {
          setAnimationState('idle');
        }
      }, 1000);
    };

    return recognition;
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      if (!recognitionRef.current) {
        recognitionRef.current = setupSpeechRecognition();
      }
      recognitionRef.current?.start();
    }
  };

  const handleInterrupt = () => {
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Clear audio queue
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
    
    // Stop listening if active
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
    
    setAnimationState('idle');
    
    // Start listening for new input
    setTimeout(() => {
      if (!recognitionRef.current) {
        recognitionRef.current = setupSpeechRecognition();
      }
      recognitionRef.current?.start();
    }, 100);
  };

  const handleTextInput = (text) => {
    handleSendMessage(text);
  };

  const handleMuteToggle = (muted) => {
    setIsMuted(muted);
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : 1;
    }
  };

  return (
    <div className="app">
      <div className="chat-container">
        <h1>🤖 AI Voice Assistant</h1>
        
        <div className="animation-container">
          <AIAnimation state={animationState} />
        </div>

        <div className="settings-panel">
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

        <div className="controls-section">
          <AIControls
            isListening={isListening}
            isSpeaking={isSpeaking}
            isProcessing={isProcessing}
            onToggleVoice={toggleVoiceInput}
            onInterrupt={handleInterrupt}
            onSendText={handleTextInput}
            onMuteToggle={handleMuteToggle}
            disabled={isProcessing}
          />
        </div>
      </div>
    </div>
  );
}