# Panduan Integrasi Supabase Client - Antigravity Budget

Panduan ini menjelaskan langkah demi langkah untuk menghubungkan aplikasi React + Vite Anda ke database Supabase Cloud dengan arsitektur Multi-Tenant berbasis **Row Level Security (RLS)**.

---

## Langkah 1: Persiapan Proyek Supabase
1. Buka [Supabase Dashboard](https://supabase.com) dan buat proyek baru.
2. Tentukan nama proyek, kata sandi database, dan wilayah server yang terdekat.
3. Tunggu hingga proses penyediaan database selesai.

---

## Langkah 2: Pembuatan Skema Database (PostgreSQL)
Jalankan skrip SQL berikut di menu **SQL Editor** pada dasbor Supabase Anda untuk membuat tabel dan trigger isolasi tenant otomatis:

```sql
-- 1. Buat Tabel Profiles (Data Tenant)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Buat Tabel Categories (Kategori Transaksi)
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Buat Tabel Transactions (Data Finansial)
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  type text NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
  amount numeric NOT NULL,
  description text,
  trx_date timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Trigger Otomatis Pembuatan Profil Tenant Baru
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  
  -- Masukkan kategori bawaan secara otomatis untuk tenant baru
  INSERT INTO public.categories (tenant_id, name, type) VALUES
    (new.id, 'Gaji', 'INCOME'),
    (new.id, 'Investasi', 'INCOME'),
    (new.id, 'Makanan', 'EXPENSE'),
    (new.id, 'Transportasi', 'EXPENSE'),
    (new.id, 'Hiburan', 'EXPENSE');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Langkah 3: Konfigurasi Keamanan (Row Level Security - RLS)
Jalankan perintah SQL ini di **SQL Editor** untuk memastikan isolasi data mutlak antar-tenant:

```sql
-- Aktifkan RLS pada seluruh tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Kebijakan (Policy) Keamanan untuk Tabel Profiles
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
```

---

## Langkah 4: Hubungkan Kredensial di React (Vite)
1. Dapatkan **Project URL** dan **Anon Key** dari menu **Settings -> API** di dasbor Supabase Anda.
2. Buat/Edit berkas `.env` di direktori utama proyek Anda:
   ```env
   VITE_SUPABASE_URL=https://proyek-anda.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN5c3RlbSIsInJvbGUiOiJhbm9uIi...
   ```

---

## Langkah 5: Cara Menggunakan Supabase Client di Kode React

### 1. Inisialisasi Klien (Sudah Dibuat di `src/lib/supabase.js`)
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 2. Autentikasi Pengguna (Sign Up / Sign In)
```javascript
// Registrasi Tenant Baru
const handleRegister = async (email, password, fullName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName } // Akan ditangkap oleh database trigger
    }
  });
  if (error) console.error('Gagal daftar:', error.message);
  return data;
};

// Masuk (Sign In)
const handleLogin = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) console.error('Gagal masuk:', error.message);
  return data;
};
```

### 3. Operasi CRUD Transaksi (Otomatis Terisolasi via RLS)
```javascript
// Membaca Data Transaksi (SELECT)
// Supabase akan menyisipkan klausa WHERE tenant_id = auth.uid() secara otomatis di sisi server!
const fetchTransactions = async () => {
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      id,
      type,
      amount,
      description,
      trx_date,
      categories (name)
    `)
    .order('trx_date', { ascending: false });

  if (error) console.error(error);
  return data;
};

// Menambahkan Transaksi Baru (INSERT)
const addTransaction = async (trxData) => {
  const { data, error } = await supabase
    .from('transactions')
    .insert([
      {
        tenant_id: (await supabase.auth.getUser()).data.user.id, // Sesuai RLS
        category_id: trxData.categoryId,
        type: trxData.type,
        amount: trxData.amount,
        description: trxData.description,
        trx_date: trxData.date
      }
    ]);
  
  if (error) console.error(error);
  return data;
};
```
