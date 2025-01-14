const express = require("express");
const mysql = require("mysql2");
const router = express.Router();
const bcrypt = require('bcryptjs');


// MySQL Database Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "yeni_depo",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to the database.");
});


// Depo İstatistikleri API'si
router.get("/depolar/stats", (req, res) => {
    const query = `
      SELECT 
        (SELECT COUNT(*) FROM mevcut_depo) AS totalDepoCount,
        (SELECT SUM(y2020_miktar + y2021_miktar + y2022_miktar + y2023_miktar + y2024_miktar) FROM satislar JOIN mevcut_depo ON mevcut_depo.depo_id=satislar.depo_id) AS totalDepoSales,
        (SELECT SUM(maliyet.maliyet_tutari) FROM maliyet) AS totalDepoCost,
        (SELECT COUNT(DISTINCT eczane_id) FROM satislar) AS totalPharmacyCount
    `;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      res.json(results[0]);
    });
  });
  
  // Depoların Satış Dağılımı (Yıllara Göre)
  router.get("/depolar/satis-dagilimi", (req, res) => {
    const { yil } = req.query; // Yıl parametresi
    const yearColumn = `y${yil}_miktar`; // Dinamik sütun seçimi
  
    const query = `
      SELECT 
        iller.il_ad AS il,
        mevcut_depo.depo_ad AS depo_adi,
        SUM(satislar.${yearColumn}) AS satis
      FROM satislar
      JOIN mevcut_depo ON satislar.depo_id = mevcut_depo.depo_id
      JOIN iller ON mevcut_depo.il_id = iller.il_id
      GROUP BY iller.il_ad, mevcut_depo.depo_ad
    `;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      res.json(results);
    });
  });
  
  // Maliyet Dağılımı API'si
  router.get("/depolar/maliyet-dagilimi", (req, res) => {
    const query = `
      SELECT 
        iller.il_ad AS il,
        mevcut_depo.depo_ad AS depo_adi,
        maliyet.maliyet_yil AS yil,
        SUM(maliyet.maliyet_tutari) AS toplam_maliyet
      FROM maliyet
      JOIN mevcut_depo ON maliyet.depo_id = mevcut_depo.depo_id
      JOIN iller ON mevcut_depo.il_id = iller.il_id
      GROUP BY iller.il_ad, mevcut_depo.depo_ad, maliyet.maliyet_yil
    `;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      res.json(results);
    });
  });

// Her İldeki Depo Sayısı API'si
router.get("/depolar/il-bazli-depo-sayisi", (req, res) => {
    const query = `
      SELECT 
        iller.il_ad AS il, 
        COUNT(mevcut_depo.depo_id) AS depo_sayisi
      FROM iller
      LEFT JOIN mevcut_depo ON mevcut_depo.il_id = iller.il_id
      GROUP BY iller.il_ad
    `;
  
    db.query(query, (err, results) => {
      if (err) {
        console.error("Error executing query:", err);
        return res.status(500).json({ error: "Database query failed" });
      }
      res.json(results);
    });
  });
  

  
  
  // Yıl Listesi
  router.get("/depolar/yillar", (req, res) => {
    const years = [2020, 2021, 2022, 2023, 2024];
    res.json({ years });
  });

// Depo Konumları API'si
router.get("/depolar/konumlar", (req, res) => {
    const query = `
        SELECT 
            depo_ad AS ad, 
            depo_enlem AS enlem, 
            depo_boylam AS boylam 
        FROM mevcut_depo 
        WHERE depo_enlem IS NOT NULL AND depo_boylam IS NOT NULL
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            return res.status(500).json({ error: "Database query failed" });
        }
        res.json(results);
    });
});

router.get("/depolar/iller", (req, res) => {
  const query = `SELECT DISTINCT il_ad FROM iller`;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: "Database query failed" });
    res.json(results);
  });
});


router.get("/depolar/depolar", (req, res) => {
  const query = `SELECT iller.il_ad, mevcut_depo.depo_ad FROM iller LEFT JOIN mevcut_depo ON mevcut_depo.il_id=iller.il_id`;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: "Database query failed" });
    res.json(results);
  });
});

// Tüm verileri döndüren API
router.get("/depolar/full-data", (req, res) => {
  const query = `
    SELECT 
        i.il_ad AS il_ad,
        md.depo_ad AS depo_ad,
        SUM(s.y2020_miktar * u.y2020_fiyat) AS gelir_2020,
        SUM(s.y2021_miktar * u.y2021_fiyat) AS gelir_2021,
        SUM(s.y2022_miktar * u.y2022_fiyat) AS gelir_2022,
        SUM(s.y2023_miktar * u.y2023_fiyat) AS gelir_2023,
        SUM(s.y2024_miktar * u.y2024_fiyat) AS gelir_2024
    FROM 
        satislar s
    INNER JOIN 
        mevcut_depo md ON s.depo_id = md.depo_id
    INNER JOIN 
        iller i ON md.il_id = i.il_id
    INNER JOIN 
        urunler u ON s.urun_id = u.urun_id
    GROUP BY 
        i.il_ad, md.depo_ad
    ORDER BY 
        i.il_ad, md.depo_ad;
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database query failed:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json(results);
  });
});



router.get("/depolar/top-products", (req, res) => {
  const { il, depo } = req.query;

  const query = `
    WITH toplam_satis AS (
        SELECT
            i.il_ad,
            md.depo_ad,
            u.urun_id,
            u.urun_ad,
            y.yil,
            SUM(CASE y.yil
                WHEN 2020 THEN s.y2020_miktar
                WHEN 2021 THEN s.y2021_miktar
                WHEN 2022 THEN s.y2022_miktar
                WHEN 2023 THEN s.y2023_miktar
                WHEN 2024 THEN s.y2024_miktar
            END) AS toplam_miktar
        FROM satislar s
        INNER JOIN mevcut_depo md ON s.depo_id = md.depo_id
        INNER JOIN iller i ON md.il_id = i.il_id
        INNER JOIN urunler u ON s.urun_id = u.urun_id
        CROSS JOIN (SELECT 2020 AS yil UNION ALL SELECT 2021 UNION ALL SELECT 2022 UNION ALL SELECT 2023 UNION ALL SELECT 2024) y
        WHERE i.il_ad = ? AND md.depo_ad = ?
        GROUP BY i.il_ad, md.depo_ad, u.urun_id, u.urun_ad, y.yil
    ),
    en_cok_satis AS (
        SELECT
            il_ad,
            depo_ad,
            yil,
            urun_ad,
            toplam_miktar,
            RANK() OVER (PARTITION BY il_ad, depo_ad, yil ORDER BY toplam_miktar DESC) AS urun_sirasi
        FROM toplam_satis
    )
    SELECT
        il_ad,
        depo_ad,
        yil,
        urun_ad,
        toplam_miktar
    FROM en_cok_satis
    WHERE urun_sirasi <= 5
    ORDER BY yil, toplam_miktar DESC;
  `;

  db.query(query, [il, depo], (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json(results);
  });
});



// Her İl, Depo ve Yıl İçin En Az Satılan 5 Ürün API'si
router.get("/depolar/least-sold-products", (req, res) => {
  const { il, depo } = req.query;

  const query = `
    WITH toplam_satis AS (
        SELECT
            i.il_ad,
            md.depo_ad,
            u.urun_id,
            u.urun_ad,
            y.yil,
            SUM(CASE y.yil
                WHEN 2020 THEN s.y2020_miktar
                WHEN 2021 THEN s.y2021_miktar
                WHEN 2022 THEN s.y2022_miktar
                WHEN 2023 THEN s.y2023_miktar
                WHEN 2024 THEN s.y2024_miktar
            END) AS toplam_miktar
        FROM satislar s
        INNER JOIN mevcut_depo md ON s.depo_id = md.depo_id
        INNER JOIN iller i ON md.il_id = i.il_id
        INNER JOIN urunler u ON s.urun_id = u.urun_id
        CROSS JOIN (SELECT 2020 AS yil UNION ALL SELECT 2021 UNION ALL SELECT 2022 UNION ALL SELECT 2023 UNION ALL SELECT 2024) y
        WHERE i.il_ad = ? AND md.depo_ad = ?
        GROUP BY i.il_ad, md.depo_ad, u.urun_id, u.urun_ad, y.yil
    ),
    en_az_satis AS (
        SELECT
            il_ad,
            depo_ad,
            yil,
            urun_id,
            urun_ad,
            toplam_miktar,
            RANK() OVER (PARTITION BY il_ad, depo_ad, yil ORDER BY toplam_miktar ASC) AS urun_sirasi
        FROM toplam_satis
    )
    SELECT
        il_ad,
        depo_ad,
        yil,
        urun_ad,
        toplam_miktar
    FROM en_az_satis
    WHERE urun_sirasi <= 5
    ORDER BY yil, toplam_miktar ASC;
  `;

  db.query(query, [il, depo], (err, results) => {
    if (err) {
      console.error("Error executing query:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json(results);
  });
});




router.get("/depolar/kar-oranlari", (req, res) => {
  const { il, depo } = req.query; // İl ve depo parametreleri frontend'den geliyor

  const query = `
    WITH gelir_hesap AS (
        SELECT 
            i.il_ad,
            d.depo_ad,
            y.yil,
            SUM(
                CASE y.yil
                    WHEN 2020 THEN s.y2020_miktar * u.y2020_fiyat
                    WHEN 2021 THEN s.y2021_miktar * u.y2021_fiyat
                    WHEN 2022 THEN s.y2022_miktar * u.y2022_fiyat
                    WHEN 2023 THEN s.y2023_miktar * u.y2023_fiyat
                    WHEN 2024 THEN s.y2024_miktar * u.y2024_fiyat
                END
            ) AS toplam_gelir
        FROM satislar s
        JOIN urunler u ON s.urun_id = u.urun_id
        JOIN mevcut_depo d ON s.depo_id = d.depo_id
        JOIN iller i ON d.il_id = i.il_id
        CROSS JOIN (
            SELECT 2020 AS yil UNION ALL SELECT 2021 UNION ALL SELECT 2022 
            UNION ALL SELECT 2023 UNION ALL SELECT 2024
        ) y
        WHERE i.il_ad = ? AND d.depo_ad = ?
        GROUP BY i.il_ad, d.depo_ad, y.yil
    ),
    maliyet_hesap AS (
        SELECT 
            i.il_ad,
            d.depo_ad,
            m.maliyet_yil AS yil,
            SUM(m.maliyet_tutari) AS toplam_maliyet
        FROM maliyet m
        JOIN mevcut_depo d ON m.depo_id = d.depo_id
        JOIN iller i ON d.il_id = i.il_id
        WHERE i.il_ad = ? AND d.depo_ad = ?
        GROUP BY i.il_ad, d.depo_ad, m.maliyet_yil
    ),
    kar_oran_hesap AS (
        SELECT 
            g.il_ad,
            g.depo_ad,
            g.yil,
            g.toplam_gelir,
            COALESCE(m.toplam_maliyet, 0) AS toplam_maliyet,
            CASE 
                WHEN g.toplam_gelir > 0 THEN 
                    ((g.toplam_gelir - COALESCE(m.toplam_maliyet, 0)) / g.toplam_gelir) * 100
                ELSE 
                    0
            END AS kar_orani
        FROM gelir_hesap g
        LEFT JOIN maliyet_hesap m ON g.il_ad = m.il_ad AND g.depo_ad = m.depo_ad AND g.yil = m.yil
    )
    SELECT 
      k.il_ad,
      k.depo_ad,
      k.yil,
      ROUND(k.toplam_gelir, 2) AS toplam_gelir,
      ROUND(k.toplam_maliyet, 2) AS toplam_maliyet,
      ROUND(k.kar_orani, 2) AS kar_orani
    FROM kar_oran_hesap k
    UNION ALL
    SELECT 
      i.il_ad,
      d.depo_ad,
      kt.yil,
      NULL AS toplam_gelir,
      NULL AS toplam_maliyet,
      kt.kar_orani AS kar_orani
    FROM kar_tahminleri kt
    JOIN mevcut_depo d ON kt.depo_id = d.depo_id
    JOIN iller i ON d.il_id = i.il_id
    WHERE kt.yil = 2025 AND i.il_ad = ? AND d.depo_ad = ?
    ORDER BY il_ad, depo_ad, yil;
  `;

  db.query(query, [il, depo, il, depo, il, depo], (err, results) => {
    if (err) {
      console.error("Kar oranları sorgusu başarısız:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json(results);
  });
});


// Tahmini Gelir Hesaplama API'si
router.get("/depolar/tahmini-gelir", (req, res) => {
  const { oran, il } = req.query; // Kullanıcıdan gelen satış artış oranı ve il

  if (!oran || isNaN(oran)) {
      return res.status(400).json({ error: "Geçerli bir oran girin." });
  }

  if (!il) {
      return res.status(400).json({ error: "Geçerli bir il seçin." });
  }

  const oranKatsayisi = parseFloat(oran) / 100; // Oran yüzdeye çevriliyor

  const query = `
      SELECT 
          i.il_ad AS il,
          md.depo_ad AS depo,
          SUM(
              (s.y2020_miktar * u.y2020_fiyat) + 
              (s.y2021_miktar * u.y2021_fiyat) + 
              (s.y2022_miktar * u.y2022_fiyat) + 
              (s.y2023_miktar * u.y2023_fiyat) + 
              (s.y2024_miktar * u.y2024_fiyat)
          ) / 5 AS ortalama_gelir
      FROM satislar s
      INNER JOIN mevcut_depo md ON s.depo_id = md.depo_id
      INNER JOIN iller i ON md.il_id = i.il_id
      INNER JOIN urunler u ON s.urun_id = u.urun_id
      WHERE i.il_ad = ?  -- Burada il parametresi eklendi
      GROUP BY i.il_ad, md.depo_ad;
  `;

  db.query(query, [il], (err, results) => {
      if (err) {
          console.error("Tahmini gelir sorgusu başarısız:", err);
          return res.status(500).json({ error: "Database query failed" });
      }

      const tahminiSonuclar = results.map(row => ({
          il: row.il,
          depo: row.depo,
          tahmini_gelir: row.ortalama_gelir * (1 + oranKatsayisi)
      }));

      res.json(tahminiSonuclar);
  });
});


/* 
// İl Listesini Döndür
router.get("/iller", (req, res) => {
  const query = `SELECT DISTINCT il_ad FROM iller`;
  db.query(query, (err, results) => {
    if (err) {
      console.error("Database query failed:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json(results); // JSON formatında yanıt
  });
});

// Depo Listesini Döndür
router.get("/depolar", (req, res) => {
  const { il } = req.query;
  const query = `
    SELECT mevcut_depo.depo_ad 
    FROM mevcut_depo 
    JOIN iller ON mevcut_depo.il_id = iller.il_id 
    WHERE iller.il_ad = ?`;
  db.query(query, [il], (err, results) => {
    if (err) {
      console.error("Database query failed:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json(results); // JSON formatında yanıt
  });
}); */



// /api/depolar/tur-maliyet-dagilimi rotası
router.get("/depolar/tur-maliyet-dagilimi", (req, res) => {
  const { il, depo } = req.query;
  const query = `
    SELECT 
      iller.il_ad,
      mevcut_depo.depo_ad,
      turler.tur_ad, 
      maliyet.maliyet_yil, 
      SUM(maliyet.maliyet_tutari) AS toplam_maliyet 
    FROM maliyet 
    JOIN mevcut_depo ON maliyet.depo_id = mevcut_depo.depo_id 
    JOIN iller ON mevcut_depo.il_id = iller.il_id 
    JOIN turler ON maliyet.tur_id = turler.tur_id 
    WHERE iller.il_ad = ? AND mevcut_depo.depo_ad = ? 
    GROUP BY turler.tur_ad, maliyet.maliyet_yil`;

  db.query(query, [il, depo], (err, results) => {
    if (err) {
      console.error("Database query failed:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json(results);
  });
});

// Maliyet ve Kapasite Kullanım Oranı
router.get("/depolar/maliyet-kullanim-dagilimi", (req, res) => {
  const { il, depo } = req.query;

  const query = `
    SELECT 
      maliyet.maliyet_yil AS yil, 
      SUM(maliyet.maliyet_tutari) AS toplam_maliyet,
      depo_kapasite_kullanim.doluluk2020 / mevcut_depo.depo_kapasite * 100 AS kapasite_2020,
      depo_kapasite_kullanim.doluluk2021 / mevcut_depo.depo_kapasite * 100 AS kapasite_2021,
      depo_kapasite_kullanim.doluluk2022 / mevcut_depo.depo_kapasite * 100 AS kapasite_2022,
      depo_kapasite_kullanim.doluluk2023 / mevcut_depo.depo_kapasite * 100 AS kapasite_2023,
      depo_kapasite_kullanim.doluluk2024 / mevcut_depo.depo_kapasite * 100 AS kapasite_2024
    FROM maliyet 
    JOIN mevcut_depo ON maliyet.depo_id = mevcut_depo.depo_id 
    JOIN iller ON mevcut_depo.il_id = iller.il_id 
    LEFT JOIN depo_kapasite_kullanim ON mevcut_depo.depo_id = depo_kapasite_kullanim.depo_id 
    WHERE iller.il_ad = ? AND mevcut_depo.depo_ad = ? 
    GROUP BY maliyet.maliyet_yil, mevcut_depo.depo_kapasite, 
             depo_kapasite_kullanim.doluluk2020,
             depo_kapasite_kullanim.doluluk2021,
             depo_kapasite_kullanim.doluluk2022,
             depo_kapasite_kullanim.doluluk2023,
             depo_kapasite_kullanim.doluluk2024`;
  db.query(query, [il, depo], (err, results) => {
    if (err) {
      console.error("Maliyet Dağılımı sorgusu başarısız:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json(results);
  });
});



// Her depo için toplam dağıtım maliyetleri API'si
router.get("/depolar/toplam-dagitim-maliyetleri", (req, res) => {
  const query = `
      SELECT 
          mevcut_depo.depo_ad AS depo,
          COALESCE(SUM(dagitim_lojistik.dagitim_maliyet_2020), 0) AS toplam_2020,
          COALESCE(SUM(dagitim_lojistik.dagitim_maliyet_2021), 0) AS toplam_2021,
          COALESCE(SUM(dagitim_lojistik.dagitim_maliyet_2022), 0) AS toplam_2022,
          COALESCE(SUM(dagitim_lojistik.dagitim_maliyet_2023), 0) AS toplam_2023,
          COALESCE(SUM(dagitim_lojistik.dagitim_maliyet_2024), 0) AS toplam_2024,
          COALESCE(SUM(dagitim_lojistik.dagitim_maliyet_2025_tahmin), 0) AS toplam_2025
      FROM dagitim_lojistik
      JOIN mevcut_depo ON dagitim_lojistik.depo_id = mevcut_depo.depo_id
      GROUP BY mevcut_depo.depo_ad
      ORDER BY mevcut_depo.depo_ad ASC;
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error("Dağıtım maliyetleri sorgusu başarısız:", err);
          return res.status(500).json({ error: "Database query failed" });
      }
      res.json(results);
  });
});



// Her ulaşım türü için yıllara göre dağıtım maliyetleri API'si
router.get("/depolar/ulasim-turu-dagitim-maliyetleri", (req, res) => {
  const query = `
      SELECT 
          ulasim_tur.ulasim_ad AS ulasim_turu,
          COALESCE(SUM(dagitim_lojistik.dagitim_maliyet_2020), 0) AS toplam_2020,
          COALESCE(SUM(dagitim_lojistik.dagitim_maliyet_2021), 0) AS toplam_2021,
          COALESCE(SUM(dagitim_lojistik.dagitim_maliyet_2022), 0) AS toplam_2022,
          COALESCE(SUM(dagitim_lojistik.dagitim_maliyet_2023), 0) AS toplam_2023,
          COALESCE(SUM(dagitim_lojistik.dagitim_maliyet_2024), 0) AS toplam_2024,
          COALESCE(SUM(dagitim_lojistik.dagitim_maliyet_2025_tahmin), 0) AS toplam_2025
      FROM dagitim_lojistik
      JOIN ulasim_tur ON dagitim_lojistik.ulasim_id = ulasim_tur.ulasim_id
      GROUP BY ulasim_tur.ulasim_ad
      ORDER BY ulasim_tur.ulasim_ad ASC;
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error("Ulaşım türü dağıtım maliyetleri sorgusu başarısız:", err);
          return res.status(500).json({ error: "Database query failed" });
      }
      res.json(results);
  });
});

router.get("/depolar/en-dusuk-ve-en-yuksek-dagitim-maliyetleri", (req, res) => {

  const query = `
  WITH yil_bazli_maliyet AS (
            SELECT 
                md.depo_ad AS depo_adi,
                '2020' AS yil,
                COALESCE(dl.dagitim_maliyet_2020, 0) AS toplam_maliyet
            FROM dagitim_lojistik dl
            JOIN mevcut_depo md ON dl.depo_id = md.depo_id
            UNION ALL
            SELECT 
                md.depo_ad AS depo_adi,
                '2021' AS yil,
                COALESCE(dl.dagitim_maliyet_2021, 0) AS toplam_maliyet
            FROM dagitim_lojistik dl
            JOIN mevcut_depo md ON dl.depo_id = md.depo_id
            UNION ALL
            SELECT 
                md.depo_ad AS depo_adi,
                '2022' AS yil,
                COALESCE(dl.dagitim_maliyet_2022, 0) AS toplam_maliyet
            FROM dagitim_lojistik dl
            JOIN mevcut_depo md ON dl.depo_id = md.depo_id
            UNION ALL
            SELECT 
                md.depo_ad AS depo_adi,
                '2023' AS yil,
                COALESCE(dl.dagitim_maliyet_2023, 0) AS toplam_maliyet
            FROM dagitim_lojistik dl
            JOIN mevcut_depo md ON dl.depo_id = md.depo_id
            UNION ALL
            SELECT 
                md.depo_ad AS depo_adi,
                '2024' AS yil,
                COALESCE(dl.dagitim_maliyet_2024, 0) AS toplam_maliyet
            FROM dagitim_lojistik dl
            JOIN mevcut_depo md ON dl.depo_id = md.depo_id
            UNION ALL
            SELECT 
                md.depo_ad AS depo_adi,
                '2025' AS yil,
                COALESCE(dl.dagitim_maliyet_2025_tahmin, 0) AS toplam_maliyet
            FROM dagitim_lojistik dl
            JOIN mevcut_depo md ON dl.depo_id = md.depo_id
        )
        SELECT 
            yil,
            depo_adi AS depo,
            'En Düşük' AS maliyet_turu,
            toplam_maliyet AS maliyet
        FROM yil_bazli_maliyet ybm1
        WHERE toplam_maliyet = (
            SELECT MIN(toplam_maliyet)
            FROM yil_bazli_maliyet ybm2
            WHERE ybm2.yil = ybm1.yil
        )
        UNION ALL
        SELECT 
            yil,
            depo_adi AS depo,
            'En Yüksek' AS maliyet_turu,
            toplam_maliyet AS maliyet
        FROM yil_bazli_maliyet ybm1
        WHERE toplam_maliyet = (
            SELECT MAX(toplam_maliyet)
            FROM yil_bazli_maliyet ybm2
            WHERE ybm2.yil = ybm1.yil
        )
        ORDER BY yil, maliyet_turu;


  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error("Sorgu hatası:", err);
          return res.status(500).json({ error: "Database query failed" });
      }
      res.json(results);
  });
});


router.get('/depolar/il-bazli-eczane-sayisi', (req, res) => {
  const query = `
    SELECT i.il_ad, COUNT(e.eczane_id) AS eczane_sayisi
    FROM iller i
    LEFT JOIN ilceler ilc ON i.il_id = ilc.il_id
    LEFT JOIN eczaneler e ON ilc.ilce_id = e.ilce_id
    GROUP BY i.il_ad
  `;
  db.query(query, (err, results) => {
      if (err) {
          console.error('Veritabanı sorgusu hatası:', err);
          return res.status(500).json({ error: 'Veritabanı hatası' });
      }
      res.json(results);
  });
});

// Her İlde Depoların İlişkili Olduğu Eczane Sayısı API'si
router.get("/depolar/il-ve-depo-iliskili-eczane-sayisi", (req, res) => {
  const { il } = req.query; // İl bilgisi query parametresinden alınır.

  const query = `
      SELECT 
          d.depo_ad AS depo_adi,
          COUNT(DISTINCT s.eczane_id) AS eczane_sayisi
      FROM mevcut_depo d
      JOIN iller i ON d.il_id = i.il_id
      LEFT JOIN satislar s ON d.depo_id = s.depo_id
      WHERE i.il_ad = ?
      GROUP BY d.depo_ad
      ORDER BY eczane_sayisi DESC;
  `;

  db.query(query, [il], (err, results) => {
      if (err) {
          console.error("Veritabanı sorgusu hatası:", err);
          return res.status(500).json({ error: "Veritabanı sorgusu başarısız." });
      }
      res.json(results); // Sonuçları JSON formatında döndür
  });
});



router.get('/depolar/il-bazli-eczane-nufus', (req, res) => {
  const query = `
      SELECT 
      iller.il_ad, 
      COUNT(eczaneler.eczane_id) AS eczane_sayisi, 
      COALESCE(SUM(nufus.y2023), 0) AS nufus_sayisi,
      iller.yuz_olcum AS yuzolcumu,
      (COALESCE(SUM(nufus.y2023), 0) / NULLIF(iller.yuz_olcum, 0)) AS nufus_yogunlugu
    FROM iller
    LEFT JOIN ilceler ON iller.il_id = ilceler.il_id
    LEFT JOIN eczaneler ON ilceler.ilce_id = eczaneler.ilce_id
    LEFT JOIN nufus ON ilceler.ilce_id = nufus.ilce_id
    GROUP BY iller.il_ad, iller.yuz_olcum
    ORDER BY nufus_yogunlugu DESC;

  `;  

  db.query(query, (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Veri çekme hatası' });
      }
      res.json(results);
  });
});



router.get("/depolar/depolarr", (req, res) => {
  const { il } = req.query; // İl bilgisi query parametresinden alınır.
  const query = `
      SELECT mevcut_depo.depo_ad
      FROM mevcut_depo
      JOIN iller ON mevcut_depo.il_id = iller.il_id
      WHERE iller.il_ad = ?
  `;
  db.query(query, [il], (err, results) => {
      if (err) {
          console.error("Depo sorgusu hatası:", err);
          return res.status(500).json({ error: "Depo sorgusu başarısız." });
      }
      res.json(results);
  });
});


router.get('/depolar/kategori-talep', (req, res) => {
  const query = `
      SELECT
        il.il_ad AS il_ad,
        d.depo_ad AS depo_ad,
        k.kategori_ad,
        SUM(mt.talep2020) AS talep_2020,
        SUM(mt.talep2021) AS talep_2021,
        SUM(mt.talep2022) AS talep_2022,
        SUM(mt.talep2023) AS talep_2023,
        SUM(mt.talep2024) AS talep_2024
      FROM
          musteri_talep_kategori mt
      JOIN
          kategoriler k ON mt.kategori_id = k.kategori_id
      JOIN
          eczaneler e ON mt.eczane_id = e.eczane_id
      JOIN
          ilceler ilc ON e.ilce_id = ilc.ilce_id
      JOIN
          iller il ON ilc.il_id = il.il_id
      JOIN
          mevcut_depo d ON il.il_id = d.il_id
      GROUP BY
          il.il_ad, d.depo_ad, k.kategori_ad
      ORDER BY
          il.il_ad, d.depo_ad, k.kategori_ad;


  `;  

  db.query(query, (err, results) => {
      if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Veri çekme hatası' });
      }
      res.json(results);
  });
});


router.get("/depolar/tercih-edilen-kategoriler", (req, res) => {
  const query = `
      SELECT 
          il.il_ad AS il,
          md.depo_ad AS depo,
          k.kategori_ad AS kategori,
          yil,
          yuzde
      FROM (
          SELECT 
              il.il_ad,
              md.depo_ad,
              k.kategori_ad,
              '2020' AS yil,
              ROUND(
                  (SUM(mt.talep2020) / (
                      SELECT SUM(mt2.talep2020)
                      FROM musteri_talep_kategori mt2
                      JOIN eczaneler e2 ON mt2.eczane_id = e2.eczane_id
                      JOIN ilceler ilc2 ON e2.ilce_id = ilc2.ilce_id
                      JOIN iller il2 ON ilc2.il_id = il2.il_id
                      WHERE il2.il_ad = il.il_ad
                  )) * 100, 2
              ) AS yuzde
          FROM musteri_talep_kategori mt
          JOIN eczaneler e ON mt.eczane_id = e.eczane_id
          JOIN ilceler ilc ON e.ilce_id = ilc.ilce_id
          JOIN iller il ON ilc.il_id = il.il_id
          JOIN kategoriler k ON mt.kategori_id = k.kategori_id
          JOIN mevcut_depo md ON il.il_id = md.il_id
          GROUP BY il.il_ad, md.depo_ad, k.kategori_ad, '2020'

          UNION ALL

          SELECT 
              il.il_ad,
              md.depo_ad,
              k.kategori_ad,
              '2021' AS yil,
              ROUND(
                  (SUM(mt.talep2021) / (
                      SELECT SUM(mt2.talep2021)
                      FROM musteri_talep_kategori mt2
                      JOIN eczaneler e2 ON mt2.eczane_id = e2.eczane_id
                      JOIN ilceler ilc2 ON e2.ilce_id = ilc2.ilce_id
                      JOIN iller il2 ON ilc2.il_id = il2.il_id
                      WHERE il2.il_ad = il.il_ad
                  )) * 100, 2
              ) AS yuzde
          FROM musteri_talep_kategori mt
          JOIN eczaneler e ON mt.eczane_id = e.eczane_id
          JOIN ilceler ilc ON e.ilce_id = ilc.ilce_id
          JOIN iller il ON ilc.il_id = il.il_id
          JOIN kategoriler k ON mt.kategori_id = k.kategori_id
          JOIN mevcut_depo md ON il.il_id = md.il_id
          GROUP BY il.il_ad, md.depo_ad, k.kategori_ad, '2021'

          UNION ALL

          SELECT 
              il.il_ad,
              md.depo_ad,
              k.kategori_ad,
              '2022' AS yil,
              ROUND(
                  (SUM(mt.talep2022) / (
                      SELECT SUM(mt2.talep2022)
                      FROM musteri_talep_kategori mt2
                      JOIN eczaneler e2 ON mt2.eczane_id = e2.eczane_id
                      JOIN ilceler ilc2 ON e2.ilce_id = ilc2.ilce_id
                      JOIN iller il2 ON ilc2.il_id = il2.il_id
                      WHERE il2.il_ad = il.il_ad
                  )) * 100, 2
              ) AS yuzde
          FROM musteri_talep_kategori mt
          JOIN eczaneler e ON mt.eczane_id = e.eczane_id
          JOIN ilceler ilc ON e.ilce_id = ilc.ilce_id
          JOIN iller il ON ilc.il_id = il.il_id
          JOIN kategoriler k ON mt.kategori_id = k.kategori_id
          JOIN mevcut_depo md ON il.il_id = md.il_id
          GROUP BY il.il_ad, md.depo_ad, k.kategori_ad, '2022'

          UNION ALL

          SELECT 
              il.il_ad,
              md.depo_ad,
              k.kategori_ad,
              '2023' AS yil,
              ROUND(
                  (SUM(mt.talep2023) / (
                      SELECT SUM(mt2.talep2023)
                      FROM musteri_talep_kategori mt2
                      JOIN eczaneler e2 ON mt2.eczane_id = e2.eczane_id
                      JOIN ilceler ilc2 ON e2.ilce_id = ilc2.ilce_id
                      JOIN iller il2 ON ilc2.il_id = il2.il_id
                      WHERE il2.il_ad = il.il_ad
                  )) * 100, 2
              ) AS yuzde
          FROM musteri_talep_kategori mt
          JOIN eczaneler e ON mt.eczane_id = e.eczane_id
          JOIN ilceler ilc ON e.ilce_id = ilc.ilce_id
          JOIN iller il ON ilc.il_id = il.il_id
          JOIN kategoriler k ON mt.kategori_id = k.kategori_id
          JOIN mevcut_depo md ON il.il_id = md.il_id
          GROUP BY il.il_ad, md.depo_ad, k.kategori_ad, '2023'

          UNION ALL

          SELECT 
              il.il_ad,
              md.depo_ad,
              k.kategori_ad,
              '2024' AS yil,
              ROUND(
                  (SUM(mt.talep2024) / (
                      SELECT SUM(mt2.talep2024)
                      FROM musteri_talep_kategori mt2
                      JOIN eczaneler e2 ON mt2.eczane_id = e2.eczane_id
                      JOIN ilceler ilc2 ON e2.ilce_id = ilc2.ilce_id
                      JOIN iller il2 ON ilc2.il_id = il2.il_id
                      WHERE il2.il_ad = il.il_ad
                  )) * 100, 2
              ) AS yuzde
          FROM musteri_talep_kategori mt
          JOIN eczaneler e ON mt.eczane_id = e.eczane_id
          JOIN ilceler ilc ON e.ilce_id = ilc.ilce_id
          JOIN iller il ON ilc.il_id = il.il_id
          JOIN kategoriler k ON mt.kategori_id = k.kategori_id
          JOIN mevcut_depo md ON il.il_id = md.il_id
          GROUP BY il.il_ad, md.depo_ad, k.kategori_ad, '2024'
      ) AS years_data
      ORDER BY il, depo, yil, yuzde DESC;
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error("Veritabanı hatası:", err);
          return res.status(500).json({ error: "Sorgu başarısız." });
      }

      if (results.length === 0) {
          return res.status(404).json({ error: "Veri bulunamadı." });
      }

      const groupedResults = {};
      results.forEach(row => {
          const key = `${row.il}-${row.depo}-${row.yil}`;
          if (!groupedResults[key]) {
              groupedResults[key] = { mostPreferred: row, leastPreferred: row };
          } else {
              groupedResults[key].leastPreferred = row;
          }
      });

      res.json(groupedResults);
  });
});



router.post('/depolar/depo_performans', (req, res) => {
  const { city1, depot1, city2, depot2, year } = req.body;

  const query = `
     SELECT
      mevcut_depo.depo_ad,
      ROUND(SUM(satislar.y2020_miktar) / NULLIF(SUM(musteri_talep_kategori.talep2020), 0) * 100, 2) AS karsilanma_orani_2020,
      ROUND(SUM(satislar.y2021_miktar) / NULLIF(SUM(musteri_talep_kategori.talep2021), 0) * 100, 2) AS karsilanma_orani_2021,
      ROUND(SUM(satislar.y2022_miktar) / NULLIF(SUM(musteri_talep_kategori.talep2022), 0) * 100, 2) AS karsilanma_orani_2022,
      ROUND(SUM(satislar.y2023_miktar) / NULLIF(SUM(musteri_talep_kategori.talep2023), 0) * 100, 2) AS karsilanma_orani_2023,
      ROUND(SUM(satislar.y2024_miktar) / NULLIF(SUM(musteri_talep_kategori.talep2024), 0) * 100, 2) AS karsilanma_orani_2024
    FROM mevcut_depo
    JOIN dagitim_lojistik ON mevcut_depo.depo_id = dagitim_lojistik.depo_id
    JOIN satislar ON dagitim_lojistik.eczane_id = satislar.eczane_id
    JOIN musteri_talep_kategori ON satislar.eczane_id = musteri_talep_kategori.eczane_id
    JOIN iller ON mevcut_depo.il_id = iller.il_id
    WHERE (iller.il_ad = ? AND mevcut_depo.depo_ad = ?)
       OR (iller.il_ad = ? AND mevcut_depo.depo_ad = ?)
    GROUP BY mevcut_depo.depo_ad
    ORDER BY mevcut_depo.depo_ad;
  `;

  db.query(query, [city1, depot1, city2, depot2], (err, results) => {
    if (err) {
      console.error('Veri çekilemedi!', err);
      return res.status(500).json({ error: 'Veri çekilemedi' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Veri bulunamadı' });
    }

    // Veriyi JSON formatında döndürmeden önce loglama
    console.log('Veri:', results);

    // Gelen veriyi JSON formatında hazırlıyoruz
    const responseData = results.map(row => ({
      depo_ad: row.depo_ad,
      karsilanma_orani_2020: row.karsilanma_orani_2020 || null,
      karsilanma_orani_2021: row.karsilanma_orani_2021 || null,
      karsilanma_orani_2022: row.karsilanma_orani_2022 || null,
      karsilanma_orani_2023: row.karsilanma_orani_2023 || null,
      karsilanma_orani_2024: row.karsilanma_orani_2024 || null
    }));

    res.json(responseData);  // JSON verisini döndürüyoruz
  });
});






   /*  router.get('/depolar/depo-kapasite-kullanim-tahmin', (req, res) => {
      const tahminYuzdesi = parseFloat(req.query.tahminYuzdesi) / 100 || 0.05; // Kullanıcıdan gelen talep tahmin yüzdesi (varsayılan %5)
  
      // Veritabanından depo kapasiteleri ve doluluk oranları verilerini alıyoruz
      const query = `
          SELECT mevcut_depo.depo_id, mevcut_depo.depo_ad,
                 depo_kapasite_kullanim.doluluk2019, 
                 depo_kapasite_kullanim.doluluk2020, 
                 depo_kapasite_kullanim.doluluk2021,
                 depo_kapasite_kullanim.doluluk2022,
                 depo_kapasite_kullanim.doluluk2023,
                 depo_kapasite_kullanim.kapasite2019,
                 depo_kapasite_kullanim.kapasite2020,
                 depo_kapasite_kullanim.kapasite2021,
                 depo_kapasite_kullanim.kapasite2022,
                 mevcut_depo.depo_kapasite AS kapasite2023
          FROM mevcut_depo 
          INNER JOIN depo_kapasite_kullanim ON mevcut_depo.depo_id = depo_kapasite_kullanim.depo_id;
      `;
  
      // Veritabanı sorgusunu çalıştır
      db.query(query, (err, results) => {
          if (err) {
              console.error('Sorgu hatası:', err.stack);
              return res.status(500).send('Veri alınırken bir hata oluştu');
          }
  
          // Sorgu sonuçlarını kontrol et
          if (results.length === 0) {
              return res.status(404).json({ message: "Depo kaydı bulunamadı." });
          }
  
          // 2024 yılı için tahmin edilen kapasite kullanım oranlarını hesaplıyoruz
          const depoTahminleri = results.map(depo => {
              const doluluk2019 = depo.doluluk2019 || 0;
              const doluluk2020 = depo.doluluk2020 || 0;
              const doluluk2021 = depo.doluluk2021 || 0;
              const doluluk2022 = depo.doluluk2022 || 0;
              const doluluk2023 = depo.doluluk2023 || 0;
  
              const kapasite2019 = depo.kapasite2019 || 0;
              const kapasite2020 = depo.kapasite2020 || 0;
              const kapasite2021 = depo.kapasite2021 || 0;
              const kapasite2022 = depo.kapasite2022 || 0;
              const kapasite2023 = depo.kapasite2023 || 0;
  
              // Her yıl için doluluk oranları hesaplanacak
              const dolulukOrani2019 = kapasite2019 > 0 ? (doluluk2019 / kapasite2019) * 100 : 0;
              const dolulukOrani2020 = kapasite2020 > 0 ? (doluluk2020 / kapasite2020) * 100 : 0;
              const dolulukOrani2021 = kapasite2021 > 0 ? (doluluk2021 / kapasite2021) * 100 : 0;
              const dolulukOrani2022 = kapasite2022 > 0 ? (doluluk2022 / kapasite2022) * 100 : 0;
              const dolulukOrani2023 = kapasite2023 > 0 ? (doluluk2023 / kapasite2023) * 100 : 0;
  
              // Ortalama doluluk oranını hesaplıyoruz
              const ortalamaDoluluk = (dolulukOrani2019 + dolulukOrani2020 + dolulukOrani2021 + dolulukOrani2022 + dolulukOrani2023) / 5;
  
              // 2024 yılı için tahmin yapıyoruz: geçmiş ortalama * (1 + tahmin yüzdesi)
                          // 2024 yılı için tahmin yapıyoruz: geçmiş ortalama * (1 + tahmin yüzdesi)
            const tahminEdilen2024DolulukOrani = ortalamaDoluluk * (1 + tahminYuzdesi);
            
            // 2024 yılı için tahmin edilen doluluk
            const tahminEdilen2024Doluluk = (tahminEdilen2024DolulukOrani / 100) * kapasite2023;

            // Sonuçları hazırlıyoruz
            return {
                depo_id: depo.depo_id,
                depo_ad: depo.depo_ad,
                kapasite_2023: kapasite2023,
                tahmin_edilen_2024_doluluk: tahminEdilen2024Doluluk,
                kapasite_kullanim_orani_2024: tahminEdilen2024DolulukOrani
            };
        });

        // Sonuçları döndürüyoruz
        console.log("Depo Tahminleri:", depoTahminleri); // Sonuçları konsola yazdır
        res.json({
            yil: 2024,
            depo_kapasite_kullanim_tahmin: depoTahminleri
        });
    });
});
 */

router.get('/depolar/talep-tahmin', (req, res) => {
  const { il, tahminOrani } = req.query;

  if (!il || isNaN(tahminOrani)) {
    return res.status(400).json({ error: "Geçerli bir il ve tahmin oranı giriniz." });
  }

  const talepArtisYuzdesi = parseFloat(tahminOrani) / 100;

  const query = `
    SELECT 
      md.depo_ad,
      md.depo_kapasite,
      dk.doluluk2024 AS mevcut_doluluk,
      (
        dk.doluluk2024 +
        (dk.doluluk2020 + dk.doluluk2021 + dk.doluluk2022 + dk.doluluk2023 + dk.doluluk2024) / 5 * ${talepArtisYuzdesi}
      ) AS tahmini_talep_2024,
      CASE 
        WHEN (
          dk.doluluk2024 +
          (dk.doluluk2020 + dk.doluluk2021 + dk.doluluk2022 + dk.doluluk2023 + dk.doluluk2024) / 5 * ${talepArtisYuzdesi}
        ) <= md.depo_kapasite THEN 'Karşılanabilir'
        ELSE 'Karşılanamaz'
      END AS durum
    FROM mevcut_depo md
    JOIN depo_kapasite_kullanim dk ON md.depo_id = dk.depo_id
    JOIN iller i ON md.il_id = i.il_id
    WHERE i.il_ad = ?;
  `;

  db.query(query, [il], (err, results) => {
    if (err) {
      console.error("Sorgu hatası:", err);
      return res.status(500).json({ error: "Veritabanı sorgusu başarısız." });
    }
    res.json(results);
  });
});



// Her ildeki her deponun yıllık doluluk oranlarını getiren route
router.get('/depolar/yillik-doluluk', (req, res) => {
  const query = `
      SELECT
          il.il_ad,
          d.depo_ad,
          d.depo_id,
          (k.doluluk2020 / k.kapasite2020) * 100 AS doluluk_orani_2020,
          (k.doluluk2021 / k.kapasite2021) * 100 AS doluluk_orani_2021,
          (k.doluluk2022 / k.kapasite2022) * 100 AS doluluk_orani_2022,
          (k.doluluk2023 / k.kapasite2023) * 100 AS doluluk_orani_2023,
          (k.doluluk2024 / d.depo_kapasite) * 100 AS doluluk_orani_2024
      FROM 
          mevcut_depo d
      JOIN 
          depo_kapasite_kullanim k ON d.depo_id = k.depo_id
      JOIN
          iller il ON d.il_id = il.il_id
      GROUP BY d.depo_id,il.il_id
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error('Sorgu hatası:', err);
          return res.status(500).json({ error: 'Veritabanı sorgusu başarısız.' });
      }
      res.json(results);
  });
});


/* 
router.get('/depolar/depo_kapasitee', (req, res) => {
  const query = `
      SELECT 
          mevcut_depo.depo_id,
          mevcut_depo.depo_ad,
          kapasite2019,
          kapasite2020,
          kapasite2021,
          kapasite2022,
          depo_kapasite AS kapasite2023,
          kapasite2024_tahmin
      FROM mevcut_depo 
      INNER JOIN depo_kapasite_kullanim 
      ON depo_kapasite_kullanim.depo_id = mevcut_depo.depo_id
  `;

  db.query(query, (err, results) => {
      if (err) {
          console.error("Database Query Error:", err);
          res.status(500).json({ message: 'Veri alınırken hata oluştu', error: err });
          return;
      }

      console.log("Query Results:", results); // Veritabanı sonucunu konsola yazdır
      res.json(results);
  });
});



 */


// Depo tahmin route'u
router.get('/depolar/kapasite-tahmin', (req, res) => {
  const il = req.query.il; // Query parametresinden "il" alınıyor
  const tahminOrani = parseFloat(req.query.tahminOrani) || 0; // Query parametresinden tahmin oranı alınıyor (varsayılan 0)

  // Eğer 'il' parametresi gönderilmemişse hata döndürülür
  if (!il) {
    return res.status(400).json({ error: 'İl parametresi eksik.' });
  }

  // SQL sorgusunun hazırlanması
  const query = `
    SELECT 
      i.il_ad,
      md.depo_ad,                    
      md.depo_kapasite,             
      COALESCE(dk.doluluk2024, 0) AS mevcut_doluluk, 
      (
        COALESCE(dk.doluluk2023, 0) + 
        (COALESCE(dk.doluluk2020, 0) + COALESCE(dk.doluluk2021, 0) + COALESCE(dk.doluluk2022, 0) + COALESCE(dk.doluluk2023, 0) + COALESCE(dk.doluluk2024, 0)) / 5 * ?
      ) AS tahmini_talep_2024,       
      CASE 
        WHEN (
          COALESCE(dk.doluluk2024, 0) + 
          (COALESCE(dk.doluluk2020, 0) + COALESCE(dk.doluluk2021, 0) + COALESCE(dk.doluluk2022, 0) + COALESCE(dk.doluluk2023, 0) + COALESCE(dk.doluluk2024, 0)) / 5 * ?
        ) <= md.depo_kapasite THEN 'Karşılanabilir'  
        ELSE 'Karşılanamaz'
      END AS durum
    FROM mevcut_depo md
    JOIN depo_kapasite_kullanim dk ON md.depo_id = dk.depo_id
    JOIN iller i ON md.il_id = i.il_id
    WHERE i.il_ad = ?;
  `;

  // Veritabanı sorgusunu çalıştırıyoruz
  db.query(query, [tahminOrani / 100, tahminOrani / 100, il], (err, results) => {
    if (err) {
      console.error('Veritabanı hatası:', err);
      return res.status(500).json({ error: 'Veritabanı hatası oluştu.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'İlgili ilde depo bulunamadı.' });
    }

    // Kapasite tahminine göre hesaplamalar yapılır
    const tahmin = results.map(depo => ({
      depo_ad: depo.depo_ad,
      depo_kapasite: depo.depo_kapasite,
      tahmin_doluluk_orani: depo.mevcut_doluluk * (1 + tahminOrani / 100),
      durum: depo.durum
    }));

    // Tahmin sonuçları JSON olarak döndürülür
    res.json({ tahmin });
  });
});
 
// Depo ve rakip depo verilerini çekme
router.get('/depolar/getBufferData', (req, res) => {
  const query = `
      SELECT m.depo_id, m.depo_ad, m.depo_enlem, m.depo_boylam, r.rakip_id, r.rakip_ad, r.rakip_enlem, r.rakip_boylam
      FROM mevcut_depo m
      LEFT JOIN rakip_depo r ON m.il_id = r.il_id;
  `;
  
  db.query(query, (err, results) => {
      if (err) {
          return res.status(500).json({ message: 'Veri çekme hatası', error: err });
      }
      res.json(results);
  });
});



router.post('/depolar/login', (req, res) => {
  const { email, password } = req.body;

  // E-posta ve şifre kontrolü
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'E-posta ve şifre gereklidir' });
  }

  // Veritabanında kullanıcıyı e-posta ile sorgula
  const query = 'SELECT * FROM admin WHERE eposta = ?';
  db.query(query, [email], (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Veritabanı hatası' });
    }

    if (result.length === 0) {
      return res.status(401).json({ success: false, message: 'Geçersiz e-posta veya şifre' });
    }

    const hashedPassword = result[0].sifre;


      // Başarılı giriş
      res.status(200).json({
        success: true,
        message: 'Giriş başarılı',
      });
    });
  });



// Depo Kapasite ve Personel Sayısı API
router.get('/depolar/depo-kapasite-personel', (req, res) => {
  const sql = `
  SELECT
  md.depo_id,
  md.depo_ad,
  p.yil,
  dk.kapasite2020,
  dk.kapasite2021,
  dk.kapasite2022,
  dk.kapasite2023,
  md.depo_kapasite,
  dk.kapasite2025_tahmin,
  COUNT(DISTINCT p.personel_id) AS personel_sayisi
FROM
  mevcut_depo md
LEFT JOIN personel p ON md.depo_id = p.depo_id AND p.yil BETWEEN 2020 AND 2025
LEFT JOIN depo_kapasite_kullanim dk ON md.depo_id = dk.depo_id
GROUP BY
  md.depo_id, p.yil
ORDER BY
  p.yil;

  `;
  
  db.query(sql, (err, result) => {
    if (err) {
      console.error('Error executing query:', err);
      return res.status(500).send('Internal Server Error');
    }

    // Veriyi döndür
    res.json(result);
  });
});



module.exports = router;