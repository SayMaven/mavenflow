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

def fetch_kakaku_multi():
    print("Mulai men-scrape data Multi-Kategori dari Kakaku.com...")
    
    # DAFTAR TARGET SCRAPING
    target_categories = [
        {"sub_name": "Audio", "url": "https://kakaku.com/kaden/headphones/ranking_2046/"},
        {"sub_name": "Keyboard", "url": "https://kakaku.com/pc/keyboard/ranking_0150/"},
        {"sub_name": "Laptop", "url": "https://kakaku.com/pc/note-pc/ranking_0020/"}
    ]
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        cat_response = supabase.table("categories").select("id").eq("name", "tech_gadgets").execute()
        if not cat_response.data:
            supabase.table("categories").insert({
                "name": "tech_gadgets", 
                "description": "Tren Hardware, Gadget & Audio dari Kakaku"
            }).execute()
            cat_response = supabase.table("categories").select("id").eq("name", "tech_gadgets").execute()
            
        category_id = cat_response.data[0]['id']
        all_tech_items = []

        # LOOPING KE SETIAP KATEGORI
        for target in target_categories:
            print(f"Mengekstrak kategori: {target['sub_name']}...")
            
            response = requests.get(target["url"], headers=headers)
            response.raise_for_status()
            
            response.encoding = response.apparent_encoding 
            soup = BeautifulSoup(response.text, 'html.parser')
            
            product_rows = soup.select('.rkgBox')
            items_collected = 0

            for index, row in enumerate(product_rows):
                title_elem = row.select_one('.rkgBoxNameItem')
                title = title_elem.text.strip() if title_elem else "Unknown Product"
                
                link_elem = row.select_one('.rkgBoxLink')
                item_url = "https://kakaku.com"
                if link_elem and link_elem.has_attr('href'):
                    item_url = link_elem['href']
                    if item_url.startswith('/'):
                        item_url = f"https://kakaku.com{item_url}"
                        
                img_elem = row.select_one('.rkgItemImg img')
                image_url = "https://img1.kakaku.k-img.com/images/logo/kakaku_logo.gif"
                if img_elem and img_elem.has_attr('src'):
                    image_url = img_elem['src']
                    
                price_elem = row.select_one('.rkgPrice .price')
                price = price_elem.text.strip() if price_elem else "N/A"
                
                if title == "Unknown Product":
                    continue

                all_tech_items.append({
                    "category_id": category_id,
                    "title": title,
                    "url": item_url,
                    "image_url": image_url,
                    "source_name": "Kakaku.com",
                    "rank": items_collected + 1,
                    "metadata": {
                        "price_yen": price,
                        "subcategory": target["sub_name"] # <-- Menambahkan penanda kategori di JSONB
                    }
                })
                
                items_collected += 1
                if items_collected >= 10: # Ambil Top 5 per kategori
                    break
            
            # Kasih jeda 2 detik sebelum pindah ke URL berikutnya biar IP kita aman
            time.sleep(2)

        if not all_tech_items:
            print("⚠️ Peringatan: Tidak ada data yang berhasil ditarik.")
            return

        print(f"Menyimpan total {len(all_tech_items)} produk ke database MavenFlow...")
        supabase.table("trend_items").insert(all_tech_items).execute()
        
        print("✅ Proses Web Scraping Kakaku.com Multi-Kategori sukses!")
        
    except Exception as e:
        print(f"❌ Terjadi kesalahan: {e}")

if __name__ == "__main__":
    fetch_kakaku_multi()