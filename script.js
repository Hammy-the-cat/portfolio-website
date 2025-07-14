class TimetableGenerator {
    constructor() {
        this.teachers = [];
        this.classes = [];
        this.subjects = [];
        this.schedule = {};
        this.currentTab = 'settings';
        this.init();
    }

    init() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.renderAllData();
    }

    setupEventListeners() {
        // タブ切り替え
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // 設定画面のイベント
        document.getElementById('add-teacher').addEventListener('click', () => this.addTeacher());
        document.getElementById('add-class').addEventListener('click', () => this.addClass());
        document.getElementById('add-subject').addEventListener('click', () => this.addSubject());
        
        document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
        document.getElementById('load-settings').addEventListener('click', () => this.loadSettings());
        document.getElementById('reset-settings').addEventListener('click', () => this.resetSettings());

        // 生成画面のイベント
        document.getElementById('generate-schedule').addEventListener('click', () => this.generateSchedule());
        document.getElementById('manual-edit').addEventListener('click', () => this.enableManualEdit());

        // フルスクリーン機能
        document.getElementById('fullscreen-settings').addEventListener('click', () => this.toggleFullscreen('settings'));

        // 出力画面のイベント
        document.getElementById('export-png').addEventListener('click', () => this.exportPNG());
        document.getElementById('export-pdf').addEventListener('click', () => this.exportPDF());
        document.getElementById('export-json').addEventListener('click', () => this.exportJSON());
        document.getElementById('export-csv').addEventListener('click', () => this.exportCSV());
        document.getElementById('export-excel').addEventListener('click', () => this.exportExcel());
        document.getElementById('export-project').addEventListener('click', () => this.exportProject());
        
        document.getElementById('import-project-btn').addEventListener('click', () => {
            document.getElementById('import-project').click();
        });
        document.getElementById('import-project').addEventListener('change', (e) => this.importProject(e));
    }

    switchTab(tabName) {
        // タブボタンの状態を更新
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // タブコンテンツの表示を切り替え
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;

        // 出力タブの場合はプレビューを更新
        if (tabName === 'output') {
            this.updatePreview();
        }
    }

    // === 設定画面の機能 ===
    addTeacher() {
        const name = document.getElementById('teacher-name').value.trim();
        const subject = document.getElementById('teacher-subject').value.trim();
        const hours = parseInt(document.getElementById('teacher-hours').value);

        if (!name || !subject || !hours) {
            this.showMessage('すべての項目を入力してください', 'error');
            return;
        }

        const teacher = {
            id: Date.now(),
            name,
            subject,
            hours
        };

        this.teachers.push(teacher);
        this.renderTeachers();
        this.clearTeacherForm();
        this.saveToStorage();
        this.showMessage('教師を追加しました');
    }

    addClass() {
        const name = document.getElementById('class-name').value.trim();
        const students = parseInt(document.getElementById('class-students').value);

        if (!name || !students) {
            this.showMessage('すべての項目を入力してください', 'error');
            return;
        }

        const classObj = {
            id: Date.now(),
            name,
            students
        };

        this.classes.push(classObj);
        this.renderClasses();
        this.clearClassForm();
        this.saveToStorage();
        this.showMessage('クラスを追加しました');
    }

    addSubject() {
        const name = document.getElementById('subject-name').value.trim();
        const hours = parseInt(document.getElementById('subject-hours').value);
        const color = document.getElementById('subject-color').value;

        if (!name || !hours) {
            this.showMessage('すべての項目を入力してください', 'error');
            return;
        }

        const subject = {
            id: Date.now(),
            name,
            hours,
            color
        };

        this.subjects.push(subject);
        this.renderSubjects();
        this.clearSubjectForm();
        this.saveToStorage();
        this.showMessage('教科を追加しました');
    }

    removeTeacher(id) {
        if (confirm('この教師を削除しますか？')) {
            this.teachers = this.teachers.filter(t => t.id !== id);
            this.renderTeachers();
            this.saveToStorage();
            this.showMessage('教師を削除しました');
        }
    }

    removeClass(id) {
        if (confirm('このクラスを削除しますか？')) {
            this.classes = this.classes.filter(c => c.id !== id);
            this.renderClasses();
            this.saveToStorage();
            this.showMessage('クラスを削除しました');
        }
    }

    removeSubject(id) {
        if (confirm('この教科を削除しますか？')) {
            this.subjects = this.subjects.filter(s => s.id !== id);
            this.renderSubjects();
            this.saveToStorage();
            this.showMessage('教科を削除しました');
        }
    }

    // === レンダリング機能 ===
    renderAllData() {
        this.renderTeachers();
        this.renderClasses();
        this.renderSubjects();
        this.renderSchedule();
    }

    renderTeachers() {
        const container = document.getElementById('teachers-list');
        container.innerHTML = '';

        this.teachers.forEach(teacher => {
            const element = document.createElement('div');
            element.className = 'data-item';
            element.innerHTML = `
                <div class="data-item-info">
                    <div class="data-item-name">${teacher.name}</div>
                    <div class="data-item-details">担当: ${teacher.subject} | 週${teacher.hours}時間</div>
                </div>
                <div class="data-item-actions">
                    <button onclick="timetable.removeTeacher(${teacher.id})">削除</button>
                </div>
            `;
            container.appendChild(element);
        });
    }

    renderClasses() {
        const container = document.getElementById('classes-list');
        container.innerHTML = '';

        this.classes.forEach(classObj => {
            const element = document.createElement('div');
            element.className = 'data-item';
            element.innerHTML = `
                <div class="data-item-info">
                    <div class="data-item-name">${classObj.name}</div>
                    <div class="data-item-details">生徒数: ${classObj.students}人</div>
                </div>
                <div class="data-item-actions">
                    <button onclick="timetable.removeClass(${classObj.id})">削除</button>
                </div>
            `;
            container.appendChild(element);
        });
    }

    renderSubjects() {
        const container = document.getElementById('subjects-list');
        container.innerHTML = '';

        this.subjects.forEach(subject => {
            const element = document.createElement('div');
            element.className = 'data-item';
            element.style.borderLeftColor = subject.color;
            element.innerHTML = `
                <div class="data-item-info">
                    <div class="data-item-name">${subject.name}</div>
                    <div class="data-item-details">週${subject.hours}時間</div>
                </div>
                <div class="data-item-actions">
                    <button onclick="timetable.removeSubject(${subject.id})">削除</button>
                </div>
            `;
            container.appendChild(element);
        });
    }

    renderSchedule() {
        const cells = document.querySelectorAll('.schedule-cell');
        
        cells.forEach(cell => {
            const day = parseInt(cell.dataset.day);
            const period = parseInt(cell.dataset.period);
            const key = `${day}-${period}`;
            const assignment = this.schedule[key];
            
            if (assignment) {
                cell.classList.add('has-subject');
                cell.style.backgroundColor = assignment.subject.color;
                cell.innerHTML = `
                    <div class="subject-content">
                        <div class="subject-name">${assignment.subject.name}</div>
                        <div class="subject-details">
                            ${assignment.teacher ? assignment.teacher.name : ''}
                            ${assignment.class ? `<br>${assignment.class.name}` : ''}
                        </div>
                    </div>
                `;
            } else {
                cell.classList.remove('has-subject');
                cell.style.backgroundColor = '';
                cell.innerHTML = '';
            }
        });
    }

    // === 時間割生成機能 ===
    generateSchedule() {
        if (this.subjects.length === 0 || this.teachers.length === 0 || this.classes.length === 0) {
            this.showMessage('教師、クラス、教科の情報を設定してください', 'error');
            return;
        }

        this.schedule = {};
        
        const optimizeTeachers = document.getElementById('optimize-teachers').checked;
        const avoidConflicts = document.getElementById('avoid-conflicts').checked;
        const balanceSubjects = document.getElementById('balance-subjects').checked;

        // シンプルな時間割生成アルゴリズム
        const totalSlots = 5 * 6; // 5日 × 6限
        const assignments = [];

        // 各教科について必要な授業時間数分の割り当てを作成
        this.subjects.forEach(subject => {
            for (let i = 0; i < subject.hours; i++) {
                // 対応する教師を見つける
                const teacher = this.teachers.find(t => t.subject === subject.name);
                // 最初のクラスを使用（複数クラス対応は今後の拡張）
                const classObj = this.classes[0];
                
                assignments.push({
                    subject,
                    teacher,
                    class: classObj
                });
            }
        });

        // ランダムに時間割に配置
        const shuffledAssignments = this.shuffleArray([...assignments]);
        
        for (let day = 0; day < 5; day++) {
            for (let period = 0; period < 6; period++) {
                const key = `${day}-${period}`;
                const assignmentIndex = day * 6 + period;
                
                if (assignmentIndex < shuffledAssignments.length) {
                    this.schedule[key] = shuffledAssignments[assignmentIndex];
                }
            }
        }

        this.renderSchedule();
        this.saveToStorage();
        this.showMessage('時間割を生成しました');
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    enableManualEdit() {
        // 手動編集モードを有効にする（ドラッグ&ドロップ機能）
        this.showMessage('手動編集モードは今後実装予定です', 'info');
    }

    // === 出力機能 ===
    exportPNG() {
        this.showMessage('PNG出力機能は今後実装予定です', 'info');
    }

    exportPDF() {
        this.showMessage('PDF出力機能は今後実装予定です', 'info');
    }

    exportJSON() {
        const data = {
            teachers: this.teachers,
            classes: this.classes,
            subjects: this.subjects,
            schedule: this.schedule
        };
        
        this.downloadFile('timetable.json', JSON.stringify(data, null, 2), 'application/json');
        this.showMessage('JSONファイルをダウンロードしました');
    }

    exportCSV() {
        this.showMessage('CSV出力機能は今後実装予定です', 'info');
    }

    exportExcel() {
        this.showMessage('Excel出力機能は今後実装予定です', 'info');
    }

    exportProject() {
        this.exportJSON();
    }

    importProject(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.teachers && data.classes && data.subjects && data.schedule) {
                    this.teachers = data.teachers;
                    this.classes = data.classes;
                    this.subjects = data.subjects;
                    this.schedule = data.schedule;
                    
                    this.renderAllData();
                    this.saveToStorage();
                    this.showMessage('プロジェクトファイルを読み込みました');
                } else {
                    this.showMessage('無効なプロジェクトファイルです', 'error');
                }
            } catch (error) {
                this.showMessage('ファイルの読み込みに失敗しました', 'error');
            }
        };
        reader.readAsText(file);
    }

    toggleFullscreen(tabName) {
        const tab = document.getElementById(`${tabName}-tab`);
        const header = document.querySelector('header');
        
        if (tab.classList.contains('fullscreen')) {
            // フルスクリーンを終了
            tab.classList.remove('fullscreen');
            header.style.display = 'block';
            
            // フルスクリーンヘッダーを削除
            const fullscreenHeader = tab.querySelector('.fullscreen-header');
            if (fullscreenHeader) {
                fullscreenHeader.remove();
            }
        } else {
            // フルスクリーンに切り替え
            tab.classList.add('fullscreen');
            header.style.display = 'none';
            
            // フルスクリーンヘッダーを追加
            const fullscreenHeader = document.createElement('div');
            fullscreenHeader.className = 'fullscreen-header';
            fullscreenHeader.innerHTML = `
                <h1 class="fullscreen-title">設定画面</h1>
                <button class="fullscreen-close" onclick="timetable.toggleFullscreen('${tabName}')">
                    全画面表示を終了
                </button>
            `;
            tab.insertBefore(fullscreenHeader, tab.firstChild);
        }
    }

    updatePreview() {
        const preview = document.getElementById('schedule-preview');
        
        if (Object.keys(this.schedule).length === 0) {
            preview.innerHTML = '<p>時間割を生成してからプレビューが表示されます</p>';
        } else {
            // 簡単なテーブル形式でプレビューを表示
            let html = '<table style="width: 100%; border-collapse: collapse;">';
            html += '<tr><th></th><th>月</th><th>火</th><th>水</th><th>木</th><th>金</th></tr>';
            
            for (let period = 0; period < 6; period++) {
                html += `<tr><th>${period + 1}限</th>`;
                for (let day = 0; day < 5; day++) {
                    const key = `${day}-${period}`;
                    const assignment = this.schedule[key];
                    const content = assignment ? assignment.subject.name : '-';
                    html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${content}</td>`;
                }
                html += '</tr>';
            }
            html += '</table>';
            preview.innerHTML = html;
        }
    }

    // === ユーティリティ機能 ===
    clearTeacherForm() {
        document.getElementById('teacher-name').value = '';
        document.getElementById('teacher-subject').value = '';
        document.getElementById('teacher-hours').value = '';
    }

    clearClassForm() {
        document.getElementById('class-name').value = '';
        document.getElementById('class-students').value = '';
    }

    clearSubjectForm() {
        document.getElementById('subject-name').value = '';
        document.getElementById('subject-hours').value = '';
        document.getElementById('subject-color').value = '#4CAF50';
    }

    saveSettings() {
        this.saveToStorage();
        this.showMessage('設定を保存しました');
    }

    loadSettings() {
        this.loadFromStorage();
        this.renderAllData();
        this.showMessage('設定を読み込みました');
    }

    resetSettings() {
        if (confirm('すべての設定をリセットしますか？')) {
            this.teachers = [];
            this.classes = [];
            this.subjects = [];
            this.schedule = {};
            this.renderAllData();
            this.saveToStorage();
            this.showMessage('設定をリセットしました');
        }
    }

    saveToStorage() {
        const data = {
            teachers: this.teachers,
            classes: this.classes,
            subjects: this.subjects,
            schedule: this.schedule
        };
        localStorage.setItem('timetable-generator-data', JSON.stringify(data));
    }

    loadFromStorage() {
        const data = localStorage.getItem('timetable-generator-data');
        if (data) {
            const parsed = JSON.parse(data);
            this.teachers = parsed.teachers || [];
            this.classes = parsed.classes || [];
            this.subjects = parsed.subjects || [];
            this.schedule = parsed.schedule || {};
        }
    }

    downloadFile(filename, content, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showMessage(message, type = 'success') {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'notification';
        messageDiv.textContent = message;
        
        if (type === 'error') {
            messageDiv.style.backgroundColor = '#f44336';
        } else if (type === 'info') {
            messageDiv.style.backgroundColor = '#2196F3';
        }
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            messageDiv.classList.remove('show');
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    document.body.removeChild(messageDiv);
                }
            }, 300);
        }, 3000);
    }
}

// 通知のスタイル
const style = document.createElement('style');
style.textContent = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 1rem 2rem;
    border-radius: 4px;
    z-index: 10000;
    opacity: 0;
    transform: translateX(100%);
    transition: all 0.3s ease;
    font-weight: 500;
}

.notification.show {
    opacity: 1;
    transform: translateX(0);
}
`;
document.head.appendChild(style);

// アプリケーションを初期化
const timetable = new TimetableGenerator();

document.addEventListener('DOMContentLoaded', () => {
    console.log('時間割ジェネレーターが初期化されました');
});