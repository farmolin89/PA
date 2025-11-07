// ===================================================================
// File: public/js/dashboard/userData.js (ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================

function getInitials(fullName) {
    if (!fullName || typeof fullName !== 'string') return '--';
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (parts.length === 1 && parts[0].length > 0) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    return '--';
}

export async function fetchUserData() {
    try {
        // Используем корректный URL и ОБЯЗАТЕЛЬНО credentials: 'include'
        const response = await fetch('/api/current-user', {
            credentials: 'include'
        });
        
        if (!response.ok) {
            // Если сессия невалидна, перенаправляем на страницу входа
            window.location.href = '/';
            return;
        }
        
        const user = await response.json();

        // Безопасно обновляем элементы, проверяя их наличие
        const userNameEl = document.querySelector('.user-name');
        const userRoleEl = document.querySelector('.user-role');
        const userAvatarEl = document.querySelector('.user-avatar');

        if (userNameEl) userNameEl.textContent = user.name;
        if (userRoleEl) userRoleEl.textContent = user.position;
        if (userAvatarEl) userAvatarEl.textContent = getInitials(user.name);

    } catch (error) {
        console.error('Ошибка при загрузке данных пользователя:', error);
        // При любой ошибке (включая сетевую) перенаправляем на вход
        window.location.href = '/';
    }
}