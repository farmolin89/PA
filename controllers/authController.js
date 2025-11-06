// ===================================================================
// Файл: controllers/authController.js (ФИНАЛЬНАЯ ВЕРСИЯ С ИСПРАВЛЕНИЕМ СЕССИИ)
// ===================================================================
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { knex } = require('../config/database');

const saltRounds = 10;
const port = process.env.PORT || 3000;

// --- РЕГИСТРАЦИЯ ---
exports.register = async (req, res, next) => {
    const { name, position, password } = req.body;
    try {
        const user = await knex('users').whereRaw('lower(name) = lower(?)', [name]).first();
        if (user) {
            return res.status(409).json({ errors: [{ message: 'Пользователь с таким ФИО уже существует.' }] });
        }
        
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await knex('users').insert({ name, position, password: hashedPassword });
        
        res.status(201).json({ message: 'Регистрация прошла успешно!' });
    } catch (error) {
        console.error("Ошибка при регистрации:", error);
        next(error);
    }
};

// --- ВХОД В СИСТЕМУ ---
exports.login = async (req, res, next) => {
    const { name, password } = req.body;
    try {
        const user = await knex('users').whereRaw('lower(name) = lower(?)', [name]).first();
        if (!user) {
            return res.status(401).json({ errors: [{ message: 'Неверное ФИО или пароль.' }] });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ errors: [{ message: 'Неверное ФИО или пароль.' }] });
        }
        
        req.session.user = { id: user.id, name: user.name, position: user.position };

        // ========================================================
        // +++ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ +++
        // Мы принудительно сохраняем сессию и отправляем ответ
        // только ПОСЛЕ того, как она гарантированно сохранится.
        // ========================================================
        req.session.save((err) => {
            if (err) {
                // Если произошла ошибка при сохранении сессии, передаем ее дальше
                console.error("Ошибка при сохранении сессии:", err);
                return next(err);
            }
            // Теперь сессия сохранена, и мы можем безопасно отправить ответ
            res.status(200).json({ message: `Добро пожаловать, ${user.name}!` });
        });

    } catch (error) {
        console.error("Ошибка при входе в систему:", error);
        next(error);
    }
};

// --- ЗАПРОС НА СБРОС ПАРОЛЯ ---
exports.forgotPassword = async (req, res, next) => {
    const { name } = req.body;
    try {
        const now = Date.now();
        await knex('users')
            .where('resetTokenExpiry', '<', now)
            .update({
                resetToken: null,
                resetTokenExpiry: null
            });

        const user = await knex('users').whereRaw('lower(name) = lower(?)', [name]).first();
        if (!user) {
            return res.status(404).json({ errors: [{ message: 'Пользователь с таким ФИО не найден.' }] });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = now + 3600000; // 1 час

        await knex('users').where({ id: user.id }).update({ resetToken, resetTokenExpiry });
        
        const baseUrl = process.env.APP_BASE_URL || `http://localhost:${port}`;
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
        
        res.status(200).json({ message: 'Ссылка для сброса пароля сгенерирована.', link: resetLink });
    } catch (error) {
        console.error("Ошибка при запросе сброса пароля:", error);
        next(error);
    }
};

// --- СБРОС ПАРОЛЯ ---
exports.resetPassword = async (req, res, next) => {
    const { token, password } = req.body;
    try {
        const user = await knex('users').where({ resetToken: token }).andWhere('resetTokenExpiry', '>', Date.now()).first();
        if (!user) {
            return res.status(400).json({ errors: [{ message: 'Токен недействителен или срок его действия истек.' }] });
        }
        
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await knex('users').where({ id: user.id }).update({
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null
        });

        res.status(200).json({ message: 'Пароль успешно обновлен!' });
    } catch (error) {
        console.error("Ошибка при сбросе пароля:", error);
        next(error);
    }
};

// --- ПОЛУЧЕНИЕ ДАННЫХ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ ---
exports.getCurrentUser = (req, res) => {
    if (req.session.user) {
        res.json(req.session.user);
    } else {
        res.status(401).json({ errors: [{ message: 'Пользователь не авторизован' }] });
    }
};

// --- ВЫХОД ИЗ СИСТЕМЫ ---
exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Ошибка при выходе из системы:", err);
            // Даже если есть ошибка, пытаемся перенаправить
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
};