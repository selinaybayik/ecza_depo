document.addEventListener("DOMContentLoaded", async () => {
    let eczaneChart = null;
    let depotChart = null;
    let categoryChart = null;

    // İl Bazlı Eczane Sayısını Çiz
    async function loadEczaneChart() {
        try {
            // API'den veri çekme
            const response = await fetch("http://localhost:3265/api/depolar/il-bazli-eczane-sayisi");
            const data = await response.json();

            // Verileri grafiğe uygun hale getirme
            const iller = data.map(item => item.il_ad);
            const eczaneSayilari = data.map(item => item.eczane_sayisi);

            // Eğer grafik varsa önce yok et
            if (eczaneChart) eczaneChart.destroy();

            // Chart.js kullanarak grafiği oluşturma
            const ctx = document.getElementById("eczaneChart").getContext("2d");
            eczaneChart = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: iller,
                    datasets: [{
                        label: "Eczane Sayısı",
                        data: eczaneSayilari,
                        backgroundColor: "rgba(110, 5, 5, 0.82)",
                        borderColor: "rgb(5, 15, 22)",
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: "İl Bazlı Eczane Sayısı"
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: "Eczane Sayısı"
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: "İl Adı"
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Eczane verileri yüklenemedi:", error);
        }
    }

    // İllerin Listesini Çek ve Dropdown'a Ekle
    async function loadCities() {
        try {
            const response = await fetch("http://localhost:3265/api/depolar/iller");
            const cities = await response.json();

            const citySelect = document.getElementById("citySelect");
            cities.forEach(city => {
                const option = document.createElement("option");
                option.value = city.il_ad;
                option.textContent = city.il_ad;
                citySelect.appendChild(option);
            });
        } catch (error) {
            console.error("İller yüklenemedi:", error);
        }
    }

    // İl Seçildiğinde Depo ve İlgili Eczane Sayısını Getir
    async function loadDepotData(cityName) {
        try {
            const response = await fetch(`http://localhost:3265/api/depolar/il-ve-depo-iliskili-eczane-sayisi?il=${cityName}`);
            const data = await response.json();

            // Grafik Verilerini Hazırlama
            const depotNames = data.map(item => item.depo_adi);
            const eczaneCounts = data.map(item => item.eczane_sayisi);

            // Daha Önce Oluşturulmuş Grafik Varsa Yok Et
            if (depotChart) depotChart.destroy();

            // Yeni Grafik Oluştur
            const ctx = document.getElementById("pharmacyByDepotChart").getContext("2d");
            depotChart = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: depotNames,
                    datasets: [{
                        label: "Eczane Sayısı",
                        data: eczaneCounts,
                        backgroundColor: "rgba(245, 107, 12, 0.8)",
                        borderColor: "rgba(245, 107, 12, 0.8)",
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `${cityName} İlindeki Depolar ve İlişkili Eczane Sayısı`
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: "Eczane Sayısı"
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: "Depo Adı"
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Depo verileri yüklenemedi:", error);
        }
    }

    // İl Seçildiğinde Çalışacak Event Listener
    const citySelect = document.getElementById("citySelect");
    citySelect.addEventListener("change", () => {
        const selectedCity = citySelect.value;
        if (selectedCity) {
            loadDepotData(selectedCity);
        }
    });

    // Yıl Bazlı Kategori Miktarı Yatay Yığılmış Grafik İçin Kodlar
    async function loadCitiesForCategory() {
        try {
            const response = await fetch("http://localhost:3265/api/depolar/iller");
            const cities = await response.json();

            const cityySelect = document.getElementById("categoryCitySelect");
            cities.forEach(city => {
                const option = document.createElement("option");
                option.value = city.il_ad;
                option.textContent = city.il_ad;
                cityySelect.appendChild(option);
            });
        } catch (error) {
            console.error("İl listesi yüklenemedi:", error);
        }
    }

    async function loadDepotsForCategory(cityName) {
        try {
            const response = await fetch(`http://localhost:3265/api/depolar/depolarr?il=${cityName}`);
            const depots = await response.json();

            const depotSelect = document.getElementById("categoryDepotSelect");
            depotSelect.innerHTML = "<option value=''>Depo Seç</option>";

            depots.forEach(depot => {
                const option = document.createElement("option");
                option.value = depot.depo_ad;
                option.textContent = depot.depo_ad;
                depotSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Depo listesi yüklenemedi:", error);
        }
    }

    async function loadCategoryChart(cityName, depotName) {
        try {
            const response = await fetch(`http://localhost:3265/api/depolar/kategori-talep?il=${cityName}&depo=${depotName}`);
            const data = await response.json();

            const years = ["2020", "2021", "2022", "2023", "2024"];
            const categories = [...new Set(data.map(item => item.kategori_ad))];

            const datasets = categories.map(category => {
                const categoryData = years.map(year => {
                    const entry = data.find(item => item.kategori_ad === category);
                    return entry ? entry[`talep_${year}`] || 0 : 0;
                });

                return {
                    label: category,
                    data: categoryData,
                    backgroundColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`
                };
            });

            if (categoryChart) categoryChart.destroy();

            const ctx = document.getElementById("categoryChart").getContext("2d");
            categoryChart = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: years,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `${depotName} Deposu Yıl Bazlı Kategori Miktarı`
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        },
                        legend: {
                            position: 'top'
                        }
                    },
                    indexAxis: 'y',
                    scales: {
                        x: {
                            stacked: true,
                            title: {
                                display: true,
                                text: "Kategori Miktarı"
                            }
                        },
                        y: {
                            stacked: true,
                            title: {
                                display: true,
                                text: "Yıllar"
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Kategori grafiği verileri yüklenemedi:", error);
        }
    }

    const cityySelect = document.getElementById("categoryCitySelect");
    cityySelect.addEventListener("change", () => {
        const selectedCity = cityySelect.value;
        if (selectedCity) {
            loadDepotsForCategory(selectedCity);
        }
    });

    const depotSelect = document.getElementById("categoryDepotSelect");
    depotSelect.addEventListener("change", () => {
        const selectedCity = cityySelect.value;
        const selectedDepot = depotSelect.value;
        if (selectedCity && selectedDepot) {
            loadCategoryChart(selectedCity, selectedDepot);
        }
    });

    // Başlangıçta Tüm Verileri Yükle
    loadCities();
    loadEczaneChart();
    loadCitiesForCategory();

    // Harita için Chloropleth yükle
    async function loadChoroplethMap() {
        try {
            const response = await fetch("http://localhost:3265/api/depolar/il-bazli-eczane-nufus");
            const data = await response.json();

            const responseGeoJSON = await fetch("https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/turkey.geojson");
            const geojsonData = await responseGeoJSON.json();

            const egeIlleri = ["İzmir", "Aydın", "Manisa", "Muğla", "Denizli", "Afyonkarahisar", "Kütahya", "Uşak"];

            const filteredGeoJSON = geojsonData.features.filter(feature => egeIlleri.includes(feature.properties.name));

            const map = L.map('chloromap').setView([38.5, 27.0], 7);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            const getColor = (value) => {
                return value > 100000000 ? '#800026' : value > 700000000 ? '#BD0026' : value > 30000000 ? '#FC4E2A' : '#FFEDA0';
            };

            L.geoJSON(filteredGeoJSON, {
                onEachFeature: (feature, layer) => {
                    const { name } = feature.properties;

                    const eczaneSayisi = data.find(item => item.il_ad === name)?.eczane_sayisi || 0;
                    const nufusSayisi = data.find(item => item.il_ad === name)?.nufus_sayisi || 0;
                    const yuzolcum = data.find(item => item.il_ad === name)?.yuz_olcum || 1;

                    const nufusYoğunlugu = nufusSayisi / yuzolcum;

                    layer.bindPopup(`<b>İl:</b> ${name}<br><b>Eczane Sayısı:</b> ${eczaneSayisi}<br><b>Nüfus Yoğunluğu (km²):</b> ${nufusYoğunlugu.toFixed(2)}`);

                    layer.setStyle({
                        fillColor: getColor(nufusYoğunlugu),
                        weight: 2,
                        opacity: 1,
                        color: 'white',
                        dashArray: '3',
                        fillOpacity: 0.7
                    });
                }
            }).addTo(map);
        } catch (error) {
            console.error("Choropleth haritası verileri yüklenemedi:", error);
        }
    }

    loadChoroplethMap();
});
document.addEventListener('DOMContentLoaded', function () {
    const compareCity1 = document.getElementById('compareCity1');
    const compareDepot1 = document.getElementById('compareDepot1');
    const compareCity2 = document.getElementById('compareCity2');
    const compareDepot2 = document.getElementById('compareDepot2');
    const compareButton = document.getElementById('compareButton');
    const performanceChartCtx = document.getElementById('performanceChart').getContext('2d');
    let chartInstance = null;

    // İlleri al
    function loadCitiess() {
        fetch('http://localhost:3265/api/depolar/iller')
            .then(response => response.json())
            .then(data => {
                data.forEach(city => {
                    const option1 = new Option(city.il_ad, city.il_id);
                    const option2 = new Option(city.il_ad, city.il_id);
                    compareCity1.appendChild(option1);
                    compareCity2.appendChild(option2);
                });
            })
            .catch(error => console.error('İller yüklenirken hata oluştu:', error));
    }

    // Depoları al
    function loadDepots(cityId, depotSelect) {
        fetch(`http://localhost:3265/api/depolar/depolarr?il=${encodeURIComponent(cityId)}`)
            .then(response => response.json())
            .then(data => {
                depotSelect.innerHTML = ''; // Depoları temizle
                data.forEach(depot => {
                    const option = new Option(depot.depo_ad, depot.depo_id);
                    depotSelect.appendChild(option);
                });
            })
            .catch(error => console.error('Depolar yüklenirken hata oluştu:', error));
    }

    // İl 1 seçildiğinde depo 1'yi güncelle
    compareCity1.addEventListener('change', function () {
        const cityId = compareCity1.value;
        if (cityId) {
            loadDepots(cityId, compareDepot1); // Depoları yükle
        }
    });

    // İl 2 seçildiğinde depo 2'yi güncelle
    compareCity2.addEventListener('change', function () {
        const cityId = compareCity2.value;
        if (cityId) {
            loadDepots(cityId, compareDepot2); // Depoları yükle
        }
    });

    // Yıl bazlı depo performansını karşılaştır
    function loadDepotPerformance(city1, depot1, city2, depot2) {
        return fetch('http://localhost:3265/api/depolar/depo_performans', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ city1, depot1, city2, depot2 })
        })
        .then(response => response.json())
        .then(data => {
            return data; // Depo 1 ve Depo 2 için karşılaştırma verileri
        })
        .catch(error => console.error('Veri yüklenirken hata oluştu', error));
    }

    function renderComparisonChart(data) {
        // Grafik için yeterli veri olup olmadığını kontrol et
        if (!Array.isArray(data) || data.length < 2) {
            console.error('Grafik için yeterli veri yok:', data);
            alert('Grafik oluşturulamadı. Veriler eksik.');
            return;
        }

        // Yıllar ve veriler
        const labels = ['2020', '2021', '2022', '2023', '2024'];

        // Depo 1 ve Depo 2 için verileri ayır
        const depot1Data = labels.map(year => parseFloat(data[0][`karsilanma_orani_${year}`] || 0));
        const depot2Data = labels.map(year => parseFloat(data[1][`karsilanma_orani_${year}`] || 0));

        // Mevcut grafiği yok et
        if (chartInstance) {
            chartInstance.destroy();
        }

        // Yeni grafiği oluştur
        chartInstance = new Chart(performanceChartCtx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: data[0].depo_ad,
                        data: depot1Data,
                        backgroundColor: 'rgba(31, 73, 224, 0.8)',
                    },
                    {
                        label: data[1].depo_ad,
                        data: depot2Data,
                        backgroundColor: '#ff6384',
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function (tooltipItem) {
                                return `${tooltipItem.dataset.label}: ${tooltipItem.raw}`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Karşılaştırma butonuna tıklandığında
    compareButton.addEventListener('click', function () {
        const city1 = compareCity1.value;
        const depot1 = compareDepot1.value;
        const city2 = compareCity2.value;
        const depot2 = compareDepot2.value;

        if (city1 && depot1 && city2 && depot2) {
            loadDepotPerformance(city1, depot1, city2, depot2).then(data => {
                renderComparisonChart(data);
            });
        } else {
            alert('Lütfen tüm alanları seçin!');
        }
    });

    // İller yüklenirken
    loadCitiess();
});

document.addEventListener("DOMContentLoaded", async () => {
    let talepChart = null;
  
    // İl Dropdown Yükleme
    async function loadIlSelect() {
      try {
        const response = await fetch("http://localhost:3265/api/depolar/iller");
        const iller = await response.json();
  
        const illSelect = document.getElementById("illSelect");
        iller.forEach(il => {
          const option = document.createElement("option");
          option.value = il.il_ad;
          option.textContent = il.il_ad;
          illSelect.appendChild(option);
        });
      } catch (error) {
        console.error("İl verileri yüklenemedi:", error);
      }
    }
  
    // Talep Tahmini Grafiğini Güncelle
    async function updateChart(il, tahminOrani) {
      try {
        const response = await fetch(`http://localhost:3265/api/depolar/talep-tahmin?il=${il}&tahminOrani=${tahminOrani}`);
        if (!response.ok) throw new Error(`HTTP hata: ${response.status}`);
  
        const data = await response.json();
  
        const depoAdlari = data.map(d => d.depo_ad);
        const tahminiTalepler = data.map(d => d.tahmini_talep_2024);
        const kapasiteDegerleri = data.map(d => d.depo_kapasite);
        const durumlar = data.map(d => d.durum === "Karşılanabilir" ? "rgba(31, 73, 224, 0.8)" : "rgba(255, 99, 132, 0.5)");
  
        if (talepChart) talepChart.destroy();
  
        const ctx = document.getElementById("talepChart").getContext("2d");
        talepChart = new Chart(ctx, {
          type: "bar",
          data: {
            labels: depoAdlari,
            datasets: [
              {
                label: "Tahmini Talep (2025)",
                data: tahminiTalepler,
                backgroundColor: durumlar,
                borderColor: "rgba(0, 0, 0, 0.1)",
                borderWidth: 1
              },
              {
                label: "Depo Kapasitesi",
                data: kapasiteDegerleri,
                type: "line",
                borderColor: "rgb(190, 66, 12)",
                borderWidth: 2,
                fill: false
              }
            ]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                title: { display: true, text: "Miktar (Adet)" }
              },
              x: {
                title: { display: true, text: "Depolar" }
              }
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: function (context) {
                    if (context.dataset.label === "Tahmini Talep (2025)") {
                      const durum = data[context.dataIndex].durum;
                      return `${context.raw} - ${durum}`;
                    }
                    return `${context.dataset.label}: ${context.raw}`;
                  }
                }
              }
            }
          }
        });
      } catch (error) {
        console.error("Grafik güncellenemedi:", error);
      }
    }
  
    // Hesapla Butonu
    document.getElementById("calculateButton").addEventListener("click", () => {
      const il = document.getElementById("illSelect").value;
      const tahminOrani = document.getElementById("demandRate").value;
  
      if (il && tahminOrani) {
        updateChart(il, tahminOrani);
      } else {
        alert("Lütfen bir il ve talep oranı giriniz.");
      }
    });
  
    // Başlangıçta İl Dropdown'u Yükle
    loadIlSelect();
  });
  