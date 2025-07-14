class TimetableGenerator {
    constructor() {
        this.subjects = [];
        this.schedule = {};
        this.draggedSubject = null;
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.renderSubjects();
        this.renderSchedule();
    }

    setupEventListeners() {
        document.getElementById('addSubject').addEventListener('click', () => {
            this.openModal();
        });

        document.getElementById('saveSchedule').addEventListener('click', () => {
            this.saveToStorage();
            this.showMessage('時間割を保存しました');
        });

        document.getElementById('loadSchedule').addEventListener('click', () => {
            this.loadFromStorage();
            this.showMessage('時間割を読み込みました');
        });

        document.getElementById('clearSchedule').addEventListener('click', () => {
            if (confirm('時間割をクリアしますか？')) {
                this.clearSchedule();
                this.showMessage('時間割をクリアしました');
            }
        });

        document.getElementById('subjectForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSubject();
        });

        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('subjectModal').addEventListener('click', (e) => {
            if (e.target.id === 'subjectModal') {
                this.closeModal();
            }
        });

        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const cells = document.querySelectorAll('.schedule-cell');
        
        cells.forEach(cell => {
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
                cell.classList.add('drag-over');
            });

            cell.addEventListener('dragleave', () => {
                cell.classList.remove('drag-over');
            });

            cell.addEventListener('drop', (e) => {
                e.preventDefault();
                cell.classList.remove('drag-over');
                
                const day = parseInt(cell.dataset.day);
                const period = parseInt(cell.dataset.period);
                
                if (this.draggedSubject) {
                    this.placeSubject(this.draggedSubject, day, period);
                    this.draggedSubject = null;
                }
            });
        });
    }

    openModal() {
        document.getElementById('subjectModal').style.display = 'block';
        document.getElementById('subjectName').focus();
    }

    closeModal() {
        document.getElementById('subjectModal').style.display = 'none';
        document.getElementById('subjectForm').reset();
    }

    addSubject() {
        const name = document.getElementById('subjectName').value.trim();
        const teacher = document.getElementById('teacher').value.trim();
        const classroom = document.getElementById('classroom').value.trim();
        const color = document.getElementById('color').value;

        if (!name) {
            alert('科目名を入力してください');
            return;
        }

        const subject = {
            id: Date.now(),
            name,
            teacher,
            classroom,
            color
        };

        this.subjects.push(subject);
        this.renderSubjects();
        this.closeModal();
        this.saveToStorage();
        this.showMessage('科目を追加しました');
    }

    removeSubject(id) {
        if (confirm('この科目を削除しますか？')) {
            this.subjects = this.subjects.filter(subject => subject.id !== id);
            
            for (let key in this.schedule) {
                if (this.schedule[key] && this.schedule[key].id === id) {
                    delete this.schedule[key];
                }
            }
            
            this.renderSubjects();
            this.renderSchedule();
            this.saveToStorage();
            this.showMessage('科目を削除しました');
        }
    }

    placeSubject(subject, day, period) {
        const key = `${day}-${period}`;
        
        if (this.schedule[key]) {
            if (!confirm('既に科目が配置されています。上書きしますか？')) {
                return;
            }
        }
        
        this.schedule[key] = subject;
        this.renderSchedule();
        this.saveToStorage();
    }

    removeFromSchedule(day, period) {
        const key = `${day}-${period}`;
        delete this.schedule[key];
        this.renderSchedule();
        this.saveToStorage();
    }

    renderSubjects() {
        const container = document.getElementById('subjectList');
        container.innerHTML = '';

        this.subjects.forEach(subject => {
            const element = document.createElement('div');
            element.className = 'subject-item';
            element.style.borderLeftColor = subject.color;
            element.draggable = true;
            
            element.innerHTML = `
                <div class="subject-item-name">${subject.name}</div>
                <div class="subject-item-details">
                    ${subject.teacher ? `担当: ${subject.teacher}` : ''}
                    ${subject.classroom ? `教室: ${subject.classroom}` : ''}
                </div>
                <div class="subject-item-actions">
                    <button onclick="timetable.removeSubject(${subject.id})">削除</button>
                </div>
            `;

            element.addEventListener('dragstart', (e) => {
                this.draggedSubject = subject;
                element.classList.add('dragging');
            });

            element.addEventListener('dragend', () => {
                element.classList.remove('dragging');
            });

            container.appendChild(element);
        });
    }

    renderSchedule() {
        const cells = document.querySelectorAll('.schedule-cell');
        
        cells.forEach(cell => {
            const day = parseInt(cell.dataset.day);
            const period = parseInt(cell.dataset.period);
            const key = `${day}-${period}`;
            const subject = this.schedule[key];
            
            if (subject) {
                cell.classList.add('has-subject');
                cell.style.backgroundColor = subject.color;
                cell.innerHTML = `
                    <div class="subject-content">
                        <div class="subject-name">${subject.name}</div>
                        <div class="subject-details">
                            ${subject.teacher ? subject.teacher : ''}
                            ${subject.classroom ? `<br>${subject.classroom}` : ''}
                        </div>
                    </div>
                `;
                
                cell.addEventListener('dblclick', () => {
                    this.removeFromSchedule(day, period);
                });
            } else {
                cell.classList.remove('has-subject');
                cell.style.backgroundColor = '';
                cell.innerHTML = '';
            }
        });
    }

    saveToStorage() {
        const data = {
            subjects: this.subjects,
            schedule: this.schedule
        };
        localStorage.setItem('timetable-data', JSON.stringify(data));
    }

    loadFromStorage() {
        const data = localStorage.getItem('timetable-data');
        if (data) {
            const parsed = JSON.parse(data);
            this.subjects = parsed.subjects || [];
            this.schedule = parsed.schedule || {};
            this.renderSubjects();
            this.renderSchedule();
        }
    }

    clearSchedule() {
        this.subjects = [];
        this.schedule = {};
        this.renderSubjects();
        this.renderSchedule();
        this.saveToStorage();
    }

    showMessage(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'notification';
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            messageDiv.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(messageDiv);
            }, 300);
        }, 2000);
    }
}

const timetable = new TimetableGenerator();

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        timetable.closeModal();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    console.log('時間割ジェネレーターが初期化されました');
});