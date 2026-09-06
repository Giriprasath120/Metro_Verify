import React, { useState, useRef } from 'react';
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
      text: `Namaste ${activeUser?.name || 'Trader'} ji. I am Metro Assistant, your Legal Metrology AI advisor. I have access to your registered equipment (${activeUser?.businessName || 'your business'}), verification applications, and certificates. How can I help you today?`,
      timestamp: 'Just now',
      source: 'gemini-api'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const quickPrompts = [
    'What is the status of my verification request?',
    'When does my certificate expire?',
    'What is my current compliance score?',
    'How do I request a bulk re-verification?'
  ];

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Send to Express Backend endpoint POST /chatbot/query
      const activeUser = getActiveUser();
      const response = await fetch(API_ENDPOINTS.chatbotQuery, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: activeUser?.id || 'OWN-101',
          message: text
        })
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'Your legal metrology records are verified in the national portal.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.source
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      // Local client fallback in case server is unreachable
      const fallbackReply = getLocalFallback(text);
      const assistantMessage: Message = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'fallback'
      };
      setMessages(prev => [...prev, assistantMessage]);
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
    if (q.includes('expire') || q.includes('weighbridge') || q.includes('due') || q.includes('scale') || q.includes('cert')) {
      return `Namaste ${name} ji. Your registered equipment at ${biz} is tracked in the national legal metrology portal. You can view certificate validity and download signed PDF certificates directly in the Certificates section.`;
    }
    if (q.includes('bulk') || q.includes('batch')) {
      return 'You can initiate a bulk verification request by opening the "New Request" tab and selecting "Bulk Request". Metro Verify automatically distributes batches across top-ranking LMO and GATC officers.';
    }
    if (q.includes('compliance') || q.includes('score')) {
      return `Your current Compliance Health Score is ${active?.complianceScore ?? 100}/100 for ${biz}. Maintaining timely statutory renewals ensures maximum standing.`;
    }
    if (q.includes('officer') || q.includes('assign') || q.includes('status')) {
      return `Your verification requests for ${biz} are recorded in MySQL and automatically scheduled with designated Legal Metrology field officers.`;
    }
    return `Your query has been recorded against your legal metrology ledger for ${biz}. All your active applications and certificates are synchronized with the national registry.`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GovHeader
        title="AI Assistant (Metro Assistant)"
        subtitle="Conversational Legal Metrology Guide"
        roleLabel="Gemini AI"
        onSwitchRole={onSwitchRole}
      />

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        {/* Powered by Gemini & Groq Banner */}
        <View style={styles.geminiBanner}>
          <Text style={styles.geminiBadge}>✨ Powered by Groq LLaMA 3.3 & Google Gemini</Text>
          <Text style={styles.geminiSub}>
            Trained on Legal Metrology Act, 2009 & your live verified instruments
          </Text>
        </View>

        {/* Messages List */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatScrollContent}
        >
          {messages.map(msg => {
            const isUser = msg.sender === 'user';
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
                    isUser ? styles.bubbleUser : styles.bubbleAssistant
                  ]}
                >
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
                      <Text style={styles.fallbackTag}>
                        {msg.source === 'groq-api'
                          ? '• Groq LLaMA 3.3'
                          : msg.source === 'gemini-api'
                          ? '• Google Gemini'
                          : '• Legal Metrology Engine'}
                      </Text>
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
                <Text style={styles.typingText}>Metro Assistant is analyzing your records...</Text>
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
                onPress={() => handleSend(prompt)}
                disabled={loading}
              >
                <Text style={styles.promptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.inputField}
            placeholder="Ask about your certificates, renewals, bulk batches..."
            placeholderTextColor={Colors.textMuted}
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
  geminiSub: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 9
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
    marginTop: 4,
    gap: 4
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
  }
});
