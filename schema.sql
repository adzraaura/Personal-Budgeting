-- ====================================================================
-- DATABASE SCHEMA & SECURITY POLICIES FOR ANTIGRAVITY BUDGET
-- Jalankan skrip ini di menu SQL Editor pada dasbor Supabase Cloud Anda
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. PEMBUATAN TABEL-TABEL UTAMA
-- --------------------------------------------------------------------

-- Tabel Profiles (Data Tenant/User)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Categories (Kategori Transaksi)
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabel Transactions (Data Finansial Transaksi)
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  amount numeric NOT NULL,
  description text,
  trx_date timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- --------------------------------------------------------------------
-- 2. TRIGGER OTOMATIS PEMBUATAN PROFIL & KATEGORI DEFAULT
-- --------------------------------------------------------------------

-- Fungsi trigger saat pengguna baru mendaftar (sign up)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert data ke tabel profiles
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', 'User'));
  
  -- Masukkan kategori bawaan secara otomatis untuk user baru
  INSERT INTO public.categories (tenant_id, name, type) VALUES
    (new.id, 'Gaji', 'INCOME'),
    (new.id, 'Investasi', 'INCOME'),
    (new.id, 'Freelance', 'INCOME'),
    (new.id, 'Lain-lain', 'INCOME'),
    (new.id, 'Makanan', 'EXPENSE'),
    (new.id, 'Transportasi', 'EXPENSE'),
    (new.id, 'Hiburan', 'EXPENSE'),
    (new.id, 'Tagihan', 'EXPENSE'),
    (new.id, 'Lain-lain', 'EXPENSE');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buat trigger setelah data masuk ke auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------------------------------------------------
-- 3. KONFIGURASI KEAMANAN (ROW LEVEL SECURITY - RLS)
-- --------------------------------------------------------------------

-- Aktifkan RLS pada seluruh tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Hapus kebijakan lama jika ada untuk mencegah konflik saat jalankan ulang skrip
DROP POLICY IF EXISTS "Tenant can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Tenant can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Tenant can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Tenant can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Tenant can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Tenant can delete own categories" ON public.categories;
DROP POLICY IF EXISTS "Tenant can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Tenant can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Tenant can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Tenant can delete own transactions" ON public.transactions;

-- Kebijakan Keamanan untuk Tabel Profiles
CREATE POLICY "Tenant can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Tenant can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Kebijakan Keamanan untuk Tabel Categories
CREATE POLICY "Tenant can view own categories" ON public.categories FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Tenant can insert own categories" ON public.categories FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Tenant can update own categories" ON public.categories FOR UPDATE USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Tenant can delete own categories" ON public.categories FOR DELETE USING (auth.uid() = tenant_id);

-- Kebijakan Keamanan untuk Tabel Transactions
CREATE POLICY "Tenant can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = tenant_id);
CREATE POLICY "Tenant can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Tenant can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = tenant_id) WITH CHECK (auth.uid() = tenant_id);
CREATE POLICY "Tenant can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = tenant_id);
