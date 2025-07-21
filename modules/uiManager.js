// UI管理モジュール
class UIManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentTab = 'settings';
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // 出力タブの場合はプレビューを更新
        if (tabName === 'output' && window.app) {
            window.app.updatePreview();
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    updateDisplay() {
        this.renderTeachers();
        this.renderClasses();
        this.renderSubjects();
    }

    renderTeachers() {
        const container = document.getElementById('teachers-list');
        if (!container) return;
        
        container.innerHTML = '';
        this.dataManager.teachers.forEach((teacher, index) => {
            const div = document.createElement('div');
            div.className = 'teacher-item';
            
            // 複数教科対応の表示
            let subjectsHtml = '';
            let gradeInfo = '';
            
            if (teacher.subjects && teacher.subjects.length > 0) {
                subjectsHtml = teacher.subjects.map(subject => {
                    const classInfo = subject.className ? ` - ${subject.className}` : '';
                    return `<span class="subject-badge">${subject.name}${classInfo} (${subject.hours}h)</span>`;
                }).join('');
                
                if (teacher.targetGrade) {
                    gradeInfo = `<span class="grade-info">${teacher.targetGrade}年生対象</span>`;
                } else {
                    gradeInfo = `<span class="grade-info">全学年平均</span>`;
                }
            } else {
                // 旧形式との互換性
                subjectsHtml = `<span class="subject-badge">${teacher.subject} (${teacher.hours}h)</span>`;
            }
            
            div.innerHTML = `
                <div>
                    <strong>${teacher.name}</strong>
                    ${gradeInfo}
                    <div class="teacher-subjects">${subjectsHtml}</div>
                </div>
                <button onclick="app.removeTeacher(${index})" class="remove-btn">削除</button>
            `;
            container.appendChild(div);
        });
    }

    renderClasses() {
        const container = document.getElementById('classes-grid');
        if (!container) {
            console.warn('classes-grid container not found');
            return;
        }
        
        const classesToShow = this.dataManager.classes;
        console.log('Rendering classes:', classesToShow.length);
        
        container.innerHTML = '';
        classesToShow.forEach((cls) => {
            const div = document.createElement('div');
            const cardClasses = ['class-card'];
            
            if (cls.active) {
                cardClasses.push('active');
            } else {
                cardClasses.push('inactive');
            }
            
            if (cls.type === 'special_support') {
                cardClasses.push('special-support');
            }
            
            div.className = cardClasses.join(' ');
            
            const typeText = cls.type === 'special_support' ? '特別支援' : '通常';
            const activeText = cls.active ? '有効' : '無効';
            
            div.innerHTML = `
                <div class="class-header">
                    <span class="class-name">${cls.name}</span>
                    <span class="class-type-badge ${cls.type}">${typeText}</span>
                </div>
                <div class="class-info">
                    生徒数: ${cls.students}人<br>
                    状態: ${activeText}
                </div>
                <div class="class-actions">
                    <button class="class-btn toggle-type" onclick="app.toggleClassType('${cls.id}')">
                        ${cls.type === 'regular' ? '特支に変更' : '通常に変更'}
                    </button>
                    <button class="class-btn toggle-active" onclick="app.toggleClassActive('${cls.id}')">
                        ${cls.active ? '無効化' : '有効化'}
                    </button>
                </div>
            `;
            container.appendChild(div);
        });
        
        console.log('Rendered', container.children.length, 'class cards');
    }

    renderSubjects() {
        const container = document.getElementById('subjects-list');
        if (!container) return;
        
        container.innerHTML = '';
        this.dataManager.subjects.forEach((subject, index) => {
            const div = document.createElement('div');
            div.className = 'subject-item';
            div.innerHTML = `
                <span style="color: ${subject.color}">${subject.name}</span>
                <button onclick="app.removeSubject(${index})" class="remove-btn">削除</button>
            `;
            container.appendChild(div);
        });
    }

    // フォーム関連
    clearForm(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.reset();
        }
    }

    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return null;

        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        return data;
    }

    // バリデーション
    validateInput(value, type = 'text') {
        if (type === 'text') {
            return value && value.trim().length > 0;
        }
        if (type === 'number') {
            return !isNaN(value) && parseInt(value) > 0;
        }
        return false;
    }
}