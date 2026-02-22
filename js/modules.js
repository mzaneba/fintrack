// helpers
const H = {
  fmt: (n, cur = "IDR") =>
    new Intl.NumberFormat(cur === "IDR" ? "id-ID" : "en-US", {
      style: "currency",
      currency: cur,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(n) || 0),
  date: (s) => {
    if (!s) return "-";
    return new Date(s + "T00:00:00").toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  },
  month: (s) => {
    if (!s) return "-";
    const [y, m] = s.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  },
  curMonth: () => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  },
  inMonth: (d, m) => d && d.startsWith(m),
  cur: () => Storage.getSettings().mata_uang || "IDR",
  sym: (c) => ({ IDR: "Rp", USD: "$", MYR: "RM", SGD: "S$" })[c] || "Rp",
  kat: (id) => Storage.getKat().find((k) => k.id === id) || null,
  katName: (id) => {
    const k = H.kat(id);
    return k ? k.nama : "-";
  },
  katColor: (id) => {
    const k = H.kat(id);
    return k ? k.warna : "#94a3b8";
  },
  pctClass: (p) => (p >= 100 ? "danger" : p >= 80 ? "warning" : "safe"),
  progress: (used, limit) => {
    const p = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    return `<div class="ft-progress"><div class="ft-progress-bar ${H.pctClass(p)}" style="width:${p}%"></div></div>`;
  },
  rgba: (hex, a = 1) => {
    const r = parseInt(hex.slice(1, 3), 16),
      g = parseInt(hex.slice(3, 5), 16),
      b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  },
  empty: (ico, txt, lg = false) =>
    `<div class="ft-empty${lg ? " lg" : ""}"><i class="fa-solid ${ico}"></i><p>${txt}</p></div>`,
  katIcon: (k, sz = 30) =>
    k
      ? `<div class="ft-kat-icon" style="width:${sz}px;height:${sz}px;background:${H.rgba(k.warna, 0.15)};color:${k.warna}"><i class="${k.ikon}"></i></div>`
      : "",

  toast(msg, type = "success") {
    const icons = {
      success: "fa-circle-check",
      error: "fa-circle-xmark",
      warning: "fa-triangle-exclamation",
      info: "fa-circle-info",
    };
    const el = document.createElement("div");
    el.className = `ft-toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${icons[type]}"></i><span>${msg}</span>`;
    document.getElementById("toastContainer").appendChild(el);
    setTimeout(() => {
      el.style.cssText =
        "opacity:0;transform:translateX(16px);transition:.25s ease";
      setTimeout(() => el.remove(), 250);
    }, 3000);
  },

  _confirmCb: null,
  confirm(title, msg, cb, btnLabel = "Hapus", btnIcon = "fa-trash") {
    document.getElementById("confirmTitle").textContent = title;
    document.getElementById("confirmMsg").textContent = msg;
    const btn = document.getElementById("btnConfirmOk");
    btn.innerHTML = `<i class="fa-solid ${btnIcon}"></i> ${btnLabel}`;
    H._confirmCb = cb;
    new bootstrap.Modal(document.getElementById("modalConfirm")).show();
  },

  fillKatSelect(sel, jenis = null) {
    if (!sel) return;
    const list = jenis
      ? Storage.getKat().filter((k) => k.jenis === jenis)
      : Storage.getKat();
    sel.innerHTML = list
      .map((k) => `<option value="${k.id}">${k.nama}</option>`)
      .join("");
  },

  isDark: () => document.documentElement.getAttribute("data-theme") === "dark",
  gridColor: () => (H.isDark() ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"),
  tickFmt: (v) =>
    v >= 1e6
      ? (v / 1e6).toFixed(1) + "jt"
      : v >= 1e3
        ? (v / 1e3).toFixed(0) + "rb"
        : v,
};

// anggaran
const Budget = {
  render() {
    const bulan =
      document.getElementById("filterBulanAnggaran")?.value || H.curMonth();
    const cur = H.cur();
    const list = Storage.getBudget().filter((b) => b.bulan === bulan);
    const trx = Storage.getTrx();
    const grid = document.getElementById("anggaranGrid");
    if (!grid) return;

    if (!list.length) {
      grid.innerHTML = `<div class="col-12">${H.empty("wallet", "Belum ada anggaran untuk bulan ini", true)}</div>`;
      return;
    }

    grid.innerHTML = list
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
        const clrMap = {
          safe: "#059669",
          warning: "#d97706",
          danger: "#dc2626",
        };
        const sisa = b.limit - used;

        return `<div class="col-12 col-md-6 col-xl-4">
        <div class="ft-panel">
          <div class="ft-panel-header">
            <div class="ft-budget-name">${H.katIcon(k, 26)}<span>${k ? k.nama : "Kategori"}</span></div>
            <div class="d-flex gap-1">
              <button class="ft-tbl-btn" onclick="Budget.edit('${b.id}')"><i class="fa-solid fa-pen"></i></button>
              <button class="ft-tbl-btn del" onclick="Budget.del('${b.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
          <div class="ft-panel-body">
            <div style="font-size:20px;font-weight:700;font-family:var(--font-d);margin-bottom:8px">
              ${H.fmt(used, cur)} <span style="font-size:12px;font-weight:400;color:var(--text-3)">/ ${H.fmt(b.limit, cur)}</span>
            </div>
            ${H.progress(used, b.limit)}
            <div style="font-size:11.5px;color:${clrMap[cls]};margin-top:6px">
              ${pct.toFixed(0)}% terpakai &bull;
              ${sisa >= 0 ? `Sisa: <strong>${H.fmt(sisa, cur)}</strong>` : `Melebihi: <strong>${H.fmt(Math.abs(sisa), cur)}</strong>`}
            </div>
          </div>
        </div>
      </div>`;
      })
      .join("");
  },

  edit(id) {
    const b = Storage.getBudget().find((b) => b.id === id);
    if (!b) return;
    document.getElementById("anggaranId").value = b.id;
    document.getElementById("anggaranLimit").value = b.limit;
    document.getElementById("anggaranBulan").value = b.bulan;
    document.getElementById("modalAnggaranTitle").textContent = "Edit Anggaran";
    H.fillKatSelect(document.getElementById("anggaranKat"), "pengeluaran");
    document.getElementById("anggaranKat").value = b.kat_id;
    new bootstrap.Modal(document.getElementById("modalAnggaran")).show();
  },

  save() {
    const id = document.getElementById("anggaranId").value;
    const katId = document.getElementById("anggaranKat").value;
    const limit = Number(document.getElementById("anggaranLimit").value);
    const bulan = document.getElementById("anggaranBulan").value;
    if (!katId) {
      H.toast("Pilih kategori", "error");
      return;
    }
    if (!limit || limit <= 0) {
      H.toast("Batas harus lebih dari 0", "error");
      return;
    }
    if (!bulan) {
      H.toast("Pilih bulan", "error");
      return;
    }
    if (id) {
      Storage.updateBudget(id, { kat_id: katId, limit, bulan });
      H.toast("Anggaran diperbarui");
    } else {
      const r = Storage.addBudget({ kat_id: katId, limit, bulan });
      if (r && r.err) {
        H.toast(r.err, "error");
        return;
      }
      H.toast("Anggaran ditambahkan");
    }
    bootstrap.Modal.getInstance(
      document.getElementById("modalAnggaran"),
    ).hide();
    this.render();
    Dashboard.render();
  },

  del(id) {
    H.confirm("Hapus Anggaran?", "Anggaran ini akan dihapus permanen.", () => {
      Storage.deleteBudget(id);
      H.toast("Anggaran dihapus", "info");
      this.render();
      Dashboard.render();
    });
  },

  init() {
    const fb = document.getElementById("filterBulanAnggaran");
    if (fb) {
      fb.value = H.curMonth();
      fb.addEventListener("change", () => this.render());
    }
    document
      .getElementById("modalAnggaran")
      ?.addEventListener("show.bs.modal", (e) => {
        if (e.relatedTarget) {
          document.getElementById("anggaranId").value = "";
          document.getElementById("anggaranLimit").value = "";
          document.getElementById("anggaranBulan").value = H.curMonth();
          document.getElementById("modalAnggaranTitle").textContent =
            "Tambah Anggaran";
          H.fillKatSelect(
            document.getElementById("anggaranKat"),
            "pengeluaran",
          );
        }
      });
    document
      .getElementById("btnSaveAnggaran")
      ?.addEventListener("click", () => this.save());
  },
};

// tujuan keuangan
const Goals = {
  render() {
    const list = Storage.getGoals();
    const cur = H.cur();
    const grid = document.getElementById("goalsGrid");
    if (!grid) return;

    if (!list.length) {
      grid.innerHTML = `<div class="col-12">${H.empty("bullseye", "Belum ada tujuan keuangan", true)}</div>`;
      return;
    }

    grid.innerHTML = list
      .map((g) => {
        const target = Number(g.target) || 0;
        const tkp = Number(g.terkumpul) || 0;
        const pct = target > 0 ? Math.min((tkp / target) * 100, 100) : 0;
        const done = tkp >= target;
        let status = "on-track",
          label = "On Track";
        if (done) {
          status = "completed";
          label = "Selesai 🎉";
        } else if (g.deadline) {
          const sisa = Math.ceil((new Date(g.deadline) - new Date()) / 864e5);
          if (sisa < 0) {
            status = "behind";
            label = "Terlambat";
          } else if (sisa < 30) {
            status = "behind";
            label = "Hampir Deadline";
          }
        }

        return `<div class="col-12 col-md-6 col-xl-4">
        <div class="ft-goal-card">
          <div class="ft-goal-header">
            <div>
              <div class="ft-goal-title">${g.nama}</div>
              ${g.deadline ? `<div class="ft-goal-dl"><i class="fa-solid fa-calendar-days me-1"></i>${H.date(g.deadline)}</div>` : ""}
            </div>
            <span class="ft-goal-status ${status}">${label}</span>
          </div>
          <div class="ft-goal-amounts">
            <span>Terkumpul: <strong style="color:var(--text)">${H.fmt(tkp, cur)}</strong></span>
            <span>Target: <strong style="color:var(--text)">${H.fmt(target, cur)}</strong></span>
          </div>
          ${H.progress(tkp, target)}
          <div class="ft-goal-footer">
            <span class="ft-goal-pct">${pct.toFixed(0)}% tercapai</span>
            <div class="d-flex gap-1">
              ${!done ? `<button class="ft-btn ft-btn-primary ft-btn-sm" onclick="Goals.openDana('${g.id}')"><i class="fa-solid fa-plus"></i> Dana</button>` : ""}
              <button class="ft-tbl-btn" onclick="Goals.edit('${g.id}')"><i class="fa-solid fa-pen"></i></button>
              <button class="ft-tbl-btn del" onclick="Goals.del('${g.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        </div>
      </div>`;
      })
      .join("");
  },

  edit(id) {
    const g = Storage.getGoals().find((g) => g.id === id);
    if (!g) return;
    document.getElementById("goalId").value = g.id;
    document.getElementById("goalNama").value = g.nama;
    document.getElementById("goalTarget").value = g.target;
    document.getElementById("goalTerkumpul").value = g.terkumpul;
    document.getElementById("goalDeadline").value = g.deadline || "";
    document.getElementById("modalGoalTitle").textContent = "Edit Tujuan";
    new bootstrap.Modal(document.getElementById("modalGoal")).show();
  },

  save() {
    const id = document.getElementById("goalId").value;
    const nama = document.getElementById("goalNama").value.trim();
    const tgt = Number(document.getElementById("goalTarget").value);
    const tkp = Number(document.getElementById("goalTerkumpul").value) || 0;
    const dl = document.getElementById("goalDeadline").value;
    if (!nama) {
      H.toast("Nama wajib diisi", "error");
      return;
    }
    if (!tgt || tgt <= 0) {
      H.toast("Target harus lebih dari 0", "error");
      return;
    }
    const payload = { nama, target: tgt, terkumpul: tkp, deadline: dl };
    if (id) {
      Storage.updateGoal(id, payload);
      H.toast("Tujuan diperbarui");
    } else {
      Storage.addGoal(payload);
      H.toast("Tujuan ditambahkan");
    }
    bootstrap.Modal.getInstance(document.getElementById("modalGoal")).hide();
    this.render();
    Dashboard.render();
  },

  openDana(id) {
    document.getElementById("danaGoalId").value = id;
    document.getElementById("danaJumlah").value = "";
    new bootstrap.Modal(document.getElementById("modalDana")).show();
  },

  saveDana() {
    const id = document.getElementById("danaGoalId").value;
    const jml = Number(document.getElementById("danaJumlah").value);
    if (!jml || jml <= 0) {
      H.toast("Masukkan jumlah dana", "error");
      return;
    }
    Storage.addDana(id, jml);
    H.toast(`Dana ${H.fmt(jml, H.cur())} ditambahkan`);
    bootstrap.Modal.getInstance(document.getElementById("modalDana")).hide();
    this.render();
    Dashboard.render();
  },

  del(id) {
    H.confirm("Hapus Tujuan?", "Tujuan ini akan dihapus permanen.", () => {
      Storage.deleteGoal(id);
      H.toast("Tujuan dihapus", "info");
      this.render();
    });
  },

  init() {
    document
      .getElementById("modalGoal")
      ?.addEventListener("show.bs.modal", (e) => {
        if (e.relatedTarget)
          [
            "goalId",
            "goalNama",
            "goalTarget",
            "goalTerkumpul",
            "goalDeadline",
          ].forEach((id) => (document.getElementById(id).value = ""));
        document.getElementById("modalGoalTitle").textContent = "Tambah Tujuan";
      });
    document
      .getElementById("btnSaveGoal")
      ?.addEventListener("click", () => this.save());
    document
      .getElementById("btnSaveDana")
      ?.addEventListener("click", () => this.saveDana());
  },
};

// laporan
const Laporan = {
  _line: null,
  _pie: null,

  render() {
    const dari = document.getElementById("lapDari")?.value;
    const sampai = document.getElementById("lapSampai")?.value;
    const cur = H.cur();
    let data = Storage.getTrx();
    if (dari) data = data.filter((t) => t.tanggal >= dari + "-01");
    if (sampai) {
      const [y, m] = sampai.split("-").map(Number);
      data = data.filter(
        (t) => t.tanggal <= `${sampai}-${new Date(y, m, 0).getDate()}`,
      );
    }

    const inc = data
      .filter((t) => t.jenis === "pemasukan")
      .reduce((s, t) => s + Number(t.nominal), 0);
    const exp = data
      .filter((t) => t.jenis === "pengeluaran")
      .reduce((s, t) => s + Number(t.nominal), 0);
    const bal = inc - exp;

    document.getElementById("lap-income").textContent = H.fmt(inc, cur);
    document.getElementById("lap-expense").textContent = H.fmt(exp, cur);
    const balEl = document.getElementById("lap-balance");
    balEl.textContent = (bal < 0 ? "-" : "") + H.fmt(Math.abs(bal), cur);
    balEl.style.color = bal >= 0 ? "#059669" : "#dc2626";

    this._renderLine(data);
    this._renderPie(data);
  },

  _renderLine(data) {
    const ctx = document.getElementById("chartLine");
    if (!ctx) return;
    if (this._line) this._line.destroy();
    const months = {};
    data.forEach((t) => {
      const m = t.tanggal.slice(0, 7);
      if (!months[m]) months[m] = { inc: 0, exp: 0 };
      months[m][t.jenis === "pemasukan" ? "inc" : "exp"] += Number(t.nominal);
    });
    const labels = Object.keys(months).sort();
    this._line = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels.map(H.month),
        datasets: [
          {
            label: "Pemasukan",
            data: labels.map((l) => months[l].inc),
            borderColor: "#10b981",
            backgroundColor: "rgba(16,185,129,.08)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: "#10b981",
          },
          {
            label: "Pengeluaran",
            data: labels.map((l) => months[l].exp),
            borderColor: "#ef4444",
            backgroundColor: "rgba(239,68,68,.08)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: "#ef4444",
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
          x: { grid: { color: H.gridColor() }, ticks: { font: { size: 11 } } },
          y: {
            grid: { color: H.gridColor() },
            ticks: { font: { size: 11 }, callback: H.tickFmt },
          },
        },
      },
    });
  },

  _renderPie(data) {
    const ctx = document.getElementById("chartPie");
    if (!ctx) return;
    if (this._pie) this._pie.destroy();
    const byKat = {};
    data
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
    if (!values.length) {
      ctx.parentElement.innerHTML = H.empty(
        "chart-pie",
        "Tidak ada data pengeluaran",
      );
      return;
    }
    this._pie = new Chart(ctx, {
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
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: { boxWidth: 12, font: { size: 12 }, padding: 10 },
          },
        },
        cutout: "65%",
      },
    });
  },

  init() {
    const now = new Date();
    const ago = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const dari = document.getElementById("lapDari");
    const smp = document.getElementById("lapSampai");
    if (dari)
      dari.value = `${ago.getFullYear()}-${String(ago.getMonth() + 1).padStart(2, "0")}`;
    if (smp) smp.value = H.curMonth();
    document
      .getElementById("btnFilterLap")
      ?.addEventListener("click", () => this.render());
  },
};

// kategori
const Kategori = {
  render() {
    const list = Storage.getKat();
    const renderItem = (k) => `
      <div class="ft-kat-item">
        <div class="ft-kat-left">${H.katIcon(k, 30)}<span class="ft-kat-name">${k.nama}</span></div>
        <div class="d-flex gap-1">
          <button class="ft-tbl-btn" onclick="Kategori.edit('${k.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="ft-tbl-btn del" onclick="Kategori.del('${k.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`;
    const inc = list.filter((k) => k.jenis === "pemasukan");
    const exp = list.filter((k) => k.jenis === "pengeluaran");
    const iEl = document.getElementById("katIncomeList");
    const eEl = document.getElementById("katExpenseList");
    if (iEl)
      iEl.innerHTML = inc.length
        ? inc.map(renderItem).join("")
        : H.empty("tags", "Belum ada kategori");
    if (eEl)
      eEl.innerHTML = exp.length
        ? exp.map(renderItem).join("")
        : H.empty("tags", "Belum ada kategori");
  },

  edit(id) {
    const k = Storage.getKat().find((k) => k.id === id);
    if (!k) return;
    document.getElementById("katId").value = k.id;
    document.getElementById("katNama").value = k.nama;
    document.getElementById("katJenis").value = k.jenis;
    document.getElementById("katIkon").value = k.ikon;
    document.getElementById("katWarna").value = k.warna;
    document.getElementById("modalKatTitle").textContent = "Edit Kategori";
    new bootstrap.Modal(document.getElementById("modalKategori")).show();
  },

  save() {
    const id = document.getElementById("katId").value;
    const nama = document.getElementById("katNama").value.trim();
    const jenis = document.getElementById("katJenis").value;
    const ikon =
      document.getElementById("katIkon").value.trim() || "fa-solid fa-circle";
    const warna = document.getElementById("katWarna").value;
    if (!nama) {
      H.toast("Nama wajib diisi", "error");
      return;
    }
    if (id) {
      Storage.updateKat(id, { nama, jenis, ikon, warna });
      H.toast("Kategori diperbarui");
    } else {
      Storage.addKat({ nama, jenis, ikon, warna });
      H.toast("Kategori ditambahkan");
    }
    bootstrap.Modal.getInstance(
      document.getElementById("modalKategori"),
    ).hide();
    this.render();
  },

  del(id) {
    H.confirm("Hapus Kategori?", "Kategori ini akan dihapus.", () => {
      Storage.deleteKat(id);
      H.toast("Kategori dihapus", "info");
      this.render();
    });
  },

  init() {
    document
      .getElementById("modalKategori")
      ?.addEventListener("show.bs.modal", (e) => {
        if (e.relatedTarget) {
          ["katId", "katNama", "katIkon"].forEach(
            (i) => (document.getElementById(i).value = ""),
          );
          document.getElementById("katJenis").value = "pengeluaran";
          document.getElementById("katWarna").value = "#10b981";
          document.getElementById("modalKatTitle").textContent =
            "Tambah Kategori";
        }
      });
    document
      .getElementById("btnSaveKat")
      ?.addEventListener("click", () => this.save());
  },
};
