# Voice Chat AI Assistant

A streaming voice chat web application built with React and Netlify Functions that connects to a local g4f API for text generation and TTS audio synthesis.

## Features

- **Real-time Voice Chat**: Speak naturally and get AI responses
- **Text Input Support**: Type messages when voice isn't preferred
- **Streaming Text Generation**: Uses Kimi-k2 model with streaming
- **Sentence-by-Sentence Audio**: GPT-4o-mini-TS with "nova" voice
- **Smart Audio Queue**: Buffered playback for smooth conversation
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18 with hooks
- **Backend**: Netlify Functions (serverless)
- **Text AI**: Kimi-k2 via g4f API
- **TTS AI**: GPT-4o-mini-tts via g4f API
- **Voice Input**: Web Speech API
- **Styling**: CSS with responsive design

## Prerequisites

1. **Node.js** (v16 or higher)
2. **g4f API** running locally on `https://77dbf3a6b234.ngrok-free.app`
3. **Netlify CLI** (for development)

## Setup Instructions

### 1. Install Dependencies

```bash
cd voice-chat-app
npm install
```

### 2. Start g4f API

Ensure your g4f API is running on `https://77dbf3a6b234.ngrok-free.app` with:
- Kimi-k2 model available
- GPT-4o-mini-tts model available
- TTS voice: "nova"

### 3. Development Mode

```bash
# Install Netlify CLI globally (if not installed)
npm install -g netlify-cli

# Start the development server
npm run dev
```

This will:
- Start React dev server on `http://localhost:3000`
- Start Netlify Functions on `http://localhost:8888`

### 4. Production Build

```bash
npm run build
```

## Architecture

### Netlify Functions

1. **`generateTextStream.js`**: 
   - Connects to Kimi-k2 model
   - Streams text responses
   - Detects complete sentences

2. **`synthesizeAudio.js`**:
   - Connects to GPT-4o-mini-tts
   - Generates audio for each sentence
   - Returns audio URLs

### React Frontend

- **State Management**: React hooks for audio queue, voice input, and messages
- **Audio Queue**: Smart buffering system with 4-5 second delay
- **Voice Input**: Web Speech API integration
- **Responsive UI**: Mobile-friendly design

## Usage

1. **Text Input**: Type your message and press Enter or click Send
2. **Voice Input**: Click the microphone button and speak
3. **Streaming**: Watch as responses appear and audio plays sentence by sentence

## Configuration

### Environment Variables

Create `.env` file for local development:
```
REACT_APP_API_URL=https://77dbf3a6b234.ngrok-free.app
```

### Netlify Configuration

Check `netlify.toml` for function settings and build configuration.

## API Endpoints

- **POST** `/.netlify/functions/generateTextStream` - Generate streaming text
- **POST** `/.netlify/functions/synthesizeAudio` - Synthesize audio from text

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure g4f API allows cross-origin requests
2. **Audio Not Playing**: Check browser autoplay policies
3. **Voice Recognition**: Ensure microphone permissions are granted
4. **API Connection**: Verify g4f API is running on port 8080

### Debug Mode

Add `console.log` statements in the Netlify functions for debugging:
```javascript
console.log('Request received:', event.body);
```

## Browser Support

- Chrome 60+ (recommended for Web Speech API)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use and modify as needed.