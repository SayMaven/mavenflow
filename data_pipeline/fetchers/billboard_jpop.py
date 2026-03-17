import os
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client

# 1. Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Kredensial Supabase tidak ditemukan!")
    exit()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_billboard_jpop():
    print("Mulai men-scrape data Billboard Japan Hot 100...")
    url = "https://www.billboard-japan.com/charts/detail?a=hot100"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        songs = []
        
        chart_rows = soup.select('table tbody tr')
        
        for row in chart_rows:
            rank_elem = row.select_one('td.rank_td span') or row.select_one('p.rank')
            
            # --- EKSTRAKSI GAMBAR DI SINI ---
            img_elem = row.select_one('td.name_td img')
            image_url = None
            if img_elem and img_elem.has_attr('src'):
                raw_src = img_elem['src']
                # Kalau link-nya tidak pakai https di depannya, kita tambahkan domain Billboard
                if raw_src.startswith('/'):
                    image_url = f"https://www.billboard-japan.com{raw_src}"
                else:
                    image_url = raw_src
            
            info_block = row.select_one('div.name_detail')
            if info_block:
                title_elem = info_block.select_one('p.musuc_title') 
                artist_elem = info_block.select_one('p.artist_name')
            else:
                title_elem = None
                artist_elem = None
                
            if rank_elem and title_elem and artist_elem:
                rank_text = rank_elem.text.strip()
                title_text = title_elem.text.strip()
                artist_text = artist_elem.text.strip()
                
                try:
                    rank = int(''.join(filter(str.isdigit, rank_text)))
                except ValueError:
                    continue
                    
                songs.append({
                    "rank": rank,
                    "title": title_text,
                    "artist": artist_text,
                    "image_url": image_url # <-- Memasukkan gambar ke dalam dictionary
                })
                
                if len(songs) >= 10:
                    break
                    
        if not songs:
            print("⚠️ Peringatan: Scraping gagal menemukan lagu.")
            return

        cat_response = supabase.table("categories").select("id").eq("name", "jpop_music").execute()
        if not cat_response.data:
            print("❌ Error: Kategori 'jpop_music' tidak ditemukan di database.")
            return
        category_id = cat_response.data[0]['id']

        trend_items = []
        for song in songs:
            item = {
                "category_id": category_id,
                "title": song["title"],
                "url": url, 
                "image_url": song["image_url"], # <-- Mengirim gambar ke Supabase
                "source_name": "Billboard Japan",
                "rank": song["rank"],
                "metadata": {
                    "artist": song["artist"]
                }
            }
            trend_items.append(item)
            
        print(f"Menyimpan {len(trend_items)} data musik J-Pop ke database MavenFlow...")
        supabase.table("trend_items").insert(trend_items).execute()
        
        print("✅ Proses Web Scraping & ETL J-Pop sukses, lengkap dengan gambar!")
        
    except Exception as e:
        print(f"❌ Terjadi kesalahan: {e}")

if __name__ == "__main__":
    fetch_billboard_jpop()