import os
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client
import time

# 1. Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Kredensial Supabase tidak ditemukan!")
    exit()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_yahoo_japan_trends():
    print("Mulai mencari Topik Hangat dari Yahoo! Japan RSS...")
    
    url = "https://news.yahoo.co.jp/rss/topics/top-picks.xml"
    
    # Header untuk scraping artikel agar tidak dikira bot jahat
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'xml')
        items = soup.find_all('item')
        
        if not items:
            print("⚠️ Peringatan: Tidak ada data tren.")
            return
            
        cat_response = supabase.table("categories").select("id").eq("name", "hot_topics").execute()
        if not cat_response.data:
            print("❌ Error: Kategori 'hot_topics' tidak ditemukan.")
            return
        category_id = cat_response.data[0]['id']

        trend_items = []
        DEFAULT_IMAGE = "https://s.yimg.jp/c/logo/f/2.0/news_r_34_2x.png"
        
        print("Mengekstrak gambar dari masing-masing artikel (ini butuh beberapa detik)...")
        
        for index, item in enumerate(items[:10]):
            title = item.title.text
            link = item.link.text
            pub_date = item.pubDate.text if item.pubDate else "N/A"
            image_url = None
            
            # --- THE META SCRAPER (Mengunjungi artikel untuk ambil gambar) ---
            try:
                article_resp = requests.get(link, headers=headers, timeout=10)
                article_soup = BeautifulSoup(article_resp.text, 'html.parser')
                
                # Mencari tag Open Graph Image (og:image)
                og_image = article_soup.find('meta', property='og:image')
                if og_image and og_image.get('content'):
                    image_url = og_image['content']
            except Exception as e:
                print(f"  ⚠️ Gagal narik gambar untuk artikel {index+1}, pakai fallback.")
            
            # Kalau masih gagal juga, baru pakai logo Yahoo
            image_url = image_url or DEFAULT_IMAGE
            
            trend_items.append({
                "category_id": category_id,
                "title": title,
                "url": link,
                "image_url": image_url,
                "source_name": "Yahoo! Japan",
                "rank": index + 1,
                "metadata": {
                    "published_date": pub_date
                }
            })
            
            # Kasih jeda 1 detik tiap artikel biar server Yahoo gak marah
            time.sleep(1)
            
        print(f"Menyimpan {len(trend_items)} topik hangat ke database MavenFlow...")
        supabase.table("trend_items").insert(trend_items).execute()
        
        print("✅ Proses Ekstraksi Yahoo! Japan sukses! Gambar asli sudah ditarik.")
        
    except Exception as e:
        print(f"❌ Terjadi kesalahan: {e}")

if __name__ == "__main__":
    fetch_yahoo_japan_trends()