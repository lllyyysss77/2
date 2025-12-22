
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Message, AppState, AppSettings } from '../types';
import { encodeWAV, playAudio, getAudioContext, stopCurrentAudio } from '../utils/audio';
import { sendVoiceMessage } from '../utils/zhipu';
import { getActiveApiKey } from '../utils/settings';
import { CharacterView } from './CharacterView';
import { SettingsPanel } from './SettingsPanel';
import { Mic, Loader2, Settings2, Trash2, AlertCircle, ChevronUp, Send, X, MessageSquare } from 'lucide-react';

interface VoiceChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

export const VoiceChatWidget: React.FC<VoiceChatWidgetProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Audio & State Refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const audioQueueRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRecordingRef = useRef(false);
  const startYRef = useRef<number>(0);
  const startXRef = useRef<number>(0);

  // Interaction State
  const [dragY, setDragY] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isLaunched, setIsLaunched] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);

  const THROW_THRESHOLD = -60;
  const CANCEL_THRESHOLD = 50;

  useEffect(() => {
    if (!isOpen) {
      stopRecordingLogic();
      stopCurrentAudio();
    }
  }, [isOpen]);

  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, appState]);

  const startRecording = async () => {
    if (appState === AppState.PROCESSING) return;
    setDragY(0); setDragX(0); setIsLaunched(false); isRecordingRef.current = true;
    if (navigator.vibrate) navigator.vibrate(20);
    try {
      setError(null); stopCurrentAudio(); audioQueueRef.current = []; isPlayingRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const ctx = getAudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      chunksRef.current = [];
      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(inputData));
        let sum = 0;
        for (let i = 0; i < inputData.length; i += 100) sum += Math.abs(inputData[i]);
        setCurrentVolume(Math.min((sum / (inputData.length / 100)) * 5, 1));
      };
      source.connect(processor);
      processor.connect(ctx.destination);
      processorRef.current = processor;
      setAppState(AppState.RECORDING);
    } catch (err) {
      setError("请允许麦克风权限。");
      resetInteraction();
    }
  };

  const resetInteraction = () => {
    isRecordingRef.current = false;
    setAppState(AppState.IDLE);
    setDragY(0); setDragX(0); setIsLaunched(false); setCurrentVolume(0);
  };

  const stopRecordingLogic = () => {
    isRecordingRef.current = false;
    if (processorRef.current) processorRef.current.disconnect();
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach(t => t.stop());
  };

  const stopRecordingAndSend = async () => {
    if (!isRecordingRef.current) return;
    stopRecordingLogic();
    setAppState(AppState.PROCESSING);
    const allChunks = chunksRef.current;
    if (allChunks.length < 3) { setAppState(AppState.IDLE); return; }
    
    const totalLength = allChunks.reduce((acc, curr) => acc + curr.length, 0);
    const mergedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of allChunks) { mergedSamples.set(chunk, offset); offset += chunk.length; }

    const wavBlob = encodeWAV(mergedSamples, audioContextRef.current?.sampleRate || 24000);
    
    // 立即保存当前的历史记录副本，用于发送
    const currentHistory = [...messages];
    setMessages(prev => [...prev, { role: 'user', isAudio: true, content: "语音消息" }]);

    try {
      let assistantContent = "";
      let assistantAudioId = "";
      const apiKey = getActiveApiKey(settings);
      const prompt = (settings.systemPrompt || "") + (settings.knowledgeBase ? `\n\nContext:\n${settings.knowledgeBase}` : "");
      
      await sendVoiceMessage(apiKey, wavBlob, currentHistory.slice(-6), prompt, (text, audio, id) => {
        if (text) assistantContent = text;
        if (id) assistantAudioId = id;
        if (audio) { audioQueueRef.current.push(audio); if (!isPlayingRef.current) playNext(); }
      });

      setMessages(prev => {
        const h = [...prev];
        h.push({ role: 'assistant', content: String(assistantContent || "收到"), isAudio: true, audioId: assistantAudioId });
        return h;
      });
      setError(null);
    } catch (err: any) {
      console.error("UI层捕获错误:", err);
      const msg = typeof err === 'string' ? err : (err?.message || "请求失败，请稍后再试");
      setError(String(msg));
      setAppState(AppState.ERROR);
    } finally {
      setIsLaunched(false); setDragY(0);
      if (audioQueueRef.current.length === 0 && !isPlayingRef.current && appState !== AppState.ERROR) {
        setAppState(AppState.IDLE);
      }
    }
  };

  const playNext = async () => {
    if (audioQueueRef.current.length === 0) { isPlayingRef.current = false; if (!isRecordingRef.current) setAppState(AppState.IDLE); return; }
    isPlayingRef.current = true;
    setAppState(AppState.PLAYING);
    const chunk = audioQueueRef.current.shift();
    if (chunk) await playAudio(chunk, playNext);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || appState === AppState.PROCESSING) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    startYRef.current = e.clientY; startXRef.current = e.clientX;
    startRecording();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (appState !== AppState.RECORDING) return;
    setDragY((e.clientY - startYRef.current) * 0.8);
    setDragX(e.clientX - startXRef.current);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (appState !== AppState.RECORDING) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    if (Math.abs(dragX) > CANCEL_THRESHOLD) { resetInteraction(); stopRecordingLogic(); }
    else if (dragY < THROW_THRESHOLD) { setIsLaunched(true); if (navigator.vibrate) navigator.vibrate([30, 50]); setTimeout(stopRecordingAndSend, 200); }
    else { resetInteraction(); stopRecordingLogic(); }
  };

  if (!isOpen) return null;

  const stretch = Math.max(0, -dragY) / 400;
  const vol = 1 + (currentVolume * 0.3);
  const blobStyle = isLaunched ? {} : { transform: `translate(${dragX}px, ${dragY}px) scale(${vol - stretch * 0.2}, ${vol + stretch})` };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto animate-fade-in" onClick={onClose} />
      
      <div className="relative w-full max-w-[600px] mx-auto bg-[var(--bg-color)] rounded-t-[40px] shadow-2xl pointer-events-auto animate-slide-up flex flex-col overflow-hidden h-[85dvh]">
        {/* Handle */}
        <div className="w-full flex justify-center py-4 shrink-0 cursor-pointer" onClick={onClose}>
            <div className="w-12 h-1.5 bg-[var(--accent-color)]/20 rounded-full" />
        </div>

        {/* Header Area */}
        <div className="px-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--primary-btn)] flex items-center justify-center text-white shadow-sm">
                  <MessageSquare size={18} />
              </div>
              <span className="font-bold text-[var(--text-color)]">二丫助手</span>
          </div>
          <div className="flex gap-2">
              <button onClick={() => { setMessages([]); setError(null); }} className="p-2 opacity-40 hover:opacity-100 transition-opacity"><Trash2 size={18} /></button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 opacity-40 hover:opacity-100 transition-opacity"><Settings2 size={18} /></button>
          </div>
        </div>

        {/* Main View */}
        <div className="flex-1 flex flex-col items-center overflow-hidden relative">
          <div className="w-full py-4 flex justify-center scale-90 sm:scale-100 origin-center">
             <CharacterView state={appState} avatarImageUrl={settings.avatarImageUrl} avatarVideoUrl={settings.avatarVideoUrl} />
          </div>

          <div ref={scrollRef} className="w-full flex-1 overflow-y-auto px-6 pb-40 scrollbar-hide space-y-4">
             {messages.length === 0 && (
               <div className="text-center opacity-30 text-sm mt-8 animate-fade-in">“跟我聊聊东里村的趣事吧！”</div>
             )}
             {messages.map((m, i) => (
               <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                  <div className={`p-3 rounded-2xl text-sm shadow-sm max-w-[85%] ${m.role === 'user' ? 'bg-[var(--primary-btn)] text-white' : 'bg-white clay-card'}`}>
                    {String(m.content || "")}
                  </div>
               </div>
             ))}
             {error && (
               <div className="bg-red-50 p-4 rounded-2xl flex items-start gap-3 text-red-600 text-sm border border-red-100 shadow-sm animate-fade-in">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" /> 
                  <div className="flex-1">
                    <p className="font-bold mb-1">发送失败</p>
                    <p className="opacity-80 text-xs leading-relaxed">{String(error)}</p>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* Interaction Footer */}
        <div className="absolute bottom-0 left-0 w-full h-36 flex flex-col items-center justify-center pointer-events-none">
            {/* Dynamic Hints */}
            <div className={`mb-4 transition-all duration-300 ${appState === AppState.RECORDING ? 'opacity-100' : 'opacity-0'}`}>
                {Math.abs(dragX) > CANCEL_THRESHOLD ? (
                   <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><X size={14} /> 松手取消</span>
                ) : dragY < THROW_THRESHOLD ? (
                   <span className="text-xs font-bold text-[var(--primary-btn)] flex items-center gap-1"><ChevronUp className="animate-bounce" size={14} /> 松手发送</span>
                ) : (
                   <span className="text-[10px] opacity-40 uppercase tracking-widest">向上滑动发送</span>
                )}
            </div>

            <button
                onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}
                style={blobStyle}
                className={`
                    w-20 h-20 rounded-full flex items-center justify-center pointer-events-auto transition-colors z-50
                    ${appState === AppState.RECORDING ? 'bg-[var(--primary-btn)] shadow-2xl animate-liquid' : 'bg-white clay-btn'}
                    ${isLaunched ? 'animate-launch' : ''}
                `}
            >
                {appState === AppState.RECORDING ? (
                   <Mic size={32} className="text-white" />
                ) : appState === AppState.PROCESSING ? (
                   <Loader2 size={32} className="text-[var(--accent-color)] animate-spin" />
                ) : (
                   <Mic size={32} className="text-[var(--primary-btn)]" />
                )}
                {appState === AppState.RECORDING && <div className="absolute inset-0 border-4 border-white/20 rounded-full animate-ripple" />}
            </button>
        </div>

        <SettingsPanel 
          isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}
          settings={settings} onSave={(s) => { onUpdateSettings(s); setIsSettingsOpen(false); }}
        />
      </div>
    </div>
  );
};
