import os
import requests
from dotenv import load_dotenv
from supabase import create_client, Client

# 1. Load environment variables dari file .env
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Kredensial Supabase tidak ditemukan di file .env!")
    exit()

# 2. Inisialisasi koneksi Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_and_store_anime():
    print("Mencari data Top Airing Anime dari Jikan API...")
    url = "https://api.jikan.moe/v4/top/anime"
    params = {"filter": "airing", "limit": 10}
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        anime_list = response.json().get("data", [])
        
        # 3. Ambil ID kategori 'anime_trending' dari database
        cat_response = supabase.table("categories").select("id").eq("name", "anime_trending").execute()
        if not cat_response.data:
            print("❌ Error: Kategori 'anime_trending' belum ada di tabel categories.")
            return
        category_id = cat_response.data[0]['id']

        # 4. Siapkan data sesuai skema database
        trend_items = []
        for index, anime in enumerate(anime_list):
            studios = anime.get("studios", [])
            studio_name = studios[0].get("name") if studios else "Unknown Studio"
            
            item = {
                "category_id": category_id,
                "title": anime.get("title"),
                "url": anime.get("url"),
                "image_url": anime.get("images", {}).get("jpg", {}).get("large_image_url"),
                "source_name": "Jikan",
                "rank": index + 1,
                "metadata": {
                    "studio": studio_name,
                    "score": anime.get("score")
                }
            }
            trend_items.append(item)
            
        # 5. Insert data ke tabel trend_items di Supabase
        print(f"Menyimpan {len(trend_items)} data ke database MavenFlow...")
        insert_response = supabase.table("trend_items").insert(trend_items).execute()
        
        print("✅ Proses ETL (Extract, Transform, Load) sukses!")
        
    except Exception as e:
        print(f"❌ Terjadi kesalahan: {e}")

if __name__ == "__main__":
    fetch_and_store_anime()