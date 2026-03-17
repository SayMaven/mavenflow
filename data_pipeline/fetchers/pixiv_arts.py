import os
from dotenv import load_dotenv
from pixivpy3 import AppPixivAPI
from supabase import create_client, Client

# 1. Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
PIXIV_REFRESH_TOKEN = os.getenv("PIXIV_REFRESH_TOKEN")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Kredensial Supabase tidak ditemukan!")
    exit()

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_pixiv_ranking():
    # Pengecekan token otentikasi Pixiv
    if not PIXIV_REFRESH_TOKEN:
        print("❌ Error: PIXIV_REFRESH_TOKEN belum diatur di file .env!")
        return

    print("Mencoba login ke Pixiv API...")
    api = AppPixivAPI()
    
    try:
        # Melakukan otentikasi
        api.auth(refresh_token=PIXIV_REFRESH_TOKEN)
        print("✅ Login Pixiv berhasil! Menarik data Daily Ranking...")
        
        # 2. Ambil ranking ilustrasi harian
        json_result = api.illust_ranking('day')
        illusts = json_result.illusts[:10] # Batasi top 5 saja
        
        # 3. Ambil ID kategori 'pixiv_arts' dari database
        cat_response = supabase.table("categories").select("id").eq("name", "pixiv_arts").execute()
        if not cat_response.data:
            print("❌ Error: Kategori 'pixiv_arts' tidak ditemukan di database.")
            return
        category_id = cat_response.data[0]['id']
        
        trend_items = []
        for index, illust in enumerate(illusts):
            # 4. Format data dengan metadata khusus Pixiv (Author, Tags, Views)
            item = {
                "category_id": category_id,
                "title": illust.title,
                "url": f"https://www.pixiv.net/en/artworks/{illust.id}",
                "image_url": illust.image_urls.large if 'large' in illust.image_urls else illust.image_urls.medium,
                "source_name": "Pixiv",
                "rank": index + 1,
                "metadata": {
                    "author": illust.user.name,
                    "tags": [tag.name for tag in illust.tags[:3]], # Ambil 3 tag teratas
                    "views": illust.total_view
                }
            }
            trend_items.append(item)
            
        # 5. Insert ke database
        print(f"Menyimpan {len(trend_items)} data ilustrasi ke database MavenFlow...")
        supabase.table("trend_items").insert(trend_items).execute()
        
        print("✅ Proses ETL Pixiv sukses!")
        
    except Exception as e:
        print(f"❌ Terjadi kesalahan saat memproses Pixiv: {e}")

if __name__ == "__main__":
    fetch_pixiv_ranking()