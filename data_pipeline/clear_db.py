import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def clear_old_trends():
    print("🧹 Membersihkan data tren hari sebelumnya...")
    try:
        # Supabase butuh filter untuk perintah delete. Kita hapus semua data yang ID-nya lebih besar dari 0.
        supabase.table("trend_items").delete().gt("id", 0).execute()
        print("✅ Tabel trend_items sudah bersih! Siap diisi data hari ini.")
    except Exception as e:
        print(f"❌ Gagal membersihkan tabel: {e}")

if __name__ == "__main__":
    clear_old_trends()