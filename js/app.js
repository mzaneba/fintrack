// google auth
function handleGoogleLogin(response) {
  const payload = JSON.parse(atob(response.credential.split(".")[1]));
  const user = {
    nama: payload.name,
    email: payload.email,
    avatar: payload.picture,
    sub: payload.sub,
  };
  Storage.saveUser(user);
  App.showApp(user);
}

/* transaksi */
const Transaksi = {
  page: 1,
  perPage: 10,
  filtered: [],

  render() {
    const jenis = document.getElementById("filterJenis")?.value || "";
    const kat = document.getElementById("filterKat")?.value || "";
    const bulan = document.getElementById("filterBulan")?.value || "";
    const cur = H.cur();

    let data = Storage.getTrx();
    if (jenis) data = data.filter((t) => t.jenis === jenis);
    if (kat) data = data.filter((t) => t.kat_id === kat);
    if (bulan) data = data.filter((t) => H.inMonth(t.tanggal, bulan));
    this.filtered = data;

    const tbody = document.getElementById("trxBody");
    if (!tbody) return;

    const pages = Math.max(1, Math.ceil(data.length / this.perPage));
    if (this.page > pages) this.page = 1;
    const slice = data.slice(
      (this.page - 1) * this.perPage,
      this.page * this.perPage,
    );

    if (!slice.length) {
      tbody.innerHTML = `<tr><td colspan="6">${H.empty("receipt", "Belum ada transaksi")}</td></tr>`;
      document.getElementById("trxPagination").innerHTML = "";
      return;
    }

    tbody.innerHTML = slice
      .map((t) => {
        const k = H.kat(t.kat_id);
        const isIn = t.jenis === "pemasukan";
        return `<tr>
        <td>${H.date(t.tanggal)}</td>
        <td><strong>${t.catatan || (isIn ? "Pemasukan" : "Pengeluaran")}</strong></td>
        <td><span class="ft-badge ft-badge-cat">${k ? `<i class="${k.ikon}" style="color:${k.warna}"></i>` : ""} ${k ? k.nama : "-"}</span></td>
        <td><span class="ft-badge ${isIn ? "ft-badge-in" : "ft-badge-out"}">${isIn ? "Pemasukan" : "Pengeluaran"}</span></td>
        <td class="text-end"><span class="${isIn ? "ft-amt-in" : "ft-amt-out"}">${isIn ? "+" : "-"}${H.fmt(t.nominal, cur)}</span></td>
        <td class="text-center">
          <div class="d-flex gap-1 justify-content-center">
            <button class="ft-tbl-btn" onclick="Transaksi.edit('${t.id}')"><i class="fa-solid fa-pen"></i></button>
            <button class="ft-tbl-btn del" onclick="Transaksi.del('${t.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
      })
      .join("");

    const pg = document.getElementById("trxPagination");
    if (pages <= 1) {
      pg.innerHTML = "";
      return;
    }
    let html = "";
    if (this.page > 1)
      html += `<button class="ft-pg-btn" onclick="Transaksi.goPage(${this.page - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
    for (let i = 1; i <= pages; i++)
      html += `<button class="ft-pg-btn ${i === this.page ? "active" : ""}" onclick="Transaksi.goPage(${i})">${i}</button>`;
    if (this.page < pages)
      html += `<button class="ft-pg-btn" onclick="Transaksi.goPage(${this.page + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
    pg.innerHTML = html;
  },

  goPage(p) {
    this.page = p;
    this.render();
  },

  setJenis(jenis) {
    document.getElementById("trxJenis").value = jenis;
    document
      .querySelectorAll(".ft-tab")
      .forEach((b) => b.classList.toggle("active", b.dataset.type === jenis));
    H.fillKatSelect(document.getElementById("trxKategori"), jenis);
  },

  edit(id) {
    const t = Storage.getTrx().find((t) => t.id === id);
    if (!t) return;
    document.getElementById("trxId").value = t.id;
    document.getElementById("trxNominal").value = t.nominal;
    document.getElementById("trxTanggal").value = t.tanggal;
    document.getElementById("trxCatatan").value = t.catatan || "";
    document.getElementById("modalTrxTitle").textContent = "Edit Transaksi";
    this.setJenis(t.jenis);
    document.getElementById("trxKategori").value = t.kat_id;
    new bootstrap.Modal(document.getElementById("modalTrx")).show();
  },

  save() {
    const id = document.getElementById("trxId").value;
    const jenis = document.getElementById("trxJenis").value;
    const nominal = Number(document.getElementById("trxNominal").value);
    const kat_id = document.getElementById("trxKategori").value;
    const tanggal = document.getElementById("trxTanggal").value;
    const catatan = document.getElementById("trxCatatan").value.trim();
    if (!nominal || nominal <= 0) {
      H.toast("Nominal harus lebih dari 0", "error");
      return;
    }
    if (!kat_id) {
      H.toast("Pilih kategori", "error");
      return;
    }
    if (!tanggal) {
      H.toast("Tanggal wajib diisi", "error");
      return;
    }
    const payload = { jenis, nominal, kat_id, tanggal, catatan };
    if (id) {
      Storage.updateTrx(id, payload);
      H.toast("Transaksi diperbarui");
    } else {
      Storage.addTrx(payload);
      H.toast("Transaksi ditambahkan");
    }
    bootstrap.Modal.getInstance(document.getElementById("modalTrx")).hide();
    this.render();
    Dashboard.render();
  },

  del(id) {
    H.confirm("Hapus Transaksi?", "Data ini akan dihapus permanen.", () => {
      Storage.deleteTrx(id);
      H.toast("Transaksi dihapus", "info");
      this.render();
      Dashboard.render();
    });
  },

  exportCSV() {
    const data = this.filtered.length ? this.filtered : Storage.getTrx();
    if (!data.length) {
      H.toast("Tidak ada data", "warning");
      return;
    }
    const rows = [
      ["Tanggal", "Jenis", "Kategori", "Nominal", "Catatan"],
      ...data.map((t) => [
        t.tanggal,
        t.jenis,
        H.katName(t.kat_id),
        t.nominal,
        t.catatan || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
      download: `fintrack-${Date.now()}.csv`,
    });
    a.click();
    H.toast("Berhasil diekspor ke CSV");
  },

  init() {
    ["filterJenis", "filterKat", "filterBulan"].forEach((id) =>
      document.getElementById(id)?.addEventListener("change", () => {
        this.page = 1;
        this.render();
      }),
    );
    document.getElementById("filterBulan").value = H.curMonth();

    const fk = document.getElementById("filterKat");
    if (fk)
      fk.innerHTML =
        '<option value="">Semua Kategori</option>' +
        Storage.getKat()
          .map((k) => `<option value="${k.id}">${k.nama}</option>`)
          .join("");

    document
      .querySelectorAll(".ft-tab")
      .forEach((b) =>
        b.addEventListener("click", () => this.setJenis(b.dataset.type)),
      );
    document
      .getElementById("btnSaveTrx")
      ?.addEventListener("click", () => this.save());
    document
      .getElementById("btnExportCSV")
      ?.addEventListener("click", () => this.exportCSV());
    document
      .getElementById("modalTrx")
      ?.addEventListener("show.bs.modal", (e) => {
        if (e.relatedTarget) {
          ["trxId", "trxNominal", "trxCatatan", "trxTanggal"].forEach(
            (i) => (document.getElementById(i).value = ""),
          );
          document.getElementById("trxTanggal").value = new Date()
            .toISOString()
            .split("T")[0];
          document.getElementById("modalTrxTitle").textContent =
            "Tambah Transaksi";
          this.setJenis("pengeluaran");
        }
      });
  },
};

// dashboard
const Dashboard = {
  _bar: null,
  _donut: null,

  render() {
    const cur = H.cur();
    const bulan = H.curMonth();
    const trx = Storage.getTrx();
    const bulanTrx = trx.filter((t) => H.inMonth(t.tanggal, bulan));
    const inc = bulanTrx
      .filter((t) => t.jenis === "pemasukan")
      .reduce((s, t) => s + Number(t.nominal), 0);
    const exp = bulanTrx
      .filter((t) => t.jenis === "pengeluaran")
      .reduce((s, t) => s + Number(t.nominal), 0);
    const bal = inc - exp;
    const sav = Storage.getGoals().reduce(
      (s, g) => s + (Number(g.terkumpul) || 0),
      0,
    );

    document.getElementById("dash-income").textContent = H.fmt(inc, cur);
    document.getElementById("dash-expense").textContent = H.fmt(exp, cur);
    document.getElementById("dash-saving").textContent = H.fmt(sav, cur);
    const balEl = document.getElementById("dash-balance");
    balEl.textContent = H.fmt(bal, cur);
    balEl.style.color = bal < 0 ? "#dc2626" : "";

    this._renderBar(trx, cur);
    this._renderDonut(bulanTrx);
    this._renderBudget(trx, bulan, cur);
    this._renderRecent(trx, cur);
  },

  _renderBar(trx, cur) {
    const ctx = document.getElementById("chartBar");
    if (!ctx) return;
    if (this._bar) this._bar.destroy();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }
    this._bar = new Chart(ctx, {
      type: "bar",
      data: {
        labels: months.map(H.month),
        datasets: [
          {
            label: "Pemasukan",
            data: months.map((m) =>
              trx
                .filter(
                  (t) => t.jenis === "pemasukan" && H.inMonth(t.tanggal, m),
                )
                .reduce((s, t) => s + Number(t.nominal), 0),
            ),
            backgroundColor: "rgba(16,185,129,.8)",
            borderRadius: 5,
            borderSkipped: false,
          },
          {
            label: "Pengeluaran",
            data: months.map((m) =>
              trx
                .filter(
                  (t) => t.jenis === "pengeluaran" && H.inMonth(t.tanggal, m),
                )
                .reduce((s, t) => s + Number(t.nominal), 0),
            ),
            backgroundColor: "rgba(239,68,68,.8)",
            borderRadius: 5,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "top",
            labels: { boxWidth: 12, font: { size: 12 } },
          },
          tooltip: { mode: "index", intersect: false },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: {
            grid: { color: H.gridColor() },
            ticks: { font: { size: 11 }, callback: H.tickFmt },
          },
        },
      },
    });
  },

  _renderDonut(bulanTrx) {
    const ctx = document.getElementById("chartDonut");
    if (!ctx) return;
    if (this._donut) this._donut.destroy();
    const byKat = {};
    bulanTrx
      .filter((t) => t.jenis === "pengeluaran")
      .forEach((t) => {
        byKat[t.kat_id] = (byKat[t.kat_id] || 0) + Number(t.nominal);
      });
    const labels = [],
      values = [],
      colors = [];
    Object.entries(byKat).forEach(([id, v]) => {
      labels.push(H.katName(id));
      values.push(v);
      colors.push(H.katColor(id));
    });
    const legend = document.getElementById("donutLegend");
    if (!values.length) {
      ctx.style.display = "none";
      if (legend)
        legend.innerHTML = `<div style="color:var(--text-3);font-size:12px">Belum ada pengeluaran</div>`;
      return;
    }
    ctx.style.display = "";
    this._donut = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: "var(--surface)",
          },
        ],
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false } },
        cutout: "68%",
      },
    });
    if (legend)
      legend.innerHTML = labels
        .map(
          (l, i) =>
            `<div class="ft-legend-item"><div class="ft-legend-dot" style="background:${colors[i]}"></div><span>${l}</span></div>`,
        )
        .join("");
  },

  _renderBudget(trx, bulan, cur) {
    const el = document.getElementById("dash-budget-list");
    if (!el) return;
    const list = Storage.getBudget()
      .filter((b) => b.bulan === bulan)
      .slice(0, 5);
    if (!list.length) {
      el.innerHTML = H.empty("wallet", "Belum ada anggaran");
      return;
    }
    el.innerHTML = list
      .map((b) => {
        const k = H.kat(b.kat_id);
        const used = trx
          .filter(
            (t) =>
              t.kat_id === b.kat_id &&
              t.jenis === "pengeluaran" &&
              H.inMonth(t.tanggal, bulan),
          )
          .reduce((s, t) => s + Number(t.nominal), 0);
        const pct = b.limit > 0 ? Math.min((used / b.limit) * 100, 100) : 0;
        const cls = H.pctClass(pct);
        const clr = { safe: "#059669", warning: "#d97706", danger: "#dc2626" }[
          cls
        ];
        return `<div class="ft-budget-item">
        <div class="ft-budget-row">
          <span class="ft-budget-name">${k ? `<i class="${k.ikon}" style="color:${k.warna}"></i>` : ""} ${k ? k.nama : "-"}</span>
          <span class="ft-budget-amt">${H.fmt(used, cur)} / ${H.fmt(b.limit, cur)}</span>
        </div>
        ${H.progress(used, b.limit)}
        <div style="font-size:11px;color:${clr};text-align:right;margin-top:3px">${pct.toFixed(0)}% terpakai</div>
      </div>`;
      })
      .join("");
  },

  _renderRecent(trx, cur) {
    const el = document.getElementById("dash-recent-list");
    if (!el) return;
    const recent = trx.slice(0, 7);
    if (!recent.length) {
      el.innerHTML = H.empty("receipt", "Belum ada transaksi");
      return;
    }
    el.innerHTML = recent
      .map((t) => {
        const k = H.kat(t.kat_id);
        const isIn = t.jenis === "pemasukan";
        return `<div class="ft-trx-item">
        <div class="ft-trx-ico ${isIn ? "in" : "out"}"><i class="${k ? k.ikon : "fa-solid fa-circle"}"></i></div>
        <div class="ft-trx-info">
          <div class="ft-trx-name">${t.catatan || (isIn ? "Pemasukan" : "Pengeluaran")}</div>
          <div class="ft-trx-date">${H.date(t.tanggal)} &bull; ${k ? k.nama : "-"}</div>
        </div>
        <div class="ft-trx-amt ${isIn ? "ft-amt-in" : "ft-amt-out"}">${isIn ? "+" : "-"}${H.fmt(t.nominal, cur)}</div>
      </div>`;
      })
      .join("");
  },
};

// pengaturan
const Pengaturan = {
  load() {
    const s = Storage.getSettings();
    document.getElementById("settingMataUang").value = s.mata_uang || "IDR";
  },
  save() {
    const mu = document.getElementById("settingMataUang").value;
    Storage.saveSettings({ ...Storage.getSettings(), mata_uang: mu });
    document.getElementById("topbarCurrency").textContent = mu;
    document.getElementById("currencyPrefix").textContent = H.sym(mu);
    H.toast("Pengaturan disimpan");
    Dashboard.render();
  },
  exportData() {
    const blob = new Blob([JSON.stringify(Storage.exportAll(), null, 2)], {
      type: "application/json",
    });
    const a = Object.assign(document.createElement("a"), {
      href: URL.createObjectURL(blob),
      download: `fintrack-backup-${Date.now()}.json`,
    });
    a.click();
    H.toast("Data diekspor");
  },
  importData(file) {
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const ok = Storage.importAll(JSON.parse(e.target.result));
        ok
          ? (H.toast("Data diimpor, halaman akan dimuat ulang"),
            setTimeout(() => location.reload(), 1500))
          : H.toast("Gagal impor", "error");
      } catch {
        H.toast("File tidak valid", "error");
      }
    };
    r.readAsText(file);
  },
  init() {
    document
      .getElementById("btnSaveSetting")
      ?.addEventListener("click", () => this.save());
    document
      .getElementById("btnExportData")
      ?.addEventListener("click", () => this.exportData());
    document.getElementById("btnResetData")?.addEventListener("click", () => {
      H.confirm(
        "Reset Semua Data?",
        "Semua data akan dihapus permanen!",
        () => {
          Storage.resetAll();
          H.toast("Data direset", "info");
          setTimeout(() => location.reload(), 1500);
        },
      );
    });
    document.getElementById("inputImport")?.addEventListener("change", (e) => {
      if (e.target.files[0]) this.importData(e.target.files[0]);
    });
  },
};

// router
const App = {
  pages: {
    dashboard: "Dashboard",
    transaksi: "Transaksi",
    anggaran: "Anggaran",
    goals: "Tujuan Keuangan",
    laporan: "Laporan",
    kategori: "Kategori",
    pengaturan: "Pengaturan",
  },
  current: "dashboard",

  navigate(page) {
    if (!this.pages[page]) return;
    this.current = page;
    document
      .querySelectorAll(".ft-page")
      .forEach((p) => p.classList.remove("active"));
    document.getElementById(`page-${page}`)?.classList.add("active");
    document
      .querySelectorAll("[data-page]")
      .forEach((a) => a.classList.toggle("active", a.dataset.page === page));
    document.getElementById("pageTitle").textContent = this.pages[page];
    const actions = {
      dashboard: () => Dashboard.render(),
      transaksi: () => Transaksi.render(),
      anggaran: () => Budget.render(),
      goals: () => Goals.render(),
      laporan: () => Laporan.render(),
      kategori: () => Kategori.render(),
      pengaturan: () => Pengaturan.load(),
    };
    actions[page]?.();
    if (window.innerWidth < 992) {
      document.getElementById("sidebar").classList.remove("open");
      document.getElementById("overlay").classList.remove("open");
    }
  },

  showApp(user) {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("appPage").style.display = "block";
    document.getElementById("userName").textContent = user.nama || "Pengguna";
    document.getElementById("userEmail").textContent = user.email || "";
    if (user.avatar) document.getElementById("userAvatar").src = user.avatar;
    document.getElementById("topbarCurrency").textContent =
      Storage.getSettings().mata_uang || "IDR";
    this.navigate("dashboard");
  },

  initTheme() {
    const tema = Storage.getSettings().tema || "light";
    document.documentElement.setAttribute("data-theme", tema);
    this._updateThemeBtn(tema);
  },

  toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    Storage.saveSettings({ ...Storage.getSettings(), tema: next });
    this._updateThemeBtn(next);
    if (this.current === "dashboard") Dashboard.render();
    if (this.current === "laporan") Laporan.render();
  },

  _updateThemeBtn(tema) {
    document.getElementById("themeIcon").className =
      tema === "light" ? "fa-solid fa-moon" : "fa-solid fa-sun";
    document.getElementById("themeLabel").textContent =
      tema === "light" ? "Dark Mode" : "Light Mode";
  },

  init() {
    this.initTheme();

    const user = Storage.getUser();
    if (user && user.sub) {
      this.showApp(user);
    }

    document.querySelectorAll("[data-page]").forEach((el) =>
      el.addEventListener("click", (e) => {
        e.preventDefault();
        this.navigate(el.dataset.page);
      }),
    );

    document.getElementById("sidebarOpen")?.addEventListener("click", () => {
      document.getElementById("sidebar").classList.add("open");
      document.getElementById("overlay").classList.add("open");
    });
    document.getElementById("sidebarClose")?.addEventListener("click", () => {
      document.getElementById("sidebar").classList.remove("open");
      document.getElementById("overlay").classList.remove("open");
    });
    document.getElementById("overlay")?.addEventListener("click", () => {
      document.getElementById("sidebar").classList.remove("open");
      document.getElementById("overlay").classList.remove("open");
    });

    document
      .getElementById("themeToggle")
      ?.addEventListener("click", () => this.toggleTheme());

    document.getElementById("btnLogout")?.addEventListener("click", () => {
      H.confirm(
        "Keluar?",
        "Kamu akan keluar dari FinTrack.",
        () => {
          google.accounts.id.disableAutoSelect();
          google.accounts.id.revoke(Storage.getUser().email, () => {
            Storage.saveUser({});
            document.getElementById("appPage").style.display = "none";
            document.getElementById("loginPage").style.display = "flex";
          });
        },
        "Keluar",
        "fa-right-from-bracket",
      );
    });

    document.getElementById("btnConfirmOk")?.addEventListener("click", () => {
      if (H._confirmCb) H._confirmCb();
      bootstrap.Modal.getInstance(
        document.getElementById("modalConfirm"),
      ).hide();
      H._confirmCb = null;
    });

    document.getElementById("topbarDate").textContent =
      new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

    Storage.getKat();

    Transaksi.init();
    Budget.init();
    Goals.init();
    Laporan.init();
    Kategori.init();
    Pengaturan.init();
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
