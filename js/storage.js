const Storage = (() => {
  const K = {
    USER: "ft_user",
    TRX: "ft_trx",
    BUDGET: "ft_budget",
    GOALS: "ft_goals",
    KAT: "ft_kat",
    SET: "ft_settings",
  };

  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const get = (k) => {
    try {
      return JSON.parse(localStorage.getItem(k));
    } catch {
      return null;
    }
  };
  const set = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  };

  const getUser = () => get(K.USER) || {};
  const saveUser = (d) => set(K.USER, d);

  const getSettings = () => get(K.SET) || { tema: "light", mata_uang: "IDR" };
  const saveSettings = (d) => set(K.SET, d);

  // transaksi
  const getTrx = () => get(K.TRX) || [];
  const addTrx = (d) => {
    const l = getTrx();
    d.id = uid();
    l.unshift(d);
    set(K.TRX, l);
    return d;
  };
  const updateTrx = (id, d) => {
    const l = getTrx();
    const i = l.findIndex((t) => t.id === id);
    if (i < 0) return false;
    l[i] = { ...l[i], ...d };
    return set(K.TRX, l);
  };
  const deleteTrx = (id) =>
    set(
      K.TRX,
      getTrx().filter((t) => t.id !== id),
    );

  // anggaran
  const getBudget = () => get(K.BUDGET) || [];
  const addBudget = (d) => {
    const l = getBudget();
    const ex = l.find((b) => b.kat_id === d.kat_id && b.bulan === d.bulan);
    if (ex) return { err: "Budget kategori ini sudah ada di bulan tersebut" };
    d.id = uid();
    l.push(d);
    set(K.BUDGET, l);
    return d;
  };
  const updateBudget = (id, d) => {
    const l = getBudget();
    const i = l.findIndex((b) => b.id === id);
    if (i < 0) return false;
    l[i] = { ...l[i], ...d };
    return set(K.BUDGET, l);
  };
  const deleteBudget = (id) =>
    set(
      K.BUDGET,
      getBudget().filter((b) => b.id !== id),
    );

  // tujuan keuangan
  const getGoals = () => get(K.GOALS) || [];
  const addGoal = (d) => {
    const l = getGoals();
    d.id = uid();
    d.terkumpul = Number(d.terkumpul) || 0;
    l.push(d);
    set(K.GOALS, l);
    return d;
  };
  const updateGoal = (id, d) => {
    const l = getGoals();
    const i = l.findIndex((g) => g.id === id);
    if (i < 0) return false;
    l[i] = { ...l[i], ...d };
    return set(K.GOALS, l);
  };
  const deleteGoal = (id) =>
    set(
      K.GOALS,
      getGoals().filter((g) => g.id !== id),
    );
  const addDana = (id, jml) => {
    const l = getGoals();
    const i = l.findIndex((g) => g.id === id);
    if (i < 0) return false;
    l[i].terkumpul = (Number(l[i].terkumpul) || 0) + Number(jml);
    return set(K.GOALS, l);
  };

  // kategori
  const defaultKat = [
    {
      id: "k1",
      nama: "Gaji",
      jenis: "pemasukan",
      ikon: "fa-solid fa-briefcase",
      warna: "#10b981",
    },
    {
      id: "k2",
      nama: "Bisnis",
      jenis: "pemasukan",
      ikon: "fa-solid fa-store",
      warna: "#3b82f6",
    },
    {
      id: "k3",
      nama: "Investasi",
      jenis: "pemasukan",
      ikon: "fa-solid fa-chart-line",
      warna: "#8b5cf6",
    },
    {
      id: "k4",
      nama: "Bonus",
      jenis: "pemasukan",
      ikon: "fa-solid fa-gift",
      warna: "#f59e0b",
    },
    {
      id: "k5",
      nama: "Lainnya",
      jenis: "pemasukan",
      ikon: "fa-solid fa-circle-plus",
      warna: "#64748b",
    },
    {
      id: "k6",
      nama: "Makan",
      jenis: "pengeluaran",
      ikon: "fa-solid fa-utensils",
      warna: "#ef4444",
    },
    {
      id: "k7",
      nama: "Transport",
      jenis: "pengeluaran",
      ikon: "fa-solid fa-car",
      warna: "#f97316",
    },
    {
      id: "k8",
      nama: "Belanja",
      jenis: "pengeluaran",
      ikon: "fa-solid fa-bag-shopping",
      warna: "#ec4899",
    },
    {
      id: "k9",
      nama: "Kesehatan",
      jenis: "pengeluaran",
      ikon: "fa-solid fa-heart-pulse",
      warna: "#14b8a6",
    },
    {
      id: "k10",
      nama: "Hiburan",
      jenis: "pengeluaran",
      ikon: "fa-solid fa-film",
      warna: "#8b5cf6",
    },
    {
      id: "k11",
      nama: "Pendidikan",
      jenis: "pengeluaran",
      ikon: "fa-solid fa-graduation-cap",
      warna: "#3b82f6",
    },
    {
      id: "k12",
      nama: "Tagihan",
      jenis: "pengeluaran",
      ikon: "fa-solid fa-file-invoice",
      warna: "#f59e0b",
    },
    {
      id: "k13",
      nama: "Lainnya",
      jenis: "pengeluaran",
      ikon: "fa-solid fa-circle-minus",
      warna: "#64748b",
    },
  ];

  const getKat = () => {
    const s = get(K.KAT);
    if (!s || !s.length) {
      set(K.KAT, defaultKat);
      return defaultKat;
    }
    return s;
  };
  const addKat = (d) => {
    const l = getKat();
    d.id = uid();
    l.push(d);
    set(K.KAT, l);
    return d;
  };
  const updateKat = (id, d) => {
    const l = getKat();
    const i = l.findIndex((k) => k.id === id);
    if (i < 0) return false;
    l[i] = { ...l[i], ...d };
    return set(K.KAT, l);
  };
  const deleteKat = (id) =>
    set(
      K.KAT,
      getKat().filter((k) => k.id !== id),
    );

  // export import reset
  const exportAll = () => ({
    ft_user: getUser(),
    ft_trx: getTrx(),
    ft_budget: getBudget(),
    ft_goals: getGoals(),
    ft_kat: getKat(),
    ft_settings: getSettings(),
    v: "1.0.0",
    at: new Date().toISOString(),
  });
  const importAll = (d) => {
    try {
      if (d.ft_user) set(K.USER, d.ft_user);
      if (d.ft_trx) set(K.TRX, d.ft_trx);
      if (d.ft_budget) set(K.BUDGET, d.ft_budget);
      if (d.ft_goals) set(K.GOALS, d.ft_goals);
      if (d.ft_kat) set(K.KAT, d.ft_kat);
      if (d.ft_settings) set(K.SET, d.ft_settings);
      return true;
    } catch {
      return false;
    }
  };
  const resetAll = () => {
    Object.values(K).forEach((k) => localStorage.removeItem(k));
    set(K.KAT, defaultKat);
  };

  return {
    getUser,
    saveUser,
    getSettings,
    saveSettings,
    getTrx,
    addTrx,
    updateTrx,
    deleteTrx,
    getBudget,
    addBudget,
    updateBudget,
    deleteBudget,
    getGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    addDana,
    getKat,
    addKat,
    updateKat,
    deleteKat,
    exportAll,
    importAll,
    resetAll,
  };
})();
