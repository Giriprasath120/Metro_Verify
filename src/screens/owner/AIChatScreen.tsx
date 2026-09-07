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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [listeningStatus, setListeningStatus] = useState<string>('');

  const scrollViewRef = useRef<ScrollView>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const silenceTimerRef = useRef<any>(null);
  const keepAliveRef = useRef<any>(null);
  const currentUtteranceRef = useRef<any>(null);

  // Clean up timers, recognition, and speech on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const speakText = (text: string, msgId?: string) => {
    if (!voiceEnabled) return;
    try {
      stopSpeaking();
      // Clean markdown symbols for natural voice
      const clean = text
        .replace(/[*_#`~>]/g, '')
        .replace(/https?:\/\/\S+/g, 'link')
        .replace(/₹/g, 'Rupees ')
        .replace(/\n+/g, '. ')
        .slice(0, 500); // smooth, crisp audio summary

      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(clean);
        currentUtteranceRef.current = utterance;
        (window as any)._speechUtterance = utterance; // Prevent Chrome V8 garbage collection!

        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // Pick Indian English voice or standard English voice
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

        // Chrome keep-alive
        if (keepAliveRef.current) clearInterval(keepAliveRef.current);
        keepAliveRef.current = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          } else {
            clearInterval(keepAliveRef.current);
          }
        }, 5000);

        // Resume and speak with 50ms tick to reset Chrome audio engine
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
   * Stop listening and immediately send the accumulated voice transcript
   */
  const stopListeningAndSend = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const textToSend = transcriptRef.current.trim() || inputText.trim();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);

    if (textToSend) {
      setListeningStatus(`✓ Heard: "${textToSend}" — Analyzing query...`);
      transcriptRef.current = '';
      handleSend(textToSend, true);
      setTimeout(() => {
        setListeningStatus('');
      }, 3500);
    } else {
      setListeningStatus('⚠️ No speech detected. Tap the mic and speak your query.');
      setTimeout(() => {
        setListeningStatus('');
      }, 3000);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListeningAndSend();
      return;
    }

    // Clear any active speaking
    stopSpeaking();

    // Prime/unlock audio context in user gesture
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume();
      } catch (e) {}
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        alert('Voice speech recognition is supported on Google Chrome, Microsoft Edge, and Safari browsers. Please open Metro Verify in Chrome or Edge.');
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = 'en-IN';

        transcriptRef.current = '';

        recognition.onstart = () => {
          setIsListening(true);
          setListeningStatus('🎙️ Listening carefully... Speak your question now');
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

            // Reset silence detection timer: 1500ms after user finishes speaking
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
            }
            silenceTimerRef.current = setTimeout(() => {
              console.log('Auto-submitting voice query after speech silence:', transcriptRef.current);
              stopListeningAndSend();
            }, 1500);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            setListeningStatus('⚠️ Microphone permission blocked. Click the lock/mic icon in the browser address bar to Allow.');
            setIsListening(false);
          } else if (event.error === 'no-speech') {
            // Keep listening gently
            setListeningStatus('🎙️ Still listening... Please speak your question');
          } else {
            setListeningStatus(`⚠️ Voice status: ${event.error}`);
            setIsListening(false);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          // If stopped and text hasn't been submitted yet
          if (transcriptRef.current.trim()) {
            const text = transcriptRef.current.trim();
            transcriptRef.current = '';
            setListeningStatus(`✓ Heard: "${text}" — Analyzing query...`);
            handleSend(text, true);
            setTimeout(() => setListeningStatus(''), 3000);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.warn('Speech recognition start failed:', err);
        setIsListening(false);
        setListeningStatus(`Voice recognition error: ${err.message || err}`);
      }
    } else {
      alert('Voice microphone input is enabled in Chrome, Edge, and Safari.');
    }
  };

  const cancelListening = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    transcriptRef.current = '';
    setIsListening(false);
    setListeningStatus('');
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
    // Strip leading mic emoji from quick prompt chips if present
    const text = rawText.replace(/^🎙️\s*/, '').trim();
    if (!text || loading) return;

    // Stop speaking if user asks a new question
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
            <Text style={styles.geminiBadge}>✨ Voice Assistant Active (Groq LLaMA 3.3 & Gemini)</Text>
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

        {/* Active Speech Recognition Banner */}
        {(isListening || !!listeningStatus) && (
          <View style={[styles.listeningActiveBanner, isListening && styles.listeningActiveBannerPulsing]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              {isListening ? (
                <View style={styles.micActivePulse}>
                  <Text style={{ fontSize: 16 }}>🎙️</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 14 }}>💬</Text>
              )}
              <Text style={styles.listeningActiveText} numberOfLines={2}>
                {listeningStatus || '🎙️ Listening carefully... Speak your question'}
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
            style={[styles.micButton, isListening && styles.micButtonListening]}
            onPress={toggleListening}
            activeOpacity={0.8}
          >
            <Text style={styles.micButtonText}>{isListening ? '🛑' : '🎙️'}</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.inputField}
            placeholder={isListening ? "Listening... Speak your query clearly" : "Tap mic to speak, or type your query..."}
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
    backgroundColor: Colors.background
  },
  keyboardContainer: {
    flex: 1
  },
  geminiBanner: {
    backgroundColor: '#07162C',
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  geminiBadge: {
    color: '#FDBA74',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  chatScroll: {
    flex: 1
  },
  chatScrollContent: {
    padding: 16,
    gap: 12
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryNavy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2
  },
  botAvatarText: {
    fontSize: 14
  },
  messageBubble: {
    maxWidth: '82%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14
  },
  bubbleUser: {
    backgroundColor: Colors.accentAmber,
    borderBottomRightRadius: 2
  },
  bubbleAssistant: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1
  },
  bubbleSpeakingHighlight: {
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    backgroundColor: '#F8FAFC'
  },
  voiceQueryTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4
  },
  voiceQueryTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700'
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12
  },
  typingText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontStyle: 'italic'
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18
  },
  textUser: {
    color: Colors.textWhite,
    fontWeight: '500'
  },
  textAssistant: {
    color: Colors.textPrimary
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
    gap: 6
  },
  timeText: {
    fontSize: 9
  },
  timeUser: {
    color: 'rgba(255, 255, 255, 0.75)'
  },
  timeAssistant: {
    color: Colors.textMuted
  },
  fallbackTag: {
    fontSize: 9,
    color: Colors.textMuted
  },
  voicePlayBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  voicePlayBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171'
  },
  promptsContainer: {
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  promptsScroll: {
    paddingHorizontal: 12,
    gap: 8
  },
  promptChip: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  promptText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1D4ED8'
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  inputField: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    maxHeight: 80
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentAmber,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1'
  },
  sendButtonText: {
    color: Colors.textWhite,
    fontSize: 14,
    fontWeight: 'bold'
  },
  micButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1'
  },
  micButtonListening: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 2
  },
  micButtonText: {
    fontSize: 18
  },
  voiceToggleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  voiceToggleText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700'
  },
  speakingBadge: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#60A5FA'
  },
  speakingBadgeText: {
    color: '#93C5FD',
    fontSize: 9,
    fontWeight: '700'
  },
  listeningActiveBanner: {
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  listeningActiveBannerPulsing: {
    backgroundColor: '#FFF1F2',
    borderBottomColor: '#FB7185'
  },
  micActivePulse: {
    marginRight: 4
  },
  listeningActiveText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    marginLeft: 6
  },
  sendNowListeningBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10
  },
  sendNowListeningBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  cancelListeningBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10
  },
  cancelListeningBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  }
});
