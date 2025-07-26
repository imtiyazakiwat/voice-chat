import React, { useState, useRef, useEffect } from 'react';
import './AIControls.css';

const AIControls = ({ 
  isListening, 
  isSpeaking, 
  isProcessing, 
  onToggleVoice, 
  onInterrupt,
  onSendText,
  disabled 
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (showTextInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showTextInput]);

  const handleMicClick = () => {
    if (isSpeaking) {
      onInterrupt();
    } else {
      onToggleVoice();
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onSendText(textInput);
      setTextInput('');
      setShowTextInput(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  };

  const getMicIcon = () => {
    if (isSpeaking) return '⏸️';
    if (isListening) return '🛑';
    if (isMuted) return '🔇';
    return '🎤';
  };

  const getMicLabel = () => {
    if (isSpeaking) return 'Tap to interrupt';
    if (isListening) return 'Listening...';
    if (isMuted) return 'Muted';
    return 'Tap to speak';
  };

  return (
    <div className="ai-controls">
      <div className="control-center">
        <button 
          className={`main-mic-button ${isListening ? 'listening' : ''} ${isSpeaking ? 'interrupt' : ''}`}
          onClick={handleMicClick}
          disabled={disabled}
          title={getMicLabel()}
        >
          <span className="mic-icon">{getMicIcon()}</span>
          <span className="mic-label">{getMicLabel()}</span>
        </button>

        <div className="control-options">
          <button 
            className={`mute-button ${isMuted ? 'active' : ''}`}
            onClick={handleMuteToggle}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <button 
            className="text-button"
            onClick={() => setShowTextInput(!showTextInput)}
            title="Type message"
          >
            ⌨️
          </button>
        </div>
      </div>

      {showTextInput && (
        <div className="text-input-overlay">
          <div className="text-input-container">
            <textarea
              ref={inputRef}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              rows={3}
              disabled={disabled}
            />
            <div className="text-input-controls">
              <button onClick={() => setShowTextInput(false)}>Cancel</button>
              <button onClick={handleTextSubmit} disabled={!textInput.trim()}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIControls;