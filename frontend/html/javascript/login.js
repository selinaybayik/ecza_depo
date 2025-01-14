document.getElementById('login-form').addEventListener('submit', async function(event) {
    event.preventDefault(); // Formun otomatik gönderilmesini engelle

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    console.log("Email:", email);  // Debugging için email'i kontrol et
    console.log("Password:", password);  // Debugging için şifreyi kontrol et

    try {
        const response = await fetch('http://localhost:3265/api/depolar/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email,
                password: password,
            }),
        });

        const data = await response.json();
        
        if (data.success) {
            // Başarılı giriş sonrası yönlendirme
            window.location.href = "deneme.html";  // Burada deneme.html sayfasına yönlendirme yapılır
        } else {
            alert(data.message); // Eğer giriş başarısızsa hata mesajını göster
        }
    } catch (error) {
        alert('Bir hata oluştu.');
    }
});
