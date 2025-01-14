const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const depoRoutes = require("./routes/depo");
const path = require("path");

const app = express();
const PORT = 3265;

app.use(express.static(path.join(__dirname, '../frontend/html')));
// giriş ekranı
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/html/login.html'));
});

app.get('/deneme.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/html/deneme.html'));
});

app.get('/satislar.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/html/satislar.html'));
});

app.get('/maliyetler.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/html/maliyetler.html'));
});


app.get('/eczane.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/html/eczane.html'));
});

app.get('/kapasite.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/html/kapasite.html'));
});

app.get('/rakip.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/html/rakip.html'));
});


app.use(bodyParser.json());
app.use(cors());

// Use the personel routes
app.use("/api", depoRoutes);


// Start the Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});