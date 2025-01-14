// Verileri API'den çekmek için async fonksiyonlar
async function fetchData() {
    try {
        const statsResponse = await fetch("/api/depolar/stats");
        const statsData = await statsResponse.json();

        const yearsResponse = await fetch("/api/depolar/yillar");
        const yearsData = await yearsResponse.json();

        return { statsData, yearsData };
    } catch (error) {
        console.error("Error fetching data:", error);
        return null;
    }
}

// Satış verilerini seçilen yıla göre çekmek için async fonksiyon
async function fetchSalesData(year) {
    try {
        const response = await fetch(`/api/depolar/satis-dagilimi?yil=${year}`);
        return await response.json();
    } catch (error) {
        console.error("Error fetching sales data:", error);
        return [];
    }
}

// Maliyet verilerini çekmek için async fonksiyon
async function fetchCostData() {
    try {
        const response = await fetch("/api/depolar/maliyet-dagilimi");
        return await response.json();
    } catch (error) {
        console.error("Error fetching cost data:", error);
        return [];
    }
}


// Her ildeki depo sayısını getirmek için async fonksiyon
async function fetchDepotCountByCity() {
    try {
      const response = await fetch("/api/depolar/il-bazli-depo-sayisi");
      return await response.json();
    } catch (error) {
      console.error("Error fetching depot count data:", error);
      return [];
    }
  }


// Depo Konumlarını Haritada Göster
async function loadDepotMap() {
    try {
        const response = await fetch("/api/depolar/konumlar");
        const depots = await response.json();

        // Leaflet.js Haritasını Oluştur
        const map = L.map('map').setView([38.0, 35.0], 6); // Türkiye merkez

        // OpenStreetMap Katmanı
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
        }).addTo(map);

        // Depo Konumlarını İşaretle
        depots.forEach(depot => {
            if (depot.enlem && depot.boylam) {
                L.marker([depot.enlem, depot.boylam])
                    .addTo(map)
                    .bindPopup(`<b>${depot.ad}</b>`);
            }
        });
    } catch (error) {
        console.error("Error loading depot map:", error);
    }
}

// Sayfa Yüklendiğinde Haritayı Yükle
document.addEventListener("DOMContentLoaded", async () => {
    await loadDepotMap();
});


// Sayfa yüklendiğinde verileri doldur
document.addEventListener("DOMContentLoaded", async () => {
    const data = await fetchData();

    if (!data) return;

    // Statik bilgileri doldur
    const { statsData, yearsData } = data;

    document.getElementById("totalDepoCount").textContent = statsData.totalDepoCount;
    document.getElementById("totalDepoCost").textContent = `₺${statsData.totalDepoCost}`;
    document.getElementById("totalDepoSales").textContent = `₺${statsData.totalDepoSales}`;
    document.getElementById("totalPharmacyCount").textContent = statsData.totalPharmacyCount;

    // Yıl seçeneklerini doldur
    const yearSelect = document.getElementById("select-box");
    yearsData.years.forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    });

    // İl ve Depo seçeneklerini doldur (Satış için)
    const ilSelect = document.getElementById("ilSelect");
    const depoSelect = document.getElementById("depoSelect");

    let ilDepoSalesData = {}; // İl ve depo satış verilerini saklayacak

    yearSelect.addEventListener("change", async () => {
        const selectedYear = yearSelect.value;

        if (!selectedYear) return;

        const salesData = await fetchSalesData(selectedYear);
        ilDepoSalesData = salesData.reduce((acc, item) => {
            acc[item.il] = acc[item.il] || {};
            acc[item.il][item.depo_adi] = item.satis;
            return acc;
        }, {});

        // İl seçeneklerini doldur
        ilSelect.innerHTML = '<option value="">İl Seç</option>';
        Object.keys(ilDepoSalesData).forEach(il => {
            const option = document.createElement("option");
            option.value = il;
            option.textContent = il;
            ilSelect.appendChild(option);
        });

        // Depo seçeneklerini temizle
        depoSelect.innerHTML = '<option value="">Depo Seç</option>';
        updateSalesChart();
    });

    ilSelect.addEventListener("change", () => {
        const selectedIl = ilSelect.value;

        depoSelect.innerHTML = '<option value="">Depo Seç</option>'; // Temizle
        if (selectedIl && ilDepoSalesData[selectedIl]) {
            Object.keys(ilDepoSalesData[selectedIl]).forEach(depo => {
                const option = document.createElement("option");
                option.value = depo;
                option.textContent = depo;
                depoSelect.appendChild(option);
            });
        }
        updateSalesChart();
    });

    depoSelect.addEventListener("change", updateSalesChart);

    // Grafikler
    const salesBarCtx = document.getElementById("salesBarChart").getContext("2d");

    const salesBarChart = new Chart(salesBarCtx, {
        type: "bar",
        data: {
            labels: [],
            datasets: [
                {
                    label: "Satış Miktarı (₺)",
                    data: [],
                    backgroundColor: "#f2892c",
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { title: { display: true, text: "Depolar" } },
                y: { title: { display: true, text: "Satış Miktarı (₺)" } }
            }
        }
    });

    function updateSalesChart() {
        const selectedIl = ilSelect.value;
        const selectedDepo = depoSelect.value;

        if (selectedIl && ilDepoSalesData[selectedIl]) {
            const sales = selectedDepo
                ? { [selectedDepo]: ilDepoSalesData[selectedIl][selectedDepo] }
                : ilDepoSalesData[selectedIl];
                const colors = {
                    2020: "rgba(255, 99, 132, 0.7)", // Pembe
                    2021: "rgba(54, 162, 235, 0.7)", // Mavi
                    2022: "rgba(255, 206, 86, 0.7)", // Sarı
                    2023: "rgba(75, 192, 192, 0.7)", // Yeşil
                    2024: "rgba(153, 102, 255, 0.7)" // Mor
                };
        
                const selectedYear = yearSelect.value; // Seçilen yıl
                const selectedColor = colors[selectedYear] || "#004080"; // Varsayılan renk

            salesBarChart.data.labels = Object.keys(sales);
            salesBarChart.data.datasets[0].data = Object.values(sales);
            salesBarChart.update();
        } else {
            salesBarChart.data.labels = [];
            salesBarChart.data.datasets[0].data = [];
            salesBarChart.update();
        }
    }

    // Maliyet verilerini işle ve grafiği hazırla
    const costData = await fetchCostData();
    const costGroupedData = costData.reduce((acc, item) => {
        acc[item.il] = acc[item.il] || {};
        acc[item.il][item.depo_adi] = acc[item.il][item.depo_adi] || [];
        acc[item.il][item.depo_adi].push({ yil: item.yil, toplam_maliyet: item.toplam_maliyet });
        return acc;
    }, {});

    const ilSelectCost = document.getElementById("ilSelectCost");
    const depoSelectCost = document.getElementById("depoSelectCost");

    // İl seçeneklerini doldur
    ilSelectCost.innerHTML = '<option value="">İl Seç</option>';
    Object.keys(costGroupedData).forEach(il => {
        const option = document.createElement("option");
        option.value = il;
        option.textContent = il;
        ilSelectCost.appendChild(option);
    });

    ilSelectCost.addEventListener("change", () => {
        const selectedIl = ilSelectCost.value;

        depoSelectCost.innerHTML = '<option value="">Depo Seç</option>'; // Temizle
        if (selectedIl && costGroupedData[selectedIl]) {
            Object.keys(costGroupedData[selectedIl]).forEach(depo => {
                const option = document.createElement("option");
                option.value = depo;
                option.textContent = depo;
                depoSelectCost.appendChild(option);
            });
        }
        updateCostChart();
    });

    depoSelectCost.addEventListener("change", updateCostChart);

    // Grafikler
    const costStackedBarCtx = document.getElementById("costStackedBarChart").getContext("2d");

    const costStackedBarChart = new Chart(costStackedBarCtx, {
        type: "bar",
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: "top" },
                title: { display: true, text: "Yıllık Toplam Maliyetler (Yığılmış)" }
            },
            scales: {
                x: { stacked: true, title: { display: true, text: "Depolar" } },
                y: { stacked: true, beginAtZero: true, title: { display: true, text: "Maliyet (₺)" } }
            }
        }
    });

    
    function updateCostChart() {
        const selectedIl = ilSelectCost.value;
        const selectedDepo = depoSelectCost.value;
    
        if (selectedIl && costGroupedData[selectedIl]) {
            const filteredData = selectedDepo
                ? { [selectedDepo]: costGroupedData[selectedIl][selectedDepo] }
                : costGroupedData[selectedIl];
    
            costStackedBarChart.data.labels = Object.keys(filteredData);
            costStackedBarChart.data.datasets = yearsData.years.map((year, index) => {
                return {
                    label: `${year}`,
                    data: Object.keys(filteredData).map(depo => {
                        const yearData = filteredData[depo].find(item => item.yil === year);
                        return yearData ? yearData.toplam_maliyet : 0;
                    }),
                    backgroundColor: `hsl(${(index * 60) % 360}, 70%, 60%)` // Dinamik renkler
                };
            });
    
            costStackedBarChart.update();
        } else {
            costStackedBarChart.data.labels = [];
            costStackedBarChart.data.datasets = [];
            costStackedBarChart.update();
        }
    }
    
    function updateSalesChart() {
        const selectedIl = ilSelect.value;
        const selectedDepo = depoSelect.value;
    
        if (selectedIl && ilDepoSalesData[selectedIl]) {
            const sales = selectedDepo
                ? { [selectedDepo]: ilDepoSalesData[selectedIl][selectedDepo] }
                : ilDepoSalesData[selectedIl];
    
            salesBarChart.data.labels = Object.keys(sales);
            salesBarChart.data.datasets[0].data = Object.values(sales);
            salesBarChart.update();
        } else {
            salesBarChart.data.labels = [];
            salesBarChart.data.datasets[0].data = [];
            salesBarChart.update();
        }
    }});
    document.addEventListener("DOMContentLoaded", async () => {
        // Daha önceki fetch işlemleri devam ediyor...
      
        // Her ildeki depo sayısı grafiği
        const depotCountData = await fetchDepotCountByCity();
      
        const cityNames = depotCountData.map(item => item.il);
        const depotCounts = depotCountData.map(item => item.depo_sayisi);
      
        const depotCountCtx = document
          .getElementById("regionBarChart")
          .getContext("2d");
      
        new Chart(depotCountCtx, {
          type: "bar",
          data: {
            labels: cityNames,
            datasets: [
              {
                label: "Depo Sayısı",
                data: depotCounts,
                backgroundColor: "#4CAF50",
              },
            ],
          },
          options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { title: { display: true, text: "İller" } },
              y: { title: { display: true, text: "Depo Sayısı" } },
            },
          },
        });
      });

    