// モジュール1: データ管理
class DataManager {
    constructor() {
        this.teachers = [];
        this.classes = [];
        this.subjects = [];
        this.schedule = {};
    }

    // LocalStorage最適化
    saveToStorage() {
        try {
            const data = {
                teachers: this.teachers,
                classes: this.classes,
                subjects: this.subjects,
                timestamp: Date.now()
            };
            
            // データ圧縮（JSON文字列の圧縮）
            const compressed = JSON.stringify(data);
            localStorage.setItem('timetable-data', compressed);
            
            // 古いデータのクリーンアップ
            this.cleanupOldData();
            
            return true;
        } catch (error) {
            console.error('Storage save failed:', error);
            return false;
        }
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('timetable-data');
            if (data) {
                const parsed = JSON.parse(data);
                this.teachers = parsed.teachers || [];
                this.classes = parsed.classes || [];
                this.subjects = parsed.subjects || [];
                
                // データ整合性チェック
                this.validateData();
            }
        } catch (error) {
            console.error('Storage load failed:', error);
            this.resetData();
        }
    }

    cleanupOldData() {
        const keys = Object.keys(localStorage);
        const oldKeys = keys.filter(key => 
            key.startsWith('timetable-') && 
            key !== 'timetable-data'
        );
        oldKeys.forEach(key => localStorage.removeItem(key));
    }

    validateData() {
        this.teachers = this.teachers.filter(t => t && t.name);
        this.classes = this.classes.filter(c => c && c.name);
        this.subjects = this.subjects.filter(s => s && s.name);
    }

    resetData() {
        this.teachers = [];
        this.classes = [];
        this.subjects = [];
        this.schedule = {};
    }
}

// モジュール2: UI管理
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
            div.innerHTML = `
                <span>${teacher.name} - ${teacher.subject} (${teacher.hours}時間/週)</span>
                <button onclick="app.removeTeacher(${index})" class="remove-btn">削除</button>
            `;
            container.appendChild(div);
        });
    }

    renderClasses() {
        const container = document.getElementById('classes-list');
        if (!container) return;
        
        container.innerHTML = '';
        this.dataManager.classes.forEach((cls, index) => {
            const div = document.createElement('div');
            div.className = 'class-item';
            div.innerHTML = `
                <span>${cls.name}</span>
                <button onclick="app.removeClass(${index})" class="remove-btn">削除</button>
            `;
            container.appendChild(div);
        });
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
}

class TimetableGenerator {
    constructor() {
        this.dataManager = new DataManager();
        this.uiManager = new UIManager(this.dataManager);
        this.init();
    }

    init() {
        this.dataManager.loadFromStorage();
        this.setupEventListeners();
        this.setupAdditionalEventListeners();
        this.uiManager.updateDisplay();
    }

    setupEventListeners() {
        // タブ切り替え
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.uiManager.switchTab(e.target.dataset.tab);
            });
        });

        // 設定画面のイベント - 要素の存在確認付き
        this.safeAddEventListener('add-teacher', 'click', () => this.addTeacher());
        this.safeAddEventListener('init-default-classes', 'click', () => this.initializeDefaultClasses());
        this.safeAddEventListener('add-grade-1', 'click', () => this.addGradeClasses(1));
        this.safeAddEventListener('add-grade-2', 'click', () => this.addGradeClasses(2));
        this.safeAddEventListener('add-grade-3', 'click', () => this.addGradeClasses(3));
        
        this.safeAddEventListener('save-settings', 'click', () => this.saveSettings());
        this.safeAddEventListener('load-settings', 'click', () => this.loadSettings());
        this.safeAddEventListener('reset-settings', 'click', () => this.resetSettings());

        // 生成画面のイベント
        this.safeAddEventListener('generate-schedule', 'click', () => this.generateSchedule());
        this.safeAddEventListener('manual-edit', 'click', () => this.enableManualEdit());

        // フルスクリーン機能
        this.safeAddEventListener('fullscreen-settings', 'click', () => this.toggleFullscreen('settings'));

        // 出力画面のイベント
        this.safeAddEventListener('export-pdf', 'click', () => this.exportPDF());
        this.safeAddEventListener('export-excel', 'click', () => this.exportExcel());
        this.safeAddEventListener('export-json', 'click', () => this.exportJSON());
        this.safeAddEventListener('import-json', 'change', (e) => this.importJSON(e));
        
        // 教師登録の学年選択変更
        this.safeAddEventListener('target-grade', 'change', () => this.updateClassOptions());
        
        // 教科選択の変更監視
        for (let i = 1; i <= 3; i++) {
            this.safeAddEventListener(`teacher-subject-${i}`, 'change', () => {
                this.updateHoursDisplay(i);
                this.updateSubjectRows();
            });
        }
    }

    safeAddEventListener(elementId, event, callback) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, callback);
            console.log(`Event listener added for ${elementId}`);
        } else {
            console.log(`Element not found: ${elementId}`);
        }
    }
    
    setupAdditionalEventListeners() {
        this.safeAddEventListener('export-project', 'click', () => this.exportProject());
        
        this.safeAddEventListener('import-project-btn', 'click', () => {
            document.getElementById('import-project').click();
        });
        this.safeAddEventListener('import-project', 'change', (e) => this.importProject(e));
    }


    // === 設定画面の機能 ===
    addTeacher() {
        console.log('Adding teacher...');
        const teacherName = document.getElementById('teacher-name').value.trim();
        
        if (!teacherName) {
            alert('教師名を入力してください');
            return;
        }
        
        // 選択された教科と担当クラスを収集
        const subjects = [];
        for (let i = 1; i <= 3; i++) {
            const subjectSelect = document.getElementById(`teacher-subject-${i}`);
            const classSelect = document.getElementById(`teacher-class-${i}`);
            
            if (subjectSelect && subjectSelect.value && classSelect && classSelect.value) {
                subjects.push({
                    subject: subjectSelect.value,
                    classId: classSelect.value,
                    className: classSelect.options[classSelect.selectedIndex].text
                });
            }
        }
        
        if (subjects.length === 0) {
            alert('最低1つの教科と担当クラスを選択してください');
            return;
        }
        
        const teacher = {
            id: Date.now().toString(),
            name: teacherName,
            subjects: subjects
        };
        
        this.dataManager.addTeacher(teacher);
        this.uiManager.updateDisplay();
        this.clearTeacherForm();
        
        console.log('Teacher added:', teacher);
    }

    initializeDefaultClasses() {
        console.log('Initializing default classes...');
        this.dataManager.initializeDefaultClasses();
        this.uiManager.updateDisplay();
        this.updateClassOptions();
    }

    addGradeClasses(grade) {
        console.log(`Adding classes for grade ${grade}...`);
        this.dataManager.addGradeClasses(grade);
        this.uiManager.updateDisplay();
        this.updateClassOptions();
    }

    clearTeacherForm() {
        document.getElementById('teacher-name').value = '';
        
        for (let i = 1; i <= 3; i++) {
            const subjectSelect = document.getElementById(`teacher-subject-${i}`);
            const classSelect = document.getElementById(`teacher-class-${i}`);
            const hoursDisplay = document.getElementById(`hours-display-${i}`);
            const row = document.getElementById(`subject-row-${i}`);
            
            if (subjectSelect) subjectSelect.value = '';
            if (classSelect) classSelect.value = '';
            if (hoursDisplay) hoursDisplay.textContent = '-';
            
            // 2行目以降は非表示に
            if (i > 1 && row) {
                row.style.display = 'none';
            }
        }
    }

    updateClassOptions() {
        console.log('Updating class options...');
        const gradeSelect = document.getElementById('target-grade');
        const selectedGrade = gradeSelect ? gradeSelect.value : '';
        
        console.log('Selected grade:', selectedGrade);
        
        // 各教科行のクラス選択を更新
        for (let i = 1; i <= 3; i++) {
            this.updateClassSelectForRow(i, selectedGrade);
        }
    }

    updateClassSelectForRow(rowNumber, selectedGrade) {
        const classSelect = document.getElementById(`teacher-class-${rowNumber}`);
        if (!classSelect) {
            console.log(`Class select not found for row ${rowNumber}`);
            return;
        }
        
        // 既存のオプションをクリア（最初のデフォルトオプション以外）
        while (classSelect.children.length > 1) {
            classSelect.removeChild(classSelect.lastChild);
        }
        
        // クラス一覧を取得
        const classes = this.dataManager.classes;
        console.log('Available classes:', classes);
        
        if (classes && classes.length > 0) {
            classes.forEach(cls => {
                // 学年フィルタ
                if (selectedGrade && cls.grade && cls.grade.toString() !== selectedGrade) {
                    return;
                }
                
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                classSelect.appendChild(option);
            });
            console.log(`Updated class options for row ${rowNumber}, count:`, classSelect.children.length - 1);
        } else {
            console.log('No classes found');
        }
    }

    updateHoursDisplay(rowNumber) {
        // 時数表示の更新ロジック
        const hoursDisplay = document.getElementById(`hours-display-${rowNumber}`);
        if (hoursDisplay) {
            hoursDisplay.textContent = '-'; // 仮の実装
        }
    }

    updateSubjectRows() {
        // 教科行の表示更新ロジック
        for (let i = 1; i <= 3; i++) {
            const subjectSelect = document.getElementById(`teacher-subject-${i}`);
            const row = document.getElementById(`subject-row-${i}`);
            
            if (subjectSelect && subjectSelect.value && row) {
                row.style.display = 'flex';
                
                // 次の行を表示
                if (i < 3) {
                    const nextRow = document.getElementById(`subject-row-${i + 1}`);
                    if (nextRow && nextRow.style.display === 'none') {
                        nextRow.style.display = 'flex';
                    }
                }
            }
        }
    }

    // === 基本機能 ===
    generateSchedule() {
        console.log('時間割生成中...');
        alert('時間割生成機能は準備中です');
    }

    enableManualEdit() {
        console.log('手動編集モード');
        alert('手動編集機能は準備中です');
    }

    toggleFullscreen(tabName) {
        const tab = document.getElementById(`${tabName}-tab`);
        const header = document.querySelector('header');
        
        if (tab.classList.contains('fullscreen')) {
            tab.classList.remove('fullscreen');
            header.style.display = 'block';
        } else {
            tab.classList.add('fullscreen');
            header.style.display = 'none';
        }
    }

    saveSettings() {
        this.dataManager.saveToStorage();
        alert('設定を保存しました');
    }

    loadSettings() {
        this.dataManager.loadFromStorage();
        this.uiManager.updateDisplay();
        this.updateClassOptions();
        alert('設定を読み込みました');
    }

    resetSettings() {
        if (confirm('すべての設定をリセットしますか？')) {
            this.dataManager.teachers = [];
            this.dataManager.classes = [];
            this.dataManager.subjects = [];
            this.dataManager.saveToStorage();
            this.uiManager.updateDisplay();
            alert('設定をリセットしました');
        }
    }

    exportPDF() {
        alert('PDF出力機能は準備中です');
    }

    exportExcel() {
        alert('Excel出力機能は準備中です');
    }

    exportJSON() {
        const data = {
            teachers: this.dataManager.teachers,
            classes: this.dataManager.classes,
            subjects: this.dataManager.subjects,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timetable-data.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.teachers && data.classes) {
                    this.dataManager.teachers = data.teachers;
                    this.dataManager.classes = data.classes;
                    this.dataManager.subjects = data.subjects || [];
                    
                    this.dataManager.saveToStorage();
                    this.uiManager.updateDisplay();
                    this.updateClassOptions();
                    
                    alert('データを読み込みました');
                } else {
                    alert('無効なファイル形式です');
                }
            } catch (error) {
                alert('ファイルの読み込みに失敗しました');
            }
        };
        reader.readAsText(file);
    }

    exportProject() {
        this.exportJSON();
    }

    importProject(event) {
        this.importJSON(event);
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

// 特別支援教育クラス別時数管理
class SpecialSupportHoursManager {
    constructor() {
        this.classHoursConfig = new Map(); // クラスID -> 時数設定のマップ
        this.currentSelectedClass = null;
        this.loadFromStorage();
        this.initializeEvents();
        this.loadSpecialSupportClasses();
    }

    initializeEvents() {
        // クラス選択ドロップダウンの変更イベント
        const classSelector = document.getElementById('special-class-selector');
        if (classSelector) {
            classSelector.addEventListener('change', (e) => {
                this.selectClass(e.target.value);
            });
        }

        // 設定読み込みボタン
        const loadButton = document.getElementById('load-class-config');
        if (loadButton) {
            loadButton.addEventListener('click', () => {
                this.loadClassConfig();
            });
        }

        // 保存ボタン
        const saveButton = document.getElementById('save-special-config');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.saveClassConfig();
            });
        }

        // リセットボタン
        const resetButton = document.getElementById('reset-special-config');
        if (resetButton) {
            resetButton.addEventListener('click', () => {
                this.resetToDefault();
            });
        }

        // 時数入力フィールドの変更監視
        this.setupHoursInputListeners();
    }

    setupHoursInputListeners() {
        const hoursInputs = document.querySelectorAll('.hours-input');
        hoursInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.calculateTotal();
            });
        });
    }

    loadSpecialSupportClasses() {
        const classSelector = document.getElementById('special-class-selector');
        if (!classSelector) return;

        // 既存のoptionをクリア（最初のデフォルトオプション以外）
        while (classSelector.children.length > 1) {
            classSelector.removeChild(classSelector.lastChild);
        }

        // 特別支援クラスを取得してドロップダウンに追加
        const specialSupportClasses = this.getSpecialSupportClasses();
        console.log('特別支援クラス:', specialSupportClasses);
        
        specialSupportClasses.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            classSelector.appendChild(option);
        });
    }

    getSpecialSupportClasses() {
        // DataManagerからクラス情報を取得
        if (typeof timetable !== 'undefined' && timetable.classes) {
            console.log('全クラス:', timetable.classes);
            const specialClasses = timetable.classes.filter(cls => {
                console.log('クラス確認:', cls.name, 'タイプ:', cls.type);
                return cls.type === '特別支援' || cls.type === 'special-support';
            });
            console.log('フィルター後の特別支援クラス:', specialClasses);
            return specialClasses;
        }
        return [];
    }

    // クラス情報が更新された時に呼び出される関数
    refreshClassList() {
        this.loadSpecialSupportClasses();
    }

    selectClass(classId) {
        if (!classId) {
            this.hideConfigSection();
            return;
        }

        this.currentSelectedClass = classId;
        this.showConfigSection();
        this.updateClassTitle(classId);
        this.loadClassConfig();
    }

    showConfigSection() {
        const configSection = document.getElementById('hours-config-section');
        if (configSection) {
            configSection.style.display = 'block';
        }
    }

    hideConfigSection() {
        const configSection = document.getElementById('hours-config-section');
        if (configSection) {
            configSection.style.display = 'none';
        }
        this.currentSelectedClass = null;
    }

    updateClassTitle(classId) {
        const titleElement = document.getElementById('current-class-title');
        const className = this.getClassName(classId);
        if (titleElement) {
            titleElement.textContent = `設定中: ${className}`;
        }
    }

    getClassName(classId) {
        const cls = timetable.classes.find(c => c.id === classId);
        return cls ? cls.name : `クラス ${classId}`;
    }

    loadClassConfig() {
        if (!this.currentSelectedClass) return;

        // 保存された設定があるかチェック
        const savedConfig = this.classHoursConfig.get(this.currentSelectedClass);
        
        if (savedConfig) {
            // 保存された設定を入力フィールドに反映
            this.applyConfigToForm(savedConfig);
        } else {
            // デフォルト値（29時間基準）を設定
            this.setDefaultHours();
        }
        
        this.calculateTotal();
    }

    applyConfigToForm(config) {
        Object.entries(config).forEach(([subjectId, hours]) => {
            const input = document.getElementById(subjectId);
            if (input) {
                input.value = hours;
            }
        });
    }

    setDefaultHours() {
        // 29時間基準のデフォルト値
        const defaultHours = {
            'special-kokugo': 4,
            'special-shakai': 2,
            'special-sugaku': 4,
            'special-rika': 2,
            'special-ongaku': 2,
            'special-bijutsu': 1,
            'special-taiiku': 3,
            'special-gijutsu': 2,
            'special-gaikokugo': 3,
            'special-doutoku': 1,
            'special-sougou': 2,
            'special-tokkatsu': 1,
            'special-jiritsu': 1,
            'special-sagyou': 1
        };

        this.applyConfigToForm(defaultHours);
    }

    saveClassConfig() {
        if (!this.currentSelectedClass) {
            alert('クラスが選択されていません');
            return;
        }

        // 現在の入力値を取得
        const config = this.getCurrentFormConfig();
        
        // マップに保存
        this.classHoursConfig.set(this.currentSelectedClass, config);
        
        // LocalStorageに保存
        this.saveToStorage();
        
        alert(`${this.getClassName(this.currentSelectedClass)}の時数設定を保存しました`);
    }

    getCurrentFormConfig() {
        const config = {};
        const hoursInputs = document.querySelectorAll('.hours-input');
        
        hoursInputs.forEach(input => {
            config[input.id] = parseInt(input.value) || 0;
        });
        
        return config;
    }

    resetToDefault() {
        if (confirm('29時間基準のデフォルト値に戻しますか？')) {
            this.setDefaultHours();
            this.calculateTotal();
        }
    }

    calculateTotal() {
        let total = 0;
        const hoursInputs = document.querySelectorAll('.hours-input');
        
        hoursInputs.forEach(input => {
            total += parseInt(input.value) || 0;
        });

        const totalDisplay = document.getElementById('total-hours-display');
        if (totalDisplay) {
            totalDisplay.textContent = total;
            
            // 色分け表示
            totalDisplay.className = 'total-number';
            if (total === 29) {
                totalDisplay.classList.add('good');
            } else if (Math.abs(total - 29) > 3) {
                totalDisplay.classList.add('warning');
            }
        }
    }

    saveToStorage() {
        const data = Object.fromEntries(this.classHoursConfig);
        localStorage.setItem('special-support-hours-config', JSON.stringify(data));
    }

    loadFromStorage() {
        try {
            const data = localStorage.getItem('special-support-hours-config');
            if (data) {
                const parsed = JSON.parse(data);
                this.classHoursConfig = new Map(Object.entries(parsed));
            }
        } catch (error) {
            console.error('特別支援時数設定の読み込みに失敗:', error);
        }
    }
}

// アプリケーションを初期化
let timetable;

document.addEventListener('DOMContentLoaded', () => {
    console.log('時間割ジェネレーターが初期化されました');
    
    // TimetableGeneratorを初期化
    try {
        timetable = new TimetableGenerator();
        console.log('TimetableGenerator初期化完了');
    } catch (error) {
        console.error('TimetableGenerator初期化エラー:', error);
    }
    
    // 特別支援教育時数管理を初期化
    setTimeout(() => {
        try {
            if (typeof SpecialSupportHoursManager !== 'undefined') {
                window.specialSupportManager = new SpecialSupportHoursManager();
                console.log('特別支援教育時数管理が初期化されました');
                
                // クラス管理システムとの連携を設定
                setupClassManagementIntegration();
            }
        } catch (error) {
            console.error('SpecialSupportHoursManager初期化エラー:', error);
        }
    }, 1000); // DOM構築完了を待つ
});

// クラス管理システムとの連携設定
function setupClassManagementIntegration() {
    // クラス切り替えボタンのクリックイベントを監視
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                // クラス情報が更新された可能性がある
                if (window.specialSupportManager) {
                    setTimeout(() => {
                        window.specialSupportManager.refreshClassList();
                    }, 100);
                }
            }
        });
    });

    // クラス表示エリアを監視
    const classesGrid = document.getElementById('classes-grid');
    if (classesGrid) {
        observer.observe(classesGrid, {
            childList: true,
            subtree: true
        });
    }

    // 初期読み込み時にもクラスリストを更新
    if (window.specialSupportManager) {
        setTimeout(() => {
            window.specialSupportManager.refreshClassList();
        }, 500);
    }
}