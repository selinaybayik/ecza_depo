// Harita oluşturma
const map = L.map('map').setView([38.4237, 27.1428], 8); // Türkiye'nin merkezi koordinatları

 // OpenStreetMap katmanı ekleyin
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
 }).addTo(map);

 // Async function ile veri çekme ve buffer ekleme
 async function getBufferData() {
     try {
         const response = await fetch('http://localhost:3265/api/depolar/getBufferData');
         const data = await response.json();

         data.forEach(item => {
             // Mevcut depolar için mavi renkli marker ekle
             const depoLatLng = [item.depo_enlem, item.depo_boylam];
             L.marker(depoLatLng)
                 .addTo(map)
                 .bindPopup(`<b>${item.depo_ad}</b>`);

             // Mevcut depolar için 10 km'lik kırmızı buffer ekle
             const depoBuffer = L.circle(depoLatLng, {
                 color: 'red',  // Kırmızı renk
                 fillColor: '#f03', // Kırmızı dolgu rengi
                 fillOpacity: 0.2,
                 radius: 20000 // 20 km buffer
             }).addTo(map);

             // Rakip depolar için yeşil renkli marker ekle
             const rakipLatLng = [item.rakip_enlem, item.rakip_boylam];
             L.marker(rakipLatLng, {
                 icon: L.divIcon({
                     className: 'leaflet-div-icon',
                     html: '<div style="background-color: green; border-radius: 50%; width: 20px; height: 20px;"></div>',
                     iconSize: [20, 20]
                 })
             }).addTo(map)
             .bindPopup(`<b>${item.rakip_ad}</b>`);
         });
     } catch (err) {
         console.error('Veri çekme hatası: ', err);
     }
 }

 // Buffer verilerini almak ve harita üzerinde göstermek için fonksiyonu çağır
 getBufferData(); 
