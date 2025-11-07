// ===================================================================
// File: public/js/trips/stats/statsRenderer.js (ИТОГОВАЯ ВЕРСИЯ С ИСПРАВЛЕННЫМ ФИЛЬТРОМ ГОДОВ)
// ===================================================================
import { renderMonthlyChart, renderTransportChart } from './chartRenderer.js';
import { utils } from '../trip-helpers.js';

function getMedal(position) {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return '';
}

// --- ФУНКЦИЯ СОЗДАНИЯ РАЗМЕТКИ ---

export function createStatsLayout() {
    const statsModalBody = document.getElementById('stats-modal-body');

    statsModalBody.innerHTML = `
        <div class="filters">
            <div class="filter-group">
                <label for="yearFilter">Год:</label>
                <select id="yearFilter"></select>
            </div>
        </div>
        <div class="section">
            <h3 class="section-title"><i class="fas fa-chart-bar"></i> Общие показатели</h3>
            <div class="summary-cards">
                <div class="summary-card" id="totalTripsCard"><i class="fas fa-suitcase"></i><div class="value" id="totalTrips">...</div><div class="label">Всего командировок</div></div>
                <div class="summary-card" id="totalCitiesCard"><i class="fas fa-map-marker-alt"></i><div class="value" id="totalCities">...</div><div class="label">Посещено городов</div></div>
                <div class="summary-card"><i class="fas fa-users"></i><div class="value" id="totalEmployees">...</div><div class="label">Сотрудников в поездках</div></div>
                <div class="summary-card"><i class="fas fa-clock"></i><div class="value" id="avgDuration">...</div><div class="label">Средняя длит. (дней)</div></div>
            </div>
        </div>
        <div class="section">
            <h3 class="section-title"><i class="fas fa-trophy"></i> Рейтинг сотрудников (ТОП-10 по дням)</h3>
            <div class="card" id="compactRankingContainer"><div style="text-align: center; padding: 20px;">Загрузка...</div></div>
        </div>
        
        <div class="section">
            <h3 class="section-title"><i class="fas fa-plane-departure"></i> Статистика транспорта</h3>
            <div class="transport-cards">
                <div class="transport-card plane"><i class="fas fa-plane"></i><div class="value" id="planeCount">...</div><div class="label">Полетов</div></div>
                <div class="transport-card train"><i class="fas fa-train"></i><div class="value" id="trainCount">...</div><div class="label">Поездок на поезде</div></div>
                <div class="transport-card car"><i class="fas fa-car"></i><div class="value" id="carCount">...</div><div class="label">Поездок на авто</div></div>
            </div>
            <div class="card chart-card"><canvas id="transportChart"></canvas></div>
        </div>
        <div class="section">
            <h3 class="section-title"><i class="fas fa-chart-line"></i> Динамика по месяцам</h3>
            <div class="card chart-card"><canvas id="monthlyChart"></canvas></div>
        </div>

        <div class="section records-section">
            <h3 class="section-title"><i class="fas fa-award"></i> Рекорды командировок</h3>
            <div class="records-grid-new">
                <div class="record-card-new highlight" id="record-most-trips">
                     <div class="record-title-new"><span class="dot"></span>Самый частый путешественник</div>
                    <div class="record-value">...</div>
                    <div class="record-description">Лидер по количеству рабочих перемещений</div>
                    <div class="record-footer"></div>
                </div>
                <div class="record-card-new" id="record-longest-trip">
                    <div class="record-title-new"><span class="dot"></span>Самая длинная командировка</div>
                    <div class="record-value">...</div>
                    <div class="record-description">Рабочий марафон с максимальной продолжительностью</div>
                    <div class="record-footer"></div>
                </div>
                <div class="record-card-new" id="record-shortest-trip">
                    <div class="record-title-new"><span class="dot"></span>Самая короткая командировка</div>
                    <div class="record-value">...</div>
                    <div class="record-description">Сверхбыстрая миссия</div>
                    <div class="record-footer"></div>
                </div>
                <div class="record-card-new" id="record-most-cities">
                    <div class="record-title-new"><span class="dot"></span>Главный "географ"</div>
                    <div class="record-value">...</div>
                    <div class="record-description">Наибольшее разнообразие рабочих локаций</div>
                    <div class="record-footer"></div>
                </div>
                <div class="record-card-new" id="record-monthly-sprinter">
                    <div class="record-title-new"><span class="dot"></span>"Месячный спринтер"</div>
                    <div class="record-value">...</div>
                    <div class="record-description">Рекордная плотность рабочих выездов</div>
                    <div class="record-footer"></div>
                </div>
                <div class="record-card-new" id="record-key-partner">
                    <div class="record-title-new"><span class="dot"></span>"Ключевой партнер"</div>
                    <div class="record-value">...</div>
                    <div class="record-description">Работа с важнейшими контрагентами компании</div>
                    <div class="record-footer"></div>
                </div>
                <div class="record-card-new" id="record-air-ace">
                    <div class="record-title-new"><span class="dot"></span>"Воздушный ас"</div>
                    <div class="record-value">...</div>
                     <div class="record-description">Активное использование воздушного транспорта</div>
                    <div class="record-footer"></div>
                </div>
                 <div class="record-card-new" id="record-railroader">
                    <div class="record-title-new"><span class="dot"></span>"Железнодорожник"</div>
                    <div class="record-value">...</div>
                    <div class="record-description">Активность на железной магистрали</div>
                    <div class="record-footer"></div>
                </div>
                <div class="record-card-new" id="record-road-warrior">
                    <div class="record-title-new"><span class="dot"></span>"Дорожный воин"</div>
                    <div class="record-value">...</div>
                    <div class="record-description">Наземная мобильность</div>
                    <div class="record-footer"></div>
                </div>
            </div>
        </div>
    `;

    const yearFilter = document.getElementById('yearFilter');
    const currentYear = new Date().getFullYear();
    yearFilter.innerHTML = '';
    for (let i = currentYear + 1; i >= currentYear; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        if (i === currentYear) {
            option.selected = true;
        }
        yearFilter.appendChild(option);
    }
}

// --- ФУНКЦИЯ ОБНОВЛЕНИЯ ДАННЫХ ---

export function updateStatsData(data) {
    // Обновление карточек-сводок
    document.getElementById('totalTrips').textContent = data.summary.totalTrips;
    document.getElementById('totalCities').textContent = data.summary.totalCities;
    document.getElementById('totalEmployees').textContent = data.summary.totalEmployees;
    document.getElementById('avgDuration').textContent = data.summary.avgDuration;

    // Обновление рейтинга
    const rankingContainer = document.getElementById('compactRankingContainer');
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

    if (data.ranking.length > 0) {
        const rankingListHTML = data.ranking.map(emp => `
            <div class="compact-ranking-item top-${emp.position} js-rank-item" data-employee-id="${emp.id}" style="cursor: pointer;">
                <div class="compact-position">${getMedal(emp.position)} ${emp.position}</div>
                <div class="compact-name">${emp.name}</div>
                <div class="compact-stat"><div class="compact-stat-value">${emp.totalDays}</div><div class="compact-stat-label">дней</div></div>
                <div class="compact-stat"><div class="compact-stat-value">${emp.totalCities}</div><div class="compact-stat-label">городов</div></div>
                <div class="compact-stat"><div class="compact-stat-value">${emp.totalTrips}</div><div class="compact-stat-label">поездок</div></div>
            </div>
        `).join('');

        const topEmployee = data.ranking[0];
        const daysText = utils.getPluralizedUnit(topEmployee.totalDays, 'день', 'дня', 'дней');
        const summaryHTML = `
            <div class="ranking-summary">
                👑 Самый "полевой" сотрудник — <span class="highlight-name">${topEmployee.name}</span>, провёл ${topEmployee.totalDays} ${daysText} в командировках!
            </div>
        `;
        
        rankingContainer.innerHTML = rankingListHTML + summaryHTML;

    } else {
        rankingContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-light);">Нет данных для построения рейтинга.</div>';
    }

    // Обновление транспорта
    document.getElementById('planeCount').textContent = data.transport.plane;
    document.getElementById('trainCount').textContent = data.transport.train;
    document.getElementById('carCount').textContent = data.transport.car;

    renderMonthlyChart(data.monthly);
    renderTransportChart(data.transport);
    
    // Обновление рекордов
    const records = data.records || {};

    const updateRecordCard = (id, recordData, valueFormatter, footerFormatter) => {
        const card = document.getElementById(id);
        if (!card) return;
        const valueEl = card.querySelector('.record-value');
        const footerEl = card.querySelector('.record-footer');

        if (recordData && recordData.winners && recordData.winners.length > 0) {
            valueEl.innerHTML = valueFormatter(recordData);
            footerEl.innerHTML = footerFormatter(recordData);
        } else {
            valueEl.innerHTML = '—';
            footerEl.innerHTML = `<i class="fas fa-info-circle"></i> Данные отсутствуют`;
        }
    };

    const simpleFooterFormatter = (record, icon, label) => {
        if (record.winners.length === 1) {
            return `<span class="record-footer-item"><i class="fas ${icon}"></i> ${label}: ${record.winners[0].employeeName}</span>`;
        }
        const winnerNames = record.winners.map(w => w.employeeName).join(', ');
        return `<span class="record-footer-item"><i class="fas fa-users"></i> ${label}и: ${winnerNames}</span>`;
    };

    updateRecordCard('record-longest-trip', records.longestTrip, 
        r => `${Math.round(r.value)} ${utils.getPluralizedUnit(r.value, 'день', 'дня', 'дней')}`, 
        r => r.winners.map(w => `<span class="record-footer-item"><i class="fas fa-user"></i> ${w.employeeName}</span> <span class="record-footer-separator">&bull;</span> <span class="record-footer-item">${w.destination}</span>`).join('<br>')
    );
    updateRecordCard('record-shortest-trip', records.shortestTrip, 
        r => `${Math.round(r.value)} ${utils.getPluralizedUnit(r.value, 'день', 'дня', 'дней')}`, 
        r => r.winners.map(w => `<span class="record-footer-item"><i class="fas fa-user"></i> ${w.employeeName}</span> <span class="record-footer-separator">&bull;</span> <span class="record-footer-item">${w.destination}</span>`).join('<br>')
    );
    updateRecordCard('record-most-trips', records.mostTrips, 
        r => `${r.value} ${utils.getPluralizedUnit(r.value, 'командировка', 'командировки', 'командировок')}`, 
        r => simpleFooterFormatter(r, 'fa-user', 'Лидер')
    );
    updateRecordCard('record-most-cities', records.mostCities, 
        r => `${r.value} ${utils.getPluralizedUnit(r.value, 'город', 'города', 'городов')}`, 
        r => simpleFooterFormatter(r, 'fa-user', 'Лидер')
    );
    updateRecordCard('record-monthly-sprinter', records.monthlySprinter, 
        r => `${r.value} ${utils.getPluralizedUnit(r.value, 'поездки', 'поездки', 'поездок')}`, 
        r => r.winners.map(w => `<span class="record-footer-item"><i class="fas fa-user"></i> ${w.employeeName}</span> <span class="record-footer-separator">&bull;</span> <span class="record-footer-item"><i class="fas fa-calendar-alt"></i> ${months[parseInt(w.month, 10) - 1]}</span>`).join('<br>')
    );
    updateRecordCard('record-key-partner', records.keyPartner, 
        r => `${r.value} ${utils.getPluralizedUnit(r.value, 'поездок', 'поездки', 'поездок')}`, 
        r => r.winners.map(w => `<span class="record-footer-item"><i class="fas fa-user"></i> ${w.employeeName}</span> <span class="record-footer-separator">&bull;</span> <span class="record-footer-item"><i class="fas fa-building"></i> ${w.organizationName}</span>`).join('<br>')
    );
    updateRecordCard('record-air-ace', records.transportChampions.plane, 
        r => `${r.value} ${utils.getPluralizedUnit(r.value, 'полет', 'полета', 'полетов')}`, 
        r => simpleFooterFormatter(r, 'fa-user', 'Лидер')
    );
    updateRecordCard('record-railroader', records.transportChampions.train, 
        r => `${r.value} ${utils.getPluralizedUnit(r.value, 'поездка', 'поездки', 'поездок')}`, 
        r => simpleFooterFormatter(r, 'fa-user', 'Лидер')
    );
    updateRecordCard('record-road-warrior', records.transportChampions.car, 
        r => `${r.value} ${utils.getPluralizedUnit(r.value, 'поездки', 'поездки', 'поездок')} на авто`, 
        r => simpleFooterFormatter(r, 'fa-user', 'Лидер')
    );
}