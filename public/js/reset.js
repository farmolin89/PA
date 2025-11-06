// ===================================================================
// Файл: public/js/reset.js (ПОЛНАЯ ИТОГОВАЯ ВЕРСИЯ БЕЗ КАСТОМНЫХ БЛОКОВ)
// ===================================================================

document.addEventListener('DOMContentLoaded', function() {
    // --- ЭЛЕМЕНТЫ DOM ---
    const resetForm = document.getElementById('reset-form');
    
    // --- ПОЛУЧЕНИЕ ТОКЕНА ИЗ URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    // --- ПРОВЕРКА ТОКЕНА ПРИ ЗАГРУЗКЕ ---
    if (!token) {
        toast.error('Отсутствует токен сброса пароля. Пожалуйста, запросите новую ссылку.');
        if (resetForm) {
            resetForm.style.display = 'none';
        }
        return;
    }

    // --- ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ ВИДИМОСТИ ПАРОЛЯ ---
    function setupPasswordToggle(buttonId, inputId) {
        const toggleButton = document.getElementById(buttonId);
        if (!toggleButton) return;
        const passwordInput = document.getElementById(inputId);
        const toggleIcon = toggleButton.querySelector('svg');
        
        toggleButton.addEventListener('click', function() {
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleIcon.innerHTML = `<path d="M10 4C4 4 1 10 1 10C1 10 4 16 10 16C16 16 19 10 19 10C19 10 16 4 10 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 1L19 19" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M13.5 13.5C12.5 14.5 11 15 10 15C7 15 5 12 5 10C5 9 5.5 7.5 6.5 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
            } else {
                passwordInput.type = 'password';
                toggleIcon.innerHTML = `<path d="M10 4C4 4 1 10 1 10C1 10 4 16 10 16C16 16 19 10 19 10C19 10 16 4 10 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 13C11.6569 13 13 11.6569 13 10C13 8.34315 11.6569 7 10 7C8.34315 7 7 8.34315 7 10C7 11.6569 8.34315 13 10 13Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
            }
        });
    }

    // --- ФУНКЦИЯ ОЧИСТКИ ПОЛЕЙ ПАРОЛЯ ---
    function clearPasswordFields() {
        const passwordInput = document.getElementById('reset-password');
        const confirmPasswordInput = document.getElementById('reset-confirm-password');
        
        if (passwordInput) passwordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
        
        // Возвращаем поля к типу password для безопасности
        passwordInput.type = 'password';
        confirmPasswordInput.type = 'password';
        
        // Сбрасываем иконки переключателей
        const toggleIcons = document.querySelectorAll('.toggle-password svg');
        toggleIcons.forEach(icon => {
            icon.innerHTML = `<path d="M10 4C4 4 1 10 1 10C1 10 4 16 10 16C16 16 19 10 19 10C19 10 16 4 10 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 13C11.6569 13 13 11.6569 13 10C13 8.34315 11.6569 7 10 7C8.34315 7 7 8.34315 7 10C7 11.6569 8.34315 13 10 13Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
        });
    }

    // --- НАСТРОЙКА ПЕРЕКЛЮЧАТЕЛЕЙ ПАРОЛЯ ---
    setupPasswordToggle('reset-toggle-password', 'reset-password');
    setupPasswordToggle('reset-confirm-toggle-password', 'reset-confirm-password');

    // --- ОБРАБОТКА ОТПРАВКИ ФОРМЫ ---
    if (resetForm) {
        resetForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const password = document.getElementById('reset-password').value;
            const confirmPassword = document.getElementById('reset-confirm-password').value;
            const submitBtn = this.querySelector('.submit-btn');

            // Клиентская валидация ТОЛЬКО через toast
            if (!password || !confirmPassword) {
                toast.error('Оба поля пароля обязательны для заполнения.');
                return;
            }
            if (password.length < 6) {
                toast.error('Пароль должен содержать не менее 6 символов.');
                return;
            }
            if (password !== confirmPassword) {
                toast.error('Пароли не совпадают.');
                return;
            }

            submitBtn.textContent = 'Сброс...';
            submitBtn.disabled = true;

            try {
                const response = await fetch('/api/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token, password })
                });

                const data = await response.json();
                
                if (!response.ok) {
                    throw data;
                }

                // --- УСПЕШНЫЙ СБРОС: УЛУЧШЕННЫЙ UX ---
                toast.success(data.message + " Перенаправление на страницу входа...");
                
                // Скрываем форму
                resetForm.style.display = 'none';
                
                // Очищаем поля (для безопасности, хотя форма скрыта)
                clearPasswordFields();
                
                // Перенаправление через 3 секунды
                setTimeout(() => {
                    window.location.href = '/';
                }, 3000);

            } catch (error) {
                // --- ОБРАБОТКА ОШИБКИ: УЛУЧШЕННЫЙ UX ---
                let errorMessage = 'Произошла неизвестная ошибка.';
                
                // Обработка сетевых ошибок
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    errorMessage = 'Ошибка сети. Проверьте подключение к интернету.';
                }
                // Ошибки от сервера
                else if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
                    errorMessage = error.errors[0].message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                toast.error(errorMessage);
                
                // ОЧИСТКА ПОЛЕЙ ПРИ ОШИБКЕ ДЛЯ БЕЗОПАСНОСТИ
                clearPasswordFields();
                
            } finally {
                submitBtn.textContent = 'Сбросить пароль';
                submitBtn.disabled = false;
            }
        });
    }
});