import { supabase } from '../utils/supabase'; 
import { AlertTriangle, BarChart3, Clock3 } from 'lucide-react'; 

export const revalidate = 60; 

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

const getSentimentColor = (score: number) => {
  if (score >= 0.75) return 'text-emerald-400 bg-emerald-950 border-emerald-800'; 
  if (score >= 0.5) return 'text-amber-400 bg-amber-950 border-amber-800';     
  return 'text-red-400 bg-red-950 border-red-800';                            
};

const getCategoryName = (id: number) => {
  switch (id) {
    case 1: return '📺 Anime';
    case 2: return '🎵 J-Pop';
    case 3: return '🎨 Art (Pixiv)';
    case 4: return '📰 Yahoo News';
    case 5: return '🎧 Tech & Gadgets';
    default: return '❓ Other';
  }
};

export default async function Home() {
  
  console.log("Fetching fresh data from Supabase...");
  const [insightResponse, itemsResponse] = await Promise.all([
    supabase
      .from('daily_insights')
      .select('*')
      .order('insight_date', { ascending: false })
      .limit(1),
    supabase
      .from('trend_items')
      .select('*')
      .order('category_id', { ascending: true }) 
      .order('rank', { ascending: true }) 
  ]);

  const todayInsight = insightResponse.data?.[0] as DailyInsight;
  const trendItems = itemsResponse.data as TrendItem[];

  if (insightResponse.error || itemsResponse.error) {
    console.error("Supabase Error:", insightResponse.error || itemsResponse.error);
    return <div className="p-10 text-red-500 font-mono">Error fetching data. Check server logs!</div>;
  }

  return (
    <main className="min-h-screen bg-[#0d1117] text-gray-200 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <header className="flex items-center justify-between mb-10 pb-6 border-b border-gray-800">
          <div>
            <h1 className="text-4xl font-extrabold text-blue-400 tracking-tighter">MavenFlow <span className='font-light text-gray-600'>// v1.0</span></h1>
            <p className="text-gray-500 mt-1">Japanese Pop-Culture & Tech Intelligence Portal</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
             <Clock3 size={16}/> Diperbarui: {todayInsight?.insight_date ?? 'No Data'}
          </div>
        </header>

        <div className="bg-[#161b22] p-6 rounded-2xl border border-gray-800 shadow-xl mb-12">
          <div className="flex justify-between items-start gap-4 mb-6">
            <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <span className='text-3xl'>🔥</span> Executive Summary
            </h2>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold ${getSentimentColor(todayInsight?.sentiment_score ?? 0.5)}`}>
              <BarChart3 size={16}/> Sentiment Score: {todayInsight?.sentiment_score?.toFixed(2) ?? 'N/A'}
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <span className="text-xs text-blue-500 uppercase tracking-widest font-bold bg-blue-950 px-2 py-1 rounded">Indonesia 🇮🇩</span>
              <p className="text-gray-100 mt-2 leading-relaxed text-lg">
                {todayInsight?.ai_summary || 'Belum ada data rangkuman hari ini.'}
              </p>
            </div>
            
            <div className="border-t border-gray-800 pt-6">
              <span className="text-xs text-gray-500 uppercase tracking-widest font-bold bg-gray-800 px-2 py-1 rounded">English 🇬🇧</span>
              <p className="text-gray-400 mt-2 leading-relaxed italic">
                {todayInsight?.ai_summary_en || 'No summary data available today.'}
              </p>
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-white tracking-tight mb-8">🌊 Top Trends Hari Ini</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {trendItems?.length > 0 ? (
            trendItems.map((item) => {
              
              // --- JURUS BYPASS PIXIV ---
              let finalImageUrl = item.image_url;
              if (finalImageUrl && finalImageUrl.includes('i.pximg.net')) {
                finalImageUrl = finalImageUrl.replace('i.pximg.net', 'i.pixiv.re');
              }

              return (
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  key={item.id} 
                  className="group bg-[#161b22] rounded-xl overflow-hidden border border-gray-800 shadow-md transition-all duration-300 hover:border-blue-700 hover:shadow-2xl hover:-translate-y-1 flex flex-col"
                >
                  <div className="relative aspect-[16/10] bg-gray-900 overflow-hidden">
                    
                    {finalImageUrl && finalImageUrl !== 'NULL' ? (
                      <img 
                        src={finalImageUrl} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        referrerPolicy="no-referrer" // Wajib ada buat nembus proteksi tambahan
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-700 gap-2 p-4">
                        <AlertTriangle size={32} />
                        <span className='text-xs text-center'>No Scraped Image</span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 bg-blue-600 text-white font-extrabold text-xl w-10 h-10 flex items-center justify-center rounded-lg shadow-lg">
                      #{item.rank}
                    </div>
                  </div>

                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <div>
                      <span className="text-xs text-gray-500 font-medium tracking-wide bg-gray-800 px-2 py-1 rounded">
                        {getCategoryName(item.category_id)}
                      </span>
                      <h3 className="text-white font-semibold mt-2.5 leading-snug text-lg line-clamp-2 group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </h3>
                    </div>
                    
                    <div className="border-t border-gray-800 pt-3 mt-4 text-xs text-gray-600 flex justify-between items-center">
                      <span>Source: {item.source_name}</span>
                      {item.metadata?.score && (
                        <span className='text-amber-500 font-bold'>⭐ {item.metadata.score}</span>
                      )}
                       {item.metadata?.price_yen && (
                        <span className='text-emerald-500 font-bold'>￥ {item.metadata.price_yen}</span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })
          ) : (
            <div className="col-span-full p-20 text-center text-gray-600 border border-dashed border-gray-800 rounded-xl">
              <BarChart3 size={48} className='mx-auto mb-4'/> Belum ada data item tren di database. Jalankan pipeline data Python-mu!
            </div>
          )}
        </div>

        <footer className="mt-20 py-8 border-t border-gray-800 text-center text-gray-700 text-sm">
          MavenFlow Dashboard &copy; 2026. Data Engine by Python & Gemini AI.
        </footer>

      </div>
    </main>
  );
}