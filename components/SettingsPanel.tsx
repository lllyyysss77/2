import React, { useState, useEffect } from 'react';
import { AppSettings, Theme } from '../types';
import { Settings, X, Save, Palette, Key, Book, Code, Image as ImageIcon, Video, User } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  // Sync when opening
  useEffect(() => {
    if (isOpen) setLocalSettings(settings);
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleChange = (field: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      {/* fix: [无障碍优化] [2025-12-17] Backdrop添加role和aria-label */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm pointer-events-auto transition-opacity" 
        onClick={onClose}
        role="button"
        aria-label="关闭设置面板"
      />

      {/* Panel */}
      <div className="clay-card w-full max-w-lg m-4 max-h-[85vh] flex flex-col pointer-events-auto animate-slide-up bg-[var(--bg-color)] relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[var(--secondary-btn)] flex items-center justify-center text-[var(--text-color)] shadow-inner" aria-hidden="true">
               <Settings className="w-6 h-6" />
            </div>
            <h2 id="settings-title" className="text-xl font-bold text-[var(--text-color)]">设置面板</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors text-[var(--accent-color)]"
            aria-label="关闭设置面板"
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 custom-scrollbar">
          
          {/* API Keys */}
          <div className="space-y-2">
            <label htmlFor="api-keys" className="flex items-center gap-2 text-sm font-bold opacity-80 text-[var(--text-color)]">
              <Key className="w-4 h-4" aria-hidden="true" /> GLM-4 API Key(s)
            </label>
            <input 
              id="api-keys"
              type="text"
              placeholder="默认使用内置Key，支持多Key用逗号分隔"
              className="clay-input font-mono text-sm"
              value={localSettings.apiKeys}
              onChange={(e) => handleChange('apiKeys', e.target.value)}
              aria-describedby="api-keys-help"
            />
            <p id="api-keys-help" className="sr-only">支持多个API密钥，用逗号分隔</p>
          </div>

          {/* fix: [无障碍优化] [2025-12-17] Avatar设置区域添加fieldset */}
          <fieldset className="space-y-4 pt-2 border-t border-[var(--shadow-dark)]">
             <legend className="text-sm font-bold text-[var(--text-color)] opacity-90">数字人形象设置</legend>
             
             <div className="space-y-2">
                <label htmlFor="avatar-image" className="flex items-center gap-2 text-xs font-bold opacity-70 text-[var(--text-color)]">
                  <ImageIcon className="w-3 h-3" aria-hidden="true" /> 静态封面 (Image URL)
                </label>
                <input 
                  id="avatar-image"
                  type="text"
                  placeholder="https://..."
                  className="clay-input text-xs"
                  value={localSettings.avatarImageUrl}
                  onChange={(e) => handleChange('avatarImageUrl', e.target.value)}
                  aria-label="数字人静态封面图片地址"
                />
             </div>

             <div className="space-y-2">
                <label htmlFor="avatar-video" className="flex items-center gap-2 text-xs font-bold opacity-70 text-[var(--text-color)]">
                  <Video className="w-3 h-3" aria-hidden="true" /> 说话视频 (Video URL)
                </label>
                <input 
                  id="avatar-video"
                  type="text"
                  placeholder="https://...mp4 (留空则只显示图片)"
                  className="clay-input text-xs"
                  value={localSettings.avatarVideoUrl}
                  onChange={(e) => handleChange('avatarVideoUrl', e.target.value)}
                  aria-label="数字人说话视频地址"
                />
             </div>
          </fieldset>

          {/* System Prompt */}
          <div className="space-y-2 pt-2 border-t border-[var(--shadow-dark)]">
            <label htmlFor="system-prompt" className="flex items-center gap-2 text-sm font-bold opacity-80 text-[var(--text-color)]">
              <User className="w-4 h-4" aria-hidden="true" /> 角色设定
            </label>
            <textarea 
              id="system-prompt"
              className="clay-input min-h-[100px] text-sm leading-relaxed"
              value={localSettings.systemPrompt}
              onChange={(e) => handleChange('systemPrompt', e.target.value)}
              aria-label="系统角色设定提示词"
            />
          </div>

          {/* Knowledge Base */}
          <div className="space-y-2">
            <label htmlFor="knowledge-base" className="flex items-center gap-2 text-sm font-bold opacity-80 text-[var(--text-color)]">
              <Book className="w-4 h-4" aria-hidden="true" /> 知识库
            </label>
            <textarea 
              id="knowledge-base"
              className="clay-input min-h-[100px] text-sm leading-relaxed"
              value={localSettings.knowledgeBase}
              onChange={(e) => handleChange('knowledgeBase', e.target.value)}
              aria-label="知识库内容"
            />
          </div>

          {/* fix: [无障碍优化] [2025-12-17] Theme选择器添加fieldset和role */}
          <fieldset className="space-y-2 pt-2 border-t border-[var(--shadow-dark)]">
            <legend className="flex items-center gap-2 text-sm font-bold opacity-80 text-[var(--text-color)]">
              <Palette className="w-4 h-4" aria-hidden="true" /> 皮肤风格
            </legend>
            <div className="flex gap-2 flex-wrap" role="group" aria-label="主题选择">
              {[
                { id: Theme.CLAY_LIGHT, name: '陶土白', color: '#FFF5D9' },
                { id: Theme.CLAY_DARK, name: '深邃夜', color: '#1e293b' },
                { id: Theme.MINT_FRESH, name: '薄荷绿', color: '#ecfdf5' },
                { id: Theme.CUSTOM, name: '自定义', color: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => handleChange('theme', t.id)}
                  className={`clay-btn rect px-4 py-2 text-sm font-bold transition-transform relative overflow-hidden ${localSettings.theme === t.id ? 'ring-2 ring-[var(--primary-btn)] scale-105' : 'opacity-70'}`}
                  style={{ background: t.color, color: t.id === Theme.CLAY_DARK ? 'white' : '#5D4037' }}
                  aria-pressed={localSettings.theme === t.id}
                  aria-label={`选择${t.name}主题`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Custom CSS */}
          <div className={`space-y-2 transition-all duration-300 ${localSettings.theme === Theme.CUSTOM ? 'opacity-100 max-h-[500px]' : 'opacity-50 max-h-12 overflow-hidden'}`}>
             <label htmlFor="custom-css" className="flex items-center gap-2 text-sm font-bold opacity-80 text-[var(--text-color)]">
               <Code className="w-4 h-4" aria-hidden="true" /> 自定义 CSS
             </label>
             <textarea 
               id="custom-css"
               className="clay-input font-mono text-xs min-h-[100px]"
               placeholder=":root { --bg-color: #ff0000; }"
               value={localSettings.customCss}
               onChange={(e) => handleChange('customCss', e.target.value)}
               disabled={localSettings.theme !== Theme.CUSTOM}
               aria-label="自定义CSS样式代码"
             />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-2 shrink-0">
            <button 
              onClick={handleSave}
              className="clay-btn-primary w-full py-4 rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
              aria-label="保存所有设置"
            >
              <Save className="w-5 h-5" aria-hidden="true" />
              保存设置
            </button>
        </div>

      </div>
    </div>
  );
};