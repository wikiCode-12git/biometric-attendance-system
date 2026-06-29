document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('js-loginForm');
  const statusText = document.getElementById('js-loginStatus');
  const usernameInput = document.getElementById('js-username');
  const passwordInput = document.getElementById('js-password');
  const togglePasswordBtn = document.getElementById('js-togglePassword');

  // Password visibility toggle
  togglePasswordBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      togglePasswordBtn.textContent = '🙈';
    } else {
      passwordInput.type = 'password';
      togglePasswordBtn.textContent = '👁️';
    }
  });

  const setStatus = (text, type = 'info') => {
    statusText.innerText = text;
    statusText.classList.remove('hidden', 'info', 'success', 'error');
    statusText.classList.add(type);
  };

  const clearStatus = () => {
    statusText.classList.add('hidden');
    statusText.innerText = '';
  };

  // Clear status when user starts typing
  usernameInput.addEventListener('input', clearStatus);
  passwordInput.addEventListener('input', clearStatus);

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      setStatus('Username and password are required.', 'error');
      return;
    }

    try {
      const response = await fetch('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const message = await response.text();
        setStatus(`Login failed: ${message}`, 'error');
        return;
      }

      setStatus('Login successful. Redirecting to dashboard...', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 500);
    } catch (err) {
      console.error('Login error:', err);
      setStatus('Login failed. Check console for details.', 'error');
    }
  });
});
