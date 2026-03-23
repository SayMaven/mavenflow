"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase'; 
import { AlertTriangle, BarChart3, Clock3, Globe2, Loader2, ExternalLink } from 'lucide-react'; 

// --- TYPESCRIPT INTERFACES ---
interface DailyInsight {
  id: number;
  insight_date: string;
  ai_summary: string;
  ai_summary_en: string;
  sentiment_score: number;
}

interface TrendItem {
  id: number;
  category_id: number;
  title: string;
  url: string;
  image_url: string | null;
  source_name: string;
  rank: number;
  metadata: any; 
}

const CATEGORIES = [
  { id: 4, name: 'Hot Topics', icon: '📰', color: 'text-red-400', border: 'border-red-500/30' },
  { id: 1, name: 'Anime Airing', icon: '📺', color: 'text-orange-400', border: 'border-orange-500/30' },
  { id: 3, name: 'Pixiv Arts', icon: '🎨', color: 'text-blue-400', border: 'border-blue-500/30' },
  { id: 2, name: 'Billboard J-Pop', icon: '🎵', color: 'text-pink-400', border: 'border-pink-500/30' },
  { id: 5, name: 'Tech & Gadgets', icon: '🎧', color: 'text-emerald-400', border: 'border-emerald-500/30' },
];

const getSentimentColor = (score: number) => {
  if (score >= 0.75) return 'text-emerald-400 bg-emerald-950/50 border-emerald-800'; 
  if (score >= 0.5) return 'text-amber-400 bg-amber-950/50 border-amber-800';     
  return 'text-red-400 bg-red-950/50 border-red-800';                                
};

// Fungsi helper untuk memperbaiki URL gambar Pixiv
const getValidImageUrl = (url: string | null) => {
  if (!url || url === 'NULL') return null;
  if (url.includes('i.pximg.net')) return url.replace('i.pximg.net', 'i.pixiv.re');
  return url;
};

export default function Home() {
  // State untuk Tab & Data
  const [activeTab, setActiveTab] = useState<string>('home');
  const [todayInsight, setTodayInsight] = useState<DailyInsight | null>(null);
  const [groupedItems, setGroupedItems] = useState<Record<number, TrendItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data secara Client-Side saat halaman pertama kali dimuat
  useEffect(() => {
    async function fetchData() {
      try {
        const [insightRes, itemsRes] = await Promise.all([
          supabase.from('daily_insights').select('*').order('insight_date', { ascending: false }).limit(1),
          supabase.from('trend_items').select('*').order('rank', { ascending: true }) 
        ]);

        if (insightRes.data) setTodayInsight(insightRes.data[0] as DailyInsight);
        
        if (itemsRes.data) {
          const grouped = (itemsRes.data as TrendItem[]).reduce((acc, item) => {
            if (!acc[item.category_id]) acc[item.category_id] = [];
            acc[item.category_id].push(item);
            return acc;
          }, {} as Record<number, TrendItem[]>);
          setGroupedItems(grouped);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const activeCategoryData = CATEGORIES.find(c => String(c.id) === activeTab);
  const activeItems = activeCategoryData ? (groupedItems[activeCategoryData.id] || []) : [];

  // Jika masih loading, tampilkan animasi
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#0d1117] flex flex-col items-center justify-center text-blue-500 space-y-4">
        <Loader2 size={48} className="animate-spin" />
        <h2 className="text-xl font-bold tracking-widest text-gray-300">INITIALIZING MAVENFLOW...</h2>
      </div>
    );
  }

  return (
    // UBAH: h-screen dan overflow-hidden mengunci keseluruhan halaman agar tidak bisa scroll liar
    <main className="h-screen w-full bg-[#0d1117] text-gray-200 flex flex-col font-sans overflow-hidden">
      
      {/* --- HEADER WRAPPER (Fixed Height) --- */}
      <header className="shrink-0 bg-[#161b22]/95 backdrop-blur-md border-b border-gray-800 shadow-md z-50">
        
        {/* Top Bar Info */}
        <div className="p-4 px-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
          <div className="min-w-[250px]">
            <h1 className="text-3xl font-black text-blue-500 tracking-tighter flex items-center gap-2">
              <Globe2 size={28} className="text-blue-400"/> MavenFlow <span className='font-light text-gray-600 text-lg'>// 1.0</span>
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5 font-medium tracking-wide">
               <Clock3 size={14}/> UPDATE: {todayInsight?.insight_date ?? 'No Data'}
            </div>
          </div>

          <div className="flex-1 bg-[#0d1117] border border-gray-800 rounded-lg p-3 px-5 flex flex-col xl:flex-row gap-4 xl:items-center w-full max-w-4xl">
            <div className="shrink-0">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${getSentimentColor(todayInsight?.sentiment_score ?? 0.5)}`}>
                <BarChart3 size={14}/> SENTIMENT: {todayInsight?.sentiment_score?.toFixed(2) ?? 'N/A'}
              </div>
            </div>
            <div className="flex-1 border-l-0 xl:border-l border-gray-800 xl:pl-4">
              <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">
                <span className="font-bold text-gray-500 mr-2">ID:</span>
                {todayInsight?.ai_summary || 'Belum ada data rangkuman.'}
              </p>
            </div>
          </div>
        </div>

        {/* --- TAB NAVIGATION BAR (Menggunakan onClick) --- */}
        <div className="px-6 flex items-center gap-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button 
            onClick={() => setActiveTab('home')}
            className={`py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors focus:outline-none ${activeTab === 'home' ? 'text-blue-400 border-blue-500' : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600'}`}
          >
            Dashboard
          </button>
          
          {CATEGORIES.map((cat) => {
            const isActive = activeTab === String(cat.id);
            return (
              <button 
                key={cat.id} 
                onClick={() => setActiveTab(String(cat.id))}
                className={`py-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 focus:outline-none ${isActive ? `${cat.color} border-current` : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600'}`}
              >
                <span>{cat.icon}</span> {cat.name}
              </button>
            );
          })}
        </div>
      </header>

      {/* --- KONTEN UTAMA --- */}
      
      {/* 1. TAMPILAN DASHBOARD (Bisa scroll ke bawah jika kategori banyak) */}
      {activeTab === 'home' && (
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="w-full max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {CATEGORIES.map((cat) => {
              const items = groupedItems[cat.id]?.slice(0, 5) || [];
              return (
                <div key={cat.id} className="flex flex-col bg-[#161b22] rounded-2xl border border-gray-800 shadow-xl overflow-hidden h-fit">
                  <div className="p-5 border-b border-gray-800 flex justify-between items-center">
                    <h2 className={`font-bold text-xl flex items-center gap-2 ${cat.color}`}>
                      <span>{cat.icon}</span> <span className="text-gray-100">{cat.name}</span>
                    </h2>
                    <button onClick={() => setActiveTab(String(cat.id))} className="text-xs font-bold bg-gray-800 text-gray-300 px-3 py-1.5 rounded-full hover:bg-gray-700 transition-colors">
                      View All
                    </button>
                  </div>
                  
                  <div className="flex flex-col p-5 gap-5">
                    {items.length > 0 ? items.map((item) => {
                      const imgUrl = getValidImageUrl(item.image_url);
                      return (
                       <a href={item.url} target="_blank" rel="noopener noreferrer" key={item.id} className="flex justify-between items-start gap-4 border-b border-gray-800/50 pb-4 last:border-0 last:pb-0 group">
                         <div className="flex-1 flex flex-col justify-between">
                           <h3 className="text-[14px] font-medium text-gray-300 line-clamp-2 leading-snug group-hover:text-blue-400 group-hover:underline transition-colors">{item.title}</h3>
                           <div className="flex items-center gap-2 mt-2">
                             <span className="bg-gray-800 text-gray-400 text-[10px] px-1.5 rounded font-bold">#{item.rank}</span>
                             <span className="text-[10px] text-gray-500 uppercase tracking-widest">{item.source_name}</span>
                           </div>
                         </div>
                         <div className="w-16 h-16 shrink-0 bg-[#0d1117] rounded-lg overflow-hidden border border-gray-800 shadow-sm relative">
                            {imgUrl ? (
                              <img src={imgUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100" loading="lazy" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-700"><AlertTriangle size={16} /></div>
                            )}
                          </div>
                       </a>
                    )}) : <p className="text-sm text-gray-600 text-center py-4">No data.</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. TAMPILAN DETAIL KATEGORI (NO SCROLL, 1 HALAMAN PENUH) */}
      {activeTab !== 'home' && activeCategoryData && (
        <div className="flex-1 flex flex-col p-6 overflow-hidden w-full max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Header Kategori */}
          <div className="shrink-0 mb-6 flex justify-between items-end">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{activeCategoryData.icon}</span>
              <h2 className={`text-3xl font-black ${activeCategoryData.color}`}>{activeCategoryData.name}</h2>
              <span className="ml-2 bg-gray-800 text-gray-300 text-sm font-bold px-3 py-1 rounded-full border border-gray-700">
                {activeItems.length} Trending Items
              </span>
            </div>
          </div>

          {/* AREA KONTEN: HERO (Kiri) & LIST (Kanan) */}
          <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
            
            {activeItems.length > 0 ? (
              <>
                {/* RANK #1: HERO ITEM (Sangat Detil, Gambar Besar) */}
                <a 
                  href={activeItems[0].url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full lg:w-7/12 flex flex-col bg-[#161b22] rounded-2xl border border-gray-700 overflow-hidden shadow-2xl hover:border-blue-500 transition-colors group"
                >
                  {/* Gambar Penuh */}
                  <div className="flex-1 bg-black relative overflow-hidden">
                    {getValidImageUrl(activeItems[0].image_url) ? (
                      <img 
                        src={getValidImageUrl(activeItems[0].image_url)!} 
                        className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                        alt={activeItems[0].title}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-700 bg-[#0d1117]"><AlertTriangle size={48} /></div>
                    )}
                    
                    {/* Badge Rank 1 */}
                    <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-black text-lg px-4 py-1.5 rounded shadow-lg flex items-center gap-2">
                      🏆 Rank #1
                    </div>
                  </div>

                  {/* Detil Teks */}
                  <div className="shrink-0 p-6 bg-gradient-to-t from-[#161b22] via-[#161b22] to-transparent">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`uppercase tracking-widest font-bold text-xs ${activeCategoryData.color}`}>
                        {activeItems[0].source_name}
                      </span>
                      {activeItems[0].metadata?.score && <span className='text-amber-400 text-sm font-bold bg-amber-900/30 px-2 py-0.5 rounded'>⭐ {activeItems[0].metadata.score}</span>}
                    </div>
                    <h3 className="text-2xl lg:text-3xl font-bold text-white leading-tight group-hover:text-blue-400 transition-colors line-clamp-2">
                      {activeItems[0].title}
                    </h3>
                    <p className="mt-3 text-gray-400 flex items-center gap-2 text-sm">
                      Klik untuk melihat sumber asli <ExternalLink size={14}/>
                    </p>
                  </div>
                </a>

                {/* RANK #2 - #5: LIST ITEM (Kanan) */}
                <div className="w-full lg:w-5/12 flex flex-col gap-4 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {activeItems.slice(1, 6).map((item) => { // Tampilkan sisa 5 item ke bawah
                    const imgUrl = getValidImageUrl(item.image_url);
                    return (
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        key={item.id}
                        className="flex gap-4 bg-[#161b22] rounded-xl border border-gray-800 p-4 hover:border-gray-500 hover:bg-[#1c2128] transition-all group"
                      >
                        {/* Thumbnail Kotak */}
                        <div className="w-24 h-24 shrink-0 bg-black rounded-lg overflow-hidden border border-gray-700 relative">
                          {imgUrl ? (
                            <img src={imgUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.title} referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-700 bg-[#0d1117]"><AlertTriangle size={20} /></div>
                          )}
                          <div className="absolute top-1 left-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">#{item.rank}</div>
                        </div>

                        {/* Teks */}
                        <div className="flex-1 flex flex-col justify-center">
                          <h4 className="text-[15px] font-semibold text-gray-200 line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors mb-2">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-3 text-xs font-mono">
                            <span className="text-gray-500 uppercase">{item.source_name}</span>
                            {item.metadata?.price_yen && <span className='text-emerald-400 font-bold'>￥{item.metadata.price_yen}</span>}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </>
            ) : (
               <div className="w-full flex flex-col items-center justify-center py-20 text-gray-600 border-2 border-dashed border-gray-800 rounded-2xl">
                 <BarChart3 size={48} className="mb-4 opacity-50" />
                 <p className="text-xl font-medium">Data sedang dikumpulkan oleh Pipeline...</p>
               </div>
            )}
            
          </div>
        </div>
      )}
      
    </main>
  );
}