// ===================================================================
// Файл: public/js/script.js (ИСПРАВЛЕННАЯ ВЕРСИЯ БЕЗ КОНФЛИКТОВ)
// ===================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- Элементы DOM ---
    const loginTab = document.getElementById('login-tab');
    const registerTab = document.getElementById('register-tab');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const showForgotPasswordLink = document.getElementById('show-forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login-link');
    
    const loginFormData = document.getElementById('login-form-data');
    const registerFormData = document.getElementById('register-form-data');
    const forgotFormData = document.getElementById('forgot-form-data');

    // --- ФУНКЦИЯ СКРЫТИЯ ВСЕХ КАСТОМНЫХ СООБЩЕНИЙ ---
    function hideAllCustomMessages() {
        // Скрываем ВСЕ кастомные сообщения на странице
        document.querySelectorAll('.error-message, .success-message').forEach(msg => {
            msg.style.display = 'none';
        });
    }

    /**
     * Отображает указанную форму и скрывает остальные.
     */
    function showForm(formId) {
        // Сначала скрываем все кастомные сообщения
        hideAllCustomMessages();
        
        // Скрываем все формы
        loginForm.classList.remove('active');
        registerForm.classList.remove('active');
        forgotPasswordForm.classList.remove('active');

        // Сбрасываем активные табы
        loginTab.classList.remove('active');
        registerTab.classList.remove('active');

        if (formId === 'login') {
            loginForm.classList.add('active');
            loginTab.classList.add('active');
        } else if (formId === 'register') {
            registerForm.classList.add('active');
            registerTab.classList.add('active');
        } else if (formId === 'forgot') {
            forgotPasswordForm.classList.add('active');
        }
    }

    /**
     * Переключает видимость пароля в поле ввода.
     */
    function togglePasswordVisibility(input) {
        if (input.type === 'password') {
            input.type = 'text';
        } else {
            input.type = 'password';
        }
    }

    /**
     * ИСПРАВЛЕННАЯ: Обрабатывает ошибки от сервера ТОЛЬКО через toast
     */
    async function handleApiError(response) {
        const errorData = await response.json();
        
        // ВСЕГДА используем toast, игнорируем кастомные блоки
        if (errorData.errors && Array.isArray(errorData.errors)) {
            // Показываем только первую ошибку через toast
            toast.error(errorData.errors[0].message);
        } else if (errorData.message) {
            toast.error(errorData.message);
        } else {
            toast.error('Произошла неизвестная ошибка.');
        }
    }

    // --- ОБРАБОТЧИКИ СОБЫТИЙ ---

    // При переключении форм скрываем все сообщения
    loginTab.addEventListener('click', () => {
        hideAllCustomMessages();
        showForm('login');
    });
    registerTab.addEventListener('click', () => {
        hideAllCustomMessages();
        showForm('register');
    });
    
    showForgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllCustomMessages();
        showForm('forgot');
    });
    
    backToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        hideAllCustomMessages();
        showForm('login');
    });

    // Обработчики переключения видимости пароля
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', () => {
            const passwordInput = button.previousElementSibling;
            togglePasswordVisibility(passwordInput);
        });
    });

    // --- ОБРАБОТЧИКИ ФОРМ (ИСПРАВЛЕННЫЕ) ---

    // Обработчик формы входа
    if (loginFormData) {
        loginFormData.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Скрываем кастомные сообщения перед отправкой
            hideAllCustomMessages();
            
            const name = document.getElementById('login-name').value;
            const password = document.getElementById('login-password').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, password })
                });

                if (!response.ok) {
                    await handleApiError(response);
                    return;
                }
                
                const result = await response.json();
                toast.success(result.message);
                
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);

            } catch (err) {
                console.error('Ошибка сети при входе:', err);
                toast.error('Ошибка сети. Попробуйте позже.');
            }
        });
    }

    // Обработчик формы регистрации
    if (registerFormData) {
        registerFormData.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Скрываем кастомные сообщения перед отправкой
            hideAllCustomMessages();
            
            const name = document.getElementById('register-name').value;
            const position = document.getElementById('register-position').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm-password').value;

            // Валидация ТОЛЬКО через toast
            if (password !== confirmPassword) {
                toast.error('Пароли не совпадают.');
                return;
            }
            
            if (password.length < 6) {
                toast.error('Пароль должен содержать не менее 6 символов.');
                return;
            }

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, position, password })
                });
                
                if (!response.ok) {
                    await handleApiError(response);
                    return;
                }
                
                const result = await response.json();
                toast.success(result.message);
                registerFormData.reset();
                
                // Переключаем на форму входа через 2 секунды
                setTimeout(() => {
                    showForm('login');
                }, 2000);

            } catch (err) {
                console.error('Ошибка сети при регистрации:', err);
                toast.error('Ошибка сети. Попробуйте позже.');
            }
        });
    }

    // Обработчик формы восстановления пароля
    if (forgotFormData) {
        forgotFormData.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Скрываем кастомные сообщения перед отправкой
            hideAllCustomMessages();
            
            const name = document.getElementById('forgot-name').value;

            try {
                const response = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });

                if (!response.ok) {
                    await handleApiError(response);
                    return;
                }
                
                const result = await response.json();
                console.info('Ссылка для сброса (для демонстрации):', result.link);
                
                // ИСПРАВЛЕНО: Показываем ссылку в toast, а не в кастомном блоке
                toast.success(`Инструкции отправлены. Ссылка: ${result.link}`, { duration: 10000 });
                forgotFormData.reset();

            } catch (err) {
                console.error('Ошибка сети при восстановлении пароля:', err);
                toast.error('Ошибка сети. Попробуйте позже.');
            }
        });
    }
});