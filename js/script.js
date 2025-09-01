// GANTI DENGAN URL WEB APP ANDA YANG SUDAH DI-DEPLOY!
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztLxlMQlywEW_-1TOkLBntRiXxdOgPsPGhc_Jf3DCla0WTcGW1zMbGjx0EXjbu0aHcmg/exec";

// Ambil semua elemen yang diperlukan dari DOM
const loginContainer = document.getElementById('login-container');
const registerContainer = document.getElementById('register-container');
const contentContainer = document.getElementById('content-container');
const mainWrapper = document.getElementById('main-wrapper');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');

const loginButton = document.getElementById('login-button');
const registerButton = document.getElementById('register-button');

// Event listener untuk link pindah form
document.getElementById('show-register').addEventListener('click', () => {
    loginContainer.classList.add('hidden');
    registerContainer.classList.remove('hidden');
});

document.getElementById('show-login').addEventListener('click', () => {
    registerContainer.classList.add('hidden');
    loginContainer.classList.remove('hidden');
});

// Event listener untuk form login
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginButton.disabled = true;
    loginMessage.textContent = 'Mencoba login...';

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'login', username, password }),
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            mainWrapper.innerHTML = `
                <div id="content-container">
                    <h1>${data.role === 'admin' ? 'Selamat Datang, Admin!' : 'Login Berhasil!'}</h1>
                    <p>${data.role === 'admin' ? 'Anda memiliki akses penuh.' : 'Selamat datang di halaman pengguna.'}</p>
                </div>
            `;
        } else {
            loginMessage.textContent = data.message;
            loginMessage.style.color = 'red';
        }
    })
    .catch(error => {
        loginMessage.textContent = 'Error: ' + error.message;
        loginMessage.style.color = 'red';
    })
    .finally(() => {
        loginButton.disabled = false;
    });
});

// Event listener untuk form registrasi
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    registerButton.disabled = true;
    registerMessage.textContent = 'Memproses pendaftaran...';

    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'register', username, password }),
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        registerMessage.textContent = data.message;
        if (data.status === 'success') {
            registerMessage.style.color = 'green';
            registerForm.reset();
        } else {
            registerMessage.style.color = 'red';
        }
    })
    .catch(error => {
        registerMessage.textContent = 'Error: ' + error.message;
        registerMessage.style.color = 'red';
    })
    .finally(() => {
        registerButton.disabled = false;
    });
});