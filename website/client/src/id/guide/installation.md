# Instalasi


Repomix dapat diinstal dengan berbagai cara, tergantung pada kebutuhan dan preferensi Anda.

## Menggunakan npx (Tanpa Instalasi)

Cara tercepat untuk mencoba Repomix adalah dengan menggunakan `npx` tanpa instalasi:

```bash
npx repomix
```

Ini akan mengunduh dan menjalankan Repomix secara langsung di direktori proyek Anda.

## Instalasi Global

Untuk penggunaan berulang, Anda dapat menginstal Repomix secara global:

### Menggunakan npm

```bash
npm install -g repomix
```

### Menggunakan yarn

```bash
yarn global add repomix
```

### Menggunakan pnpm

```bash
pnpm add -g repomix
```

### Menggunakan Bun

```bash
bun add -g repomix
```

### Menggunakan Homebrew (macOS/Linux)

```bash
brew install repomix
```

## Menggunakan Docker

Anda juga dapat menjalankan Repomix menggunakan Docker:

```bash
docker run -v .:/app -it --rm ghcr.io/yamadashy/repomix
```

## Ekstensi Chrome

Dapatkan akses instan ke Repomix langsung dari repositori GitHub mana pun! Ekstensi Chrome kami menambahkan tombol "Repomix" yang nyaman ke halaman repositori GitHub.

![Repomix Browser Extension](/images/docs/browser-extension.png)

Anda dapat menginstal ekstensi dari [Chrome Web Store](https://chromewebstore.google.com/detail/repomix/fimfamikepjgchehkohedilpdigcpkoa).

## Verifikasi Instalasi

Setelah instalasi, Anda dapat memverifikasi bahwa Repomix telah diinstal dengan benar dengan menjalankan:

```bash
repomix --version
```

## Langkah Selanjutnya

Setelah Anda menginstal Repomix, lihat [Panduan Penggunaan](usage.md) untuk mempelajari cara menggunakannya.
