# Autonomous Parking Simulation (A* Algorithm)

Proyek Tugas Besar Kecerdasan Buatan untuk mensimulasikan mobil yang bisa nyari jalur dan parkir sendiri secara otomatis. Di sini kita pakai **Algoritma A\* (A-Star)** sebagai otak utama buat nyari rute paling pendek dan efisien dari titik awal ke slot parkir tujuan.

Simulasi ini dibuat pakai Vanilla JavaScript, HTML5 Canvas, dan CSS biasa (tanpa framework/library tambahan) biar eksekusi rendering-nya enteng dan gak tumpang tindih antara logika codingan sama visualnya.

## Fitur & Logika Utama

* **Kalkulasi Jalur Efisien:** Nyari rute pakai fungsi utama $f(n) = g(n) + h(n)$.
* **Directional Heuristic:** Fungsi heuristiknya gak cuma ngitung jarak kaku (*Manhattan Distance*), tapi juga ngasih penalti skor (+1.5 sampai +2) kalau arah hadap mobil melenceng dari target. Ini bikin mobil gak bakal ngambil belokan patah yang mustahil dilakuin sama struktur fisik mobil asli.
* **Grid Interaktif (22×16):** Peta parkir bisa diubah-ubah langsung lewat browser. Kita bisa klik kiri pakai mouse di area grid buat pasang/ngapus tembok pembatas secara *real-time*.
* **Anti-Crash (Infinite Loop Guard):** Ada batas maksimal iterasi perulangan *while*. Jadi kalau jalur parkir sengaja diblokir total sampai buntu, program bakal langsung berhenti nyari secara aman dalam beberapa milidetik, lalu ngasih status **"Gagal"** tanpa bikin tab browser *freeze* atau *crash*.

## Alur Kerja Fungsi (`app.js`)

Biar struktur kodenya rapi (*clean architecture*), logika di `app.js` dipecah jadi beberapa fungsi modular:
* `init()` : Setup awal buat nentuin ukuran canvas dan posisi objek pas pertama kali web dibuka.
* `addDef()` : Otomatis ngegambar pilar pembatas bawaan (tembok abu-abu) di tengah grid begitu aplikasi jalan, jadi gak perlu ngegambar manual dari nol setiap kali di-refresh.
* `clearViz()` : Ngebersihin sisa-sisa warna jejak pencarian rute yang lama biar memori visualnya seger lagi sebelum mulai kalkulasi baru.
* `runAstar()` : Inti algoritma yang nge-evaluasi *Open Set* dan *Closed Set* buat nyari koordinat jalan terbaik.
* `doCarFrame()` : Ngejalanin animasi per frame buat ngegerakin aset gambar mobil ngelewatin jalur hijau yang udah ditemuin.

## Cara Nyoba

### 1. Clone Repositori
```bash
git clone [https://github.com/Ariefhuda434/GreddySearch-Parking-.git](https://github.com/Ariefhuda434/GreddySearch-Parking-.git)
cd GreddySearch-Parking-
