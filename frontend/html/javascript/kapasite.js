document.addEventListener("DOMContentLoaded", async () => {
    // Eleman referansları
    const citySelect = document.getElementById("citySelect");
    const depotSelect = document.getElementById("depotSelect");
    const compareCity2 = document.getElementById("compareCity2");
    const compareDepot2 = document.getElementById("compareDepot2");
    const compareButton = document.getElementById("compareButton");

    let kapasiteChart = null;

    // Seçim Kutularını Doldurma
    async function fillSelectBoxes() {
        try {
            const illerResponse = await fetch("http://localhost:3265/api/depolar/iller");
            const illerData = await illerResponse.json();
            illerData.forEach(item => {
                const option1 = new Option(item.il_ad, item.il_ad);
                const option2 = new Option(item.il_ad, item.il_ad);
                citySelect.appendChild(option1);
                compareCity2.appendChild(option2);
            });

            const depolarResponse = await fetch("http://localhost:3265/api/depolar/depolar");
            const depolarData = await depolarResponse.json();
            citySelect.addEventListener("change", () => updateDepots(citySelect.value, depolarData, depotSelect));
            compareCity2.addEventListener("change", () => updateDepots(compareCity2.value, depolarData, compareDepot2));
        } catch (error) {
            console.error("Seçim kutularını doldururken hata oluştu:", error);
        }
    }

    // Depoları Güncelleme
    function updateDepots(selectedCity, depolarData, targetSelect) {
        targetSelect.innerHTML = '<option value="">Tümü</option>';
        const filteredDepots = depolarData.filter(depo => depo.il_ad === selectedCity);
        filteredDepots.forEach(depo => {
            const option = document.createElement("option");
            option.value = depo.depo_ad;
            option.textContent = depo.depo_ad;
            targetSelect.appendChild(option);
        });
    }

    // Kapasite Grafiği Yükleme
    // Kapasite Grafiğini Yükleme
async function loadKapasiteChart() {
    const selectedCity = citySelect.value;
    const selectedDepot = depotSelect.value;

    if (!selectedDepot) {
        alert("Lütfen bir depo seçiniz.");
        return;
    }

    try {
        const response = await fetch(
            `http://localhost:3265/api/depolar/yillik-doluluk?il=${selectedCity}&depo=${selectedDepot}`
        );
        const data = await response.json();

        if (!data || data.length === 0) {
            alert("Veri bulunamadı.");
            return;
        }

        console.log("API Verisi:", data);

        const years = [2020, 2021, 2022, 2023, 2024];
        const dolulukOranlari = years.map(yil => {
            // Veri içindeki her yıl için doluluk oranını almak
            const yearData = data.find(item => item[`doluluk_orani_${yil}`] !== undefined); // Yıl verisi var mı kontrol et
            return yearData ? parseFloat(yearData[`doluluk_orani_${yil}`]) : 0;  // sayıya dönüştürme
        });

        console.log("Yıllar:", years);
        console.log("Doluluk Oranları:", dolulukOranlari);

        if (kapasiteChart) {
            kapasiteChart.destroy();
            kapasiteChart = null;
        }

        kapasiteChart = new Chart(document.getElementById("chartKapasite"), {
            type: "bar",
            data: {
                labels: years,
                datasets: [
                    {
                        label: "Kapasite Doluluk Oranı (%)",
                        data: dolulukOranlari,
                        backgroundColor: "rgba(7, 37, 182, 0.8)",
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Depo: ${selectedDepot} - Kapasite Doluluk Oranı`,
                    },
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: "Doluluk Oranı (%)",
                        },
                        min: 0,
                        max: 100,
                    },
                },
            },
        });
    } catch (error) {
        console.error("Kapasite grafiği verileri alınamadı:", error);
    }
}


    // Karşılaştırma Butonuna Tıklama
    compareButton.addEventListener("click", async () => {
        const selectedCity1 = citySelect.value;
        const selectedDepot1 = depotSelect.value;
        const selectedCity2 = compareCity2.value;
        const selectedDepot2 = compareDepot2.value;

        if (!selectedDepot1 || !selectedDepot2) {
            alert("Lütfen her iki depo seçimini de yapınız.");
            return;
        }

        try {
            const response = await fetch("http://localhost:3265/api/depolar/yillik-doluluk");
            const data = await response.json();

            const depot1Data = data.filter(item => item.depo_ad === selectedDepot1);
            const depot2Data = data.filter(item => item.depo_ad === selectedDepot2);

            const years = [2020, 2021, 2022, 2023, 2024];
            const depot1Oranlari = years.map(year => {
                const fieldName = `doluluk_orani_${year}`;  // Yıllık doluluk oranlarını doğru şekilde al
                return depot1Data[0]?.[fieldName] ? parseFloat(depot1Data[0]?.[fieldName]) : 0;
            });
            
            const depot2Oranlari = years.map(year => {
                const fieldName = `doluluk_orani_${year}`;  // Yıllık doluluk oranlarını doğru şekilde al
                return depot2Data[0]?.[fieldName] ? parseFloat(depot2Data[0]?.[fieldName]) : 0;
            });

            if (kapasiteChart) kapasiteChart.destroy();

            kapasiteChart = new Chart(document.getElementById("chartKapasite"), {
                type: "bar",
                data: {
                    labels: years,
                    datasets: [
                        {
                            label: `${selectedDepot1} Deposu`,
                            data: depot1Oranlari,
                            backgroundColor: "rgba(7, 37, 182, 0.8)",
                        },
                        {
                            label: `${selectedDepot2} Deposu`,
                            data: depot2Oranlari,
                            backgroundColor: "rgba(234, 132, 25, 0.8)",
                        },
                    ],
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: `${selectedDepot1} ve ${selectedDepot2} Depoları Kapasite Doluluk Karşılaştırması`,
                        },
                    },
                    scales: {
                        y: {
                            title: {
                                display: true,
                                text: "Doluluk Oranı (%)",
                            },
                            min: 0,
                            max: 100,
                        },
                    },
                },
            });
        } catch (error) {
            console.error("Kapasite karşılaştırma verileri alınamadı:", error);
        }
    });

    // Depo Seçimi Değiştiğinde Kapasite Grafiğini Yükle
    depotSelect.addEventListener("change", () => {
        loadKapasiteChart();
    });

    // Başlangıçta Seçim Kutularını Doldur
    await fillSelectBoxes();
});

 
// İl seçeneklerini almak için bir fonksiyon
async function fetchCities() {
    try {
      // İl verilerini almak için doğru endpoint'e istek gönderiyoruz
      const response = await fetch("http://localhost:3265/api/depolar/iller"); // İllerin alındığı endpoint
      const cities = await response.json();
  
      if (!Array.isArray(cities)) {
        throw new Error('İl verisi bekleniyor ancak geçersiz bir formatta veri alındı.');
      }
  
      const ilSelect = document.getElementById('il');
      cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city.il_ad;
        option.textContent = city.il_ad;
        ilSelect.appendChild(option);
      });
    } catch (error) {
      console.error('İl verisi alınırken hata oluştu:', error);
      alert('İl verisi alınırken bir hata oluştu.');
    }
}
  
// Tahmin butonuna tıklanınca tahmin hesaplamak için bir fonksiyon
// Tahmin butonuna tıklanınca tahmin hesaplamak için bir fonksiyon
document.getElementById('tahminleButton').addEventListener('click', async () => {
    const il = document.getElementById('il').value;
    const tahminOrani = parseFloat(document.getElementById('tahminOrani').value);

    // Sadece belirtilen yüzdelik değerler geçerli
    const validPercentages = [10,30,50,70,90,130];
    if (!il || isNaN(tahminOrani) || !validPercentages.includes(tahminOrani)) {
        alert("Lütfen geçerli bir il ve yüzdelik tahmin oranı seçiniz (%10, %30, %50, %70, %90, %130).");
        return;
    }

    try {
        // API'ye istek gönderiyoruz
        const response = await fetch(`http://localhost:3265/api/depolar/kapasite-tahmin?il=${il}&tahminOrani=${tahminOrani}`);

        if (!response.ok) {
            const errorData = await response.json();
            alert(errorData.error || 'Beklenmeyen bir hata oluştu.');
            return;
        }

        const data = await response.json();

        const tahminData = data.tahmin;
        if (!Array.isArray(tahminData)) {
            throw new Error('Beklenen tahmin verisi formatı hatalı.');
        }

        const depoAdlari = tahminData.map(item => item.depo_ad);
        const depoKapasiteleri = tahminData.map(item => parseFloat(item.depo_kapasite) || 0);
        const tahminDolulukOrani = tahminData.map(item => parseFloat(item.tahmin_doluluk_orani));
        const durumlar = tahminData.map(item => item.durum);

        const durumRenkleri = durumlar.map(durum =>
            durum === "Karşılanabilir" ? 'rgba(7, 37, 182, 0.8)' : 'rgba(255, 99, 132, 0.5)'
        );

        const ctx = document.getElementById('capacityChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: depoAdlari,
                datasets: [
                    {
                        label: 'Mevcut Doluluk 2024',
                        data: depoKapasiteleri,
                        backgroundColor: 'rgba(234, 132, 25, 0.8)',
                        borderColor: 'rgba(234, 132, 25, 0.8)',
                        borderWidth: 1
                    },
                    {
                        label: 'Tahmini Doluluk Miktarı 2025(K:Karşılanamaz)',
                        data: tahminDolulukOrani,
                        backgroundColor: durumRenkleri,
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            },
        });
    } catch (error) {
        console.error('Tahmin verisi alınırken hata oluştu:', error);
        alert('Tahmin verisi alınırken bir hata oluştu.');
    }
});

// Sayfa yüklendiğinde illeri al
fetchCities();

// İl Seçim Listesini Yükle
// İl Seçim Listesini Yükle
function loadCities() {
    fetch('http://localhost:3265/api/depolar/iller')
      .then(response => response.json())
      .then(data => {
        const citySelect = document.getElementById('newCitySelect');
        data.forEach(city => {
          const option = new Option(city.il_ad, city.il_id); // Option'u yeni bir şekilde oluşturuyoruz
          citySelect.appendChild(option);
        });
      })
      .catch(error => {
        console.error('İller yüklenirken hata oluştu:', error);
      });
}

// Depo Seçim Listesini Yükle (Belirli Bir İl için Depolar)
function loadDepots(cityId) {
    fetch(`http://localhost:3265/api/depolar/depolarr?il=${encodeURIComponent(cityId)}`) // İl filtresi ekleniyor
      .then(response => response.json())
      .then(data => {
        const depotSelect = document.getElementById('newDepotSelect');
        depotSelect.innerHTML = '<option value="">Seçiniz</option>'; // Önceki depo seçeneklerini temizle
        data.forEach(depot => {
          const option = new Option(depot.depo_ad, depot.depo_id); // Depo seçeneklerini ekliyoruz
          depotSelect.appendChild(option);
        });
      })
      .catch(error => {
        console.error('Depolar yüklenirken hata oluştu:', error);
      });
}

// İl seçim değiştiğinde, depoları yüklemek için çağır
document.getElementById('newCitySelect').addEventListener('change', (e) => {
  const cityId = e.target.value; // Seçilen il ID'si alınıyor
  if (cityId) {
    loadDepots(cityId); // Depoları yükle
  } else {
    // Eğer il seçilmezse, depo seçimini sıfırla
    document.getElementById('newDepotSelect').innerHTML = '<option value="">Seçiniz</option>';
  }
});

// Sayfa ilk yüklendiğinde şehirleri yükle
loadCities();
  // Depo ve Personel Grafiklerini Yükle
  // Depo Kapasite ve Personel Sayısı API'yi yükleyen fonksiyon
  function loadChart(depotId) {
    fetch(`http://localhost:3265/api/depolar/depo-kapasite-personel`)
      .then(response => response.json())
      .then(data => {
        const yil = [];
        const kapasite2020 = [];
        const kapasite2021 = [];
        const kapasite2022 = [];
        const kapasite2023 = [];
        const kapasite2024=[];
        const kapasite2025 = [];
        const personelSayisi = [];
  
        data.forEach(item => {
          if (!yil.includes(item.yil)) yil.push(item.yil);
          kapasite2020.push(item.kapasite2020 || 0);
          kapasite2021.push(item.kapasite2021 || 0);
          kapasite2022.push(item.kapasite2022 || 0);
          kapasite2023.push(item.kapasite2023 || 0);
          kapasite2024.push(item.depo_kapasite || 0); 
          kapasite2025.push(item.kapasite2025_tahmin || 0);
          personelSayisi.push(item.personel_sayisi || 0);
        });
  
        const ctx = document.getElementById('personelChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
              labels: yil,
              datasets: [
                {
                  label: 'Depo Kapasitesi (m²)',
                  data: [
                    kapasite2020[0],
                    kapasite2021[1],
                    kapasite2022[2],
                    kapasite2023[3],
                    kapasite2024[4],
                    kapasite2025[5]
                  ],
                  backgroundColor: 'rgba(7, 37, 182, 0.8)',
                  borderColor: 'rgba(7, 37, 182, 0.8)',
                  borderWidth: 1,
                  type: 'bar',
                  yAxisID: 'y'
                },
                {
                  label: 'Personel Sayısı',
                  data: personelSayisi,
                  backgroundColor: 'rgba(255, 99, 132, 0.5)',
                  borderColor: 'rgba(255, 99, 132, 1)',
                  borderWidth: 1,
                  type: 'line',
                  fill: false,
                  yAxisID: 'y1'
                }
              ]
            },
            options: {
              scales: {
                y: {
                  beginAtZero: true,
                  position: 'left',
                },
                y1: {
                  beginAtZero: true,
                  position: 'right',
                  grid: {
                    drawOnChartArea: false
                  }
                }
              }
            }
          });
        })          
      .catch(error => {
        console.error('Error loading chart data:', error);
      });
  }
  
  // İl değiştiğinde depo seçeneklerini yükle
  document.getElementById('newCitySelect').addEventListener('change', (e) => {
    const cityId = e.target.value;
    if (cityId) {
      loadDepots(cityId);
    } else {
      document.getElementById('newDepotSelect').innerHTML = '<option value="">Seçiniz</option>';
    }
  });
  
  // Depo değiştiğinde grafiği yükle
  document.getElementById('newDepotSelect').addEventListener('change', (e) => {
    const depotId = e.target.value;
    if (depotId) {
      loadChart(depotId);
    }
  })