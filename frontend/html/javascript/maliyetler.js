document.addEventListener("DOMContentLoaded", async () => {
    // Seçim Kutuları
    
    const citySelect = document.getElementById("citySelect"); // İl seçimi
    const depotSelect = document.getElementById("depotSelect"); // Depo seçimi
    const compareCity2 = document.getElementById("compareCity2"); // 2. İl seçimi
    const compareDepot2 = document.getElementById("compareDepot2"); // 2. Depo seçimi
    const compareButton = document.getElementById("compareButton"); // Karşılaştırma düğmesi

    
  
    let turMaliyetChart = null; // Tür Maliyet grafiği referansı
    let kapasiteMaliyetChart = null; // Kapasite & Maliyet grafiği referansı
    let toplamDagitimChart = null;
    let ulasimMaliyetChart = null;
    let enDusukYuksekChart = null;
    loadEnDusukVeEnYuksekDagitimMaliyetChart();
  
    // İl ve Depo Seçeneklerini Doldurma
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

  async function loadAllCharts() {
      await loadTurMaliyetChart();
      await loadKapasiteMaliyetChart();
      await loadToplamDagitimMaliyetChart();
      await loadUlasimTuruDagitimMaliyetChart();
  }

  
    // Her Depo İçin Tür Maliyet Değişim Grafiğini Çiz
    async function loadTurMaliyetChart() {
      const selectedCity = citySelect.value;
      const selectedDepot = depotSelect.value;
  
      if (!selectedDepot) {
        alert("Lütfen bir depo seçiniz.");
        return;
      }
  
      try {
        const response = await fetch(
          `http://localhost:3265/api/depolar/tur-maliyet-dagilimi?il=${selectedCity}&depo=${selectedDepot}`
        );
        const data = await response.json();
  
        const years = [2020, 2021, 2022, 2023, 2024];
        const turler = [...new Set(data.map((item) => item.tur_ad))];
        const datasets = turler.map((tur) => ({
          label: tur,
          data: years.map((year) => {
            const record = data.find((item) => item.tur_ad === tur && item.maliyet_yil === year);
            return record ? record.toplam_maliyet : 0;
          }),
          borderColor: getRandomColor(),
          fill: false,
        }));
  
        if (turMaliyetChart) turMaliyetChart.destroy();
        turMaliyetChart = new Chart(document.getElementById("chart1"), {
          type: "line",
          data: {
            labels: years,
            datasets: datasets,
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: `Depo: ${selectedDepot} - Maliyet Türlerine Göre Yıllık Değişim`,
              },
            },
          },
        });
      } catch (error) {
        console.error("Tür Maliyet verileri alınamadı:", error);
      }
    }
  
    // Maliyet & Kapasite Kullanım Oranı Grafiğini Çiz
    async function loadKapasiteMaliyetChart() {
      const selectedCity = citySelect.value;
      const selectedDepot = depotSelect.value;
  
      if (!selectedDepot) {
        alert("Lütfen bir depo seçiniz.");
        return;
      }
  
      try {
        const response = await fetch(
          `http://localhost:3265/api/depolar/maliyet-kullanim-dagilimi?il=${selectedCity}&depo=${selectedDepot}`
        );
        const data = await response.json();
  
        const years = [2020, 2021, 2022, 2023, 2024];
        const toplamMaliyet = years.map(
          (year) =>
            data.find((item) => item.yil === year)?.toplam_maliyet || 0
        );
        const kapasiteOrani = [80, 85, 90, 92, 88]; // Örnek kapasite oranı, backend'den gelecek
  
        if (kapasiteMaliyetChart) kapasiteMaliyetChart.destroy();
        kapasiteMaliyetChart = new Chart(document.getElementById("chart2"), {
          type: "bar",
          data: {
            labels: years,
            datasets: [
              {
                type: "bar",
                label: "Yıllık Toplam Maliyet (TL)",
                data: toplamMaliyet,
                backgroundColor: "rgba(31, 73, 224, 0.8)",
              },
              {
                type: "line",
                label: "Kapasite Kullanım Oranı (%)",
                data: kapasiteOrani,
                borderColor: "rgba(255, 99, 132, 1)",
                fill: false,
                tension: 0.4,
                yAxisID: "y1",
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              title: {
                display: true,
                text: `Depo: ${selectedDepot} - Maliyet ve Kapasite Kullanım Oranı`,
              },
            },
            scales: {
              y: {
                title: {
                  display: true,
                  text: "Maliyet (TL)",
                },
              },
              y1: {
                position: "right",
                title: {
                  display: true,
                  text: "Kapasite Kullanım Oranı (%)",
                },
                grid: {
                  drawOnChartArea: false,
                },
              },
            },
          },
        });
      } catch (error) {
        console.error("Kapasite & Maliyet verileri alınamadı:", error);
      }
    }

    // Rastgele Renk Oluşturucu
    function getRandomColor() {
      return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    }
  
    async function loadToplamDagitimMaliyetChart() {
      const selectedCity = citySelect.value;
      const selectedDepot = depotSelect.value;
  
      if (!selectedDepot) {
          alert("Lütfen bir depo seçiniz.");
          return;
      }
  
      try {
          const response = await fetch(
              `http://localhost:3265/api/depolar/toplam-dagitim-maliyetleri`
          );
          const data = await response.json();
  
          // Seçili depoya göre filtreleme
          const selectedDepotData = data.find((item) => item.depo === selectedDepot);
  
          if (!selectedDepotData) {
              alert("Seçili depo için veri bulunamadı.");
              return;
          }
  
          const years = [2020, 2021, 2022, 2023, 2024, 2025];
          const maliyetler = [
              selectedDepotData.toplam_2020,
              selectedDepotData.toplam_2021,
              selectedDepotData.toplam_2022,
              selectedDepotData.toplam_2023,
              selectedDepotData.toplam_2024,
              selectedDepotData.toplam_2025,
          ];
  
          const colors = years.map((year) => (year === 2025 ? "red" : "blue"));
  
          if (toplamDagitimChart) toplamDagitimChart.destroy();
          toplamDagitimChart = new Chart(document.getElementById("chart3"), {
              type: "line",
              data: {
                  labels: years,
                  datasets: [
                      {
                          label: "Toplam Dağıtım Maliyeti (TL)",
                          data: maliyetler,
                          borderColor: colors,
                          borderWidth: 2,
                          fill: false,
                          tension: 0.4,
                          segment: {
                            borderColor: (ctx) => {
                                const index = ctx.p0DataIndex; // Mevcut segmentin başlangıç indeksi
                                const nextYear = years[index + 1]; // Sonraki yıl
                                return nextYear === 2025 ? "red" : "blue"; // 2024'ten sonraki çizgiyi kırmızı yap
                            },
                      },
                      }],
              },
              options: {
                  responsive: true,
                  plugins: {
                      title: {
                          display: true,
                          text: `Depo: ${selectedDepot} - Toplam Dağıtım Maliyeti`,
                      },
                  },
                  scales: {
                      y: {
                          title: {
                              display: true,
                              text: "Maliyet (TL)",
                          },
                      },
                  },
              },
          });
      } catch (error) {
          console.error("Toplam dağıtım maliyeti verileri alınamadı:", error);
      }
  }


  async function updateToplamDagitimMaliyetChartForComparison() {
    const selectedCity1 = citySelect.value;
    const selectedDepot1 = depotSelect.value;
    const selectedCity2 = compareCity2.value;
    const selectedDepot2 = compareDepot2.value;

    if (!selectedDepot1 || !selectedDepot2) {
        alert("Lütfen her iki depo seçimini de yapınız.");
        return;
    }

    try {
        const response = await fetch("http://localhost:3265/api/depolar/toplam-dagitim-maliyetleri");
        const data = await response.json();

        const depot1Data = data.find(item => item.depo === selectedDepot1);
        const depot2Data = data.find(item => item.depo === selectedDepot2);

        if (!depot1Data || !depot2Data) {
            alert("Seçili depolar için veri bulunamadı.");
            return;
        }

        const years = [2020, 2021, 2022, 2023, 2024, 2025];
        const depot1Maliyetler = [
            depot1Data.toplam_2020,
            depot1Data.toplam_2021,
            depot1Data.toplam_2022,
            depot1Data.toplam_2023,
            depot1Data.toplam_2024,
            depot1Data.toplam_2025
        ];
        const depot2Maliyetler = [
            depot2Data.toplam_2020,
            depot2Data.toplam_2021,
            depot2Data.toplam_2022,
            depot2Data.toplam_2023,
            depot2Data.toplam_2024,
            depot2Data.toplam_2025
        ];

        if (toplamDagitimChart) toplamDagitimChart.destroy();

        toplamDagitimChart = new Chart(document.getElementById("chart3"), {
            type: "line",
            data: {
                labels: years,
                datasets: [
                    {
                        label: `${selectedDepot1} Deposu`,
                        data: depot1Maliyetler,
                        borderColor: "blue",
                        tension: 0.4,
                        fill: false,
                    },
                    {
                        label: `${selectedDepot2} Deposu`,
                        data: depot2Maliyetler,
                        borderColor: "red",
                        tension: 0.4,
                        fill: false,
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `${selectedDepot1} ve ${selectedDepot2} Depoları Toplam Dağıtım Maliyet Karşılaştırması`
                    }
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: "Maliyet (TL)"
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error("Karşılaştırma grafiği güncellenirken hata oluştu:", error);
    }
}




  async function loadUlasimTuruDagitimMaliyetChart() {
    const selectedCity = citySelect.value;
    const selectedDepot = depotSelect.value;

    if (!selectedDepot) {
        alert("Lütfen bir depo seçiniz.");
        return;
    }

    try {
        const response = await fetch(
            `http://localhost:3265/api/depolar/ulasim-turu-dagitim-maliyetleri`
        );
        const data = await response.json();

        const years = [2020, 2021, 2022, 2023, 2024, 2025];
        const ulasimTurleri = data.map((item) => item.ulasim_turu);

        const datasets = ulasimTurleri.map((tur, index) => ({
            label: tur,
            data: years.map((year) => data.find((item) => item.ulasim_turu === tur)?.[`toplam_${year}`] || 0),
            backgroundColor: getRandomColor(),
        }));

        if (ulasimMaliyetChart) ulasimMaliyetChart.destroy();

        ulasimMaliyetChart = new Chart(document.getElementById("chart4"), {
            type: "bar",
            data: {
                labels: years,
                datasets: datasets,
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Depo: ${selectedDepot} - Ulaşım Türüne Göre Yıllık Dağıtım Maliyetleri`,
                    },
                    tooltip: {
                        mode: "index",
                        intersect: false,
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Yıllar",
                        },
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Maliyet (TL)",
                        },
                    },
                },
            },
        });
    } catch (error) {
        console.error("Ulaşım türü dağıtım maliyet verileri alınamadı:", error);
    }
  }

  async function loadEnDusukVeEnYuksekDagitimMaliyetChart() {
    try {
        const response = await fetch(
            `http://localhost:3265/api/depolar/en-dusuk-ve-en-yuksek-dagitim-maliyetleri`
        );
        const data = await response.json();

        const years = [...new Set(data.map(item => item.yil))]; // Yıllar
        const enDusukMaliyetler = years.map(year => {
            const record = data.find(item => item.yil === year && item.maliyet_turu === "En Düşük");
            return record ? { maliyet: record.maliyet, depo: record.depo } : { maliyet: 0, depo: "Bilinmiyor" };
        });
        const enYuksekMaliyetler = years.map(year => {
            const record = data.find(item => item.yil === year && item.maliyet_turu === "En Yüksek");
            return record ? { maliyet: record.maliyet, depo: record.depo } : { maliyet: 0, depo: "Bilinmiyor" };
        });

        if (enDusukYuksekChart) enDusukYuksekChart.destroy();

        enDusukYuksekChart = new Chart(document.getElementById("chart5"), {
            type: "bar",
            data: {
                labels: years,
                datasets: [
                    {
                        label: "En Düşük Dağıtım Maliyeti",
                        data: enDusukMaliyetler.map(item => item.maliyet),
                        backgroundColor: "#111663",
                        barThickness: 30,
                        maxBarThickness: 50,
                    },
                    {
                        label: "En Yüksek Dağıtım Maliyeti",
                        data: enYuksekMaliyetler.map(item => item.maliyet),
                        backgroundColor: "#93261e",
                        barThickness: 30,
                        maxBarThickness: 50,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: "En Düşük ve En Yüksek Dağıtım Maliyetleri",
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const index = context.dataIndex;
                                const dataset = context.datasetIndex === 0 ? enDusukMaliyetler : enYuksekMaliyetler;
                                const depoAdi = dataset[index].depo;
                                const maliyet = dataset[index].maliyet;
                                return `${depoAdi}: ${maliyet} TL`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Yıllar",
                        },
                        stacked: false,
                    },
                    y: {
                        title: {
                            display: true,
                            text: "Maliyet (TL)",
                        },
                        beginAtZero: true,
                    },
                },
            },
        });
    } catch (error) {
        console.error("Veri alınamadı:", error);
    }
}



    // Depo seçiminde grafik yükleme
    depotSelect.addEventListener("change", () => {
      loadTurMaliyetChart();
      loadKapasiteMaliyetChart();
      loadToplamDagitimMaliyetChart();
      loadUlasimTuruDagitimMaliyetChart(); 
    });
  
    // İl ve depo seçim kutularını doldur
    depotSelect.addEventListener("change", loadAllCharts);
    compareButton.addEventListener("click", updateToplamDagitimMaliyetChartForComparison);
    fillSelectBoxes();

  });
  