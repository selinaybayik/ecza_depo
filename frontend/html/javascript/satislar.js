document.addEventListener("DOMContentLoaded", async () => {
  // Seçim Kutuları
  const citySelect = document.getElementById("citySelect"); // Gelir ve ürünler için il seçimi
  const depotSelect = document.getElementById("depotSelect"); // Gelir ve ürünler için depo seçimi

  const karIlSelect = document.getElementById("karIlSelect"); // Kar grafiği için il seçimi
  const karDepoSelect = document.getElementById("karDepoSelect"); // Kar grafiği için depo seçimi
  const karYilSelect = document.getElementById("karYilSelect"); // Kar grafiği için yıl seçimi
  const tahminIlSelect = document.getElementById("tahminIlSelect"); // İl seçimi
    const tahminOraniInput = document.getElementById("tahminOrani"); // Oran input
    const tahminButton = document.getElementById("tahminButton"); // Tahmin butonu
    const tahminChartCanvas = document.getElementById("tahminChartCanvas"); // Tahmin grafiği
    let tahminChart = null;
  
   
  let gelirChart = null;
  let mostSoldChart = null;
  let leastSoldChart = null;
  let karChart = null;

  // İl ve Depo Seçeneklerini Doldurma
  async function fillSelectBoxes() {
    try {
      // İl Verilerini Çekme
      const illerResponse = await fetch("http://localhost:3265/api/depolar/iller");
      const illerData = await illerResponse.json();

      illerData.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.il_ad;
        option.textContent = item.il_ad;

        // Genel seçim kutuları
        citySelect.appendChild(option);

        // Kar grafiği seçim kutuları
        const karOption = option.cloneNode(true);
        karIlSelect.appendChild(karOption);
      });

      // Depo Verilerini Çekme
      const depolarResponse = await fetch("http://localhost:3265/api/depolar/depolar");
      const depolarData = await depolarResponse.json();

      // İl seçildiğinde depo seçeneklerini güncelle
      citySelect.addEventListener("change", () => updateDepots(citySelect.value, depolarData, depotSelect));
      karIlSelect.addEventListener("change", () => updateDepots(karIlSelect.value, depolarData, karDepoSelect));

      // Yıl seçeneklerini doldur (kar grafiği için)
      [2020, 2021, 2022, 2023, 2024, 2025].forEach((year) => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        karYilSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Seçim kutularını doldururken hata oluştu:", error);
    }
  }

  // Depoları Güncelleme
  function updateDepots(selectedCity, depolarData, targetSelect) {
    targetSelect.innerHTML = "<option value=''>Depo Seç</option>";
    const filteredDepots = depolarData.filter((item) => item.il_ad === selectedCity);

    filteredDepots.forEach((depo) => {
      const option = document.createElement("option");
      option.value = depo.depo_ad;
      option.textContent = depo.depo_ad;
      targetSelect.appendChild(option);
    });
  }

  // API'den Kar Oranlarını Çekme
  async function fetchKarOranlari(il, depo, yil) {
    try {
      const response = await fetch(`http://localhost:3265/api/depolar/kar-oranlari?il=${il}&depo=${depo}&yil=${yil}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Kar oranları verisi alınırken hata oluştu:", error);
      return [];
    }
  }

  // API'den Gelir ve Ürün Verilerini Çekme
  async function fetchFullData(il, depo) {
    try {
      const response = await fetch(`http://localhost:3265/api/depolar/full-data?il=${il}&depo=${depo}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Gelir ve ürün verisi alınırken hata oluştu:", error);
      return null;
    }
  }

  // Kar Grafiğini Güncelleme
  async function updateKarChart(il, depo, yil) {
    try {
      const karOraniData = await fetchKarOranlari(il, depo, yil);
      const oran = karOraniData.length > 0 ? karOraniData[0].kar_orani : 0;

      const ctx = document.getElementById("yearProfitChartCanvas").getContext("2d");
      if (karChart) karChart.destroy();

      karChart = new Chart(ctx, {
        type: "pie",
        data: {
          labels: [`${yil}`],
          datasets: [
            {
              data: [oran],
              backgroundColor: ["#ff6384"],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: "top" },
            title: { display: true, text: `${il} - ${depo} (${yil}) Kar Oranı` },
          },
        },
      });
    } catch (error) {
      console.error("Kar grafiği güncellenirken hata oluştu:", error);
    }
  }

  async function updateGelirAndProductsCharts(il, depo) {
    try {
      // Gelir Verisi
      const fullDataResponse = await fetch(`http://localhost:3265/api/depolar/full-data`);
      const fullData = await fullDataResponse.json();
      const gelirData = fullData.find((item) => item.il_ad === il && item.depo_ad === depo);
  
      if (!gelirData) {
        console.warn("Seçilen il ve depo için gelir verisi bulunamadı.");
        return;
      }
  
      // Gelir Grafiği
      const gelirCtx = document.getElementById("incomeChartCanvas");
      if (!gelirCtx) {
        console.error("Gelir grafiği için 'incomeChartCanvas' bulunamadı.");
        return;
      }
  
      if (gelirChart) gelirChart.destroy();
      gelirChart = new Chart(gelirCtx.getContext("2d"), {
        type: "bar",
        data: {
          labels: ["2020", "2021", "2022", "2023", "2024"],
          datasets: [
            {
              label: "Yıllık Gelir",
              data: [
                gelirData.gelir_2020 || 0,
                gelirData.gelir_2021 || 0,
                gelirData.gelir_2022 || 0,
                gelirData.gelir_2023 || 0,
                gelirData.gelir_2024 || 0,
              ],
              backgroundColor: "rgba(31, 73, 224, 0.8)",
            },
          ],
        },
      });
  
      // En Çok Satılan Ürünler Verisi
const topProductsResponse = await fetch(`http://localhost:3265/api/depolar/top-products?il=${il}&depo=${depo}`);
const topProductsData = await topProductsResponse.json();

if (topProductsData.length === 0) {
  console.warn("En çok satılan ürün verisi bulunamadı.");
} else {
  const mostCtx = document.getElementById("mostSoldChart");
  if (mostSoldChart) mostSoldChart.destroy();

  // Yıllara Göre Verileri Grupla
  const groupedTopProducts = {};
  topProductsData.forEach((item) => {
    if (!groupedTopProducts[item.urun_ad]) {
      groupedTopProducts[item.urun_ad] = { 2020: 0, 2021: 0, 2022: 0, 2023: 0, 2024: 0 };
    }
    groupedTopProducts[item.urun_ad][item.yil] = item.toplam_miktar;
  });

  // Datasetleri Hazırla
  const topProductsDatasets = Object.keys(groupedTopProducts).map((urunAd) => ({
    label: urunAd,
    data: [
      groupedTopProducts[urunAd][2020],
      groupedTopProducts[urunAd][2021],
      groupedTopProducts[urunAd][2022],
      groupedTopProducts[urunAd][2023],
      groupedTopProducts[urunAd][2024],
    ],
    backgroundColor: "#" + Math.floor(Math.random() * 16777215).toString(16), // Rastgele renkler
  }));

  // Grafik Oluştur
  mostSoldChart = new Chart(mostCtx.getContext("2d"), {
    type: "bar",
    data: {
      labels: ["2020", "2021", "2022", "2023", "2024"], // Yıllar X ekseninde
      datasets: topProductsDatasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "En Çok Satılan Ürünler (Yıllık)" },
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true },
      },
    },
  });
}

// En Az Satılan Ürünler Verisi
const leastSoldResponse = await fetch(`http://localhost:3265/api/depolar/least-sold-products?il=${il}&depo=${depo}`);
const leastSoldData = await leastSoldResponse.json();

if (leastSoldData.length === 0) {
  console.warn("En az satılan ürün verisi bulunamadı.");
} else {
  const leastCtx = document.getElementById("leastSoldChart");
  if (leastSoldChart) leastSoldChart.destroy();

  // Yıllara Göre Verileri Grupla
  const groupedLeastSold = {};
  leastSoldData.forEach((item) => {
    if (!groupedLeastSold[item.urun_ad]) {
      groupedLeastSold[item.urun_ad] = { 2020: 0, 2021: 0, 2022: 0, 2023: 0, 2024: 0 };
    }
    groupedLeastSold[item.urun_ad][item.yil] = item.toplam_miktar;
  });

  // Datasetleri Hazırla
  const leastSoldDatasets = Object.keys(groupedLeastSold).map((urunAd) => ({
    label: urunAd,
    data: [
      groupedLeastSold[urunAd][2020],
      groupedLeastSold[urunAd][2021],
      groupedLeastSold[urunAd][2022],
      groupedLeastSold[urunAd][2023],
      groupedLeastSold[urunAd][2024],
    ],
    backgroundColor: "#" + Math.floor(Math.random() * 16777215).toString(16), // Rastgele renkler
  }));

  // Grafik Oluştur
  leastSoldChart = new Chart(leastCtx.getContext("2d"), {
    type: "bar",
    data: {
      labels: ["2020", "2021", "2022", "2023", "2024"], // Yıllar X ekseninde
      datasets: leastSoldDatasets,
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "En Az Satılan Ürünler (Yıllık)" },
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true },
      },
    },
  });
}

    } catch (error) {
      console.error("Gelir ve ürün grafikleri güncellenirken hata oluştu:", error);
    }
  }
  

  // Event Listener'lar
  karYilSelect.addEventListener("change", async () => {
    const il = karIlSelect.value;
    const depo = karDepoSelect.value;
    const yil = karYilSelect.value;
    if (il && depo && yil) await updateKarChart(il, depo, yil);
  });

  depotSelect.addEventListener("change", async () => {
    const il = citySelect.value;
    const depo = depotSelect.value;
    if (il && depo) await updateGelirAndProductsCharts(il, depo);
  });



 // API'den illeri çekme
 async function fetchIller() {
  try {
    const response = await fetch("http://localhost:3265/api/depolar/iller");
    const illerData = await response.json();
    illerData.forEach(item => {
      const option = document.createElement("option");
      option.value = item.il_ad;
      option.textContent = item.il_ad;
      tahminIlSelect.appendChild(option);
    });
  } catch (error) {
    console.error("İller verisi alınırken hata oluştu:", error);
  }
}

// Tahmin Gelirini Çekme
async function fetchTahminGelir(il, oran) {
  try {
    const response = await fetch(`http://localhost:3265/api/depolar/tahmini-gelir?il=${il}&oran=${oran}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Tahmin gelir verisi alınırken hata oluştu:", error);
    return [];
  }
}

// Tahmin Geliri Grafiğini Güncelleme
async function updateTahminChart(il, oran) {
  try {
    const tahminGelirData = await fetchTahminGelir(il, oran);

    if (tahminGelirData.length === 0) {
      console.warn("Tahmin gelir verisi bulunamadı.");
      return;
    }

    // Mevcut grafiği yoksa oluştur
    if (tahminChart) tahminChart.destroy();

    tahminChart = new Chart(tahminChartCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: tahminGelirData.map(item => item.depo), // Depolar burada kullanılıyor
        datasets: [{
          label: "Tahmin Edilen Gelir",
          data: tahminGelirData.map(item => item.tahmini_gelir),
          backgroundColor: "rgba(31, 73, 224, 0.8)",
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "top" },
          title: { display: true, text: `Tahmin Edilen Gelir (${il})` },
        },
        scales: {
          x: { title: { display: true, text: "Depolar" } },
          y: { title: { display: true, text: "Gelir (₺)" }, beginAtZero: true },
        },
      },
    });
  } catch (error) {
    console.error("Tahmin grafiği güncellenirken hata oluştu:", error);
  }
}

// İl Seçildiğinde Yalnızca Seçilen İl İçin Tahmin Verisi Çekme
tahminIlSelect.addEventListener("change", async () => {
  const il = tahminIlSelect.value;
  if (il) {
    // İl seçildiğinde tahmin gelirini çekiyoruz
    const oran = parseFloat(tahminOraniInput.value); // Oranı alıyoruz
    if (!oran || isNaN(oran)) {
      alert("Lütfen geçerli bir oran girin!");
      return;
    }
    await updateTahminChart(il, oran); // Seçilen il için tahmin gelirini ve grafiği güncelle
  }
});

// Tahmin Butonuna Tıklanması
tahminButton.addEventListener("click", async () => {
  const oran = parseFloat(tahminOraniInput.value); // Oranı sayısal değere çeviriyoruz
  const il = tahminIlSelect.value;

  if (!oran || isNaN(oran) || !il) {
    alert("Lütfen geçerli bir il ve oran girin!");
    return;
  }

  await updateTahminChart(il, oran); // Grafiği güncelle
});

  // Başlangıçta illeri yükle
  await fetchIller();

  // Başlangıç
  await fillSelectBoxes();
});
