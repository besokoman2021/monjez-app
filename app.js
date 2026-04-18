// ============================================
// مُنجز - Task Management Application
// Modular Vanilla JS with localStorage
// ============================================

(function () {
    'use strict';

    // ===== CONSTANTS =====
    const STORAGE_KEY = 'monjez_tasks';
    const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const PRIORITY_LABELS = { high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
    const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };

    // ===== STATE =====
    let tasks = [];
    let currentFilter = 'all';
    let deleteTargetId = null;
    let priorityChart = null;
    let weeklyChart = null;
    let reminderInterval = null;

    // =========================================================
    //  MODULE: Storage - localStorage persistence
    // =========================================================
    const Storage = {
        load() {
            try {
                const data = localStorage.getItem(STORAGE_KEY);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                console.error('Error loading tasks:', e);
                return [];
            }
        },
        save(taskList) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(taskList));
            } catch (e) {
                console.error('Error saving tasks:', e);
            }
        }
    };

    // =========================================================
    //  MODULE: TaskManager - CRUD operations
    // =========================================================
    const TaskManager = {
        // Generate unique ID
        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        },

        // Add a new task
        add(taskData) {
            const task = {
                id: this.generateId(),
                title: taskData.title.trim(),
                description: taskData.description.trim(),
                priority: taskData.priority,
                dueDate: taskData.dueDate || null,
                completed: false,
                createdAt: new Date().toISOString()
            };
            tasks.unshift(task);
            Storage.save(tasks);
            return task;
        },

        // Update an existing task
        update(id, taskData) {
            const index = tasks.findIndex(t => t.id === id);
            if (index === -1) return null;
            tasks[index] = {
                ...tasks[index],
                title: taskData.title.trim(),
                description: taskData.description.trim(),
                priority: taskData.priority,
                dueDate: taskData.dueDate || null
            };
            Storage.save(tasks);
            return tasks[index];
        },

        // Delete a task
        delete(id) {
            tasks = tasks.filter(t => t.id !== id);
            Storage.save(tasks);
        },

        // Toggle complete status
        toggle(id) {
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                Storage.save(tasks);
            }
            return task;
        },

        // Get filtered tasks
        getFiltered(filter) {
            switch (filter) {
                case 'pending': return tasks.filter(t => !t.completed);
                case 'completed': return tasks.filter(t => t.completed);
                case 'high': return tasks.filter(t => t.priority === 'high');
                case 'medium': return tasks.filter(t => t.priority === 'medium');
                case 'low': return tasks.filter(t => t.priority === 'low');
                default: return [...tasks];
            }
        },

        // Get today's tasks
        getToday() {
            const today = new Date().toDateString();
            return tasks.filter(t => {
                if (!t.dueDate) return true; // Tasks with no date count as today
                return new Date(t.dueDate).toDateString() === today;
            });
        },

        // Get overdue tasks
        getOverdue() {
            const now = new Date();
            return tasks.filter(t => t.dueDate && !t.completed && new Date(t.dueDate) < now);
        },

        // Get stats
        getStats() {
            const total = tasks.length;
            const completed = tasks.filter(t => t.completed).length;
            const pending = total - completed;
            const overdue = this.getOverdue().length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
            const byPriority = {
                high: tasks.filter(t => t.priority === 'high'),
                medium: tasks.filter(t => t.priority === 'medium'),
                low: tasks.filter(t => t.priority === 'low')
            };
            return { total, completed, pending, overdue, percent, byPriority };
        }
    };

    // =========================================================
    //  MODULE: UI - DOM manipulation & rendering
    // =========================================================
    const UI = {
        // DOM element cache
        el: {},

        // Cache all DOM references
        cacheElements() {
            this.el = {
                app: document.getElementById('app'),
                splash: document.getElementById('splashScreen'),
                headerDate: document.getElementById('headerDate'),
                taskList: document.getElementById('taskList'),
                emptyState: document.getElementById('emptyState'),
                // Stats
                statTotal: document.getElementById('statTotal'),
                statDone: document.getElementById('statDone'),
                statPending: document.getElementById('statPending'),
                // Dashboard
                progressRing: document.getElementById('progressRing'),
                progressPercent: document.getElementById('progressPercent'),
                dashDone: document.getElementById('dashDone'),
                dashPending: document.getElementById('dashPending'),
                dashOverdue: document.getElementById('dashOverdue'),
                // Reports
                dailyScore: document.getElementById('dailyScore'),
                dailyMotivation: document.getElementById('dailyMotivation'),
                highTasks: document.getElementById('highTasks'),
                mediumTasks: document.getElementById('mediumTasks'),
                lowTasks: document.getElementById('lowTasks'),
                highCount: document.getElementById('highCount'),
                mediumCount: document.getElementById('mediumCount'),
                lowCount: document.getElementById('lowCount'),
                // Modals
                taskModal: document.getElementById('taskModal'),
                deleteModal: document.getElementById('deleteModal'),
                taskForm: document.getElementById('taskForm'),
                modalTitle: document.getElementById('modalTitle'),
                taskId: document.getElementById('taskId'),
                taskTitle: document.getElementById('taskTitle'),
                taskDesc: document.getElementById('taskDesc'),
                taskPriority: document.getElementById('taskPriority'),
                taskDue: document.getElementById('taskDue'),
                // Toast
                toast: document.getElementById('toast'),
                toastMessage: document.getElementById('toastMessage'),
            };
        },

        // Set today's date in header
        setHeaderDate() {
            const now = new Date();
            const day = DAYS_AR[now.getDay()];
            const date = now.getDate();
            const month = MONTHS_AR[now.getMonth()];
            this.el.headerDate.textContent = `${day}، ${date} ${month}`;
        },

        // Show splash screen then reveal app
        initSplash() {
            setTimeout(() => {
                this.el.splash.style.opacity = '0';
                this.el.splash.style.transition = 'opacity 0.5s ease';
                this.el.app.style.opacity = '1';
                setTimeout(() => {
                    this.el.splash.style.display = 'none';
                }, 500);
            }, 1500);
        },

        // Show toast notification
        showToast(message) {
            this.el.toastMessage.textContent = message;
            this.el.toast.classList.remove('hidden');
            this.el.toast.classList.add('show');
            setTimeout(() => {
                this.el.toast.classList.remove('show');
                setTimeout(() => this.el.toast.classList.add('hidden'), 350);
            }, 2500);
        },

        // Open task modal for add/edit
        openTaskModal(task = null) {
            if (task) {
                this.el.modalTitle.textContent = 'تعديل المهمة';
                this.el.taskId.value = task.id;
                this.el.taskTitle.value = task.title;
                this.el.taskDesc.value = task.description;
                this.el.taskPriority.value = task.priority;
                this.el.taskDue.value = task.dueDate || '';
            } else {
                this.el.modalTitle.textContent = 'مهمة جديدة';
                this.el.taskForm.reset();
                this.el.taskId.value = '';
            }
            this.el.taskModal.classList.remove('hidden');
        },

        closeTaskModal() {
            this.el.taskModal.classList.add('hidden');
            this.el.taskForm.reset();
            this.el.taskId.value = '';
        },

        openDeleteModal(id) {
            deleteTargetId = id;
            this.el.deleteModal.classList.remove('hidden');
        },

        closeDeleteModal() {
            deleteTargetId = null;
            this.el.deleteModal.classList.add('hidden');
        },

        // Format date in Arabic
        formatDate(dateStr) {
            if (!dateStr) return '';
            const d = new Date(dateStr);
            const now = new Date();
            const isOverdue = d < now;
            const day = d.getDate();
            const month = MONTHS_AR[d.getMonth()];
            const hours = d.getHours().toString().padStart(2, '0');
            const mins = d.getMinutes().toString().padStart(2, '0');

            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            let label = `${day} ${month} - ${hours}:${mins}`;
            if (d.toDateString() === today.toDateString()) {
                label = `اليوم - ${hours}:${mins}`;
            } else if (d.toDateString() === tomorrow.toDateString()) {
                label = `غداً - ${hours}:${mins}`;
            }

            return { label, isOverdue };
        },

        // Render a single task card
        renderTaskCard(task) {
            const dateInfo = this.formatDate(task.dueDate);
            const isOverdue = dateInfo.isOverdue && !task.completed;

            return `
                <div class="task-card ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                    <div class="flex gap-3">
                        <div class="priority-strip priority-${task.priority}"></div>
                        <input type="checkbox" class="task-checkbox mt-0.5" ${task.completed ? 'checked' : ''} data-toggle="${task.id}">
                        <div class="flex-1 min-w-0">
                            <p class="task-title text-sm font-semibold truncate">${task.title}</p>
                            ${task.description ? `<p class="text-xs text-dark-400 mt-0.5 truncate">${task.description}</p>` : ''}
                            <div class="flex items-center gap-3 mt-2">
                                <span class="text-[10px] px-2 py-0.5 rounded-full" style="background: ${PRIORITY_COLORS[task.priority]}22; color: ${PRIORITY_COLORS[task.priority]}">${PRIORITY_LABELS[task.priority]}</span>
                                ${dateInfo.label ? `
                                    <span class="text-[10px] ${isOverdue ? 'text-rose-400' : 'text-dark-400'} flex items-center gap-1">
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                        ${dateInfo.label}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <button class="p-1.5 rounded-xl hover:bg-white/5 transition-colors" data-edit="${task.id}">
                                <svg class="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button class="p-1.5 rounded-xl hover:bg-rose-500/10 transition-colors" data-delete="${task.id}">
                                <svg class="w-4 h-4 text-dark-500 hover:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        // Render the full task list
        renderTasks() {
            const filtered = TaskManager.getFiltered(currentFilter);
            const stats = TaskManager.getStats();

            // Update quick stats
            this.el.statTotal.textContent = stats.total;
            this.el.statDone.textContent = stats.completed;
            this.el.statPending.textContent = stats.pending;

            // Render task cards
            if (filtered.length === 0) {
                this.el.taskList.innerHTML = '';
                this.el.emptyState.classList.remove('hidden');
            } else {
                this.el.emptyState.classList.add('hidden');
                this.el.taskList.innerHTML = filtered.map(t => this.renderTaskCard(t)).join('');
            }
        },

        // Update dashboard
        renderDashboard() {
            const stats = TaskManager.getStats();

            // Progress ring
            const circumference = 2 * Math.PI * 60; // r=60
            const offset = circumference - (stats.percent / 100) * circumference;
            this.el.progressRing.style.strokeDashoffset = offset;
            this.el.progressPercent.textContent = stats.percent + '%';

            // Stats
            this.el.dashDone.textContent = stats.completed;
            this.el.dashPending.textContent = stats.pending;
            this.el.dashOverdue.textContent = stats.overdue;

            // Charts
            this.updatePriorityChart(stats);
            this.updateWeeklyChart();
        },

        // Update priority doughnut chart
        updatePriorityChart(stats) {
            const ctx = document.getElementById('priorityChart');
            if (!ctx) return;

            const data = {
                labels: ['عالية', 'متوسطة', 'منخفضة'],
                datasets: [{
                    data: [
                        stats.byPriority.high.length,
                        stats.byPriority.medium.length,
                        stats.byPriority.low.length
                    ],
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(34, 197, 94, 0.8)'
                    ],
                    borderColor: [
                        'rgba(239, 68, 68, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(34, 197, 94, 1)'
                    ],
                    borderWidth: 1,
                    hoverOffset: 8
                }]
            };

            const options = {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        rtl: true,
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Tajawal', size: 12 },
                            padding: 16,
                            usePointStyle: true,
                            pointStyleWidth: 10
                        }
                    }
                }
            };

            if (priorityChart) {
                priorityChart.data = data;
                priorityChart.update();
            } else {
                priorityChart = new Chart(ctx, { type: 'doughnut', data, options });
            }
        },

        // Update weekly bar chart
        updateWeeklyChart() {
            const ctx = document.getElementById('weeklyChart');
            if (!ctx) return;

            // Calculate tasks completed per day this week
            const today = new Date();
            const labels = [];
            const completedData = [];
            const addedData = [];

            for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                const dateStr = d.toDateString();
                labels.push(DAYS_AR[d.getDay()]);

                const completedOnDay = tasks.filter(t => {
                    if (!t.completed) return false;
                    // Approximate: use createdAt as a proxy
                    return new Date(t.createdAt).toDateString() === dateStr;
                }).length;

                const addedOnDay = tasks.filter(t => {
                    return new Date(t.createdAt).toDateString() === dateStr;
                }).length;

                completedData.push(completedOnDay);
                addedData.push(addedOnDay);
            }

            const data = {
                labels,
                datasets: [
                    {
                        label: 'تمت الإضافة',
                        data: addedData,
                        backgroundColor: 'rgba(99, 102, 241, 0.6)',
                        borderColor: 'rgba(99, 102, 241, 1)',
                        borderWidth: 1,
                        borderRadius: 6,
                        borderSkipped: false
                    },
                    {
                        label: 'مكتملة',
                        data: completedData,
                        backgroundColor: 'rgba(34, 197, 94, 0.6)',
                        borderColor: 'rgba(34, 197, 94, 1)',
                        borderWidth: 1,
                        borderRadius: 6,
                        borderSkipped: false
                    }
                ]
            };

            const options = {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { family: 'Tajawal', size: 10 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.03)' },
                        ticks: {
                            color: '#64748b',
                            font: { family: 'Tajawal', size: 10 },
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        rtl: true,
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Tajawal', size: 11 },
                            padding: 12,
                            usePointStyle: true,
                            pointStyleWidth: 10
                        }
                    }
                }
            };

            if (weeklyChart) {
                weeklyChart.data = data;
                weeklyChart.update();
            } else {
                weeklyChart = new Chart(ctx, { type: 'bar', data, options });
            }
        },

        // Render reports tab
        renderReports() {
            const stats = TaskManager.getStats();

            // Daily score
            this.el.dailyScore.textContent = stats.percent + '%';

            // Motivational message
            const messages = [
                { min: 0, max: 0, text: 'ابدأ يومك بإنجاز مهمة واحدة! 🚀' },
                { min: 1, max: 25, text: 'بداية جيدة، استمر! 💪' },
                { min: 26, max: 50, text: 'أنت في منتصف الطريق، أحسنت! 🌟' },
                { min: 51, max: 75, text: 'عمل رائع، اقتربت من الهدف! 🎯' },
                { min: 76, max: 99, text: 'ممتاز! أنت على وشك الانتهاء! 🔥' },
                { min: 100, max: 100, text: 'مبروك! أنجزت جميع المهام! 🎉' }
            ];
            const msg = messages.find(m => stats.percent >= m.min && stats.percent <= m.max);
            this.el.dailyMotivation.textContent = msg ? msg.text : '';

            // Render priority sections
            this.renderPrioritySection('high', stats.byPriority.high, this.el.highTasks, this.el.highCount);
            this.renderPrioritySection('medium', stats.byPriority.medium, this.el.mediumTasks, this.el.mediumCount);
            this.renderPrioritySection('low', stats.byPriority.low, this.el.lowTasks, this.el.lowCount);
        },

        renderPrioritySection(priority, taskList, container, countEl) {
            countEl.textContent = taskList.length;
            if (taskList.length === 0) {
                container.innerHTML = '<p class="text-dark-500 text-xs">لا توجد مهام</p>';
                return;
            }
            container.innerHTML = taskList.map(t => `
                <div class="report-task-item ${t.completed ? 'done' : ''}">
                    <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background: ${PRIORITY_COLORS[priority]}"></span>
                    <span class="report-task-title flex-1 truncate text-dark-200">${t.title}</span>
                    <span class="text-[10px] ${t.completed ? 'text-emerald-400' : 'text-dark-500'}">${t.completed ? '✓ مكتمل' : 'معلّق'}</span>
                </div>
            `).join('');
        },

        // Full re-render of all views
        renderAll() {
            this.renderTasks();
            this.renderDashboard();
            this.renderReports();
        }
    };

    // =========================================================
    //  MODULE: Navigation - Tab switching
    // =========================================================
    const Navigation = {
        init() {
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    const tabId = item.dataset.tab;
                    this.switchTab(tabId, item, navItems);
                });
            });
        },

        switchTab(tabId, activeItem, allItems) {
            // Update nav active state
            allItems.forEach(i => i.classList.remove('active'));
            activeItem.classList.add('active');

            // Switch tab pages
            document.querySelectorAll('.tab-page').forEach(page => {
                page.classList.remove('active');
            });
            document.getElementById(tabId).classList.add('active');

            // Re-render current tab data
            if (tabId === 'tabDashboard') UI.renderDashboard();
            if (tabId === 'tabReports') UI.renderReports();
        }
    };

    // =========================================================
    //  MODULE: Voice - Web Speech API integration
    // =========================================================
    const Voice = {
        synth: window.speechSynthesis,

        // Speak text in Arabic
        speak(text) {
            if (!this.synth) {
                UI.showToast('المتصفح لا يدعم التحدث الصوتي');
                return;
            }
            // Cancel any ongoing speech
            this.synth.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ar-SA';
            utterance.rate = 0.95;
            utterance.pitch = 1;

            // Try to find an Arabic voice
            const voices = this.synth.getVoices();
            const arVoice = voices.find(v => v.lang.startsWith('ar'));
            if (arVoice) utterance.voice = arVoice;

            this.synth.speak(utterance);
        },

        // Read today's summary aloud
        listenToMyDay() {
            const stats = TaskManager.getStats();
            const overdue = TaskManager.getOverdue();
            const pending = tasks.filter(t => !t.completed);

            let text = `مرحباً! إليك ملخص يومك. `;
            text += `لديك ${stats.total} مهمة إجمالاً، منها ${stats.completed} مكتملة و ${stats.pending} معلّقة. `;

            if (stats.percent === 100 && stats.total > 0) {
                text += `ممتاز! لقد أنجزت جميع مهامك اليوم! `;
            } else if (stats.percent > 50) {
                text += `أحسنت! أنجزت ${stats.percent} بالمئة من مهامك. `;
            }

            if (overdue.length > 0) {
                text += `تنبيه: لديك ${overdue.length} مهام متأخرة. `;
                overdue.slice(0, 3).forEach(t => {
                    text += `المهمة: ${t.title}، أولوية ${PRIORITY_LABELS[t.priority]}. `;
                });
            }

            // Read high priority pending tasks
            const highPending = pending.filter(t => t.priority === 'high');
            if (highPending.length > 0) {
                text += `المهام ذات الأولوية العالية: `;
                highPending.forEach(t => {
                    text += `${t.title}. `;
                });
            }

            if (stats.total === 0) {
                text += `لا توجد لديك مهام بعد. أضف مهمتك الأولى الآن!`;
            }

            this.speak(text);
            UI.showToast('🔊 جاري قراءة ملخص اليوم...');
        },

        // Check for due reminders
        checkReminders() {
            const remindersEnabled = document.getElementById('toggleReminders')?.checked;
            if (!remindersEnabled) return;

            const now = new Date();
            const fiveMinutes = 5 * 60 * 1000;

            tasks.forEach(task => {
                if (!task.dueDate || task.completed) return;
                const due = new Date(task.dueDate);
                const diff = due - now;

                // Remind when task is due within 5 minutes
                if (diff > 0 && diff <= fiveMinutes) {
                    const reminderKey = `reminded_${task.id}`;
                    if (!sessionStorage.getItem(reminderKey)) {
                        this.speak(`تذكير: المهمة "${task.title}" مستحقة قريباً`);
                        UI.showToast(`⏰ تذكير: ${task.title}`);
                        sessionStorage.setItem(reminderKey, 'true');
                    }
                }
            });
        },

        // Start periodic reminder checks
        startReminders() {
            // Check every 60 seconds
            reminderInterval = setInterval(() => this.checkReminders(), 60000);
            // Also check immediately
            setTimeout(() => this.checkReminders(), 3000);
        }
    };

    // =========================================================
    //  MODULE: Export - Data export functionality
    // =========================================================
    const Export = {
        toJSON() {
            const data = JSON.stringify(tasks, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `monjez-tasks-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            UI.showToast('✅ تم تصدير المهام بنجاح');
        },

        // Open WhatsApp date picker modal
        openWhatsAppModal() {
            const modal = document.getElementById('whatsappModal');
            const dateInput = document.getElementById('whatsappDate');
            // Default to today
            dateInput.value = new Date().toISOString().split('T')[0];
            modal.classList.remove('hidden');
        },

        // Close WhatsApp modal
        closeWhatsAppModal() {
            document.getElementById('whatsappModal').classList.add('hidden');
        },

        // Get tasks for a specific date (by createdAt or dueDate)
        getTasksForDate(dateStr) {
            const targetDate = new Date(dateStr).toDateString();
            return tasks.filter(t => {
                // Match tasks created on this date OR due on this date
                const createdDate = new Date(t.createdAt).toDateString();
                const dueDate = t.dueDate ? new Date(t.dueDate).toDateString() : null;
                return createdDate === targetDate || dueDate === targetDate;
            });
        },

        // Generate formatted report text for WhatsApp sharing by date
        toWhatsApp(dateStr) {
            const selectedDate = new Date(dateStr);
            const day = DAYS_AR[selectedDate.getDay()];
            const date = selectedDate.getDate();
            const month = MONTHS_AR[selectedDate.getMonth()];
            const year = selectedDate.getFullYear();

            // Get tasks for that specific day
            const dayTasks = this.getTasksForDate(dateStr);
            const completed = dayTasks.filter(t => t.completed).length;
            const total = dayTasks.length;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

            // Group by priority
            const high = dayTasks.filter(t => t.priority === 'high');
            const medium = dayTasks.filter(t => t.priority === 'medium');
            const low = dayTasks.filter(t => t.priority === 'low');

            let text = `📋 *تقرير مُنجز اليومي*\n`;
            text += `📅 ${day}، ${date} ${month} ${year}\n`;
            text += `${'━'.repeat(20)}\n\n`;

            if (total === 0) {
                text += `📭 لا توجد مهام في هذا اليوم\n\n`;
            } else {
                // High priority tasks
                if (high.length > 0) {
                    text += `🔴 *أولوية عالية (${high.length}):*\n`;
                    high.forEach(t => {
                        text += `  ${t.completed ? '✅' : '⬜'} ${t.title}\n`;
                    });
                    text += `\n`;
                }

                // Medium priority tasks
                if (medium.length > 0) {
                    text += `🟡 *أولوية متوسطة (${medium.length}):*\n`;
                    text += medium.map(t => `  ${t.completed ? '✅' : '⬜'} ${t.title}`).join('\n');
                    text += `\n\n`;
                }

                // Low priority tasks
                if (low.length > 0) {
                    text += `🟢 *أولوية منخفضة (${low.length}):*\n`;
                    low.forEach(t => {
                        text += `  ${t.completed ? '✅' : '⬜'} ${t.title}\n`;
                    });
                    text += `\n`;
                }

                // Summary at the bottom
                text += `${'━'.repeat(20)}\n`;
                text += `📊 *الملخص:*\n`;
                text += `  📌 إجمالي المهام: ${total}\n`;
                text += `  ✅ مكتملة: ${completed}\n`;
                text += `  ⬜ غير مكتملة: ${total - completed}\n`;
                text += `  🎯 نسبة الإنجاز: ${percent}%\n`;
            }

            text += `\n📱 _تم الإنشاء بواسطة تطبيق مُنجز_`;

            // Open WhatsApp with pre-filled text
            const encodedText = encodeURIComponent(text);
            const whatsappUrl = `https://wa.me/?text=${encodedText}`;
            window.open(whatsappUrl, '_blank');
            UI.showToast('📤 جاري فتح واتساب...');
            this.closeWhatsAppModal();
        }
    };

    // =========================================================
    //  MODULE: Events - All event listeners
    // =========================================================
    const Events = {
        init() {
            // Add task buttons
            document.getElementById('btnAddTask').addEventListener('click', () => UI.openTaskModal());

            // Voice buttons
            document.getElementById('btnVoiceDay').addEventListener('click', () => Voice.listenToMyDay());
            document.getElementById('btnListenDay').addEventListener('click', () => Voice.listenToMyDay());

            // Task form submit
            UI.el.taskForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const data = {
                    title: UI.el.taskTitle.value,
                    description: UI.el.taskDesc.value,
                    priority: UI.el.taskPriority.value,
                    dueDate: UI.el.taskDue.value
                };

                if (UI.el.taskId.value) {
                    TaskManager.update(UI.el.taskId.value, data);
                    UI.showToast('✅ تم تحديث المهمة');
                } else {
                    TaskManager.add(data);
                    UI.showToast('✅ تمت إضافة المهمة');
                }

                UI.closeTaskModal();
                UI.renderAll();
            });

            // Cancel task modal
            document.getElementById('btnCancelTask').addEventListener('click', () => UI.closeTaskModal());

            // Close modals on overlay click
            UI.el.taskModal.addEventListener('click', (e) => {
                if (e.target === UI.el.taskModal) UI.closeTaskModal();
            });
            UI.el.deleteModal.addEventListener('click', (e) => {
                if (e.target === UI.el.deleteModal) UI.closeDeleteModal();
            });

            // Delete confirmation
            document.getElementById('btnConfirmDelete').addEventListener('click', () => {
                if (deleteTargetId) {
                    // Animate removal
                    const card = document.querySelector(`.task-card[data-id="${deleteTargetId}"]`);
                    if (card) card.classList.add('removing');

                    setTimeout(() => {
                        TaskManager.delete(deleteTargetId);
                        UI.closeDeleteModal();
                        UI.renderAll();
                        UI.showToast('🗑️ تم حذف المهمة');
                    }, 300);
                }
            });
            document.getElementById('btnCancelDelete').addEventListener('click', () => UI.closeDeleteModal());

            // Task list event delegation (toggle, edit, delete)
            UI.el.taskList.addEventListener('click', (e) => {
                const target = e.target;

                // Toggle checkbox
                if (target.dataset.toggle) {
                    TaskManager.toggle(target.dataset.toggle);
                    UI.renderAll();
                    return;
                }

                // Edit button
                const editBtn = target.closest('[data-edit]');
                if (editBtn) {
                    const task = tasks.find(t => t.id === editBtn.dataset.edit);
                    if (task) UI.openTaskModal(task);
                    return;
                }

                // Delete button
                const deleteBtn = target.closest('[data-delete]');
                if (deleteBtn) {
                    UI.openDeleteModal(deleteBtn.dataset.delete);
                    return;
                }
            });

            // Filter pills
            document.querySelectorAll('.filter-pill').forEach(pill => {
                pill.addEventListener('click', () => {
                    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    currentFilter = pill.dataset.filter;
                    UI.renderTasks();
                });
            });

            // Export button
            document.getElementById('btnExport').addEventListener('click', () => Export.toJSON());

            // WhatsApp share button — opens date picker modal
            document.getElementById('btnShareWhatsApp').addEventListener('click', () => Export.openWhatsAppModal());

            // WhatsApp modal: quick day buttons
            document.querySelectorAll('.wa-day-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const dateInput = document.getElementById('whatsappDate');
                    const d = new Date();
                    if (btn.dataset.day === 'yesterday') d.setDate(d.getDate() - 1);
                    if (btn.dataset.day === '2days') d.setDate(d.getDate() - 2);
                    dateInput.value = d.toISOString().split('T')[0];
                    // Highlight active button
                    document.querySelectorAll('.wa-day-btn').forEach(b => {
                        b.classList.remove('bg-emerald-500/20', 'border-emerald-500/30', 'text-emerald-400');
                    });
                    btn.classList.add('bg-emerald-500/20', 'border-emerald-500/30', 'text-emerald-400');
                });
            });

            // WhatsApp modal: confirm send
            document.getElementById('btnConfirmWhatsApp').addEventListener('click', () => {
                const dateValue = document.getElementById('whatsappDate').value;
                if (!dateValue) {
                    UI.showToast('⚠️ اختر تاريخ التقرير أولاً');
                    return;
                }
                Export.toWhatsApp(dateValue);
            });

            // WhatsApp modal: cancel
            document.getElementById('btnCancelWhatsApp').addEventListener('click', () => Export.closeWhatsAppModal());
            document.getElementById('whatsappModal').addEventListener('click', (e) => {
                if (e.target.id === 'whatsappModal') Export.closeWhatsAppModal();
            });

            // Clear all tasks
            document.getElementById('btnClearAll').addEventListener('click', () => {
                if (tasks.length === 0) {
                    UI.showToast('لا توجد مهام لحذفها');
                    return;
                }
                deleteTargetId = '__ALL__';
                UI.el.deleteModal.classList.remove('hidden');
                document.querySelector('#deleteModal h3').textContent = 'حذف جميع المهام';
                document.querySelector('#deleteModal p').textContent = 'هل أنت متأكد من حذف جميع المهام؟ لا يمكن التراجع عن هذا الإجراء.';

                // Override confirm handler for clear-all
                const confirmBtn = document.getElementById('btnConfirmDelete');
                const originalHandler = confirmBtn.onclick;
                confirmBtn.onclick = () => {
                    tasks = [];
                    Storage.save(tasks);
                    UI.closeDeleteModal();
                    UI.renderAll();
                    UI.showToast('🗑️ تم حذف جميع المهام');
                    // Reset modal text
                    document.querySelector('#deleteModal h3').textContent = 'حذف المهمة';
                    document.querySelector('#deleteModal p').textContent = 'هل أنت متأكد من حذف هذه المهمة؟ لا يمكن التراجع عن هذا الإجراء.';
                    confirmBtn.onclick = null;
                };
            });
        }
    };

    // =========================================================
    //  MODULE: SVG Gradient - Add gradient def for progress ring
    // =========================================================
    function addProgressGradient() {
        const svg = document.querySelector('.progress-ring');
        if (!svg) return;
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        gradient.setAttribute('id', 'progressGradient');
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('y1', '0%');
        gradient.setAttribute('x2', '100%');
        gradient.setAttribute('y2', '100%');

        const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop1.setAttribute('offset', '0%');
        stop1.setAttribute('stop-color', '#6366f1');
        const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        stop2.setAttribute('offset', '100%');
        stop2.setAttribute('stop-color', '#a855f7');

        gradient.appendChild(stop1);
        gradient.appendChild(stop2);
        defs.appendChild(gradient);
        svg.insertBefore(defs, svg.firstChild);
    }

    // =========================================================
    //  INIT: Bootstrap the application
    // =========================================================
    function init() {
        // Cache DOM elements
        UI.cacheElements();

        // Load tasks from storage
        tasks = Storage.load();

        // Set header date
        UI.setHeaderDate();

        // Initialize Lucide icons
        if (window.lucide) lucide.createIcons();

        // Add SVG gradient
        addProgressGradient();

        // Initialize navigation
        Navigation.init();

        // Bind all events
        Events.init();

        // Render all views
        UI.renderAll();

        // Show splash then reveal app
        UI.initSplash();

        // Start voice reminders
        Voice.startReminders();

        // Ensure voices are loaded (some browsers load asynchronously)
        if (window.speechSynthesis) {
            speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
        }

        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('[App] Service Worker registered:', reg.scope))
                .catch(err => console.log('[App] SW registration failed:', err));
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
