// ===================================================================
// File: public/js/dashboard/tripCard.js (НОВЫЙ ФАЙЛ: Логика карточки командировок)
// ===================================================================

function getTripStatus(trip) {
    const now = new Date();
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    now.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (now >= startDate && now <= endDate) {
        return 'active';
    } else if (startDate > now) {
        return 'upcoming';
    } else {
        return 'completed';
    }
}

function updateTripCard(trips, employees, organizations) {
    let activeCount = 0;
    let upcomingCount = 0;
    let completedCount = 0; 

    trips.forEach(trip => {
        const status = getTripStatus(trip);
        if (status === 'active') { activeCount++; } 
        else if (status === 'upcoming') { upcomingCount++; } 
        else { completedCount++; }
    });

    const tripStatsContainer = document.querySelector('.trip-stats');
    if (tripStatsContainer) {
        tripStatsContainer.innerHTML = `
            <div class="trip-stat"><div class="trip-stat-value">${activeCount}</div><div class="trip-stat-label">Активные</div></div>
            <div class="trip-stat"><div class="trip-stat-value">${upcomingCount}</div><div class="trip-stat-label">Запланированы</div></div>
            <div class="trip-stat"><div class="trip-stat-value">${completedCount}</div><div class="trip-stat-label">Завершены</div></div>
        `;
    }

    const totalTrips = activeCount + upcomingCount + completedCount;
    const fillPercentage = totalTrips > 0 ? ((activeCount + upcomingCount) / totalTrips) * 100 : 0;
    
    const progressBarFill = document.querySelector('.business-trip .progress-fill');
    const progressValue = document.querySelector('.business-trip .progress-value');
    const progressLabel = document.querySelector('.business-trip .progress-label');

    if (progressBarFill && progressValue && progressLabel) {
        progressLabel.textContent = 'Актуальные задачи'; 
        const displayPercentage = Math.min(100, fillPercentage).toFixed(0);
        progressBarFill.style.width = `${displayPercentage}%`;
        progressValue.textContent = `${displayPercentage}%`;
    }
    
    const upcomingTripsContainer = document.querySelector('.upcoming-trips');
    if (upcomingTripsContainer) {
        const employeeMap = new Map(employees.map(emp => [emp.id, emp]));
        const orgMap = new Map(organizations.map(org => [org.id, org]));

        const upcomingParticipants = [];
        trips.forEach(trip => {
            if (getTripStatus(trip) === 'upcoming') {
                trip.participants.forEach(employeeId => {
                    upcomingParticipants.push({ trip, employeeId });
                });
            }
        });

        const upcomingTripsToDisplay = upcomingParticipants
            .sort((a, b) => new Date(a.trip.startDate) - new Date(b.trip.startDate))
            .slice(0, 3);

        if (upcomingTripsToDisplay.length > 0) {
             upcomingTripsContainer.innerHTML = `
                <h3 style="font-size: 14px; margin-bottom: 15px; color: var(--text);">Ближайшие командировки</h3>
                ${upcomingTripsToDisplay.map(({ trip, employeeId }) => {
                    const employee = employeeMap.get(employeeId);
                    const organization = orgMap.get(trip.organizationId);
                    if (!employee) return '';

                    const initials = `${employee.lastName[0] || ''}${employee.firstName[0] || ''}`.toUpperCase();
                    const shortName = `${employee.lastName} ${employee.firstName[0]}.`;
                    const destinationText = organization ? `${trip.destination}, ${organization.name}` : trip.destination;
                    const startDate = new Date(trip.startDate).toLocaleDateString('ru', { day: 'numeric', month: 'long' });
                    const endDate = new Date(trip.endDate).toLocaleDateString('ru', { day: 'numeric', month: 'long' });
                    const year = new Date(trip.endDate).getFullYear();

                    return `
                    <div class="trip-item">
                        <div class="trip-avatar">${initials}</div>
                        <div class="trip-details">
                            <div class="trip-employee">${shortName}</div>
                            <div class="trip-destination">${destinationText}</div>
                            <div class="trip-date">${startDate} - ${endDate} ${year} г.</div>
                        </div>
                        <div class="trip-status status-upcoming">Запланирована</div>
                    </div>
                    `;
                }).join('')}
            `;
        } else {
            upcomingTripsContainer.innerHTML = `
                <h3 style="font-size: 14px; margin-bottom: 15px; color: var(--text);">Ближайшие командировки</h3>
                <p style="font-size: 14px; color: #605E5C; text-align: center; padding: 20px 0;">Нет запланированных поездок.</p>
            `;
        }
    }
}

export async function fetchTripData() {
    try {
        const [tripsResponse, employeesResponse, orgsResponse] = await Promise.all([
            fetch('/api/trips'),
            fetch('/api/employees'),
            fetch('/api/organizations')
        ]);

        if (!tripsResponse.ok || !employeesResponse.ok || !orgsResponse.ok) {
            console.error('Could not fetch all required data for trip card');
            return;
        }
        
        const trips = await tripsResponse.json();
        const employees = await employeesResponse.json();
        const organizations = await orgsResponse.json();

        updateTripCard(trips, employees, organizations);

    } catch (error) {
        console.error('Error fetching trip data:', error);
    }
}