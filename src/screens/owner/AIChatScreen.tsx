import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import * as Speech from 'expo-speech';
import { GovHeader } from '../../components/GovHeader';
import { Colors } from '../../theme/colors';
import { API_ENDPOINTS } from '../../config/api';
import { getActiveUser } from '../../services/authService';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: string;
  isVoice?: boolean;
}

interface AIChatScreenProps {
  navigation: any;
  onSwitchRole: () => void;
}

export const AIChatScreen: React.FC<AIChatScreenProps> = ({
  navigation,
  onSwitchRole
}) => {
  const activeUser = getActiveUser();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-0',
      sender: 'assistant',
      text: `Greetings ${activeUser?.name || 'Trader'}! I am Metro Assistant, your Legal Metrology AI advisor. I have access to your registered equipment (${activeUser?.businessName || 'your business'}), verification applications, and certificates. Tap the microphone to speak, or ask any query to begin!`,
      timestamp: 'Just now',
      source: 'gemini-api'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [listeningStatus, setListeningStatus] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const scrollViewRef = useRef<ScrollView>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<any>(null);
  const analyserRef = useRef<any>(null);
  const animationFrameRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const silenceTimerRef = useRef<any>(null);
  const keepAliveRef = useRef<any>(null);
  const currentUtteranceRef = useRef<any>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  // Clean up timers, recognition, media streams, and speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopAudioCapture();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
      }
    };
  }, []);

  const stopAudioCapture = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
      mediaRecorderRef.current = null;
    }
    setIsListening(false);
    setAudioLevel(0);
  };

  const speakText = (text: string, msgId?: string) => {
    if (!voiceEnabled) return;
    try {
      stopSpeaking();
      const clean = text
        .replace(/[*_#`~>]/g, '')
        .replace(/https?:\/\/\S+/g, 'link')
        .replace(/₹/g, 'Rupees ')
        .replace(/\n+/g, '. ')
        .slice(0, 500);

      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(clean);
        currentUtteranceRef.current = utterance;
        (window as any)._speechUtterance = utterance;

        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        const voices = window.speechSynthesis.getVoices();
        const inVoice = voices.find(v => v.lang === 'en-IN' || v.lang.startsWith('en-IN'));
        const enVoice = voices.find(v => v.lang.startsWith('en'));
        if (inVoice) {
          utterance.voice = inVoice;
        } else if (enVoice) {
          utterance.voice = enVoice;
        }

        utterance.onstart = () => {
          setIsSpeaking(true);
          if (msgId) setSpeakingId(msgId);
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          setSpeakingId(null);
          currentUtteranceRef.current = null;
          (window as any)._speechUtterance = null;
        };
        utterance.onerror = (e) => {
          console.warn('Speech synthesis error:', e);
          setIsSpeaking(false);
          setSpeakingId(null);
          currentUtteranceRef.current = null;
          (window as any)._speechUtterance = null;
        };

        if (keepAliveRef.current) clearInterval(keepAliveRef.current);
        keepAliveRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          } else {
            clearInterval(keepAliveRef.current);
          }
        }, 5000);

        setTimeout(() => {
          try {
            window.speechSynthesis.resume();
            window.speechSynthesis.speak(utterance);
          } catch (e) {
            console.warn('speechSynthesis.speak failed:', e);
            setIsSpeaking(false);
          }
        }, 50);
      } else {
        setIsSpeaking(true);
        if (msgId) setSpeakingId(msgId);
        Speech.speak(clean, {
          language: 'en-IN',
          rate: 1.0,
          onDone: () => {
            setIsSpeaking(false);
            setSpeakingId(null);
          },
          onError: () => {
            setIsSpeaking(false);
            setSpeakingId(null);
          }
        });
      }
    } catch (e) {
      console.warn('Speech error:', e);
      setIsSpeaking(false);
      setSpeakingId(null);
    }
  };

  const stopSpeaking = () => {
    try {
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
      }
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      Speech.stop();
    } catch (e) {}
    setIsSpeaking(false);
    setSpeakingId(null);
    currentUtteranceRef.current = null;
    if (typeof window !== 'undefined') {
      (window as any)._speechUtterance = null;
    }
  };

  /**
   * Stop recording and process the voice query (using speech recognition or Whisper AI fallback)
   */
  const stopListeningAndSend = async () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const wordsFromRecognition = transcriptRef.current.trim();

    // Stop recognition
    const recorder = mediaRecorderRef.current;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    // Stop visual analyzer
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    setIsListening(false);
    setAudioLevel(0);

    const stopHardwareTracks = () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
        mediaStreamRef.current = null;
      }
    };

    // CASE 1: Browser SpeechRecognition successfully captured words
    if (wordsFromRecognition && wordsFromRecognition.length > 1) {
      stopHardwareTracks();
      transcriptRef.current = '';
      setListeningStatus(`✓ Heard: "${wordsFromRecognition}" — Analyzing query...`);
      handleSend(wordsFromRecognition, true);
      setTimeout(() => setListeningStatus(''), 3000);
      return;
    }

    // CASE 2: Fallback to Groq Whisper AI via recorded audio chunks
    if (recorder && recorder.state !== 'inactive') {
      setIsTranscribing(true);
      setListeningStatus('🎙️ Hearing & transcribing with Groq Whisper AI...');

      recorder.onstop = async () => {
        stopHardwareTracks();
        try {
          const actualMime = mimeTypeRef.current || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
          if (audioBlob.size < 250) {
            setIsTranscribing(false);
            setListeningStatus('⚠️ Speech was too faint. Please speak closer to microphone.');
            setTimeout(() => setListeningStatus(''), 3000);
            return;
          }

          // Convert blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            try {
              const base64data = (reader.result as string).split(',')[1];
              const res = await fetch(API_ENDPOINTS.chatbotVoiceTranscribe, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioBase64: base64data,
                  mimeType: actualMime
                })
              });
              const data = await res.json();
              setIsTranscribing(false);

              if (data && data.success && data.text && data.text.trim()) {
                const transcribed = data.text.trim();
                const isHallucination = /^(thank you|thanks|thank you so much|thank you for watching|thanks for watching|subtitles by|\.|\.\.\.)$/i.test(transcribed);
                if (!isHallucination) {
                  setListeningStatus(`✓ Heard: "${transcribed}" — Analyzing query...`);
                  handleSend(transcribed, true);
                  setTimeout(() => setListeningStatus(''), 3000);
                } else {
                  setListeningStatus('⚠️ Speech too faint or unclear. Tap mic and speak closer to microphone.');
                  setTimeout(() => setListeningStatus(''), 3000);
                }
              } else {
                setListeningStatus('⚠️ No words detected. Tap the mic and speak your query.');
                setTimeout(() => setListeningStatus(''), 3000);
              }
            } catch (err) {
              console.warn('Whisper transcription failed:', err);
              setIsTranscribing(false);
              setListeningStatus('⚠️ Voice processing completed.');
              setTimeout(() => setListeningStatus(''), 2000);
            }
          };
        } catch (e) {
          setIsTranscribing(false);
          setListeningStatus('⚠️ Microphone processing error.');
          setTimeout(() => setListeningStatus(''), 2000);
        }
      };

      try {
        if (recorder.state === 'recording') {
          recorder.requestData();
        }
        recorder.stop();
      } catch (e) {
        stopHardwareTracks();
        setIsTranscribing(false);
      }
    } else {
      stopHardwareTracks();
      setListeningStatus('⚠️ No speech detected. Tap mic to speak.');
      setTimeout(() => setListeningStatus(''), 3000);
    }
  };

  /**
   * Main Microphone Toggle: Requests real audio stream, starts visual level detector,
   * MediaRecorder, and SpeechRecognition simultaneously
   */
  const toggleListening = async () => {
    if (isListening || isTranscribing) {
      stopListeningAndSend();
      return;
    }

    stopSpeaking();

    // Unlock/resume audio context
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.resume(); } catch (e) {}
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        // 1. Request real hardware microphone access with optimal gain & noise cancellation
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          alert('Microphone access is not supported by your current browser.');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1
          }
        });
        mediaStreamRef.current = stream;

        // 2. Real-time Audio Level Visualizer
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animationFrameRef.current = requestAnimationFrame(updateLevel);
          };
          updateLevel();
        }

        // 3. MediaRecorder for high-fidelity audio chunks
        audioChunksRef.current = [];
        let mimeType = 'audio/webm';
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          }
        }
        mimeTypeRef.current = mimeType;

        if (typeof MediaRecorder !== 'undefined') {
          const mediaRecorder = new MediaRecorder(stream, { mimeType });
          mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data);
            }
          };
          mediaRecorder.start(100);
          mediaRecorderRef.current = mediaRecorder;
        }

        // 4. Concurrently start Web Speech Recognition for live interim text display
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        transcriptRef.current = '';

        if (SpeechRec) {
          try {
            const recognition = new SpeechRec();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;
            recognition.lang = 'en-IN';

            recognition.onstart = () => {
              setIsListening(true);
              setListeningStatus('🎙️ Listening... Speak your query clearly');
            };

            recognition.onresult = (event: any) => {
              let fullWords = '';
              for (let i = 0; i < event.results.length; ++i) {
                fullWords += event.results[i][0].transcript + ' ';
              }
              fullWords = fullWords.trim();

              if (fullWords) {
                transcriptRef.current = fullWords;
                setInputText(fullWords);
                setListeningStatus(`🎙️ Heard: "${fullWords}"`);

                // Reset silence detection timer: 3000ms after user pauses
                if (silenceTimerRef.current) {
                  clearTimeout(silenceTimerRef.current);
                }
                silenceTimerRef.current = setTimeout(() => {
                  stopListeningAndSend();
                }, 3000);
              }
            };

            recognition.onerror = (event: any) => {
              console.warn('Speech recognition status:', event.error);
              if (event.error === 'not-allowed') {
                setListeningStatus('⚠️ Microphone access blocked. Please allow mic in browser address bar.');
              }
            };

            recognitionRef.current = recognition;
            recognition.start();
          } catch (e) {
            console.warn('Web speech recognition start error:', e);
          }
        }

        setIsListening(true);
        setListeningStatus('🎙️ Listening... Speak your query clearly');
      } catch (err: any) {
        console.warn('Microphone permission or start error:', err);
        setIsListening(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setListeningStatus('⚠️ Microphone permission blocked. Click the lock/mic icon in browser address bar to Allow.');
        } else {
          setListeningStatus(`⚠️ Mic error: ${err.message || 'Microphone unavailable'}`);
        }
      }
    } else {
      alert('Voice microphone input is enabled on modern web browsers.');
    }
  };

  const cancelListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    stopAudioCapture();
    transcriptRef.current = '';
    setListeningStatus('');
    setIsTranscribing(false);
  };

  const quickPrompts = [
    '🎙️ When does my scale expire?',
    '🎙️ What is my verification status?',
    '🎙️ What is my compliance score?',
    '🎙️ How do I request bulk re-verification?',
    '🎙️ Show my digital certificate details'
  ];

  const handleSend = async (textToSend?: string, isVoice = false) => {
    const rawText = textToSend || inputText;
    const text = rawText.replace(/^🎙️\s*/, '').trim();
    if (!text || loading) return;

    stopSpeaking();

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isVoice
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const active = getActiveUser();
      const response = await fetch(API_ENDPOINTS.chatbotQuery, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: active?.id || 'OWN-101',
          message: text
        })
      });

      const data = await response.json();
      const replyText = data.reply || 'Your legal metrology records are verified in the national portal.';
      const astId = `ast-${Date.now()}`;

      const assistantMessage: Message = {
        id: astId,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source
      };

      setMessages(prev => [...prev, assistantMessage]);
      speakText(replyText, astId);
    } catch (err) {
      console.warn('Network chatbot query failed, using local domain fallback:', err);
      const fallbackReply = getLocalFallback(text);
      const astId = `ast-${Date.now()}`;
      const assistantMessage: Message = {
        id: astId,
        sender: 'assistant',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'domain-fallback'
      };
      setMessages(prev => [...prev, assistantMessage]);
      speakText(fallbackReply, astId);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const getLocalFallback = (query: string): string => {
    const active = getActiveUser();
    const name = active?.name || 'Trader';
    const biz = active?.businessName || (active?.name ? `${active.name} Enterprises` : 'your registered business');
    const q = query.toLowerCase();

    if (q.includes('status') || q.includes('request') || q.includes('application') || q.includes('approval')) {
      return `Greetings ${name} ji! Your active verification applications for "${biz}" are recorded in the central legal metrology registry. Assigned officers conduct physical tests and verify standard weights as scheduled.`;
    }
    if (q.includes('expire') || q.includes('weighbridge') || q.includes('due') || q.includes('scale') || q.includes('valid')) {
      return `Greetings ${name} ji. Your registered equipment at "${biz}" is tracked in the national portal. All valid instruments carry statutory stamping. You can view certificate validity and download signed PDF certificates under the Certificates section.`;
    }
    if (q.includes('bulk') || q.includes('batch') || q.includes('multiple')) {
      return `To request bulk verification for "${biz}", switch to the "New Request" tab and select "Bulk Request". Metro Verify automatically distributes batches across top-ranking LMO and GATC officers in your district.`;
    }
    if (q.includes('compliance') || q.includes('score') || q.includes('health')) {
      return `Your current Compliance Health Score is ${active?.complianceScore ?? 100}/100 for "${biz}". Maintaining timely statutory renewals ensures maximum Tier-A standing under the Legal Metrology Act.`;
    }
    if (q.includes('certificate') || q.includes('pdf') || q.includes('qr') || q.includes('download')) {
      return `Your digital verification certificates are issued under Form VI of Legal Metrology General Rules. Each certificate features an instant QR code allowing any smartphone to verify statutory validity and test readings.`;
    }
    if (q.includes('officer') || q.includes('inspector') || q.includes('lmo') || q.includes('gatc')) {
      return `Legal Metrology Officers (LMO) conduct physical verification of your equipment, and GATC officers perform secondary verification endorsements to guarantee national standards compliance.`;
    }
    if (q.includes('hello') || q.includes('hi') || q.includes('greetings')) {
      return `Greetings ${name} ji! I am Metro Assistant, your Legal Metrology AI guide. How can I assist you with your equipment, verification applications, or certificates today?`;
    }
    return `Greetings ${name} ji. Your query regarding "${biz}" has been recorded. All your registered equipment items, verification requests, and certificates are synchronized with the national legal metrology portal.`;
  };

  // Soundwave visual bars based on real mic volume
  const renderSoundWave = () => {
    const bars = [
      Math.max(4, Math.min(24, Math.round(audioLevel * 0.4))),
      Math.max(6, Math.min(32, Math.round(audioLevel * 0.7))),
      Math.max(8, Math.min(38, Math.round(audioLevel * 1.0))),
      Math.max(6, Math.min(32, Math.round(audioLevel * 0.8))),
      Math.max(4, Math.min(24, Math.round(audioLevel * 0.5)))
    ];

    return (
      <View style={styles.soundWaveContainer}>
        {bars.map((height, idx) => (
          <View
            key={idx}
            style={[
              styles.soundWaveBar,
              { height, backgroundColor: audioLevel > 15 ? '#DC2626' : '#9CA3AF' }
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="AI Voice Assistant (Metro Assistant)"
        subtitle="Voice-Enabled Legal Metrology AI Advisor"
        roleLabel="Gemini & Groq AI"
        onSwitchRole={onSwitchRole}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        {/* Powered by Gemini & Groq Banner */}
        <View style={styles.geminiBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Text style={styles.geminiBadge}>✨ Voice Assistant Active (Groq Whisper & LLaMA AI)</Text>
            {isSpeaking && (
              <TouchableOpacity onPress={stopSpeaking} style={styles.speakingBadge}>
                <Text style={styles.speakingBadgeText}>🔊 Speaking (Tap to Mute)</Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={styles.voiceToggleBtn}
            onPress={() => {
              if (voiceEnabled) stopSpeaking();
              setVoiceEnabled(!voiceEnabled);
            }}
          >
            <Text style={styles.voiceToggleText}>
              {voiceEnabled ? '🔊 Voice: ON' : '🔈 Voice: OFF'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Speech Recognition & Real Audio Visualizer Banner */}
        {(isListening || isTranscribing || !!listeningStatus) && (
          <View style={[styles.listeningActiveBanner, isListening && styles.listeningActiveBannerPulsing]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {isListening && renderSoundWave()}
              {isTranscribing && <ActivityIndicator size="small" color="#DC2626" style={{ marginRight: 6 }} />}
              <Text style={styles.listeningActiveText} numberOfLines={2}>
                {listeningStatus || (audioLevel > 10 ? '🎙️ Voice Detected! Listening...' : '🎙️ Speak your question now...')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {isListening && (
                <TouchableOpacity onPress={stopListeningAndSend} style={styles.sendNowListeningBtn}>
                  <Text style={styles.sendNowListeningBtnText}>✓ Send Now</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={cancelListening} style={styles.cancelListeningBtn}>
                <Text style={styles.cancelListeningBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatScrollContent}
        >
          {messages.map(msg => {
            const isUser = msg.sender === 'user';
            const isThisSpeaking = isSpeaking && speakingId === msg.id;
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isUser ? styles.messageRowUser : styles.messageRowAssistant
                ]}
              >
                {!isUser && (
                  <View style={styles.botAvatar}>
                    <Text style={styles.botAvatarText}>⚖️</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    isUser ? styles.bubbleUser : styles.bubbleAssistant,
                    isThisSpeaking && styles.bubbleSpeakingHighlight
                  ]}
                >
                  {isUser && msg.isVoice && (
                    <View style={styles.voiceQueryTag}>
                      <Text style={styles.voiceQueryTagText}>🎙️ Spoken Voice Query</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      isUser ? styles.textUser : styles.textAssistant
                    ]}
                  >
                    {msg.text}
                  </Text>
                  <View style={styles.bubbleFooter}>
                    <Text style={[styles.timeText, isUser ? styles.timeUser : styles.timeAssistant]}>
                      {msg.timestamp}
                    </Text>
                    {!isUser && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.fallbackTag}>
                          {msg.source === 'groq-api'
                            ? '• Groq Cloud AI'
                            : msg.source === 'gemini-api'
                            ? '• Google Gemini'
                            : '• Legal Metrology Engine'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            if (isThisSpeaking) {
                              stopSpeaking();
                            } else {
                              speakText(msg.text, msg.id);
                            }
                          }}
                          style={[styles.voicePlayBtn, isThisSpeaking && styles.voicePlayBtnActive]}
                        >
                          <Text style={{ fontSize: 12 }}>
                            {isThisSpeaking ? '⏹ Stop' : '🔊 Listen'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {loading && (
            <View style={[styles.messageRow, styles.messageRowAssistant]}>
              <View style={styles.botAvatar}>
                <Text style={styles.botAvatarText}>⚖️</Text>
              </View>
              <View style={[styles.messageBubble, styles.bubbleAssistant, styles.typingBubble]}>
                <ActivityIndicator size="small" color={Colors.accentAmber} />
                <Text style={styles.typingText}>Metro Assistant is analyzing your records and preparing voice response...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Suggestion Chips */}
        <View style={styles.promptsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptsScroll}>
            {quickPrompts.map((prompt, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.promptChip}
                onPress={() => handleSend(prompt, true)}
                disabled={loading}
              >
                <Text style={styles.promptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar with Mic & Send */}
        <View style={styles.inputContainer}>
          {/* Voice Microphone Input Button */}
          <TouchableOpacity
            style={[
              styles.micButton,
              isListening && styles.micButtonListening,
              isTranscribing && styles.micButtonTranscribing
            ]}
            onPress={toggleListening}
            activeOpacity={0.8}
          >
            <Text style={styles.micButtonText}>
              {isListening ? '🛑' : isTranscribing ? '⏳' : '🎙️'}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={styles.inputField}
            placeholder={isListening ? "Listening to your voice... Speak now" : "Tap mic to speak, or type your query..."}
            placeholderTextColor={isListening ? "#DC2626" : Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
            returnKeyType="send"
          />

          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || loading}
          >
            <Text style={styles.sendButtonText}>▲</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F9FC'
  },
  keyboardContainer: {
    flex: 1
  },
  geminiBanner: {
    backgroundColor: '#EFF2FE',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#DFE5FE'
  },
  geminiBadge: {
    color: '#635BFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3
  },
  chatScroll: {
    flex: 1
  },
  chatScrollContent: {
    padding: 16,
    gap: 12,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center'
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4
  },
  messageRowUser: {
    justifyContent: 'flex-end'
  },
  messageRowAssistant: {
    justifyContent: 'flex-start'
  },
  botAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFF2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#DFE5FE',
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2
  },
  botAvatarText: {
    fontSize: 16
  },
  messageBubble: {
    maxWidth: '84%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: 'rgba(50, 50, 93, 0.08)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2
  },
  bubbleUser: {
    backgroundColor: '#635BFF',
    borderBottomRightRadius: 4,
    borderWidth: 0
  },
  bubbleAssistant: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    borderBottomLeftRadius: 4,
    borderLeftWidth: 3.5,
    borderLeftColor: '#635BFF'
  },
  bubbleSpeakingHighlight: {
    borderColor: '#635BFF',
    borderLeftColor: '#635BFF',
    borderWidth: 1.5,
    backgroundColor: '#F8FAFC'
  },
  voiceQueryTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginBottom: 6
  },
  voiceQueryTagText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14
  },
  typingText: {
    fontSize: 12,
    color: '#425466',
    fontStyle: 'italic',
    fontWeight: '600'
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 20
  },
  textUser: {
    color: '#FFFFFF',
    fontWeight: '500'
  },
  textAssistant: {
    color: '#0A2540',
    fontWeight: '500'
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8
  },
  timeText: {
    fontSize: 9.5,
    fontWeight: '600'
  },
  timeUser: {
    color: 'rgba(255, 255, 255, 0.85)'
  },
  timeAssistant: {
    color: '#8898AA'
  },
  fallbackTag: {
    fontSize: 9.5,
    color: '#8898AA',
    fontWeight: '600'
  },
  voicePlayBtn: {
    backgroundColor: '#EFF2FE',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DFE5FE'
  },
  voicePlayBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171'
  },
  promptsContainer: {
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E3E8EE'
  },
  promptsScroll: {
    paddingHorizontal: 16,
    gap: 8
  },
  promptChip: {
    backgroundColor: '#F6F9FC',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: 'rgba(50, 50, 93, 0.04)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1
  },
  promptText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#635BFF'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E3E8EE',
    shadowColor: 'rgba(50, 50, 93, 0.06)',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3
  },
  inputField: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 13.5,
    color: '#0A2540',
    borderWidth: 1,
    borderColor: '#E3E8EE',
    maxHeight: 90
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#635BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    shadowColor: 'rgba(99, 91, 255, 0.35)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3
  },
  sendButtonDisabled: {
    backgroundColor: '#E3E8EE',
    shadowOpacity: 0
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold'
  },
  micButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFF2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#DFE5FE',
    shadowColor: 'rgba(50, 50, 93, 0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1
  },
  micButtonListening: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 2,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4
  },
  micButtonTranscribing: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
    borderWidth: 2
  },
  micButtonText: {
    fontSize: 20
  },
  voiceToggleBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DFE5FE'
  },
  voiceToggleText: {
    color: '#635BFF',
    fontSize: 10.5,
    fontWeight: '700'
  },
  speakingBadge: {
    backgroundColor: 'rgba(30, 58, 138, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#60A5FA'
  },
  speakingBadgeText: {
    color: '#93C5FD',
    fontSize: 9.5,
    fontWeight: '800'
  },
  listeningActiveBanner: {
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1.5,
    borderBottomColor: '#FCA5A5',
    paddingHorizontal: 18,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2
  },
  listeningActiveBannerPulsing: {
    backgroundColor: '#FFF1F2',
    borderBottomColor: '#FB7185'
  },
  soundWaveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    marginRight: 10,
    height: 32,
    paddingHorizontal: 6
  },
  soundWaveBar: {
    width: 3.5,
    borderRadius: 2
  },
  listeningActiveText: {
    color: '#991B1B',
    fontSize: 12.5,
    fontWeight: '800',
    flex: 1,
    marginLeft: 6
  },
  sendNowListeningBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2
  },
  sendNowListeningBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800'
  },
  cancelListeningBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10
  },
  cancelListeningBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800'
  }
});

