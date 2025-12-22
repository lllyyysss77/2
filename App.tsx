
import React, { useState, useEffect } from 'react';
import { AppSettings, DEFAULT_SETTINGS } from './types';
import { loadSettings, saveSettings, applyTheme } from './utils/settings';
import { VoiceChatWidget } from './components/VoiceChatWidget';
import { MessageSquare, Map, Info, Star } from 'lucide-react';

export default function App() {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const saved = loadSettings();
    setSettings(saved);
    applyTheme(saved.theme, saved.customCss);
  }, []);

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
    applyTheme(newSettings.theme, newSettings.customCss);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Example Landing Page Content */}
      <nav className="p-6 flex justify-between items-center max-w-5xl mx-auto">
        <div className="font-black text-2xl text-slate-800 tracking-tight flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-400 rounded-xl shadow-lg flex items-center justify-center text-white">
                <Map size={24} />
            </div>
            东里村导览
        </div>
        <div className="flex gap-6 text-sm font-bold text-slate-500">
            <a href="#" className="hover:text-orange-500">景点</a>
            <a href="#" className="hover:text-orange-500">特产</a>
            <a href="#" className="hover:text-orange-500">关于</a>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <section className="bg-white rounded-[40px] p-8 sm:p-12 shadow-xl shadow-slate-200/50 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
                <span className="bg-orange-100 text-orange-600 px-4 py-1 rounded-full text-xs font-bold mb-4 inline-block">2024 智慧乡村试点</span>
                <h2 className="text-4xl sm:text-6xl font-black text-slate-900 leading-tight mb-6">
                    探索东里，<br/><span className="text-orange-500">遇见数字人二丫</span>
                </h2>
                <p className="text-slate-500 text-lg mb-8 leading-relaxed">
                    点击右下角的语音按钮，和我们的数字小村官“二丫”聊聊天。她知道村里所有的历史文化、特色景点，还能给你推荐最好吃的黑米！
                </p>
                
                <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-2xl">
                        <Star className="text-yellow-400 fill-yellow-400" size={18} />
                        <span className="text-sm font-bold">孙中山旌义状</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-2xl">
                        <Info className="text-blue-400" size={18} />
                        <span className="text-sm font-bold">120米仙灵瀑布</span>
                    </div>
                </div>
            </div>

            {/* Decorative Image/Graphic */}
            <div className="absolute right-[-5%] bottom-[-10%] w-1/2 opacity-10 pointer-events-none text-orange-200">
                <MessageSquare size={400} />
            </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
            {[
                { title: '红色魂', desc: '追寻辛亥革命的侨乡记忆' },
                { title: '生态魂', desc: '看飞流直下的仙灵瀑布' },
                { title: '人文魂', desc: '漫步洋杆尾百年古民居' }
            ].map((item, i) => (
                <div key={i} className="bg-white p-6 rounded-3xl shadow-md hover:shadow-lg transition-shadow border border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-2">{item.title}</h4>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
            ))}
        </section>
      </main>

      {/* Floating Trigger Button */}
      <button 
        onClick={() => setIsWidgetOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-orange-500 rounded-2xl shadow-2xl shadow-orange-300 flex items-center justify-center text-white hover:scale-110 active:scale-90 transition-transform group z-40"
      >
        <MessageSquare size={28} className="group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-12 right-0 bg-white text-orange-600 px-3 py-1 rounded-xl text-xs font-bold shadow-md whitespace-nowrap animate-bounce">
            试试语音咨询?
        </span>
      </button>

      {/* The Encapsulated Widget */}
      <VoiceChatWidget 
        isOpen={isWidgetOpen}
        onClose={() => setIsWidgetOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      <footer className="text-center py-12 text-slate-300 text-xs font-bold uppercase tracking-widest">
          © 2024 东里村智慧导览系统
      </footer>
    </div>
  );
}
