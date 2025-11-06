// ===================================================================
// Файл: public/js/components/datepicker.js (УЛУЧШЕННАЯ ВЕРСИЯ ДЛЯ РУЧНОГО ВВОДА)
// ===================================================================

const DEFAULT_OPTIONS = {
    locale: 'ru-RU',
    firstDay: 1,
    dateFormat: 'dd.mm.yyyy',
    outputFormat: 'yyyy-mm-dd',
    closeOnSelect: true,
    minDate: null, // По умолчанию нет ограничений
    maxDate: null,
    monthNames: [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ],
    monthNamesShort: [
        'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
        'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
    ],
    dayNamesMin: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
};

export default class DatePicker {
    constructor(inputElement, options = {}) {
        if (inputElement._datepickerInstance) {
            return inputElement._datepickerInstance;
        }
        this.inputElement = inputElement;
        this.inputElement._datepickerInstance = this;

        this.options = { ...DEFAULT_OPTIONS, ...options };

        if (this.inputElement) {
            this.inputElement.type = 'text';
            this.inputElement.setAttribute('autocomplete', 'off');
            this.inputElement.setAttribute('placeholder', 'ДД.ММ.ГГГГ');
            this.inputElement.setAttribute('maxlength', '10');

            const dateError = this.inputElement.parentElement.querySelector('.date-error');

            this._unifiedKeyDownHandler = e => {
                const input = this.inputElement;
                const key = e.key;

                if (key === 'Enter') { e.preventDefault(); this._onEnterPress(); return; }
                if (key === ' ') { e.preventDefault(); if (!this.isOpen()) { this.open(); } return; }
                if (key === 'Escape' && this.visible) { e.preventDefault(); this.close(); return; }

                if (e.ctrlKey || e.metaKey || e.altKey ||
                    ['Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
                    return;
                }

                if (key === 'Backspace' || key === 'Delete') {
                    setTimeout(() => {
                        let value = input.value.replace(/\D/g, '');
                        let formattedValue = '';
                        if (value.length > 0) formattedValue += value.substring(0, 2);
                        if (value.length > 2) formattedValue += '.' + value.substring(2, 4);
                        if (value.length > 4) formattedValue += '.' + value.substring(4, 8);
                        
                        if (input.value !== formattedValue) {
                            input.value = formattedValue;
                        }
                        this._syncInputToCalendarHandler({ target: input });
                    }, 0);
                    return;
                }

                if (!/\d/.test(key)) {
                    e.preventDefault();
                    return;
                }

                e.preventDefault();

                let cursorPos = input.selectionStart;
                let currentValue = input.value;
                
                if (currentValue.length >= 10 && input.selectionStart === input.selectionEnd && cursorPos === 10) {
                    return;
                }

                let beforeCursor = currentValue.substring(0, cursorPos);
                let afterCursor = currentValue.substring(input.selectionEnd);
                
                let newValue = beforeCursor + key + afterCursor;
                
                let digits = newValue.replace(/\D/g, '').substring(0, 8);
                let formatted = '';
                
                if (digits.length > 0) formatted += digits.substring(0, 2);
                if (digits.length > 2) formatted += '.' + digits.substring(2, 4);
                if (digits.length > 4) formatted += '.' + digits.substring(4, 8);

                input.value = formatted;
                
                let tempDigitsBeforeCursor = (beforeCursor + key).replace(/\D/g, '');
                let newCursorPos = tempDigitsBeforeCursor.length;
                if (tempDigitsBeforeCursor.length > 2) newCursorPos++;
                if (tempDigitsBeforeCursor.length > 4) newCursorPos++;
                
                newCursorPos = Math.min(newCursorPos, formatted.length);
                
                input.setSelectionRange(newCursorPos, newCursorPos);

                this._syncInputToCalendarHandler({ target: input });
            };
            this.inputElement.addEventListener('keydown', this._unifiedKeyDownHandler);

            this._maskPasteHandler = e => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text');
                let digits = text.replace(/\D/g, '').slice(0, 8);
                const parts = [];
                if (digits.length > 0) parts.push(digits.slice(0, 2));
                if (digits.length > 2) parts.push(digits.slice(2, 4));
                if (digits.length > 4) parts.push(digits.slice(4, 8));
                this.inputElement.value = parts.join('.');
                this._syncInputToCalendarHandler({ target: this.inputElement });
            };
            this.inputElement.addEventListener('paste', this._maskPasteHandler);

            this._validationBlurHandler = e => {
                const inputValue = e.target.value.trim();
                if (inputValue.length === 0) {
                    if (this.selectedDate !== null) {
                        this.setDate(null, true);
                    }
                    if (dateError) dateError.style.display = 'none';
                    return;
                }

                const parsedDate = this._parseDate(inputValue, this.options.dateFormat);
                const isValidFormat = parsedDate && this._isValidDate(parsedDate);
                
                let isStrictlyValid = false;
                if (isValidFormat) {
                    const dayPart = inputValue.split('.')[0];
                    const monthPart = inputValue.split('.')[1];
                    const yearPart = inputValue.split('.')[2];
                    isStrictlyValid = dayPart === String(parsedDate.getDate()).padStart(dayPart.length > 1 ? 2 : 1, '0') &&
                                    monthPart === String(parsedDate.getMonth() + 1).padStart(monthPart.length > 1 ? 2 : 1, '0') &&
                                    yearPart === String(parsedDate.getFullYear());
                }
                
                const finalValidationResult = isValidFormat && isStrictlyValid;

                if (dateError) {
                    dateError.style.display = !finalValidationResult ? 'inline' : 'none';
                }

                if (finalValidationResult) {
                    this.setDate(parsedDate, true);
                } else {
                    if (this.selectedDate !== null || this.inputElement.value !== '') {
                        this.setDate(null, true);
                    }
                }
            };
            this.inputElement.addEventListener('blur', this._validationBlurHandler);

            this._syncInputToCalendarHandler = e => {
                const inputValue = this.inputElement.value;

                if (inputValue === '') {
                    if (this.selectedDate !== null) {
                        this.setDate(null, false);
                    }
                    if (this.visible) {
                        this.currentDate = new Date();
                        this.currentDate.setHours(0,0,0,0);
                        this.currentDate.setDate(1);
                        this._renderCalendar();
                    }
                    return;
                }

                const parsedDate = this._parseDate(inputValue, this.options.dateFormat);

                if (parsedDate && this._isValidDate(parsedDate)) {
                    const dateChanged = !(this.selectedDate && this.selectedDate.getTime() === parsedDate.getTime());
                    if(dateChanged || this.inputElement.value !== this._formatDate(parsedDate, this.options.dateFormat)){
                        this.setDate(parsedDate, false);
                    } else if (this.visible) {
                        this._renderCalendar();
                    }
                } else {
                    if (this.hiddenInputElement) {
                        this.hiddenInputElement.value = '';
                    }
                    if (this.visible) {
                        this._renderCalendar();
                    }
                }
            };
            this.inputElement.addEventListener('input', this._syncInputToCalendarHandler);

            this._onInputClick = (event) => {
                if (!this.isOpen()) {
                    this.open();
                }
            };
            this.inputElement.addEventListener('click', this._onInputClick);

            const calendarIcon = this.inputElement.parentElement.querySelector('.calendar-icon');
            if (calendarIcon) {
                calendarIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!this.isOpen()) {
                        this.open();
                    }
                });
            }

        } else {
            console.error("DatePicker: this.inputElement is null. Setup skipped.");
            return;
        }

        if (this.options.firstDay === 1) {
            this.options.dayNamesMin = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        } else {
            this.options.dayNamesMin = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        }

        this.currentDate = new Date();
        this.currentDate.setHours(0,0,0,0);
        this.selectedDate = null;
        this.visible = false;
        this.viewMode = 'days';

        this._boundOnMonthLabelClick = () => {
            if (this.viewMode === 'months') { this.viewMode = 'days'; }
            else { this.viewMode = 'months'; }
            this._renderCalendar();
        };
        this._boundOnYearLabelClick  = () => {
            if (this.viewMode === 'years') { this.viewMode = 'months'; }
            else { this.viewMode = 'years'; }
            this._renderCalendar();
        };
        this._boundOnDocumentClick = this._onDocumentClick.bind(this);
        this._boundOnPanelClick = this._onPanelClick.bind(this);
        this._boundOnPrevMonthClick = this._onPrevMonthClick.bind(this);
        this._boundOnNextMonthClick = this._onNextMonthClick.bind(this);
        this._boundOnKeyDown = this._onKeyDown.bind(this);
        this._boundReposition = this.reposition.bind(this);

        const hiddenFieldId = this.inputElement.dataset.hiddenFieldId;
        this.hiddenInputElement = hiddenFieldId ? document.getElementById(hiddenFieldId) : null;
        
        this._init();
    }

    _init() {
        this._createDOMElements();
        this._parseInitialValue();
        this.currentDate.setDate(1);
    }
    
    _onEnterPress() {
        const inputValue = this.inputElement.value;
        if (inputValue) {
            const parsed = this._parseDate(inputValue, this.options.dateFormat);
            if (parsed && this._isValidDate(parsed)) {
                const dayPart = inputValue.split('.')[0];
                const monthPart = inputValue.split('.')[1];
                const yearPart = inputValue.split('.')[2];
                const isStrictlyValid = dayPart === String(parsed.getDate()).padStart(dayPart.length > 1 ? 2 : 1, '0') &&
                                        monthPart === String(parsed.getMonth() + 1).padStart(monthPart.length > 1 ? 2 : 1, '0') &&
                                        yearPart === String(parsed.getFullYear());
                if (isStrictlyValid) {
                    this.setDate(parsed, true);
                } else {
                    this.setDate(null, true);
                }
            } else {
                this.setDate(null, true);
            }
        } else {
            this.setDate(null, true);
        }
        this.close();
    }

    _createDOMElements() {
        this.portal = document.createElement('div');
        this.portal.className = 'datepicker-portal';
        this.portal.setAttribute('aria-hidden', 'true');
        this.portal.addEventListener('keydown', this._boundOnKeyDown);

        this.backdrop = document.createElement('div');
        this.backdrop.className = 'datepicker-backdrop';

        this.panel = document.createElement('div');
        this.panel.className = 'datepicker-panel';
        this.panel.setAttribute('role', 'dialog');
        this.panel.setAttribute('aria-modal', 'true');
        this.panel.setAttribute('tabindex', '-1');

        const header = document.createElement('div');
        header.className = 'datepicker-header';

        this.prevButton = document.createElement('button');
        this.prevButton.type = 'button';
        this.prevButton.className = 'datepicker-btn prev-month';
        this.prevButton.innerHTML = '‹';
        this.prevButton.setAttribute('aria-label', 'Предыдущий');
        this.prevButton.addEventListener('click', this._boundOnPrevMonthClick);

        this.captionElement = document.createElement('div');
        this.captionElement.className = 'datepicker-caption';

        this.monthLabel = document.createElement('span');
        this.monthLabel.className = 'month-label';
        this.monthLabel.setAttribute('tabindex', '0');
        this.monthLabel.setAttribute('role', 'button');
        this.monthLabel.addEventListener('click', this._boundOnMonthLabelClick);
        this.monthLabel.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') this._boundOnMonthLabelClick(); });

        this.yearLabel = document.createElement('span');
        this.yearLabel.className = 'year-label';
        this.yearLabel.setAttribute('tabindex', '0');
        this.yearLabel.setAttribute('role', 'button');
        this.yearLabel.addEventListener('click', this._boundOnYearLabelClick);
        this.yearLabel.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') this._boundOnYearLabelClick(); });

        this.captionElement.appendChild(this.monthLabel);
        this.captionElement.appendChild(document.createTextNode(' '));
        this.captionElement.appendChild(this.yearLabel);

        this.nextButton = document.createElement('button');
        this.nextButton.type = 'button';
        this.nextButton.className = 'datepicker-btn next-month';
        this.nextButton.innerHTML = '›';
        this.nextButton.setAttribute('aria-label', 'Следующий');
        this.nextButton.addEventListener('click', this._boundOnNextMonthClick);

        header.appendChild(this.prevButton);
        header.appendChild(this.captionElement);
        header.appendChild(this.nextButton);

        this.gridTable = document.createElement('table');
        this.gridTable.className = 'datepicker-grid';
        const gridHead = document.createElement('thead');
        this.gridHeadRow = document.createElement('tr');
        gridHead.appendChild(this.gridHeadRow);
        this.gridBody = document.createElement('tbody');

        // ИСПРАВЛЕНО: Добавлен обработчик mousedown для мгновенного выбора
        this.gridBody.addEventListener('mousedown', (event) => {
            const dayButton = event.target.closest('button.datepicker-day');
            if (dayButton && this.viewMode === 'days' && !dayButton.disabled && dayButton.dataset.date) {
                event.preventDefault(); // Предотвращаем потерю фокуса
                const parsed = this._parseDate(dayButton.dataset.date, 'yyyy-mm-dd');
                if (parsed && this._isValidDate(parsed)) {
                    this.setDate(parsed, true);
                }
                if (this.options.closeOnSelect) {
                    this.close();
                }
            }
        });

        this.gridBody.addEventListener('click', (event) => {
            const monthButton = event.target.closest('button.datepicker-month');
            const yearButton = event.target.closest('button.datepicker-year');

            if (monthButton && this.viewMode === 'months' && monthButton.dataset.monthIndex) {
                this.currentDate.setMonth(parseInt(monthButton.dataset.monthIndex, 10));
                this.viewMode = 'days';
                this._renderCalendar();
            } else if (yearButton && this.viewMode === 'years' && yearButton.dataset.year) {
                this.currentDate.setFullYear(parseInt(yearButton.dataset.year, 10));
                this.viewMode = 'months';
                this._renderCalendar();
            }
        });

        this.gridTable.appendChild(gridHead);
        this.gridTable.appendChild(this.gridBody);

        this.panel.appendChild(header);
        this.panel.appendChild(this.gridTable);

        this.portal.appendChild(this.backdrop);
        this.portal.appendChild(this.panel);

        document.body.appendChild(this.portal);
    }

    _renderCalendar() {
        if (!this.panel) return;
        
        this.prevButton.style.visibility = 'visible';
        this.nextButton.style.visibility = 'visible';
        this.monthLabel.style.cursor = 'pointer';
        this.yearLabel.style.cursor = 'pointer';
        this.panel.dataset.viewmode = this.viewMode;

        switch (this.viewMode) {
            case 'months': this._renderMonths(); break;
            case 'years' : this._renderYears();  break;
            default      : this._renderDays();   break;
        }
    }

    _renderDays() {
        this.gridHeadRow.innerHTML = '';
        this.options.dayNamesMin.forEach(dayName => {
            const th = document.createElement('th');
            th.scope = 'col';
            th.textContent = dayName;
            this.gridHeadRow.appendChild(th);
        });
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        this.monthLabel.textContent = this.options.monthNames[month];
        this.monthLabel.setAttribute('aria-label', `Месяц ${this.options.monthNames[month]}. Выбрать другой месяц.`);
        this.yearLabel.textContent = year;
        this.yearLabel.setAttribute('aria-label', `Год ${year}. Выбрать другой год.`);
        this.gridBody.innerHTML = '';
        const firstDayOfMonth = new Date(year, month, 1);
        let startDayOfWeek = firstDayOfMonth.getDay();
        if (this.options.firstDay === 1) {
            startDayOfWeek = (startDayOfWeek === 0) ? 6 : startDayOfWeek - 1;
        }
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let dayCounter = 1;
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayTimestamp = today.getTime();
        for (let i = 0; i < 6; i++) {
            const row = document.createElement('tr');
            for (let j = 0; j < 7; j++) {
                const cell = document.createElement('td');
                const dayButton = document.createElement('button');
                dayButton.type = 'button';
                dayButton.classList.add('datepicker-day');
                if ((i === 0 && j < startDayOfWeek) || dayCounter > daysInMonth) {
                    cell.classList.add('empty');
                    dayButton.disabled = true;
                    dayButton.style.visibility = 'hidden';
                } else {
                    const currentDateCell = new Date(year, month, dayCounter);
                    currentDateCell.setHours(0,0,0,0);
                    const cellTimestamp = currentDateCell.getTime();
                    dayButton.textContent = dayCounter;
                    dayButton.dataset.date = this._formatDate(currentDateCell, 'yyyy-mm-dd');
                    dayButton.setAttribute('aria-label', `${dayCounter} ${this.options.monthNames[month]} ${year}`);
                    
                    // УБРАНО: автоматическое отключение прошедших дат
                    // Теперь все даты доступны для выбора
                    
                    const weekday = currentDateCell.getDay();
                    if (weekday === 0 || weekday === 6) {
                        dayButton.classList.add('weekend');
                    }
                    
                    if (cellTimestamp === todayTimestamp) {
                        dayButton.classList.add('today');
                        dayButton.setAttribute('aria-label', `Сегодня, ${dayButton.getAttribute('aria-label')}`);
                    }
                    if (this.selectedDate && cellTimestamp === this.selectedDate.getTime()) {
                        dayButton.classList.add('selected');
                        dayButton.setAttribute('aria-selected', 'true');
                    }
                    dayCounter++;
                }
                cell.appendChild(dayButton);
                row.appendChild(cell);
            }
            this.gridBody.appendChild(row);
            if (dayCounter > daysInMonth && i >= Math.floor((startDayOfWeek + daysInMonth -1) / 7) ) {
                break;
            }
        }
    }

    _renderMonths() {
        this.gridHeadRow.innerHTML = '';
        this.gridBody.innerHTML = '';
        this.monthLabel.textContent = 'Выберите месяц';
        this.monthLabel.setAttribute('aria-label', 'Режим выбора месяца. Нажмите для возврата к выбору дня.');
        this.yearLabel.textContent  = this.currentDate.getFullYear();
        this.yearLabel.setAttribute('aria-label', `Год ${this.currentDate.getFullYear()}. Нажмите для выбора другого года.`);

        let row;
        this.options.monthNamesShort.forEach((name, idx) => {
            if (idx % 3 === 0) {
                row = document.createElement('tr');
                this.gridBody.appendChild(row);
            }
            const cell  = document.createElement('td');
            cell.colSpan = Math.floor(7/3);
            if (idx % 3 === 2) {
                cell.colSpan = 7 - 2 * Math.floor(7/3);
            }
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = name;
            btn.className = 'datepicker-month';
            btn.dataset.monthIndex = idx;
            btn.setAttribute('aria-label', this.options.monthNames[idx]);
            if (idx === this.currentDate.getMonth()) {
                btn.classList.add('active');
            }
            cell.appendChild(btn);
            row.appendChild(cell);
        });
    }

    _renderYears() {
        this.gridHeadRow.innerHTML = '';
        this.gridBody.innerHTML = '';
        const currentDisplayYear = this.currentDate.getFullYear();
        const baseYear = Math.floor(currentDisplayYear / 10) * 10 - 1;
        this.monthLabel.textContent = `${baseYear + 1} - ${baseYear + 10}`;
        this.monthLabel.setAttribute('aria-label', 'Режим выбора года. Нажмите для возврата к выбору месяца.');
        this.yearLabel.textContent  = '';
        this.yearLabel.setAttribute('aria-label', '');

        let row;
        let yearCounter = 0;
        for (let i = 0; i < 12; i++) {
            const yearToDisplay = baseYear + i;
            if (yearCounter % 3 === 0) {
                row = document.createElement('tr');
                this.gridBody.appendChild(row);
            }
            const cell = document.createElement('td');
            cell.colSpan = Math.floor(7/3);
            if (yearCounter % 3 === 2) {
                cell.colSpan = 7 - 2 * Math.floor(7/3);
            }
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = yearToDisplay;
            btn.className = 'datepicker-year';
            btn.dataset.year = yearToDisplay;
            btn.setAttribute('aria-label', `${yearToDisplay} год`);
            if (i === 0 || i === 11) {
                btn.classList.add('other-decade');
            }
            if (yearToDisplay === currentDisplayYear) {
                btn.classList.add('active');
            }
            cell.appendChild(btn);
            row.appendChild(cell);
            yearCounter++;
        }
    }

    _parseInitialValue() {
        let initialDateFound = false;
        if (this.hiddenInputElement && this.hiddenInputElement.value) {
            const parsedFromHidden = this._parseDate(this.hiddenInputElement.value, this.options.outputFormat);
            if (parsedFromHidden && this._isValidDate(parsedFromHidden)) {
                this.selectedDate = parsedFromHidden;
                initialDateFound = true;
            } else {
                this.hiddenInputElement.value = '';
            }
        }

        if (!initialDateFound && this.inputElement && this.inputElement.value) {
            let parsedFromVisible = this._parseDate(this.inputElement.value, this.options.dateFormat);
            if (!parsedFromVisible && this.options.dateFormat !== this.options.outputFormat) {
                parsedFromVisible = this._parseDate(this.inputElement.value, this.options.outputFormat);
            }

            if (parsedFromVisible && this._isValidDate(parsedFromVisible)) {
                this.selectedDate = parsedFromVisible;
            }
        }
        
        if (!this.selectedDate) {
            this.selectedDate = null;
        }

        this._updateInput();
    }

    _updateInput() {
        let newVisibleValue = '';
        let newHiddenValue = '';
        if (this.selectedDate && this._isValidDate(this.selectedDate)) {
            newVisibleValue = this._formatDate(this.selectedDate, this.options.dateFormat);
            if (this.hiddenInputElement) {
                newHiddenValue = this._formatDate(this.selectedDate, this.options.outputFormat);
            }
        }
        
        if (this.inputElement.value !== newVisibleValue) {
            if (this.selectedDate || newVisibleValue === '') {
                this.inputElement.value = newVisibleValue;
            }
        }

        if (this.hiddenInputElement && this.hiddenInputElement.value !== newHiddenValue) {
            this.hiddenInputElement.value = newHiddenValue;
            const event = new Event('change', { bubbles: true, cancelable: false });
            this.hiddenInputElement.dispatchEvent(event);
        }
    }

    _onPrevMonthClick() {
        const dir = -1;
        if (this.viewMode === 'days') { this.currentDate.setMonth(this.currentDate.getMonth() + dir); }
        else if (this.viewMode === 'months') { this.currentDate.setFullYear(this.currentDate.getFullYear() + dir); }
        else if (this.viewMode === 'years') { this.currentDate.setFullYear(this.currentDate.getFullYear() + (dir * 10)); }
        this._renderCalendar();
    }

    _onNextMonthClick() {
        const dir = 1;
        if (this.viewMode === 'days') { this.currentDate.setMonth(this.currentDate.getMonth() + dir); }
        else if (this.viewMode === 'months') { this.currentDate.setFullYear(this.currentDate.getFullYear() + dir); }
        else if (this.viewMode === 'years') { this.currentDate.setFullYear(this.currentDate.getFullYear() + (dir * 10)); }
        this._renderCalendar();
    }

    _onDocumentClick(event) {
        const targetElement = event.target;
        if (!this.visible) {
            return;
        }
        if (targetElement === this.inputElement || this.inputElement.contains(targetElement)) {
            return;
        }
        const wrapper = this.inputElement.closest('.calendar-wrapper');
        if (wrapper && wrapper.contains(targetElement) && !this.panel.contains(targetElement)) {
            return;
        }
        if (this.panel.contains(targetElement)) {
            return;
        }
        this.close();
    }

    _onPanelClick(event) {
        event.stopPropagation();
    }

    _onKeyDown(event) {
        if (!this.visible) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            if (this.viewMode === 'years') {
                this.viewMode = 'months'; this._renderCalendar(); if(this.panel) this.panel.focus();
            } else if (this.viewMode === 'months') {
                this.viewMode = 'days'; this._renderCalendar(); if(this.panel) this.panel.focus();
            } else {
                this.close();
            }
            return;
        }
    }

    open() {
        if (this.visible) return;

        const inputValue = this.inputElement.value;
        let parsedFromInput = null;
        if (inputValue) {
            parsedFromInput = this._parseDate(inputValue, this.options.dateFormat);
        }

        if (parsedFromInput && this._isValidDate(parsedFromInput)) {
            if (!this.selectedDate || this.selectedDate.getTime() !== parsedFromInput.getTime()) {
                this.selectedDate = parsedFromInput;
            }
        } else if (inputValue === '' && this.selectedDate !== null) {
            this.selectedDate = null;
        }
        
        this.currentDate = this.selectedDate ? new Date(this.selectedDate.getTime()) : new Date();
        this.currentDate.setHours(0,0,0,0);
        this.currentDate.setDate(1);

        this.viewMode = 'days';
        this.visible = true;
        this.portal.setAttribute('aria-hidden', 'false');

        this._renderCalendar();
        this.reposition();

        document.addEventListener('click', this._boundOnDocumentClick, true);
        this.panel.addEventListener('click', this._boundOnPanelClick);
        window.addEventListener('resize', this._boundReposition);
        document.addEventListener('scroll', this._boundReposition, true);

        // Передаем фокус панели, а не инпуту
         if (this.inputElement) {
            this.inputElement.focus();
        }

        this.inputElement.dispatchEvent(new CustomEvent('datepicker:open', { bubbles: true }));
    }

    close() {
        if (!this.visible) return;
        this.visible = false;
        this.portal.setAttribute('aria-hidden', 'true');

        document.removeEventListener('click', this._boundOnDocumentClick, true);
        this.panel.removeEventListener('click', this._boundOnPanelClick);
        window.removeEventListener('resize', this._boundReposition);
        document.removeEventListener('scroll', this._boundReposition, true);

        const inputValue = this.inputElement.value.trim();
        if (inputValue) {
            this._validationBlurHandler({target: this.inputElement });
        } else {
            if (this.selectedDate !== null) {
                this.setDate(null, true);
            }
        }

        if (document.activeElement === this.panel) {
            this.inputElement.focus();
        }
        this.inputElement.dispatchEvent(new CustomEvent('datepicker:close', { bubbles: true }));
    }

    isOpen() { return this.visible; }

    reposition() {
        if (!this.visible || !this.inputElement || !this.panel) return;

        const panelHeight = this.panel.offsetHeight;
        const panelWidth = this.panel.offsetWidth;

        if (panelHeight === 0 || panelWidth === 0) {
            return;
        }

        const inputRect = this.inputElement.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        const margin = 10;

        let top;
        let left = inputRect.left;

        const preferredTopBelow = inputRect.bottom + 5;
        const alternativeTopAbove = inputRect.top - panelHeight - 5;

        const fitsBelow = (preferredTopBelow + panelHeight <= windowHeight - margin);
        const fitsAbove = (alternativeTopAbove >= margin);

        if (fitsBelow) {
            top = preferredTopBelow;
        } else if (fitsAbove) {
            top = alternativeTopAbove;
        } else {
            const spaceBelowAvailable = windowHeight - (inputRect.bottom + 5);
            const spaceAboveAvailable = inputRect.top - 5;

            if (spaceBelowAvailable >= panelHeight / 2 || spaceBelowAvailable >= spaceAboveAvailable) {
            top = Math.min(preferredTopBelow, windowHeight - panelHeight - margin);
            top = Math.max(margin, top);
            } else {
            top = Math.max(margin, alternativeTopAbove);
            if (top + panelHeight > windowHeight - margin) {
                    top = windowHeight - panelHeight - margin;
            }
            top = Math.max(margin, top);
            }
        }

        if (left + panelWidth > windowWidth - margin) {
            left = windowWidth - panelWidth - margin;
        }
        if (left < margin) {
            left = margin;
        }
        
        // Позиционируем относительно окна, а не документа
        this.panel.style.top = `${top}px`;
        this.panel.style.left = `${left}px`;
    }
    
    destroy() {
        this.close();
        if (this.inputElement) {
            this.inputElement.removeEventListener('click', this._onInputClick);
            if (this._unifiedKeyDownHandler) {
                this.inputElement.removeEventListener('keydown', this._unifiedKeyDownHandler);
            }
            if (this._maskPasteHandler) {
                this.inputElement.removeEventListener('paste', this._maskPasteHandler);
            }
            if (this._validationBlurHandler) {
                this.inputElement.removeEventListener('blur', this._validationBlurHandler);
            }
            if (this._syncInputToCalendarHandler) {
                this.inputElement.removeEventListener('input', this._syncInputToCalendarHandler);
            }
            if (this.inputElement._datepickerInstance === this) {
                delete this.inputElement._datepickerInstance;
            }
            this.inputElement.dispatchEvent(new CustomEvent('datepicker:destroy', { bubbles: true }));
        }

        if (this.portal && this.portal.parentNode) {
            this.portal.parentNode.removeChild(this.portal);
        }
        
        this.inputElement = null;
        this.hiddenInputElement = null;
        this.options = null;
        this.portal = null;
        this.panel = null;
        this.currentDate = null;
        this.selectedDate = null;
    }

    _formatDate(dateObj, format) {
        if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
        const d = String(dateObj.getDate()).padStart(2, '0');
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const y = dateObj.getFullYear();
        if (format === 'dd.mm.yyyy') return `${d}.${m}.${y}`;
        if (format === 'yyyy-mm-dd') return `${y}-${m}-${d}`;
        return `${y}-${m}-${d}`;
    }

    _parseDate(dateString, format) {
        if (!dateString || typeof dateString !== 'string') return null;
        let d, m, y;
        let separator = '.';
        let yearFirst = false;

        if (format === 'yyyy-mm-dd') {
            separator = '-'; yearFirst = true;
        } else if (format === 'dd.mm.yyyy') {
            separator = '.'; yearFirst = false;
        } else {
            if (dateString.includes('-') && dateString.split('-')[0].length === 4) {
                separator = '-'; yearFirst = true;
            } else if (dateString.includes('.') && dateString.split('.')[2] && dateString.split('.')[2].length === 4) {
                separator = '.'; yearFirst = false;
            } else if (dateString.length === 8 && /^\d+$/.test(dateString) && format === 'dd.mm.yyyy') {
                dateString = `${dateString.slice(0,2)}.${dateString.slice(2,4)}.${dateString.slice(4,8)}`;
                separator = '.'; yearFirst = false;
            }
            else {
                return null;
            }
        }

        const parts = dateString.split(separator);
        if (parts.length !== 3) return null;
        
        const numParts = parts.map(s => {
            const num = parseInt(s, 10);
            return isNaN(num) ? -1 : num;
        });

        if (yearFirst) { [y, m, d] = numParts; }
        else { [d, m, y] = numParts; }
        
        m -= 1;

        if (y < 1000 || y > 9999 || m < 0 || m > 11 || d < 1 || d > 31) return null;
        
        const date = new Date(y, m, d);
        date.setHours(0,0,0,0);

        if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) {
            return null;
        }
        return date;
    }

    _isValidDate(dateObj) {
        return dateObj instanceof Date && !isNaN(dateObj.getTime());
    }

    setDate(date, triggerChange = true) {
        let newDate = null;
        if (date instanceof Date && this._isValidDate(date)) {
            newDate = new Date(date.getTime());
        } else if (typeof date === 'string') {
            newDate = this._parseDate(date, this.options.outputFormat) || this._parseDate(date, this.options.dateFormat);
        }
        
        if (newDate && this._isValidDate(newDate)) {
            newDate.setHours(0,0,0,0);
            
            const dateChanged = !(this.selectedDate && this.selectedDate.getTime() === newDate.getTime());
            
            if (dateChanged) {
                this.selectedDate = newDate;
            }
            
            this._updateInput();

            if (this.visible) {
                if (!this.currentDate || this.currentDate.getMonth() !== newDate.getMonth() || this.currentDate.getFullYear() !== newDate.getFullYear()) {
                    this.currentDate = new Date(newDate.getTime());
                    this.currentDate.setDate(1);
                }
                this._renderCalendar();
            }
            
            if (triggerChange && dateChanged && this.inputElement) {
                this.inputElement.dispatchEvent(new Event('change', { bubbles: true }));
            }
        } else {
            if (date === null || date === '') {
                const previouslySelectedDateExisted = this.selectedDate !== null;
                if (previouslySelectedDateExisted || (this.inputElement && this.inputElement.value !== '')) {
                    this.selectedDate = null;
                    this._updateInput();
                    if (this.visible) {
                        this.currentDate = new Date();
                        this.currentDate.setHours(0,0,0,0);
                        this.currentDate.setDate(1);
                        this._renderCalendar();
                    }
                    if (triggerChange && (previouslySelectedDateExisted || (this.inputElement && this.inputElement.value !== '')) && this.inputElement) {
                        this.inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            }
        }
    }
    
    setMinDate(date) {
        this.options.minDate = this._parseAndNormalizeDate(date);
        if(this.visible) this._renderCalendar();
    }

    setMaxDate(date) {
        this.options.maxDate = this._parseAndNormalizeDate(date);
        if(this.visible) this._renderCalendar();
    }

    _parseAndNormalizeDate(date) {
        if (!date) return null;
        let parsedDate = (date instanceof Date) ? new Date(date.getTime()) : this._parseDate(date.toString(), 'yyyy-mm-dd') || this._parseDate(date.toString(), 'dd.mm.yyyy');
        if (parsedDate && this._isValidDate(parsedDate)) {
            parsedDate.setHours(0, 0, 0, 0);
            return parsedDate;
        }
        return null;
    }

    getDate() {
        return this.selectedDate ? new Date(this.selectedDate.getTime()) : null;
    }

    getFormattedDate(format = this.options.outputFormat) {
        return this.selectedDate ? this._formatDate(this.selectedDate, format) : '';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const datepickerInputs = document.querySelectorAll('.datepicker');
    datepickerInputs.forEach(input => {
        if (!input._datepickerInstance) {
            new DatePicker(input);
        }
    });
});