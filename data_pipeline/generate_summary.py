import os
import json
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai

# 1. Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not all([SUPABASE_URL, SUPABASE_KEY, GEMINI_API_KEY]):
    print("❌ Error: Kredensial Supabase atau Gemini belum lengkap di .env!")
    exit()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

def generate_daily_insight():
    print("Membaca 60 Top Tren terbaru dari database...")
    
    try:
        response = supabase.table("trend_items").select("title, categories(name)").execute()
        items = response.data
        
        if not items:
            print("⚠️ Data kosong. Jalankan script fetcher terlebih dahulu.")
            return
            
        data_text = "Berikut adalah daftar tren di Jepang hari ini:\n"
        for item in items:
            cat_name = item['categories']['name']
            title = item['title']
            data_text += f"- Kategori [{cat_name}]: {title}\n"
            
        print("Mengirim data ke Gemini API untuk dianalisis (Mode Bilingual)...")
        
        model = genai.GenerativeModel('gemini-2.5-flash') 
        
        # --- PROMPT DIUPDATE UNTUK BILINGUAL ---
        prompt = f"""
        Kamu adalah analis tren industri kreatif dan budaya pop Jepang.
        
        {data_text}
        
        Tugasmu:
        1. Buat 'Executive Summary' (maksimal 3-4 kalimat) yang merangkum benang merah atau situasi tren hari ini secara profesional.
        2. Buat ringkasan tersebut dalam 2 bahasa: Bahasa Indonesia dan English.
        3. Berikan skor sentimen agregat dari 0.00 (Sangat Negatif/Kacau) hingga 1.00 (Sangat Positif/Antusias).
        
        KEMBALIKAN HANYA FORMAT JSON PERSIS SEPERTI DI BAWAH INI TANPA TAMBAHAN TEKS LAIN (TANPA MARKDOWN ```json):
        {{
            "ai_summary_id": "Teks rangkuman bahasa Indonesia di sini...",
            "ai_summary_en": "English summary text here...",
            "sentiment_score": 0.85
        }}
        """
        
        ai_response = model.generate_content(prompt)
        
        raw_text = ai_response.text.replace('```json', '').replace('```', '').strip()
        insight_data = json.loads(raw_text)
        
        today_date = datetime.now().strftime("%Y-%m-%d")
        
        # --- UPDATE PENYIMPANAN KE DATABASE ---
        insert_data = {
            "insight_date": today_date,
            "ai_summary": insight_data['ai_summary_id'],    # Masuk ke kolom lama (ID)
            "ai_summary_en": insight_data['ai_summary_en'], # Masuk ke kolom baru (EN)
            "sentiment_score": insight_data['sentiment_score']
        }
        
        print("Menyimpan hasil pemikiran AI ke tabel daily_insights...")
        supabase.table("daily_insights").upsert(insert_data, on_conflict="insight_date").execute()
        
        print("\n✅ Otak AI sukses bekerja!")
        print(f"🇮🇩 ID: {insight_data['ai_summary_id']}")
        print(f"🇬🇧 EN: {insight_data['ai_summary_en']}")
        print(f"📊 Skor: {insight_data['sentiment_score']}")
        
    except Exception as e:
        print(f"❌ Terjadi kesalahan: {e}")

if __name__ == "__main__":
    generate_daily_insight()