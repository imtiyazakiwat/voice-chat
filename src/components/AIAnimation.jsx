import React from 'react';
import './AIAnimation.css';

const AIAnimation = ({ state }) => {
  const getAnimationClass = () => {
    switch (state) {
      case 'idle':
        return 'ai-animation idle';
      case 'listening':
        return 'ai-animation listening';
      case 'thinking':
        return 'ai-animation thinking';
      case 'speaking':
        return 'ai-animation speaking';
      default:
        return 'ai-animation idle';
    }
  };

  const renderWaveform = () => {
    const bars = Array.from({ length: 20 }, (_, i) => (
      <div
        key={i}
        className="waveform-bar"
        style={{
          animationDelay: `${i * 0.1}s`,
          animationDuration: `${1.5 + (i % 3) * 0.3}s`
        }}
      />
    ));
    return <div className="waveform-container">{bars}</div>;
  };

  const renderListeningCircles = () => {
    return (
      <div className="listening-circles">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>
    );
  };

  const renderThinkingDots = () => {
    return (
      <div className="thinking-dots">
        <div className="dot dot-1"></div>
        <div className="dot dot-2"></div>
        <div className="dot dot-3"></div>
      </div>
    );
  };

  const renderSpeakingWaves = () => {
    const waves = Array.from({ length: 5 }, (_, i) => (
      <div
        key={i}
        className="speaking-wave"
        style={{
          animationDelay: `${i * 0.2}s`,
          animationDuration: `${0.8 + (i % 2) * 0.4}s`
        }}
      />
    ));
    return <div className="speaking-waves-container">{waves}</div>;
  };

  const renderStateContent = () => {
    switch (state) {
      case 'listening':
        return (
          <>
            {renderListeningCircles()}
            <div className="state-label">Listening...</div>
          </>
        );
      case 'thinking':
        return (
          <>
            <div className="thinking-container">
              <div className="brain-icon">🧠</div>
              {renderThinkingDots()}
            </div>
            <div className="state-label">Thinking...</div>
          </>
        );
      case 'speaking':
        return (
          <>
            {renderSpeakingWaves()}
            <div className="state-label">Speaking...</div>
          </>
        );
      default:
        return (
          <>
            <div className="idle-icon">🤖</div>
            <div className="state-label">Ready</div>
          </>
        );
    }
  };

  return (
    <div className={getAnimationClass()}>
      <div className="animation-center">
        {renderStateContent()}
      </div>
    </div>
  );
};

export default AIAnimation;