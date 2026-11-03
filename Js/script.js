
const $ = (id) => document.getElementById(id);
 
function copyData(data) {
  return JSON.parse(JSON.stringify(data));
}
 
function readStore(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? copyData(fallback) : JSON.parse(value);
  } catch {
    return copyData(fallback);
  }
}
 
function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
 
function escapeHTML(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };
 
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => entities[character]
  );
}
 
function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}
 
function priceNumber(value) {
  return typeof value === "number"
    ? value
    : Number(String(value).replace(/\D/g, ""));
}
 
function localDate(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
 
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-");
}
 
function localTimestamp() {
  const date = new Date();
  return `${localDate(date)} ${date.toTimeString().slice(0, 8)}`;
}
 
function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem("tb_session"));
  } catch {
    return null;
  }
}
 
/* =========================
   DATA APLIKASI
   ========================= */
 
let users = readStore("tb_users", dataPengguna);
let orders = readStore("tb_orders", []);
 
function loadBooks() {
  const storedBooks = readStore("tb_books", dataKatalogBuku);
 
  // Perbarui cover buku awal dari data.js.
  // Stok, harga, dan buku tambahan tetap dipertahankan.
  // PERBAIKAN: jika cover di data.js kosong, pakai cover yang tersimpan.
  return storedBooks.map((book) => {
    const original = dataKatalogBuku.find(
      (item) => item.kodeBarang === book.kodeBarang
    );
 
    return original
      ? { ...book, cover: original.cover || book.cover }
      : book;
  });
}
 
function loadTracking() {
  return {
    ...copyData(dataTracking),
    ...readStore("tb_tracking", {})
  };
}
 
let books = loadBooks();
let tracking = loadTracking();
 
const user = getSession();
const page = document.body.dataset.page;
const cartKey = user ? `tb_cart_${user.id}` : "tb_cart_guest";
 
let cart = readStore(cartKey, []);
 
function findBook(code) {
  return books.find((book) => book.kodeBarang === code);
}
 
function saveCart() {
  writeStore(cartKey, cart);
}
 
function cartTotal() {
  return cart.reduce((total, item) => {
    const book = findBook(item.code);
 
    return total + (
      book ? priceNumber(book.harga) * item.quantity : 0
    );
  }, 0);
}
 
function addToCart(code, quantity) {
  books = loadBooks();
 
  const book = findBook(code);
 
  if (!book || !Number.isSafeInteger(quantity) || quantity < 1) {
    alert("Buku atau jumlah pesanan tidak valid.");
    return false;
  }
 
  const existing = cart.find((item) => item.code === code);
  const newQuantity = (existing?.quantity || 0) + quantity;
 
  if (newQuantity > Number(book.stok)) {
    alert(`Stok tidak cukup. Stok tersedia: ${book.stok}`);
    return false;
  }
 
  if (existing) {
    existing.quantity = newQuantity;
  } else {
    cart.push({ code, quantity });
  }
 
  saveCart();
  return true;
}
 
/* =========================
   NAVIGASI DAN LOGOUT
   ========================= */
 
function renderNavbar() {
  $("navbar").innerHTML = `
    <nav class="navbar">
      <a href="dashboard.html" class="brand">📚 Toko Buku</a>
 
      <div class="nav-links">
        <a href="dashboard.html">Dashboard</a>
        <a href="stok.html">Katalog</a>
        <a href="chackout.html">Pemesanan</a>
        <a href="tracking.html">Tracking</a>
 
        <span>${escapeHTML(user.nama)}</span>
 
        <button id="logoutButton"
                type="button"
                class="secondary">
          Keluar
        </button>
      </div>
    </nav>
  `;
 
  $("logoutButton").addEventListener("click", () => {
    sessionStorage.removeItem("tb_session");
    location.href = "index.html";
  });
}
 
/* =========================
   LOGIN DAN MODAL
   ========================= */
 
function initLogin() {
  document.querySelectorAll("[data-open]").forEach((button) => {
    button.addEventListener("click", () => {
      $(button.dataset.open).showModal();
    });
  });
 
  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => {
      $(button.dataset.close).close();
    });
  });
 
  $("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
 
    users = readStore("tb_users", dataPengguna);
 
    const email = $("email").value.trim().toLowerCase();
    const password = $("password").value;
 
    const account = users.find((item) =>
      item.email.toLowerCase() === email &&
      item.password === password
    );
 
    if (!account) {
      alert("email/password yang anda masukkan salah");
      return;
    }
 
    sessionStorage.setItem("tb_session", JSON.stringify({
      id: account.id,
      nama: account.nama,
      email: account.email,
      role: account.role
    }));
 
    location.href = "dashboard.html";
  });
 
  $("registerForm").addEventListener("submit", (event) => {
    event.preventDefault();
 
    const nama = $("registerName").value.trim();
    const email = $("registerEmail").value.trim().toLowerCase();
    const password = $("registerPassword").value;
 
    if (!nama || !email || password.length < 6) {
      alert("Lengkapi nama dan email. Password minimal 6 karakter.");
      return;
    }
 
    users = readStore("tb_users", dataPengguna);
 
    if (users.some((item) => item.email.toLowerCase() === email)) {
      alert("Email sudah terdaftar.");
      return;
    }
 
    users.push({
      id: Date.now(),
      nama,
      email,
      password,
      role: "User"
    });
 
    writeStore("tb_users", users);
 
    $("registerForm").reset();
    $("registerModal").close();
 
    alert("Pendaftaran berhasil. Silakan login.");
  });
 
  $("forgotForm").addEventListener("submit", (event) => {
    event.preventDefault();
 
    alert(
      "Simulasi: jika email terdaftar, instruksi reset akan dikirim. " +
      "Aplikasi tugas ini tidak benar-benar mengirim email."
    );
 
    $("forgotForm").reset();
    $("forgotModal").close();
  });
}
 
/* =========================
   DASHBOARD DAN LAPORAN
   ========================= */
 
function initDashboard() {
  const hour = new Date().getHours();
 
  const greeting =
    hour >= 5 && hour < 11 ? "Selamat pagi" :
    hour >= 11 && hour < 15 ? "Selamat siang" :
    hour >= 15 && hour < 18 ? "Selamat sore" :
    "Selamat malam";
 
  $("greeting").textContent = `${greeting}, ${user.nama}!`;
 
  orders = readStore("tb_orders", []);
 
  const myOrders = orders.filter(
    (order) => order.userId === user.id
  );
 
  const totalValue = myOrders.reduce(
    (sum, order) => sum + order.total,
    0
  );
 
  const totalBooks = myOrders.reduce((sum, order) =>
    sum + order.items.reduce(
      (count, item) => count + item.quantity,
      0
    ), 0
  );
 
  $("report").innerHTML = `
    <div class="stat">
      Jumlah Pesanan
      <strong>${myOrders.length}</strong>
    </div>
    <div class="stat">
      Buku Dipesan
      <strong>${totalBooks}</strong>
    </div>
    <div class="stat">
      Nilai Pesanan
      <strong>${rupiah(totalValue)}</strong>
    </div>
  `;
 
  $("historyBody").innerHTML = myOrders.length
    ? [...myOrders].reverse().map((order) => `
      <tr>
        <td>${escapeHTML(order.nomorDO)}</td>
        <td>${escapeHTML(order.tanggal)}</td>
        <td>${escapeHTML(order.nama)}</td>
        <td>${rupiah(order.total)}</td>
        <td>
          ${escapeHTML(order.payment)}<br>
          <small>Belum dibayar / simulasi</small>
        </td>
        <td>
          <a class="button"
             href="tracking.html?do=${encodeURIComponent(order.nomorDO)}">
            Lacak
          </a>
        </td>
      </tr>
    `).join("")
    : `
      <tr>
        <td colspan="6" class="empty">Belum ada transaksi.</td>
      </tr>
    `;
}
 
/* =========================
   KATALOG DAN GAMBAR BUKU
   ========================= */
 
// Ekstensi huruf kecil dan besar (server Linux/hosting peka huruf besar-kecil)
const COVER_EXTENSIONS = [
  "jpg", "jpeg", "png", "webp",
  "JPG", "JPEG", "PNG", "WEBP"
];
 
const COVER_FOLDERS = ["img", "images", "assets/img", "assets/images"];
 
const COVER_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="65" height="90">
      <rect width="65" height="90" rx="6" fill="#e5e7eb"/>
      <text x="32" y="48" font-size="10" text-anchor="middle"
            fill="#6b7280" font-family="sans-serif">Tanpa</text>
      <text x="32" y="60" font-size="10" text-anchor="middle"
            fill="#6b7280" font-family="sans-serif">Sampul</text>
    </svg>`
  );
 
function slugify(text) {
  return String(text ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
 
// Daftar kemungkinan path gambar, dicoba berurutan sampai ada yang berhasil
function coverCandidates(book) {
  const list = [];
 
  const addNames = (name) => {
    if (!name) return;
 
    COVER_FOLDERS.forEach((folder) => {
      COVER_EXTENSIONS.forEach((ext) => {
        list.push(`${folder}/${name}.${ext}`);
      });
    });
  };
 
  const rawValue = String(book.cover || "").trim();
 
  // URL penuh atau data URI langsung dipakai apa adanya
  if (/^(https?:)?\/\//i.test(rawValue) || /^data:/i.test(rawValue)) {
    list.push(rawValue);
  } else if (rawValue) {
    const raw = rawValue
      .replace(/\\/g, "/")
      .replace(/^(\.{0,2}\/)+/, "");
 
    const file = raw.split("/").pop();
    const base = file.replace(/\.[^.]+$/, "");
 
    list.push(raw);
    COVER_FOLDERS.forEach((folder) => list.push(`${folder}/${file}`));
    addNames(base);
  }
 
  // Tebak dari kode buku: ASIP4301 -> img/ASIP4301.jpg, img/asip4301.jpg
  const code = String(book.kodeBarang || "").trim();
  addNames(code);
  addNames(code.toLowerCase());
 
  // Tebak dari judul: "Pengantar Ilmu Komunikasi"
  const slug = slugify(book.namaBarang);
  addNames(slug);
  addNames(slug.replace(/_/g, "-"));
  addNames(slug.replace(/_/g, ""));
 
  return [...new Set(list)];
}
 
function renderBooks() {
  $("bookBody").innerHTML = books.map((book) => `
    <tr>
      <td>
        <img class="cover"
             alt="Sampul ${escapeHTML(book.namaBarang)}">
      </td>
      <td>${escapeHTML(book.kodeBarang)}</td>
      <td>${escapeHTML(book.namaBarang)}</td>
      <td>${escapeHTML(book.jenisBarang)}</td>
      <td>${escapeHTML(book.edisi)}</td>
      <td>${Number(book.stok)}</td>
      <td>${rupiah(priceNumber(book.harga))}</td>
      <td>
        <button type="button"
                data-buy="${escapeHTML(book.kodeBarang)}"
                ${Number(book.stok) < 1 ? "disabled" : ""}>
          Pesan
        </button>
      </td>
    </tr>
  `).join("");
 
  $("bookBody").querySelectorAll("img").forEach((image, index) => {
    const book = books[index];
    const candidates = coverCandidates(book);
    let attempt = 0;
 
    image.style.width = "65px";
    image.style.height = "90px";
    image.style.objectFit = "cover";
    image.style.borderRadius = "6px";
 
    image.onerror = () => {
      attempt++;
 
      if (attempt < candidates.length) {
        image.src = candidates[attempt];
        return;
      }
 
      console.warn(
        `Sampul "${book.namaBarang}" tidak ditemukan. Path yang dicoba:`,
        candidates
      );
 
      image.onerror = null;
      image.src = COVER_PLACEHOLDER;
    };
 
    image.src = candidates[0] || COVER_PLACEHOLDER;
  });
}
 
function initStock() {
  renderBooks();
 
  $("bookBody").addEventListener("click", (event) => {
    const button = event.target.closest("[data-buy]");
 
    if (button && addToCart(button.dataset.buy, 1)) {
      location.href = "chackout.html";
    }
  });
 
  $("stockForm").addEventListener("submit", (event) => {
    event.preventDefault();
 
    const code = $("bookCode").value.trim().toUpperCase();
    const name = $("bookName").value.trim();
    const type = $("bookType").value.trim();
    const edition = Number($("bookEdition").value);
    const stock = Number($("bookStock").value);
    const price = Number($("bookPrice").value);
 
    if (
      !code || !name || !type ||
      !Number.isSafeInteger(edition) || edition < 1 ||
      !Number.isSafeInteger(stock) || stock < 0 ||
      !Number.isSafeInteger(price) || price < 1
    ) {
      alert("Periksa kembali data buku yang dimasukkan.");
      return;
    }
 
    books = loadBooks();
 
    if (findBook(code)) {
      alert("Kode buku sudah digunakan.");
      return;
    }
 
    books.push({
      kodeBarang: code,
      namaBarang: name,
      jenisBarang: type,
      edisi: String(edition),
      stok: stock,
      harga: rupiah(price),
      cover: $("bookCover").value.trim()
    });
 
    writeStore("tb_books", books);
    renderBooks();
    $("stockForm").reset();
 
    alert("Baris stok baru berhasil ditambahkan.");
  });
}
 
/* =========================
   KERANJANG
   ========================= */
 
function renderCart() {
  $("cartBody").innerHTML = cart.length
    ? cart.map((item) => {
      const book = findBook(item.code);
 
      if (!book) {
        return `
          <tr>
            <td colspan="4">
              Buku ${escapeHTML(item.code)} tidak tersedia.
            </td>
            <td>
              <button type="button" class="danger"
                      data-remove="${escapeHTML(item.code)}">
                Hapus
              </button>
            </td>
          </tr>
        `;
      }
 
      return `
        <tr>
          <td>${escapeHTML(book.namaBarang)}</td>
          <td>${rupiah(priceNumber(book.harga))}</td>
          <td>
            <input type="number"
                   class="quantity"
                   min="1"
                   max="${Number(book.stok)}"
                   step="1"
                   value="${item.quantity}"
                   data-quantity="${escapeHTML(item.code)}"
                   aria-label="Jumlah ${escapeHTML(book.namaBarang)}">
          </td>
          <td>${rupiah(priceNumber(book.harga) * item.quantity)}</td>
          <td>
            <button type="button" class="danger"
                    data-remove="${escapeHTML(item.code)}">
              Hapus
            </button>
          </td>
        </tr>
      `;
    }).join("")
    : `
      <tr>
        <td colspan="5" class="empty">Pesanan masih kosong.</td>
      </tr>
    `;
 
  $("cartTotal").textContent = rupiah(cartTotal());
}
 
/* =========================
   CHECKOUT
   ========================= */
 
function initCheckout() {
  $("customerName").value = user.nama;
  $("customerEmail").value = user.email;
 
  $("bookSelect").innerHTML = books.map((book) => `
    <option value="${escapeHTML(book.kodeBarang)}"
            ${Number(book.stok) < 1 ? "disabled" : ""}>
      ${escapeHTML(book.namaBarang)} — stok ${Number(book.stok)}
    </option>
  `).join("");
 
  renderCart();
 
  $("addCartForm").addEventListener("submit", (event) => {
    event.preventDefault();
 
    if (addToCart(
      $("bookSelect").value,
      Number($("cartQuantity").value)
    )) {
      renderCart();
      $("cartQuantity").value = 1;
    }
  });
 
  $("cartBody").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove]");
    if (!button) return;
 
    cart = cart.filter(
      (item) => item.code !== button.dataset.remove
    );
 
    saveCart();
    renderCart();
  });
 
  $("cartBody").addEventListener("change", (event) => {
    const input = event.target.closest("[data-quantity]");
    if (!input) return;
 
    books = loadBooks();
 
    const item = cart.find(
      (entry) => entry.code === input.dataset.quantity
    );
 
    const book = findBook(input.dataset.quantity);
    const quantity = Number(input.value);
 
    if (
      !item || !book ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > Number(book.stok)
    ) {
      alert("Jumlah tidak valid atau melebihi stok.");
      renderCart();
      return;
    }
 
    item.quantity = quantity;
    saveCart();
    renderCart();
  });
 
  $("checkoutForm").addEventListener("submit", submitOrder);
}
 
function submitOrder(event) {
  event.preventDefault();
 
  if (!cart.length) {
    alert("Tambahkan buku terlebih dahulu.");
    return;
  }
 
  const nama = $("customerName").value.trim();
  const email = $("customerEmail").value.trim();
  const phone = $("customerPhone").value.trim();
  const address = $("customerAddress").value.trim();
 
  if (!nama || !email || !phone || !address) {
    alert("Lengkapi seluruh informasi pemesan.");
    return;
  }
 
  books = loadBooks();
 
  for (const item of cart) {
    const book = findBook(item.code);
 
    if (
      !book ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > Number(book.stok)
    ) {
      alert("Stok berubah atau jumlah tidak valid. Periksa pesanan.");
      renderCart();
      return;
    }
  }
 
  if (!confirm("Konfirmasi pesanan ini? Pembayaran hanya simulasi.")) {
    return;
  }
 
  orders = readStore("tb_orders", []);
  tracking = loadTracking();
 
  let nomorDO;
 
  do {
    nomorDO = `DO${Date.now()}${Math.floor(Math.random() * 1000)}`;
  } while (
    Object.prototype.hasOwnProperty.call(tracking, nomorDO)
  );
 
  const total = cartTotal();
  const tanggal = localDate();
 
  const items = cart.map((item) => {
    const book = findBook(item.code);
 
    return {
      code: item.code,
      nama: book.namaBarang,
      harga: priceNumber(book.harga),
      quantity: item.quantity
    };
  });
 
  orders.push({
    nomorDO,
    userId: user.id,
    nama,
    email,
    phone,
    address,
    tanggal,
    total,
    payment: $("payment").value,
    items
  });
 
  tracking[nomorDO] = {
    nomorDO,
    nama,
    status: "Diproses",
    ekspedisi: $("shipping").value,
    tanggalKirim: "-",
    paket: "Reguler",
    total: rupiah(total),
    perjalanan: [{
      waktu: localTimestamp(),
      keterangan:
        "Pesanan diterima dan menunggu pemrosesan (simulasi)."
    }]
  };
 
  items.forEach((item) => {
    findBook(item.code).stok -= item.quantity;
  });
 
  writeStore("tb_books", books);
  writeStore("tb_orders", orders);
  writeStore("tb_tracking", tracking);
 
  cart = [];
  saveCart();
 
  alert(`Pesanan berhasil dibuat.\nNomor DO: ${nomorDO}`);
 
  location.href =
    `tracking.html?do=${encodeURIComponent(nomorDO)}`;
}
 
/* =========================
   TRACKING PENGIRIMAN
   ========================= */
 
function showTracking(number) {
  tracking = loadTracking();
 
  const item = Object.prototype.hasOwnProperty.call(tracking, number)
    ? tracking[number]
    : null;
 
  if (!item) {
    $("trackingResult").innerHTML = `
      <div class="card empty">
        Nomor Delivery Order tidak ditemukan.
      </div>
    `;
    return;
  }
 
  $("trackingResult").innerHTML = `
    <article class="card">
      <h2>DO ${escapeHTML(item.nomorDO)}</h2>
      <p class="badge">${escapeHTML(item.status)}</p>
 
      <dl class="detail-grid">
        <div>
          <dt>Nama pemesan</dt>
          <dd>${escapeHTML(item.nama)}</dd>
        </div>
        <div>
          <dt>Ekspedisi</dt>
          <dd>${escapeHTML(item.ekspedisi)}</dd>
        </div>
        <div>
          <dt>Tanggal kirim</dt>
          <dd>${escapeHTML(item.tanggalKirim)}</dd>
        </div>
        <div>
          <dt>Kode/Jenis paket</dt>
          <dd>${escapeHTML(item.paket)}</dd>
        </div>
        <div>
          <dt>Total pembayaran</dt>
          <dd>${escapeHTML(item.total)}</dd>
        </div>
      </dl>
 
      <h3>Riwayat Perjalanan</h3>
 
      <ol class="timeline">
        ${(item.perjalanan || []).map((step) => `
          <li>
            <time>${escapeHTML(step.waktu)}</time>
            ${escapeHTML(step.keterangan)}
          </li>
        `).join("")}
      </ol>
    </article>
  `;
}
 
function initTracking() {
  $("trackingForm").addEventListener("submit", (event) => {
    event.preventDefault();
 
    const number = $("doNumber").value.trim();
 
    if (!number) {
      alert("Masukkan nomor Delivery Order.");
      return;
    }
 
    showTracking(number);
  });
 
  const number = new URLSearchParams(location.search).get("do");
 
  if (number) {
    $("doNumber").value = number;
    showTracking(number);
  }
}
 
/* =========================
   INISIALISASI
   ========================= */
 
function initApp() {
  if (page === "login") {
    initLogin();
    return;
  }
 
  if (!user) {
    location.replace("index.html");
    return;
  }
 
  renderNavbar();
 
  switch (page) {
    case "dashboard":
      initDashboard();
      break;
 
    case "stok":
      initStock();
      break;
 
    case "checkout":
      initCheckout();
      break;
 
    case "tracking":
      initTracking();
      break;
 
    default:
      console.warn("Halaman tidak dikenali:", page);
  }
}
 
initApp();
 
