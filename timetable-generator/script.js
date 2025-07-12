// グローバル変数
let teachers = [];
let classes = [];
let rooms = [];
let timetableData = {};
let currentTeacherMeetings = [];
let currentForbiddenTimes = new Set();
let currentJointClasses = [];
let bulkModeActive = false;
let bulkTeacherData = [];
let specialClassHours = {}; // 特別支援クラスの教科時数設定
let fixedSubjectSchedules = {}; // 固定教科のスケジュール設定

// 法定時数データ（年間授業時数を35で割った週当たり時数）
const LEGAL_HOURS = {
    1: { // 第一学年
        '国語': 4, // 140÷35
        '社会': 3, // 105÷35
        '数学': 4, // 140÷35
        '理科': 3, // 105÷35
        '音楽': 1.3, // 45÷35 (実際は1-2時間)
        '美術': 1.3, // 45÷35 (実際は1-2時間)
        '保健体育': 3, // 105÷35
        '技術・家庭': 2, // 70÷35
        '外国語': 4, // 140÷35
        '道徳': 1, // 35÷35
        '総合的な学習の時間': 1.4, // 50÷35 (実際は1-2時間)
        '特別活動': 1 // 35÷35
    },
    2: { // 第二学年
        '国語': 4, // 140÷35
        '社会': 3, // 105÷35
        '数学': 3, // 105÷35
        '理科': 4, // 140÷35
        '音楽': 1, // 35÷35
        '美術': 1, // 35÷35
        '保健体育': 3, // 105÷35
        '技術・家庭': 2, // 70÷35
        '外国語': 4, // 140÷35
        '道徳': 1, // 35÷35
        '総合的な学習の時間': 2, // 70÷35
        '特別活動': 1 // 35÷35
    },
    3: { // 第三学年
        '国語': 3, // 105÷35
        '社会': 4, // 140÷35
        '数学': 4, // 140÷35
        '理科': 4, // 140÷35
        '音楽': 1, // 35÷35
        '美術': 1, // 35÷35
        '保健体育': 3, // 105÷35
        '技術・家庭': 1, // 35÷35
        '外国語': 4, // 140÷35
        '道徳': 1, // 35÷35
        '総合的な学習の時間': 2, // 70÷35
        '特別活動': 1 // 35÷35
    }
};

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeTimetable();
    initializeTeacherSettings();
    initializeSubjectCheckboxes();
    initializeSpecialClassSelector();
    initializeGradeSubjectScheduleSettings();
    loadFromLocalStorage() || loadSampleData();
});

// 教科チェックボックスの初期化（最大3つまでの制限）
function initializeSubjectCheckboxes() {
    const checkboxes = document.querySelectorAll('#teacher-subjects input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const checkedBoxes = document.querySelectorAll('#teacher-subjects input[type="checkbox"]:checked');
            
            if (checkedBoxes.length >= 3) {
                // 3つ選択されている場合、他のチェックボックスを無効化
                checkboxes.forEach(cb => {
                    if (!cb.checked) {
                        cb.disabled = true;
                    }
                });
            } else {
                // 3つ未満の場合、すべてのチェックボックスを有効化
                checkboxes.forEach(cb => {
                    cb.disabled = false;
                });
            }
        });
    });
}

// タブ機能
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// 時間割テーブル初期化
function initializeTimetable() {
    timetableData = {
        periods: [6, 6, 5, 6, 6], // 月火水木金の時限数
        days: 5,
        schedule: {}
    };
    
    // 曜日別の時限数で初期化
    for (let day = 0; day < 5; day++) {
        const maxPeriods = timetableData.periods[day];
        for (let period = 1; period <= maxPeriods; period++) {
            timetableData.schedule[`${day}-${period}`] = null;
        }
    }
}

// 教師設定の初期化
function initializeTeacherSettings() {
    initializeForbiddenTimeGrid();
    initializeJointClassSettings();
    initializeTeachingClassSelection();
    initializeHomeroomSettings();
}

// 担当クラス選択の初期化
function initializeTeachingClassSelection() {
    updateTeachingClassOptions();
}

// 担任・副担任設定の初期化
function initializeHomeroomSettings() {
    const roleSelect = document.getElementById('homeroom-role');
    const classSelect = document.getElementById('homeroom-class');
    
    roleSelect.addEventListener('change', function() {
        if (this.value) {
            classSelect.disabled = false;
            updateHomeroomClassOptions();
        } else {
            classSelect.disabled = true;
            classSelect.innerHTML = '<option value="">クラス選択</option>';
            hideHomeroomInfo();
        }
    });
    
    classSelect.addEventListener('change', function() {
        if (this.value) {
            showHomeroomInfo();
        } else {
            hideHomeroomInfo();
        }
    });
}

// 担任クラス選択オプションの更新
function updateHomeroomClassOptions() {
    const classSelect = document.getElementById('homeroom-class');
    const role = document.getElementById('homeroom-role').value;
    
    classSelect.innerHTML = '<option value="">クラス選択</option>';
    
    classes.forEach(classData => {
        const option = document.createElement('option');
        option.value = classData.id;
        option.textContent = `${classData.grade}年${classData.name}`;
        
        // 既に担任が設定されているかチェック
        const existingTeacher = teachers.find(t => 
            t.homeroomRole === 'main' && t.homeroomClass === classData.id
        );
        
        if (existingTeacher && role === 'main') {
            option.textContent += ` (${existingTeacher.name}が担任)`;
            option.disabled = true;
        }
        
        classSelect.appendChild(option);
    });
}

// 担任情報の表示
function showHomeroomInfo() {
    const role = document.getElementById('homeroom-role').value;
    const classId = parseInt(document.getElementById('homeroom-class').value);
    const classData = classes.find(c => c.id === classId);
    const infoDiv = document.getElementById('homeroom-info');
    
    if (!classData) return;
    
    const roleText = role === 'main' ? '担任' : '副担任';
    let html = `
        <h5><i class="fas fa-user-graduate"></i> ${roleText}設定</h5>
        <div class="homeroom-details">
            <strong>${classData.grade}年${classData.name}</strong> の${roleText}として設定されます。
        </div>
    `;
    
    if (role === 'main') {
        const moralHours = LEGAL_HOURS[classData.grade]['道徳'] || 1;
        const specialActivityHours = LEGAL_HOURS[classData.grade]['特別活動'] || 1;
        
        html += `
            <div class="homeroom-subjects">
                <strong>自動追加される授業:</strong><br>
                • 道徳: ${moralHours}時間/週<br>
                • 特別活動(学級活動): ${specialActivityHours}時間/週
            </div>
        `;
    }
    
    infoDiv.innerHTML = html;
    infoDiv.classList.add('active');
}

// 担任情報の非表示
function hideHomeroomInfo() {
    const infoDiv = document.getElementById('homeroom-info');
    infoDiv.classList.remove('active');
}

// 担当クラス選択オプションの更新
function updateTeachingClassOptions() {
    const container = document.getElementById('teaching-classes');
    container.innerHTML = '';

    // 学年ごとにグループ化
    const gradeGroups = {};
    classes.forEach(classData => {
        if (!gradeGroups[classData.grade]) {
            gradeGroups[classData.grade] = [];
        }
        gradeGroups[classData.grade].push(classData);
    });

    Object.keys(gradeGroups).sort().forEach(grade => {
        const gradeSection = document.createElement('div');
        gradeSection.className = 'grade-section';
        
        const gradeTitle = document.createElement('div');
        gradeTitle.className = 'grade-title';
        gradeTitle.textContent = `第${grade}学年`;
        gradeSection.appendChild(gradeTitle);

        gradeGroups[grade].forEach(classData => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'class-checkbox';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `teaching-class-${classData.id}`;
            checkbox.value = classData.id;
            checkbox.addEventListener('change', calculateLegalHours);
            
            const label = document.createElement('label');
            label.htmlFor = `teaching-class-${classData.id}`;
            label.textContent = `${classData.grade}年${classData.name}`;
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            gradeSection.appendChild(checkboxDiv);
        });

        container.appendChild(gradeSection);
    });
}

// 法定時数計算
function calculateLegalHours() {
    const subject = document.getElementById('teacher-subject').value;
    const selectedClasses = Array.from(document.querySelectorAll('#teaching-classes input:checked'))
        .map(cb => parseInt(cb.value));

    if (!subject || selectedClasses.length === 0) {
        document.getElementById('calculated-hours').innerHTML = '';
        return;
    }

    const hoursDisplay = document.getElementById('calculated-hours');
    let html = '<div class="legal-hours-summary"><h5>📊 法定時数計算結果</h5>';
    
    let totalHours = 0;
    const gradeHours = {};

    selectedClasses.forEach(classId => {
        const classData = classes.find(c => c.id === classId);
        if (classData) {
            const grade = classData.grade;
            const hours = LEGAL_HOURS[grade][subject] || 0;
            
            if (!gradeHours[grade]) {
                gradeHours[grade] = { hours: 0, classes: [] };
            }
            gradeHours[grade].hours += hours;
            gradeHours[grade].classes.push(classData.name);
            totalHours += hours;
        }
    });

    // 学年別表示
    Object.keys(gradeHours).sort().forEach(grade => {
        const data = gradeHours[grade];
        html += `
            <div class="hours-item">
                <span>第${grade}学年 (${data.classes.join('・')}) - ${subject}</span>
                <span><strong>${data.hours}時間/週</strong></span>
            </div>
        `;
    });

    html += `
        <div class="hours-item total-hours">
            <span>合計週時数</span>
            <span><strong>${totalHours}時間/週</strong></span>
        </div>
    `;

    html += '</div>';
    hoursDisplay.innerHTML = html;

    // 週授業数フィールドを自動更新
    if (totalHours > 0) {
        // 小数点は四捨五入
        const roundedHours = Math.round(totalHours);
        showNotification(`法定時数: ${roundedHours}時間/週 で計算されました`, 'success');
    }
}

// 禁止時間グリッドの初期化
function initializeForbiddenTimeGrid() {
    const grid = document.getElementById('forbidden-time-grid');
    grid.innerHTML = '';

    for (let period = 1; period <= 6; period++) {
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = `${period}時間目`;
        grid.appendChild(timeLabel);

        for (let day = 0; day < 5; day++) {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'time-slot';
            timeSlot.dataset.day = day;
            timeSlot.dataset.period = period;
            timeSlot.addEventListener('click', toggleForbiddenTime);
            grid.appendChild(timeSlot);
        }
    }
}

// 禁止時間の切り替え
function toggleForbiddenTime(event) {
    const slot = event.target;
    const day = slot.dataset.day;
    const period = slot.dataset.period;
    const key = `${day}-${period}`;

    if (currentForbiddenTimes.has(key)) {
        currentForbiddenTimes.delete(key);
        slot.classList.remove('forbidden');
    } else {
        currentForbiddenTimes.add(key);
        slot.classList.add('forbidden');
    }
}

// 合同授業設定の初期化
function initializeJointClassSettings() {
    const jointClassType = document.getElementById('joint-class-type');
    jointClassType.addEventListener('change', function() {
        const classSelection = document.getElementById('class-selection');
        if (this.value === 'custom-joint') {
            classSelection.style.display = 'block';
            updateClassSelectionOptions();
        } else {
            classSelection.style.display = 'none';
        }
    });
}

// クラス選択オプションの更新
function updateClassSelectionOptions() {
    const container = document.getElementById('class-selection');
    container.innerHTML = '';

    classes.forEach(classData => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'class-checkbox';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `class-${classData.id}`;
        checkbox.value = classData.id;
        
        const label = document.createElement('label');
        label.htmlFor = `class-${classData.id}`;
        label.textContent = `${classData.grade}年${classData.name}`;
        
        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(label);
        container.appendChild(checkboxDiv);
    });
}

// 会議追加
function addMeeting() {
    const name = document.getElementById('meeting-name').value.trim();
    const day = document.getElementById('meeting-day').value;
    const period = document.getElementById('meeting-period').value;

    if (!name || !day || !period) {
        alert('会議名、曜日、時限をすべて入力してください');
        return;
    }

    const meeting = {
        id: Date.now(),
        name: name,
        day: parseInt(day),
        period: parseInt(period)
    };

    currentTeacherMeetings.push(meeting);
    updateMeetingsDisplay();
    clearMeetingInputs();
}

// 会議表示の更新
function updateMeetingsDisplay() {
    const container = document.getElementById('meetings-list');
    container.innerHTML = '';

    const dayNames = ['月', '火', '水', '木', '金'];

    currentTeacherMeetings.forEach(meeting => {
        const meetingDiv = document.createElement('div');
        meetingDiv.className = 'meeting-item';
        
        meetingDiv.innerHTML = `
            <div class="meeting-info">
                <div class="meeting-name">${meeting.name}</div>
                <div class="meeting-time">${dayNames[meeting.day]}曜日 ${meeting.period}時間目</div>
            </div>
            <button class="meeting-delete" onclick="deleteMeeting(${meeting.id})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        container.appendChild(meetingDiv);
    });
}

// 会議削除
function deleteMeeting(id) {
    currentTeacherMeetings = currentTeacherMeetings.filter(m => m.id !== id);
    updateMeetingsDisplay();
}

// 会議入力フィールドのクリア
function clearMeetingInputs() {
    document.getElementById('meeting-name').value = '';
    document.getElementById('meeting-day').value = '';
    document.getElementById('meeting-period').value = '';
}

// 教師フォームのリセット
function resetTeacherForm() {
    document.getElementById('teacher-name').value = '';
    
    // 教科チェックボックスをすべて未選択に
    document.querySelectorAll('#teacher-subjects input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    document.getElementById('homeroom-role').value = '';
    document.getElementById('homeroom-class').disabled = true;
    document.getElementById('homeroom-class').value = '';
    document.getElementById('joint-class-type').value = '';
    document.getElementById('joint-class-subject').value = '';
    document.getElementById('joint-class-hours').value = '';
    document.getElementById('class-selection').style.display = 'none';
    document.getElementById('calculated-hours').innerHTML = '';
    
    // 担当クラスのチェックボックスをリセット
    document.querySelectorAll('#teaching-classes input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
    
    currentForbiddenTimes.clear();
    currentTeacherMeetings = [];
    currentJointClasses = [];
    
    // 禁止時間グリッドをリセット
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('forbidden');
    });
    
    // 担任情報を非表示
    hideHomeroomInfo();
    
    updateMeetingsDisplay();
}

// デフォルトクラス生成
function generateDefaultClasses() {
    classes = [];
    
    // 1年〜3年、各学年1組〜10組を通常学級として自動生成
    for (let grade = 1; grade <= 3; grade++) {
        for (let classNum = 1; classNum <= 10; classNum++) {
            const className = `${classNum}組`;
            classes.push({
                id: grade * 100 + classNum, // 101, 102, ..., 110, 201, 202, ..., 310
                grade: grade,
                name: className,
                type: 'regular' // 通常学級（デフォルト）
            });
        }
    }
    
    // 注意: 特別支援学級は手動で設定するか、既存の通常学級を変更して作成
}

// デフォルト教室生成
function generateDefaultRooms() {
    rooms = [];
    
    // 普通教室（各学年のホームルーム）
    for (let grade = 1; grade <= 3; grade++) {
        for (let classNum = 1; classNum <= 10; classNum++) {
            rooms.push({
                id: grade * 100 + classNum, // 101, 102, ..., 110, 201, 202, ..., 310
                name: `${grade}-${classNum}教室`,
                type: 'normal'
            });
        }
    }
    
    // 特別教室
    const specialRooms = [
        { id: 1001, name: '理科室A', type: 'science' },
        { id: 1002, name: '理科室B', type: 'science' },
        { id: 1003, name: '音楽室', type: 'music' },
        { id: 1004, name: '美術室', type: 'art' },
        { id: 1005, name: '技術室', type: 'technology' },
        { id: 1006, name: '体育館', type: 'gym' }
    ];
    
    rooms.push(...specialRooms);
}

// サンプルデータ読み込み
function loadSampleData() {
    // デフォルトクラスを生成
    generateDefaultClasses();
    
    // デフォルト教室を生成
    generateDefaultRooms();
    
    teachers = [
        { 
            id: 1, 
            name: '田中先生', 
            subjects: ['数学'], 
            weeklyLessons: 16,
            forbiddenTimes: new Set(),
            meetings: [],
            jointClasses: []
        },
        { 
            id: 2, 
            name: '佐藤先生', 
            subjects: ['国語'], 
            weeklyLessons: 14,
            forbiddenTimes: new Set(),
            meetings: [],
            jointClasses: []
        },
        { 
            id: 3, 
            name: '鈴木先生', 
            subjects: ['外国語'], 
            weeklyLessons: 12,
            forbiddenTimes: new Set(),
            meetings: [],
            jointClasses: []
        },
        { 
            id: 4, 
            name: '高橋先生', 
            subjects: ['理科'], 
            weeklyLessons: 10,
            forbiddenTimes: new Set(),
            meetings: [],
            jointClasses: []
        },
        { 
            id: 5, 
            name: '伊藤先生', 
            subjects: ['社会', '道徳'], 
            weeklyLessons: 8,
            forbiddenTimes: new Set(),
            meetings: [],
            jointClasses: []
        }
    ];

    updateDataLists();
}

// ローカルストレージに自動保存
function saveToLocalStorage() {
    try {
        const data = {
            teachers: teachers,
            classes: classes,
            rooms: rooms,
            timetable: timetableData,
            version: '1.0',
            savedAt: new Date().toISOString()
        };
        
        // Set や Map を含むデータを適切にシリアライズ
        const serializedData = JSON.stringify(data, (key, value) => {
            if (value instanceof Set) {
                return Array.from(value);
            }
            if (value instanceof Map) {
                return Object.fromEntries(value);
            }
            return value;
        });
        
        localStorage.setItem('timetable-data', serializedData);
        console.log('データを自動保存しました');
    } catch (error) {
        console.error('ローカルストレージへの保存に失敗しました:', error);
    }
}

// ローカルストレージから自動読み込み
function loadFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('timetable-data');
        if (!savedData) {
            return false;
        }
        
        const data = JSON.parse(savedData);
        
        // データの復元時にSetやMapを適切に復元
        if (data.teachers) {
            teachers = data.teachers.map(teacher => ({
                ...teacher,
                forbiddenTimes: new Set(teacher.forbiddenTimes || []),
                meetings: teacher.meetings || [],
                jointClasses: teacher.jointClasses || [],
                homeroomSubjects: teacher.homeroomSubjects || []
            }));
        }
        
        classes = data.classes || [];
        rooms = data.rooms || [];
        timetableData = data.timetable || {};
        
        // 特別支援クラス時数データを復元
        const savedSpecialHours = localStorage.getItem('specialClassHours');
        if (savedSpecialHours) {
            specialClassHours = JSON.parse(savedSpecialHours);
        }
        
        // 固定教科設定データを復元
        const savedFixedSchedules = localStorage.getItem('fixedSubjectSchedules');
        if (savedFixedSchedules) {
            fixedSubjectSchedules = JSON.parse(savedFixedSchedules);
        }
        
        // 保存データにクラスがない場合はデフォルトクラスを生成
        if (classes.length === 0) {
            generateDefaultClasses();
        }
        
        // 保存データに教室がない場合はデフォルト教室を生成
        if (rooms.length === 0) {
            generateDefaultRooms();
        }
        
        updateDataLists();
        if (timetableData.schedule && Object.keys(timetableData.schedule).length > 0) {
            displayTimetable();
        }
        
        showNotification('保存されたデータを読み込みました', 'success');
        return true;
    } catch (error) {
        console.error('ローカルストレージからの読み込みに失敗しました:', error);
        return false;
    }
}

// ローカルストレージのクリア
function clearLocalStorage() {
    if (confirm('保存されたデータを削除しますか？この操作は取り消せません。')) {
        localStorage.removeItem('timetable-data');
        showNotification('保存データを削除しました', 'success');
    }
}

// CSVテンプレートダウンロード機能
function downloadTeacherCSVTemplate() {
    // CSVヘッダー
    const headers = [
        '教員名',
        '担当教科1', 
        '担当教科2',
        '担当教科3',
        '担当クラス（学年-組形式、複数はセミコロン区切り）',
        '担任役職（main=担任、sub=副担任、空白=なし）',
        '担任クラス（学年-組形式）',
        '禁止時間（曜日-時限形式、複数はセミコロン区切り）',
        '会議（会議名:曜日-時限形式、複数はセミコロン区切り）'
    ];
    
    // サンプルデータ
    const sampleData = [
        [
            '田中太郎',
            '数学',
            '',
            '',
            '1-1;1-2;2-1',
            'main',
            '1-1',
            '0-6;4-1',
            '職員会議:3-6'
        ],
        [
            '佐藤花子',
            '国語',
            '道徳',
            '',
            '1-1;1-2;1-3',
            'sub',
            '1-2',
            '1-3;2-4',
            '学年会議:4-6;教科会議:0-5'
        ],
        [
            '鈴木一郎',
            '理科',
            '総合的な学習の時間',
            '特別活動',
            '2-1;2-2;3-1',
            '',
            '',
            '',
            ''
        ],
        [
            '高橋美咲',
            '音楽',
            '',
            '',
            '1-1;1-2;1-3;2-1;2-2;3-1',
            '',
            '',
            '0-1;4-6',
            '音楽部:2-6'
        ]
    ];
    
    // CSV形式に変換（全セルをクォートで囲む）
    let csvContent = '';
    
    // ヘッダー行を追加
    const quotedHeaders = headers.map(header => `"${header}"`);
    csvContent += quotedHeaders.join(',') + '\\n';
    
    // サンプルデータを追加
    sampleData.forEach(row => {
        const quotedRow = row.map(cell => `"${cell}"`);
        csvContent += quotedRow.join(',') + '\\n';
    });
    
    try {
        // SJIS（Shift_JIS）エンコードでダウンロード
        downloadCSVSJIS(csvContent, '教員一括登録テンプレート.csv');
        showNotification('CSVテンプレートをダウンロードしました（SJIS形式）', 'success');
    } catch (error) {
        // SJISエンコードに失敗した場合はUTF-8 with BOMで出力
        const bom = '\\uFEFF';
        const fullContent = bom + csvContent;
        downloadCSV(fullContent, '教員一括登録テンプレート_UTF8.csv');
        showNotification('CSVテンプレートをダウンロードしました（UTF-8形式）', 'info');
    }
}

// CSV形式の説明書きダウンロード
function downloadCSVInstructions() {
    const instructions = `教員一括登録CSVファイルの使い方

■ 各列の説明
1. 教員名: 必須項目
2. 担当教科1: 必須項目（国語、社会、数学、理科、音楽、美術、保健体育、技術・家庭、外国語、道徳、総合的な学習の時間、特別活動）
3. 担当教科2: 任意項目（最大3つまで設定可能）
4. 担当教科3: 任意項目
5. 担当クラス: 必須項目（例: 1-1;1-2;2-1）
6. 担任役職: 任意項目（main=担任、sub=副担任、空白=なし）
7. 担任クラス: 担任役職が設定されている場合は必須（例: 1-1）
8. 禁止時間: 任意項目（例: 0-6;4-1 ※0=月曜、1=火曜...、1-6=時限）
9. 会議: 任意項目（例: 職員会議:3-6;学年会議:4-6）

■ 入力形式の注意
- 複数項目はセミコロン(;)で区切る
- 曜日は数字で入力（0=月曜、1=火曜、2=水曜、3=木曜、4=金曜）
- 時限は1-6で入力
- クラスは「学年-組」形式で入力（例: 1-1、2-3）

■ サンプルデータ
田中太郎先生の例:
- 数学担当
- 1年1組、1年2組、2年1組を担当
- 1年1組の担任
- 月曜6時限と金曜1時限は授業禁止
- 木曜6時限に職員会議

このファイルを参考にして、学校の教員情報を入力してください。`;
    
    downloadText(instructions, '教員CSV入力説明書.txt');
    showNotification('CSV入力説明書をダウンロードしました', 'info');
}

// CSVファイルダウンロード用ヘルパー関数（UTF-8）
function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// CSVファイルダウンロード用ヘルパー関数（SJIS - Excel用）
function downloadCSVSJIS(content, filename) {
    // Excel用にUTF-8 with BOMを使用（より確実な方法）
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // UTF-8 BOM
    const encoder = new TextEncoder();
    const encoded = encoder.encode(content);
    
    // BOM + UTF-8エンコードデータ
    const combined = new Uint8Array(bom.length + encoded.length);
    combined.set(bom);
    combined.set(encoded, bom.length);
    
    const blob = new Blob([combined], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// テキストファイルダウンロード用ヘルパー関数
function downloadText(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 教員追加
function addTeacher() {
    const name = document.getElementById('teacher-name').value.trim();
    
    // 選択された教科を取得（最大3つまで）
    const selectedSubjects = Array.from(document.querySelectorAll('#teacher-subjects input:checked'))
        .map(cb => cb.value);
    
    // 担当クラスから法定時数を計算
    const selectedClasses = Array.from(document.querySelectorAll('#teaching-classes input:checked'))
        .map(cb => parseInt(cb.value));

    if (!name || selectedSubjects.length === 0 || selectedClasses.length === 0) {
        alert('教員名、担当教科、担当クラスをすべて入力してください');
        return;
    }

    if (selectedSubjects.length > 3) {
        alert('担当教科は最大3つまでです');
        return;
    }

    // 法定時数の計算（複数教科対応）
    let totalHours = 0;
    const teachingClassesData = [];
    
    // 各教科と各クラスの組み合わせで時数を計算
    selectedSubjects.forEach(subject => {
        selectedClasses.forEach(classId => {
            const classData = classes.find(c => c.id === classId);
            if (classData) {
                const grade = classData.grade;
                const hours = LEGAL_HOURS[grade][subject] || 0;
                totalHours += hours;
                teachingClassesData.push({
                    classId: classId,
                    grade: grade,
                    className: classData.name,
                    subject: subject,
                    hours: hours
                });
            }
        });
    });

    const lessons = Math.round(totalHours);

    // 担任・副担任設定の取得
    const homeroomRole = document.getElementById('homeroom-role').value;
    const homeroomClass = document.getElementById('homeroom-class').value ? 
        parseInt(document.getElementById('homeroom-class').value) : null;

    // 合同授業設定の取得
    const jointClassType = document.getElementById('joint-class-type').value;
    const jointClassSubject = document.getElementById('joint-class-subject').value.trim();
    const jointClassHours = parseInt(document.getElementById('joint-class-hours').value);
    
    let jointClasses = [];
    if (jointClassType && jointClassSubject && jointClassHours) {
        if (jointClassType === 'grade-joint') {
            // 学年合同の場合、同学年のクラスをすべて選択
            const grades = [...new Set(classes.map(c => c.grade))];
            grades.forEach(grade => {
                const gradeClasses = classes.filter(c => c.grade === grade);
                if (gradeClasses.length > 1) {
                    jointClasses.push({
                        type: 'grade-joint',
                        subject: jointClassSubject,
                        hours: jointClassHours,
                        classes: gradeClasses.map(c => c.id),
                        grade: grade
                    });
                }
            });
        } else if (jointClassType === 'custom-joint') {
            // カスタム合同の場合、選択されたクラスを取得
            const selectedClasses = Array.from(document.querySelectorAll('#class-selection input:checked'))
                .map(cb => parseInt(cb.value));
            
            if (selectedClasses.length > 1) {
                jointClasses.push({
                    type: 'custom-joint',
                    subject: jointClassSubject,
                    hours: jointClassHours,
                    classes: selectedClasses
                });
            }
        }
    }

    // 担任の場合、道徳と特別活動を自動追加
    let homeroomSubjects = [];
    if (homeroomRole === 'main' && homeroomClass) {
        const homeroomClassData = classes.find(c => c.id === homeroomClass);
        if (homeroomClassData) {
            // 道徳の追加
            const moralHours = LEGAL_HOURS[homeroomClassData.grade]['道徳'] || 1;
            homeroomSubjects.push({
                subject: '道徳',
                classId: homeroomClass,
                grade: homeroomClassData.grade,
                className: homeroomClassData.name,
                hours: moralHours
            });
            
            // 特別活動の追加
            const specialActivityHours = LEGAL_HOURS[homeroomClassData.grade]['特別活動'] || 1;
            homeroomSubjects.push({
                subject: '特別活動',
                classId: homeroomClass,
                grade: homeroomClassData.grade,
                className: homeroomClassData.name,
                hours: specialActivityHours
            });
            
            // 担任授業を法定時数に加算
            totalHours += moralHours + specialActivityHours;
        }
    }

    const teacher = {
        id: Date.now(),
        name: name,
        subjects: selectedSubjects, // 複数教科対応
        weeklyLessons: Math.round(totalHours), // 担任授業も含めた総時数
        teachingClasses: teachingClassesData,
        legalHours: totalHours,
        homeroomRole: homeroomRole,
        homeroomClass: homeroomClass,
        homeroomSubjects: homeroomSubjects,
        forbiddenTimes: new Set(currentForbiddenTimes),
        meetings: [...currentTeacherMeetings],
        jointClasses: jointClasses
    };

    teachers.push(teacher);
    updateDataLists();
    resetTeacherForm();
    saveToLocalStorage();
    showNotification('教員が追加されました', 'success');
}


// データリスト更新
function updateDataLists() {
    updateTeacherList();
    updateClassList();
    updateRoomList();
    updateTeachingClassOptions(); // 担当クラス選択オプションも更新
    updateSpecialClassSelector(); // 特別支援クラス選択肢も更新
}

function updateTeacherList() {
    const list = document.getElementById('teacher-list');
    list.innerHTML = '';

    teachers.forEach(teacher => {
        const item = document.createElement('div');
        item.className = 'data-item';
        
        // 詳細情報の構築（複数教科対応）
        const subjectsText = teacher.subjects ? teacher.subjects.join('・') : (teacher.subject || '未設定');
        let detailsHtml = `${teacher.name} - ${subjectsText}`;
        
        // 法定時数情報を表示
        if (teacher.legalHours) {
            detailsHtml += ` (法定: ${teacher.legalHours.toFixed(1)}h → 週${teacher.weeklyLessons}コマ)`;
        } else {
            detailsHtml += ` (週${teacher.weeklyLessons}コマ)`;
        }
        
        // 担任・副担任情報
        if (teacher.homeroomRole && teacher.homeroomClass) {
            const homeroomClassData = classes.find(c => c.id === teacher.homeroomClass);
            if (homeroomClassData) {
                const roleText = teacher.homeroomRole === 'main' ? '担任' : '副担任';
                detailsHtml += ` | ${roleText}: ${homeroomClassData.grade}年${homeroomClassData.name}`;
            }
        }
        
        // 担当クラス情報
        if (teacher.teachingClasses && teacher.teachingClasses.length > 0) {
            const classInfo = teacher.teachingClasses.map(tc => `${tc.grade}${tc.className}`).join('・');
            detailsHtml += ` | 授業: ${classInfo}`;
        }
        
        // 禁止時間があれば表示
        if (teacher.forbiddenTimes && teacher.forbiddenTimes.size > 0) {
            detailsHtml += ` | 禁止時間: ${teacher.forbiddenTimes.size}コマ`;
        }
        
        // 会議があれば表示
        if (teacher.meetings && teacher.meetings.length > 0) {
            detailsHtml += ` | 会議: ${teacher.meetings.length}件`;
        }
        
        // 合同授業があれば表示
        if (teacher.jointClasses && teacher.jointClasses.length > 0) {
            detailsHtml += ` | 合同授業: ${teacher.jointClasses.length}件`;
        }
        
        item.innerHTML = `
            <div>
                <div style="font-weight: 600;">${detailsHtml}</div>
                ${teacher.meetings && teacher.meetings.length > 0 ? 
                    `<div style="font-size: 0.85rem; color: #718096; margin-top: 4px;">
                        会議: ${teacher.meetings.map(m => m.name).join(', ')}
                    </div>` : ''
                }
                ${teacher.homeroomSubjects && teacher.homeroomSubjects.length > 0 ? 
                    `<div style="font-size: 0.85rem; color: #28a745; margin-top: 4px;">
                        担任授業: ${teacher.homeroomSubjects.map(hs => `${hs.subject}(${hs.hours}h)`).join(', ')}
                    </div>` : ''
                }
                ${teacher.jointClasses && teacher.jointClasses.length > 0 ? 
                    `<div style="font-size: 0.85rem; color: #718096; margin-top: 4px;">
                        合同授業: ${teacher.jointClasses.map(j => j.subject).join(', ')}
                    </div>` : ''
                }
            </div>
            <button class="delete-btn" onclick="deleteTeacher(${teacher.id})">削除</button>
        `;
        list.appendChild(item);
    });
}

function updateClassList() {
    const list = document.getElementById('class-list');
    list.innerHTML = '';

    // 学年ごとにグループ化
    for (let grade = 1; grade <= 3; grade++) {
        const gradeClasses = classes.filter(c => c.grade === grade);
        
        if (gradeClasses.length > 0) {
            // 学年ヘッダー
            const gradeHeader = document.createElement('div');
            gradeHeader.className = 'grade-header';
            gradeHeader.innerHTML = `<h4><i class="fas fa-graduation-cap"></i> ${grade}年生 (${gradeClasses.length}クラス)</h4>`;
            list.appendChild(gradeHeader);
            
            // 通常学級
            const regularClasses = gradeClasses.filter(c => c.type === 'regular' || !c.type);
            if (regularClasses.length > 0) {
                const regularHeader = document.createElement('div');
                regularHeader.className = 'class-type-header';
                regularHeader.innerHTML = `<h5><i class="fas fa-users"></i> 通常学級 (${regularClasses.length}クラス)</h5>`;
                list.appendChild(regularHeader);
                
                const regularContainer = document.createElement('div');
                regularContainer.className = 'grade-classes';
                
                regularClasses
                    .sort((a, b) => parseInt(a.name) - parseInt(b.name))
                    .forEach(classData => {
                        const item = document.createElement('div');
                        item.className = 'data-item class-item regular-class';
                        item.innerHTML = `
                            <div class="class-info">
                                <span class="class-name">${classData.grade}年${classData.name}</span>
                                <div class="class-type-selector">
                                    <label>学級種別:</label>
                                    <select onchange="changeClassType(${classData.id}, this.value)" class="class-type-select">
                                        <option value="regular" ${(classData.type === 'regular' || !classData.type) ? 'selected' : ''}>通常学級</option>
                                        <option value="special-intellectual" ${classData.type === 'special-intellectual' ? 'selected' : ''}>知的障害学級</option>
                                        <option value="special-emotional" ${classData.type === 'special-emotional' ? 'selected' : ''}>自閉症・情緒障害学級</option>
                                        <option value="special-physical" ${classData.type === 'special-physical' ? 'selected' : ''}>肢体不自由学級</option>
                                        <option value="special-visual" ${classData.type === 'special-visual' ? 'selected' : ''}>弱視学級</option>
                                        <option value="special-hearing" ${classData.type === 'special-hearing' ? 'selected' : ''}>難聴学級</option>
                                    </select>
                                </div>
                            </div>
                            <button class="delete-btn" onclick="deleteClass(${classData.id})">
                                <i class="fas fa-trash"></i> 削除
                            </button>
                        `;
                        regularContainer.appendChild(item);
                    });
                
                list.appendChild(regularContainer);
            }
            
            // 特別支援学級
            const specialClasses = gradeClasses.filter(c => c.type && c.type.startsWith('special-'));
            if (specialClasses.length > 0) {
                const specialHeader = document.createElement('div');
                specialHeader.className = 'class-type-header';
                specialHeader.innerHTML = `<h5><i class="fas fa-heart"></i> 特別支援学級 (${specialClasses.length}クラス)</h5>`;
                list.appendChild(specialHeader);
                
                const specialContainer = document.createElement('div');
                specialContainer.className = 'grade-classes';
                
                // 特別支援学級のタイプ順にソート
                const typeOrder = { 'special-intellectual': 1, 'special-emotional': 2, 'special-physical': 3, 'special-visual': 4, 'special-hearing': 5 };
                
                specialClasses
                    .sort((a, b) => {
                        const orderA = typeOrder[a.type] || 999;
                        const orderB = typeOrder[b.type] || 999;
                        if (orderA !== orderB) return orderA - orderB;
                        return a.name.localeCompare(b.name, 'ja');
                    })
                    .forEach(classData => {
                        const item = document.createElement('div');
                        item.className = 'data-item class-item special-class';
                        item.innerHTML = `
                            <div class="class-info">
                                <span class="class-name">${classData.grade}年${classData.name} <small class="class-type-label">特別支援</small></span>
                                <div class="class-type-selector">
                                    <label>学級種別:</label>
                                    <select onchange="changeClassType(${classData.id}, this.value)" class="class-type-select">
                                        <option value="regular" ${(classData.type === 'regular' || !classData.type) ? 'selected' : ''}>通常学級</option>
                                        <option value="special-intellectual" ${classData.type === 'special-intellectual' ? 'selected' : ''}>知的障害学級</option>
                                        <option value="special-emotional" ${classData.type === 'special-emotional' ? 'selected' : ''}>自閉症・情緒障害学級</option>
                                        <option value="special-physical" ${classData.type === 'special-physical' ? 'selected' : ''}>肢体不自由学級</option>
                                        <option value="special-visual" ${classData.type === 'special-visual' ? 'selected' : ''}>弱視学級</option>
                                        <option value="special-hearing" ${classData.type === 'special-hearing' ? 'selected' : ''}>難聴学級</option>
                                    </select>
                                </div>
                            </div>
                            <button class="delete-btn" onclick="deleteClass(${classData.id})">
                                <i class="fas fa-trash"></i> 削除
                            </button>
                        `;
                        specialContainer.appendChild(item);
                    });
                
                list.appendChild(specialContainer);
            }
        }
    }
}

function updateRoomList() {
    const list = document.getElementById('room-list');
    list.innerHTML = '';

    // 普通教室
    const normalRooms = rooms.filter(r => r.type === 'normal');
    if (normalRooms.length > 0) {
        const normalHeader = document.createElement('div');
        normalHeader.className = 'grade-header';
        normalHeader.innerHTML = `<h4><i class="fas fa-school"></i> 普通教室 (${normalRooms.length}教室)</h4>`;
        list.appendChild(normalHeader);
        
        const normalContainer = document.createElement('div');
        normalContainer.className = 'grade-classes';
        
        normalRooms
            .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
            .forEach(room => {
                const item = document.createElement('div');
                item.className = 'data-item class-item';
                item.innerHTML = `
                    <span>${room.name}</span>
                    <button class="delete-btn" onclick="deleteRoom(${room.id})">
                        <i class="fas fa-trash"></i> 削除
                    </button>
                `;
                normalContainer.appendChild(item);
            });
        
        list.appendChild(normalContainer);
    }

    // 特別教室
    const specialRooms = rooms.filter(r => r.type !== 'normal');
    if (specialRooms.length > 0) {
        const specialHeader = document.createElement('div');
        specialHeader.className = 'grade-header';
        specialHeader.innerHTML = `<h4><i class="fas fa-flask"></i> 特別教室 (${specialRooms.length}教室)</h4>`;
        list.appendChild(specialHeader);
        
        const specialContainer = document.createElement('div');
        specialContainer.className = 'grade-classes';
        
        // タイプ順（理科室、音楽室、美術室、技術室、体育館）
        const typeOrder = { 'science': 1, 'music': 2, 'art': 3, 'technology': 4, 'gym': 5 };
        
        specialRooms
            .sort((a, b) => {
                const orderA = typeOrder[a.type] || 999;
                const orderB = typeOrder[b.type] || 999;
                if (orderA !== orderB) return orderA - orderB;
                return a.name.localeCompare(b.name, 'ja');
            })
            .forEach(room => {
                const typeNames = {
                    'science': '理科室',
                    'music': '音楽室', 
                    'art': '美術室',
                    'technology': '技術室',
                    'gym': '体育館'
                };
                
                const item = document.createElement('div');
                item.className = 'data-item class-item';
                item.innerHTML = `
                    <span>${room.name} <small class="room-type">(${typeNames[room.type] || room.type})</small></span>
                    <button class="delete-btn" onclick="deleteRoom(${room.id})">
                        <i class="fas fa-trash"></i> 削除
                    </button>
                `;
                specialContainer.appendChild(item);
            });
        
        list.appendChild(specialContainer);
    }
}

// 削除機能
function deleteTeacher(id) {
    teachers = teachers.filter(t => t.id !== id);
    updateDataLists();
    saveToLocalStorage();
}

function deleteClass(id) {
    classes = classes.filter(c => c.id !== id);
    updateDataLists();
    saveToLocalStorage();
}

function deleteRoom(id) {
    rooms = rooms.filter(r => r.id !== id);
    updateDataLists();
    saveToLocalStorage();
}

// 入力フィールドクリア
function clearTeacherInputs() {
    document.getElementById('teacher-name').value = '';
    document.getElementById('teacher-subject').value = '';
    document.getElementById('teacher-lessons').value = '';
}



// 時間割自動作成
function generateTimetable() {
    if (teachers.length === 0 || classes.length === 0) {
        alert('教員と学級のデータを入力してください');
        return;
    }

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading';
    loadingDiv.textContent = '時間割を作成中...';
    document.getElementById('timetable-container').appendChild(loadingDiv);

    setTimeout(() => {
        try {
            generateBasicTimetable();
            displayTimetable();
            saveToLocalStorage();
            loadingDiv.remove();
            showNotification('時間割が作成されました', 'success');
        } catch (error) {
            loadingDiv.remove();
            showNotification('時間割の作成に失敗しました: ' + error.message, 'error');
        }
    }, 1000);
}

// 基本的な時間割作成アルゴリズム
function generateBasicTimetable() {
    initializeTimetable();
    
    // 最初に会議をスケジュールに配置
    scheduleMeetings();
    
    const assignments = [];
    
    // 通常の授業をスケジュール（法定時数ベース）
    teachers.forEach(teacher => {
        if (teacher.teachingClasses && teacher.teachingClasses.length > 0) {
            // 法定時数ベースの授業割り当て（複数教科対応）
            teacher.teachingClasses.forEach(teachingClass => {
                const classData = classes.find(c => c.id === teachingClass.classId);
                if (classData) {
                    const lessonsForThisClass = Math.round(teachingClass.hours);
                    const subject = teachingClass.subject || (teacher.subjects ? teacher.subjects[0] : teacher.subject);
                    for (let i = 0; i < lessonsForThisClass; i++) {
                        assignments.push({
                            teacher: teacher,
                            class: classData,
                            subject: subject,
                            room: findSuitableRoom(subject),
                            type: 'regular'
                        });
                    }
                }
            });
        } else {
            // 従来の方式（後方互換性）
            const primarySubject = teacher.subjects ? teacher.subjects[0] : teacher.subject;
            classes.forEach(classData => {
                const lessonsPerClass = Math.floor(teacher.weeklyLessons / classes.length);
                for (let i = 0; i < lessonsPerClass; i++) {
                    assignments.push({
                        teacher: teacher,
                        class: classData,
                        subject: primarySubject,
                        room: findSuitableRoom(primarySubject),
                        type: 'regular'
                    });
                }
            });
        }
    });

    // 担任授業をスケジュール（道徳・特別活動）
    teachers.forEach(teacher => {
        if (teacher.homeroomSubjects && teacher.homeroomSubjects.length > 0) {
            teacher.homeroomSubjects.forEach(homeroomSubject => {
                const classData = classes.find(c => c.id === homeroomSubject.classId);
                if (classData) {
                    const lessonsForThisSubject = Math.round(homeroomSubject.hours);
                    for (let i = 0; i < lessonsForThisSubject; i++) {
                        assignments.push({
                            teacher: teacher,
                            class: classData,
                            subject: homeroomSubject.subject,
                            room: findSuitableRoom(homeroomSubject.subject),
                            type: 'homeroom'
                        });
                    }
                }
            });
        }
    });

    // 合同授業をスケジュール
    teachers.forEach(teacher => {
        if (teacher.jointClasses && teacher.jointClasses.length > 0) {
            teacher.jointClasses.forEach(jointClass => {
                for (let i = 0; i < jointClass.hours; i++) {
                    assignments.push({
                        teacher: teacher,
                        class: null, // 複数クラス
                        subject: jointClass.subject,
                        room: findSuitableRoom(jointClass.subject),
                        type: 'joint',
                        jointClasses: jointClass.classes,
                        jointInfo: jointClass
                    });
                }
            });
        }
    });

    // スケジュールに配置
    scheduleAssignments(assignments);
}

// 会議をスケジュールに配置
function scheduleMeetings() {
    teachers.forEach(teacher => {
        if (teacher.meetings && teacher.meetings.length > 0) {
            teacher.meetings.forEach(meeting => {
                const key = `${meeting.day}-${meeting.period}`;
                timetableData.schedule[key] = {
                    teacher: teacher,
                    class: null,
                    subject: meeting.name,
                    room: null,
                    type: 'meeting'
                };
            });
        }
    });
}

// 授業をスケジュールに配置（制約考慮）
function scheduleAssignments(assignments) {
    // ランダムシャッフル
    shuffleArray(assignments);
    
    assignments.forEach(assignment => {
        let scheduled = false;
        
        // 全ての時間スロットを試行
        for (let day = 0; day < 5 && !scheduled; day++) {
            for (let period = 1; period <= 6 && !scheduled; period++) {
                const key = `${day}-${period}`;
                
                // スロットが利用可能かチェック
                if (canScheduleAssignment(assignment, day, period)) {
                    timetableData.schedule[key] = assignment;
                    scheduled = true;
                }
            }
        }
        
        if (!scheduled) {
            console.warn('スケジュールできない授業:', assignment);
        }
    });
}

// 授業をスケジュールできるかチェック
function canScheduleAssignment(assignment, day, period) {
    const key = `${day}-${period}`;
    
    // 既にスロットが埋まっている場合
    if (timetableData.schedule[key]) {
        return false;
    }
    
    // 教師の禁止時間をチェック
    if (assignment.teacher.forbiddenTimes && assignment.teacher.forbiddenTimes.has(key)) {
        return false;
    }
    
    // 教師の重複をチェック
    if (isTeacherBusy(assignment.teacher, day, period)) {
        return false;
    }
    
    // 合同授業の場合、関連クラスの空き時間をチェック
    if (assignment.type === 'joint') {
        for (let classId of assignment.jointClasses) {
            if (isClassBusy(classId, day, period)) {
                return false;
            }
        }
    } else if (assignment.class) {
        // 通常授業の場合、クラスが空いているかチェック
        if (isClassBusy(assignment.class.id, day, period)) {
            return false;
        }
    }
    
    // 教室の重複をチェック
    if (assignment.room && isRoomBusy(assignment.room.id, day, period)) {
        return false;
    }
    
    return true;
}

// 教師が忙しいかチェック
function isTeacherBusy(teacher, day, period) {
    for (let d = 0; d < 5; d++) {
        for (let p = 1; p <= 6; p++) {
            const key = `${d}-${p}`;
            const scheduled = timetableData.schedule[key];
            if (scheduled && scheduled.teacher.id === teacher.id && d === day && p === period) {
                return true;
            }
        }
    }
    return false;
}

// クラスが忙しいかチェック
function isClassBusy(classId, day, period) {
    for (let d = 0; d < 5; d++) {
        for (let p = 1; p <= 6; p++) {
            const key = `${d}-${p}`;
            const scheduled = timetableData.schedule[key];
            if (scheduled && d === day && p === period) {
                if (scheduled.class && scheduled.class.id === classId) {
                    return true;
                }
                if (scheduled.type === 'joint' && scheduled.jointClasses.includes(classId)) {
                    return true;
                }
            }
        }
    }
    return false;
}

// 教室が忙しいかチェック
function isRoomBusy(roomId, day, period) {
    for (let d = 0; d < 5; d++) {
        for (let p = 1; p <= 6; p++) {
            const key = `${d}-${p}`;
            const scheduled = timetableData.schedule[key];
            if (scheduled && scheduled.room && scheduled.room.id === roomId && d === day && p === period) {
                return true;
            }
        }
    }
    return false;
}

// 適切な教室を見つける
function findSuitableRoom(subject) {
    let suitableRooms;
    
    switch (subject) {
        case '理科':
            suitableRooms = rooms.filter(r => r.type === 'science');
            break;
        case '音楽':
            suitableRooms = rooms.filter(r => r.type === 'music');
            break;
        case '美術':
            suitableRooms = rooms.filter(r => r.type === 'art');
            break;
        case '技術・家庭':
            suitableRooms = rooms.filter(r => r.type === 'technology');
            break;
        case '体育':
            suitableRooms = rooms.filter(r => r.type === 'gym');
            break;
        default:
            suitableRooms = rooms.filter(r => r.type === 'normal');
    }
    
    return suitableRooms.length > 0 ? suitableRooms[0] : rooms[0];
}

// 配列をシャッフル
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 時間割表示
function displayTimetable() {
    const table = document.getElementById('timetable');
    const periods = table.querySelectorAll('.period');
    
    periods.forEach(period => {
        const day = parseInt(period.dataset.day);
        const periodNum = parseInt(period.dataset.period);
        const key = `${day}-${periodNum}`;
        const assignment = timetableData.schedule[key];
        
        if (assignment) {
            let className = 'period occupied';
            let displayInfo = '';
            
            if (assignment.type === 'meeting') {
                className += ' meeting';
                displayInfo = `
                    <div class="lesson-info">
                        <div class="lesson-subject">🏛️ ${assignment.subject}</div>
                        <div class="lesson-teacher">${assignment.teacher.name}</div>
                        <div class="lesson-room">会議</div>
                    </div>
                `;
            } else if (assignment.type === 'joint') {
                className += ' joint';
                const classNames = assignment.jointClasses.map(id => {
                    const cls = classes.find(c => c.id === id);
                    return cls ? `${cls.grade}${cls.name}` : '';
                }).join(',');
                
                displayInfo = `
                    <div class="lesson-info">
                        <div class="lesson-subject">👥 ${assignment.subject}</div>
                        <div class="lesson-teacher">${assignment.teacher.name}</div>
                        <div class="lesson-room">${assignment.room ? assignment.room.name : ''}</div>
                        <div class="lesson-classes">${classNames}</div>
                    </div>
                `;
            } else if (assignment.type === 'homeroom') {
                className += ' homeroom';
                const subjectIcon = assignment.subject === '道徳' ? '🎓' : '🏫';
                displayInfo = `
                    <div class="lesson-info">
                        <div class="lesson-subject">${subjectIcon} ${assignment.subject}</div>
                        <div class="lesson-teacher">${assignment.teacher.name}(担任)</div>
                        <div class="lesson-room">${assignment.room ? assignment.room.name : ''}</div>
                        <div class="lesson-class">${assignment.class ? `${assignment.class.grade}年${assignment.class.name}` : ''}</div>
                    </div>
                `;
            } else {
                displayInfo = `
                    <div class="lesson-info">
                        <div class="lesson-subject">${assignment.subject}</div>
                        <div class="lesson-teacher">${assignment.teacher.name}</div>
                        <div class="lesson-room">${assignment.room ? assignment.room.name : ''}</div>
                        <div class="lesson-class">${assignment.class ? `${assignment.class.grade}年${assignment.class.name}` : ''}</div>
                    </div>
                `;
            }
            
            period.className = className;
            period.innerHTML = displayInfo;
        } else {
            period.className = 'period';
            period.innerHTML = '';
        }
    });
}

// 時間割クリア
function clearTimetable() {
    if (confirm('時間割をクリアしますか？')) {
        initializeTimetable();
        displayTimetable();
        hideValidationResults();
        showNotification('時間割をクリアしました', 'success');
    }
}

// 矛盾チェック
function validateTimetable() {
    const conflicts = [];
    const teacherSchedule = {};
    const roomSchedule = {};
    
    // 各時間帯での重複チェック
    for (let day = 0; day < 5; day++) {
        for (let period = 1; period <= 6; period++) {
            const key = `${day}-${period}`;
            const assignment = timetableData.schedule[key];
            
            if (assignment) {
                const timeSlot = `${day}-${period}`;
                
                // 教員の重複チェック
                const teacherId = assignment.teacher.id;
                if (teacherSchedule[timeSlot]) {
                    if (teacherSchedule[timeSlot].includes(teacherId)) {
                        conflicts.push(`${getDayName(day)}${period}時間目: ${assignment.teacher.name}先生が重複`);
                    } else {
                        teacherSchedule[timeSlot].push(teacherId);
                    }
                } else {
                    teacherSchedule[timeSlot] = [teacherId];
                }
                
                // 教室の重複チェック
                if (assignment.room) {
                    const roomId = assignment.room.id;
                    if (roomSchedule[timeSlot]) {
                        if (roomSchedule[timeSlot].includes(roomId)) {
                            conflicts.push(`${getDayName(day)}${period}時間目: ${assignment.room.name}が重複`);
                        } else {
                            roomSchedule[timeSlot].push(roomId);
                        }
                    } else {
                        roomSchedule[timeSlot] = [roomId];
                    }
                }
            }
        }
    }
    
    showValidationResults(conflicts);
}

// 曜日名取得
function getDayName(day) {
    const days = ['月', '火', '水', '木', '金'];
    return days[day];
}

// 検証結果表示
function showValidationResults(conflicts) {
    const resultsDiv = document.getElementById('validation-results');
    resultsDiv.style.display = 'block';
    
    if (conflicts.length === 0) {
        resultsDiv.className = 'success';
        resultsDiv.innerHTML = '<h4>✅ 矛盾は見つかりませんでした</h4><p>時間割は正常です。</p>';
    } else {
        resultsDiv.className = 'error';
        resultsDiv.innerHTML = `
            <h4>⚠️ ${conflicts.length}件の矛盾が見つかりました</h4>
            ${conflicts.map(conflict => `<div class="validation-item">${conflict}</div>`).join('')}
        `;
    }
}

function hideValidationResults() {
    document.getElementById('validation-results').style.display = 'none';
}

// 通知表示
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.background = '#28a745';
    } else {
        notification.style.background = '#dc3545';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// 出力機能
function printTimetable() {
    window.print();
}

function exportTimetable() {
    const csvContent = generateCSV();
    downloadCSV(csvContent, 'timetable.csv');
}

function generateCSV() {
    let csv = '時間,月曜日,火曜日,水曜日,木曜日,金曜日\n';
    
    for (let period = 1; period <= 6; period++) {
        let row = `${period}時間目`;
        
        for (let day = 0; day < 5; day++) {
            const key = `${day}-${period}`;
            const assignment = timetableData.schedule[key];
            
            if (assignment) {
                row += `,${assignment.subject}(${assignment.teacher.name})`;
            } else {
                row += ',';
            }
        }
        
        csv += row + '\n';
    }
    
    return csv;
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// データ保存・読込
function saveData() {
    const data = {
        teachers: teachers,
        classes: classes,
        rooms: rooms,
        timetable: timetableData
    };
    
    const jsonData = JSON.stringify(data, null, 2);
    downloadJSON(jsonData, 'timetable-data.json');
}

function downloadJSON(content, filename) {
    const blob = new Blob([content], { type: 'application/json' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function loadData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    teachers = data.teachers || [];
                    classes = data.classes || [];
                    rooms = data.rooms || [];
                    timetableData = data.timetable || {};
                    
                    updateDataLists();
                    displayTimetable();
                    showNotification('データを読み込みました', 'success');
                } catch (error) {
                    showNotification('データの読み込みに失敗しました', 'error');
                }
            };
            reader.readAsText(file);
        }
    });
    
    input.click();
}

// CSS アニメーション
// 法定時数適合チェック
function checkLegalHoursCompliance() {
    const reportContainer = document.getElementById('legal-hours-report');
    
    if (Object.keys(timetableData.schedule).length === 0) {
        reportContainer.innerHTML = '<div class="report-section error"><h4>⚠️ エラー</h4><p>時間割が作成されていません。まず時間割を作成してください。</p></div>';
        return;
    }

    // 各クラス・教科ごとの実際の授業時数を集計
    const actualHours = {};
    
    // 時間割から実際の授業時数を集計
    Object.values(timetableData.schedule).forEach(assignment => {
        if (assignment && assignment.type === 'regular' && assignment.class) {
            const key = `${assignment.class.grade}-${assignment.subject}`;
            if (!actualHours[key]) {
                actualHours[key] = {
                    grade: assignment.class.grade,
                    subject: assignment.subject,
                    count: 0,
                    classes: new Set()
                };
            }
            actualHours[key].count++;
            actualHours[key].classes.add(`${assignment.class.grade}${assignment.class.name}`);
        }
    });

    // 法定時数と比較
    let html = '<div class="legal-hours-summary"><h5>📊 法定時数適合レポート</h5></div>';
    
    const gradeReports = {};
    let totalCompliance = 0;
    let totalSubjects = 0;

    Object.values(actualHours).forEach(data => {
        const legalHour = LEGAL_HOURS[data.grade][data.subject] || 0;
        const actualWeeklyHour = data.count; // 週の実際の時数
        const compliance = Math.abs(actualWeeklyHour - legalHour) <= 0.5; // 0.5時間の誤差を許容
        
        if (!gradeReports[data.grade]) {
            gradeReports[data.grade] = [];
        }
        
        let status = 'compliant';
        let statusText = '✅ 適合';
        
        if (actualWeeklyHour < legalHour - 0.5) {
            status = 'error';
            statusText = '❌ 不足';
        } else if (actualWeeklyHour > legalHour + 0.5) {
            status = 'warning';
            statusText = '⚠️ 超過';
        }
        
        gradeReports[data.grade].push({
            subject: data.subject,
            legal: legalHour,
            actual: actualWeeklyHour,
            status: status,
            statusText: statusText,
            classes: Array.from(data.classes).join('・'),
            compliance: compliance
        });
        
        if (compliance) totalCompliance++;
        totalSubjects++;
    });

    // 学年ごとのレポート生成
    Object.keys(gradeReports).sort().forEach(grade => {
        const reports = gradeReports[grade];
        const gradeCompliance = reports.filter(r => r.compliance).length;
        const gradeTotal = reports.length;
        
        let sectionClass = 'compliance';
        if (gradeCompliance < gradeTotal * 0.8) {
            sectionClass = 'warning';
        }
        if (gradeCompliance < gradeTotal * 0.6) {
            sectionClass = 'error';
        }
        
        html += `<div class="report-section ${sectionClass}">`;
        html += `<h4>第${grade}学年 (適合率: ${gradeCompliance}/${gradeTotal})</h4>`;
        
        reports.forEach(report => {
            html += `
                <div class="report-item">
                    <div class="subject-info">
                        <strong>${report.subject}</strong> (${report.classes})
                    </div>
                    <div class="hours-info ${report.status}">
                        ${report.statusText} ${report.actual}/${report.legal}時間
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    });

    // 全体の適合率
    const overallCompliance = Math.round((totalCompliance / totalSubjects) * 100);
    let overallStatus = 'compliance';
    if (overallCompliance < 80) overallStatus = 'warning';
    if (overallCompliance < 60) overallStatus = 'error';
    
    html = `<div class="report-section ${overallStatus}">
        <h4>📈 全体適合率: ${overallCompliance}% (${totalCompliance}/${totalSubjects})</h4>
    </div>` + html;

    reportContainer.innerHTML = html;
    showNotification(`法定時数チェック完了: 適合率 ${overallCompliance}%`, overallCompliance >= 80 ? 'success' : 'warning');
}

// 一括追加モード関連関数

// 一括追加モードの切り替え
function toggleBulkMode() {
    bulkModeActive = !bulkModeActive;
    const bulkContainer = document.getElementById('bulk-add-mode');
    const button = document.getElementById('bulk-mode-btn');
    
    if (bulkModeActive) {
        bulkContainer.style.display = 'block';
        bulkContainer.classList.add('active');
        button.innerHTML = '<i class="fas fa-times"></i> 単体追加モード';
        button.classList.remove('btn-validate');
        button.classList.add('btn-secondary');
        initializeBulkTable();
    } else {
        bulkContainer.style.display = 'none';
        bulkContainer.classList.remove('active');
        button.innerHTML = '<i class="fas fa-users-cog"></i> 一括追加モード';
        button.classList.remove('btn-secondary');
        button.classList.add('btn-validate');
    }
}

// 一括追加テーブルの初期化
function initializeBulkTable() {
    bulkTeacherData = [];
    addBulkRow(); // 最初の行を追加
    addBulkRow(); // 2行目も追加
    addBulkRow(); // 3行目も追加
}

// 一括追加行の追加
function addBulkRow() {
    const rowId = Date.now() + Math.random();
    const newRow = {
        id: rowId,
        name: '',
        subject: '',
        teachingClasses: [],
        homeroomRole: '',
        homeroomClass: null,
        weeklyHours: 0,
        forbiddenTimes: new Set(),
        meetings: []
    };
    
    bulkTeacherData.push(newRow);
    renderBulkTable();
}

// 一括追加テーブルの描画
function renderBulkTable() {
    const tbody = document.getElementById('bulk-teacher-tbody');
    tbody.innerHTML = '';
    
    bulkTeacherData.forEach((teacher, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="text" value="${teacher.name}" 
                       onchange="updateBulkTeacher(${index}, 'name', this.value)"
                       placeholder="教員名">
            </td>
            <td>
                <select onchange="updateBulkTeacher(${index}, 'subject', this.value)">
                    <option value="">選択</option>
                    <option value="国語" ${teacher.subject === '国語' ? 'selected' : ''}>国語</option>
                    <option value="社会" ${teacher.subject === '社会' ? 'selected' : ''}>社会</option>
                    <option value="数学" ${teacher.subject === '数学' ? 'selected' : ''}>数学</option>
                    <option value="理科" ${teacher.subject === '理科' ? 'selected' : ''}>理科</option>
                    <option value="音楽" ${teacher.subject === '音楽' ? 'selected' : ''}>音楽</option>
                    <option value="美術" ${teacher.subject === '美術' ? 'selected' : ''}>美術</option>
                    <option value="保健体育" ${teacher.subject === '保健体育' ? 'selected' : ''}>保健体育</option>
                    <option value="技術・家庭" ${teacher.subject === '技術・家庭' ? 'selected' : ''}>技術・家庭</option>
                    <option value="外国語" ${teacher.subject === '外国語' ? 'selected' : ''}>外国語</option>
                    <option value="道徳" ${teacher.subject === '道徳' ? 'selected' : ''}>道徳</option>
                    <option value="総合的な学習の時間" ${teacher.subject === '総合的な学習の時間' ? 'selected' : ''}>総合</option>
                    <option value="特別活動" ${teacher.subject === '特別活動' ? 'selected' : ''}>特別活動</option>
                </select>
            </td>
            <td>
                <div class="class-multi-select" id="classes-${index}">
                    ${renderClassTags(teacher.teachingClasses, index)}
                </div>
                <select onchange="addClassToBulkTeacher(${index}, this.value); this.value=''">
                    <option value="">クラス選択</option>
                    ${renderClassOptions(teacher.teachingClasses)}
                </select>
            </td>
            <td>
                <select onchange="updateBulkTeacher(${index}, 'homeroomRole', this.value)">
                    <option value="">選択なし</option>
                    <option value="main" ${teacher.homeroomRole === 'main' ? 'selected' : ''}>担任</option>
                    <option value="sub" ${teacher.homeroomRole === 'sub' ? 'selected' : ''}>副担任</option>
                </select>
            </td>
            <td>
                <select onchange="updateBulkTeacher(${index}, 'homeroomClass', parseInt(this.value) || null)" 
                        ${!teacher.homeroomRole ? 'disabled' : ''}>
                    <option value="">クラス選択</option>
                    ${classes.map(c => `<option value="${c.id}" ${teacher.homeroomClass === c.id ? 'selected' : ''}>${c.grade}年${c.name}</option>`).join('')}
                </select>
            </td>
            <td>
                <input type="number" value="${teacher.weeklyHours}" 
                       onchange="updateBulkTeacher(${index}, 'weeklyHours', parseInt(this.value))"
                       min="0" max="30" readonly style="background: #f0f0f0;">
                <br>
                <button type="button" onclick="calculateBulkLegalHours(${index})" 
                        style="font-size: 0.7rem; padding: 2px 6px; margin-top: 2px;">計算</button>
            </td>
            <td>
                <button type="button" onclick="setBulkForbiddenTimes(${index})" 
                        style="font-size: 0.8rem; padding: 4px 8px;">
                    ${teacher.forbiddenTimes.size > 0 ? `設定済(${teacher.forbiddenTimes.size})` : '設定'}
                </button>
            </td>
            <td>
                <button type="button" onclick="setBulkMeetings(${index})" 
                        style="font-size: 0.8rem; padding: 4px 8px;">
                    ${teacher.meetings.length > 0 ? `設定済(${teacher.meetings.length})` : '設定'}
                </button>
            </td>
            <td>
                <div class="bulk-row-actions">
                    <button class="bulk-row-btn copy" onclick="copyBulkRow(${index})" title="行をコピー">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="bulk-row-btn delete" onclick="deleteBulkRow(${index})" title="行を削除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// クラスタグの描画
function renderClassTags(teachingClasses, teacherIndex) {
    return teachingClasses.map(classId => {
        const classData = classes.find(c => c.id === classId);
        if (classData) {
            return `<span class="class-tag">
                ${classData.grade}${classData.name}
                <span class="remove" onclick="removeClassFromBulkTeacher(${teacherIndex}, ${classId})">×</span>
            </span>`;
        }
        return '';
    }).join('');
}

// クラス選択オプションの描画
function renderClassOptions(selectedClasses) {
    return classes.map(classData => {
        if (!selectedClasses.includes(classData.id)) {
            return `<option value="${classData.id}">${classData.grade}年${classData.name}</option>`;
        }
        return '';
    }).join('');
}

// 一括教員データの更新
function updateBulkTeacher(index, field, value) {
    if (bulkTeacherData[index]) {
        bulkTeacherData[index][field] = value;
    }
}

// クラスを一括教員に追加
function addClassToBulkTeacher(index, classId) {
    if (classId && bulkTeacherData[index]) {
        const classIdNum = parseInt(classId);
        if (!bulkTeacherData[index].teachingClasses.includes(classIdNum)) {
            bulkTeacherData[index].teachingClasses.push(classIdNum);
            renderBulkTable();
        }
    }
}

// クラスを一括教員から削除
function removeClassFromBulkTeacher(index, classId) {
    if (bulkTeacherData[index]) {
        bulkTeacherData[index].teachingClasses = bulkTeacherData[index].teachingClasses.filter(id => id !== classId);
        renderBulkTable();
    }
}

// 一括法定時数計算
function calculateBulkLegalHours(index) {
    const teacher = bulkTeacherData[index];
    if (!teacher.subject || teacher.teachingClasses.length === 0) {
        alert('教科と担当クラスを選択してください');
        return;
    }

    let totalHours = 0;
    teacher.teachingClasses.forEach(classId => {
        const classData = classes.find(c => c.id === classId);
        if (classData) {
            const hours = LEGAL_HOURS[classData.grade][teacher.subject] || 0;
            totalHours += hours;
        }
    });

    // 担任の場合、道徳と特別活動の時数を追加
    if (teacher.homeroomRole === 'main' && teacher.homeroomClass) {
        const homeroomClassData = classes.find(c => c.id === teacher.homeroomClass);
        if (homeroomClassData) {
            const moralHours = LEGAL_HOURS[homeroomClassData.grade]['道徳'] || 1;
            const specialActivityHours = LEGAL_HOURS[homeroomClassData.grade]['特別活動'] || 1;
            totalHours += moralHours + specialActivityHours;
        }
    }

    teacher.weeklyHours = Math.round(totalHours);
    renderBulkTable();
    
    const homeroomInfo = teacher.homeroomRole === 'main' ? '(担任科目含む)' : '';
    showNotification(`${teacher.name || '教員'}: ${totalHours.toFixed(1)}時間 → ${teacher.weeklyHours}コマ ${homeroomInfo}`, 'success');
}

// 一括行のコピー
function copyBulkRow(index) {
    const originalTeacher = bulkTeacherData[index];
    const newTeacher = {
        id: Date.now() + Math.random(),
        name: originalTeacher.name + '_コピー',
        subject: originalTeacher.subject,
        teachingClasses: [...originalTeacher.teachingClasses],
        homeroomRole: originalTeacher.homeroomRole,
        homeroomClass: originalTeacher.homeroomClass,
        weeklyHours: originalTeacher.weeklyHours,
        forbiddenTimes: new Set(originalTeacher.forbiddenTimes),
        meetings: [...originalTeacher.meetings]
    };
    
    bulkTeacherData.splice(index + 1, 0, newTeacher);
    renderBulkTable();
}

// 一括行の削除
function deleteBulkRow(index) {
    if (bulkTeacherData.length > 1) {
        bulkTeacherData.splice(index, 1);
        renderBulkTable();
    } else {
        alert('最低1行は必要です');
    }
}

// 一括禁止時間設定（簡易版）
function setBulkForbiddenTimes(index) {
    const periods = prompt('禁止時間を入力してください（例: 月1,火3,金6）\n形式: 曜日+時限をカンマ区切り');
    if (periods) {
        const forbiddenTimes = new Set();
        const dayMap = { '月': 0, '火': 1, '水': 2, '木': 3, '金': 4 };
        
        periods.split(',').forEach(period => {
            const match = period.trim().match(/([月火水木金])(\d)/);
            if (match) {
                const day = dayMap[match[1]];
                const periodNum = parseInt(match[2]);
                if (day !== undefined && periodNum >= 1 && periodNum <= 6) {
                    forbiddenTimes.add(`${day}-${periodNum}`);
                }
            }
        });
        
        bulkTeacherData[index].forbiddenTimes = forbiddenTimes;
        renderBulkTable();
    }
}

// 一括会議設定（簡易版）
function setBulkMeetings(index) {
    const meetings = prompt('会議を入力してください（例: 企画委員会_月6,職員会議_金6）\n形式: 会議名_曜日+時限をカンマ区切り');
    if (meetings) {
        const meetingList = [];
        const dayMap = { '月': 0, '火': 1, '水': 2, '木': 3, '金': 4 };
        
        meetings.split(',').forEach(meeting => {
            const parts = meeting.trim().split('_');
            if (parts.length === 2) {
                const name = parts[0];
                const match = parts[1].match(/([月火水木金])(\d)/);
                if (match) {
                    const day = dayMap[match[1]];
                    const period = parseInt(match[2]);
                    if (day !== undefined && period >= 1 && period <= 6) {
                        meetingList.push({
                            id: Date.now() + Math.random(),
                            name: name,
                            day: day,
                            period: period
                        });
                    }
                }
            }
        });
        
        bulkTeacherData[index].meetings = meetingList;
        renderBulkTable();
    }
}

// プレビュー機能
function previewBulkAdd() {
    const validTeachers = bulkTeacherData.filter(t => t.name && t.subject && t.teachingClasses.length > 0);
    const errors = [];
    
    bulkTeacherData.forEach((teacher, index) => {
        if (!teacher.name) errors.push(`行${index + 1}: 教員名が未入力`);
        if (!teacher.subject) errors.push(`行${index + 1}: 教科が未選択`);
        if (teacher.teachingClasses.length === 0) errors.push(`行${index + 1}: 担当クラスが未選択`);
    });
    
    const resultDiv = document.getElementById('bulk-preview-result');
    
    if (errors.length > 0) {
        resultDiv.className = 'preview-result error';
        resultDiv.innerHTML = `<strong>エラー (${errors.length}件)</strong><br>${errors.slice(0, 3).join('<br>')}${errors.length > 3 ? '<br>...' : ''}`;
    } else {
        resultDiv.className = 'preview-result';
        resultDiv.innerHTML = `<strong>追加予定: ${validTeachers.length}名</strong><br>すべて正常です`;
    }
}

// 一括追加実行
function submitBulkAdd() {
    const validTeachers = bulkTeacherData.filter(t => t.name && t.subject && t.teachingClasses.length > 0);
    
    if (validTeachers.length === 0) {
        alert('追加可能な教員がありません');
        return;
    }
    
    if (!confirm(`${validTeachers.length}名の教員を追加しますか？`)) {
        return;
    }
    
    let addedCount = 0;
    
    validTeachers.forEach(bulkTeacher => {
        // 法定時数ベースの担当クラスデータ作成
        const teachingClassesData = [];
        let totalHours = 0;
        
        bulkTeacher.teachingClasses.forEach(classId => {
            const classData = classes.find(c => c.id === classId);
            if (classData) {
                const hours = LEGAL_HOURS[classData.grade][bulkTeacher.subject] || 0;
                totalHours += hours;
                teachingClassesData.push({
                    classId: classId,
                    grade: classData.grade,
                    className: classData.name,
                    hours: hours
                });
            }
        });
        
        // 担任の場合、道徳と特別活動を自動追加
        let homeroomSubjects = [];
        if (bulkTeacher.homeroomRole === 'main' && bulkTeacher.homeroomClass) {
            const homeroomClassData = classes.find(c => c.id === bulkTeacher.homeroomClass);
            if (homeroomClassData) {
                // 道徳の追加
                const moralHours = LEGAL_HOURS[homeroomClassData.grade]['道徳'] || 1;
                homeroomSubjects.push({
                    subject: '道徳',
                    classId: bulkTeacher.homeroomClass,
                    grade: homeroomClassData.grade,
                    className: homeroomClassData.name,
                    hours: moralHours
                });
                
                // 特別活動の追加
                const specialActivityHours = LEGAL_HOURS[homeroomClassData.grade]['特別活動'] || 1;
                homeroomSubjects.push({
                    subject: '特別活動',
                    classId: bulkTeacher.homeroomClass,
                    grade: homeroomClassData.grade,
                    className: homeroomClassData.name,
                    hours: specialActivityHours
                });
                
                // 担任授業を法定時数に加算
                totalHours += moralHours + specialActivityHours;
            }
        }
        
        const teacher = {
            id: Date.now() + Math.random(),
            name: bulkTeacher.name,
            subject: bulkTeacher.subject,
            weeklyLessons: bulkTeacher.weeklyHours || Math.round(totalHours),
            teachingClasses: teachingClassesData,
            legalHours: totalHours,
            homeroomRole: bulkTeacher.homeroomRole || '',
            homeroomClass: bulkTeacher.homeroomClass || null,
            homeroomSubjects: homeroomSubjects,
            forbiddenTimes: new Set(bulkTeacher.forbiddenTimes),
            meetings: [...bulkTeacher.meetings],
            jointClasses: []
        };
        
        teachers.push(teacher);
        addedCount++;
    });
    
    updateDataLists();
    saveToLocalStorage();
    showNotification(`${addedCount}名の教員を追加しました`, 'success');
    
    // 一括モードを終了
    toggleBulkMode();
}

// 一括テーブルクリア
function clearBulkTable() {
    if (confirm('一括追加テーブルをクリアしますか？')) {
        initializeBulkTable();
        document.getElementById('bulk-preview-result').innerHTML = '';
    }
}

// CSV インポート機能（簡易版）
function importCSV() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    
    input.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const csv = e.target.result;
                    const lines = csv.split('\n').filter(line => line.trim());
                    
                    if (lines.length < 2) {
                        alert('CSVファイルの形式が正しくありません');
                        return;
                    }
                    
                    // ヘッダーをスキップして2行目から処理
                    const teachers = [];
                    for (let i = 1; i < lines.length; i++) {
                        const fields = lines[i].split(',').map(f => f.trim().replace(/"/g, ''));
                        if (fields.length >= 3 && fields[0] && fields[1]) {
                            teachers.push({
                                id: Date.now() + Math.random(),
                                name: fields[0],
                                subject: fields[1],
                                teachingClasses: fields[2] ? fields[2].split('|').map(c => {
                                    // "1A" → クラスIDを検索
                                    const match = c.match(/(\d)([A-Z])/);
                                    if (match) {
                                        const grade = parseInt(match[1]);
                                        const className = match[2] + '組';
                                        const classData = classes.find(cl => cl.grade === grade && cl.name === className);
                                        return classData ? classData.id : null;
                                    }
                                    return null;
                                }).filter(id => id !== null) : [],
                                weeklyHours: fields[3] ? parseInt(fields[3]) : 0,
                                forbiddenTimes: new Set(),
                                meetings: []
                            });
                        }
                    }
                    
                    if (teachers.length > 0) {
                        bulkTeacherData = teachers;
                        renderBulkTable();
                        showNotification(`${teachers.length}名の教員データを読み込みました`, 'success');
                    } else {
                        alert('有効な教員データが見つかりませんでした');
                    }
                } catch (error) {
                    alert('CSVファイルの読み込みに失敗しました');
                }
            };
            reader.readAsText(file, 'UTF-8');
        }
    });
    
    input.click();
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// 特別支援クラス関連の関数

// 特別支援クラスセレクターの初期化
function initializeSpecialClassSelector() {
    const selector = document.getElementById('special-class-select');
    const hoursSettings = document.getElementById('special-hours-settings');
    
    if (selector) {
        selector.addEventListener('change', function() {
            const selectedClassId = this.value;
            if (selectedClassId) {
                loadSpecialClassHours(selectedClassId);
                if (hoursSettings) {
                    hoursSettings.style.display = 'block';
                }
            } else {
                if (hoursSettings) {
                    hoursSettings.style.display = 'none';
                }
            }
        });
    }
    
    // 時数入力フィールドにイベントリスナーを追加
    setTimeout(() => {
        const hourInputs = document.querySelectorAll('.hours-grid input[type="number"]');
        hourInputs.forEach(input => {
            input.addEventListener('input', calculateSpecialTotalHours);
        });
        
        // 生活単元フィールドにも個別でイベントリスナーを追加
        const dailyLifeInput = document.getElementById('special-hours-daily-life');
        if (dailyLifeInput) {
            dailyLifeInput.addEventListener('input', calculateSpecialTotalHours);
        }
    }, 100);
}

// 特別支援クラス選択肢を更新
function updateSpecialClassSelector() {
    const selector = document.getElementById('special-class-select');
    if (!selector) return;
    
    // 現在の選択を保存
    const currentSelection = selector.value;
    
    // 選択肢をクリア
    selector.innerHTML = '<option value="">クラスを選択してください</option>';
    
    // 特別支援クラスのみを追加
    const specialClasses = classes.filter(c => c.type && c.type.startsWith('special-'));
    specialClasses.forEach(classData => {
        const option = document.createElement('option');
        option.value = classData.id;
        option.textContent = `${classData.grade}年 ${classData.name}`;
        selector.appendChild(option);
    });
    
    // 以前の選択を復元
    if (currentSelection) {
        selector.value = currentSelection;
    }
}

// 特別支援クラスの時数データを読み込み
function loadSpecialClassHours(classId) {
    const classData = classes.find(c => c.id == classId);
    if (!classData) return;
    
    // 生活単元フィールドの表示制御（知的障害学級のみ表示）
    const dailyLifeItem = document.getElementById('daily-life-unit-item');
    if (dailyLifeItem) {
        if (classData.type === 'special-intellectual') {
            dailyLifeItem.style.display = 'flex';
        } else {
            dailyLifeItem.style.display = 'none';
            // 知的障害学級以外の場合は値をクリア
            document.getElementById('special-hours-daily-life').value = '';
        }
    }
    
    // デフォルト時数またはカスタム時数を取得
    const savedHours = specialClassHours[classId] || getStandardHours(classData.grade);
    
    // フォームに値を設定
    document.getElementById('special-hours-japanese').value = savedHours['国語'] || '';
    document.getElementById('special-hours-social').value = savedHours['社会'] || '';
    document.getElementById('special-hours-math').value = savedHours['数学'] || '';
    document.getElementById('special-hours-science').value = savedHours['理科'] || '';
    document.getElementById('special-hours-music').value = savedHours['音楽'] || '';
    document.getElementById('special-hours-art').value = savedHours['美術'] || '';
    document.getElementById('special-hours-pe').value = savedHours['保健体育'] || '';
    document.getElementById('special-hours-tech').value = savedHours['技術・家庭'] || '';
    document.getElementById('special-hours-english').value = savedHours['外国語'] || '';
    document.getElementById('special-hours-moral').value = savedHours['道徳'] || '';
    document.getElementById('special-hours-integrated').value = savedHours['総合的な学習の時間'] || '';
    document.getElementById('special-hours-special').value = savedHours['特別活動'] || '';
    document.getElementById('special-hours-independence').value = savedHours['自立活動'] || '';
    document.getElementById('special-hours-daily-life').value = savedHours['生活単元'] || '';
    
    calculateSpecialTotalHours();
}

// 標準時数を取得
function getStandardHours(grade) {
    return LEGAL_HOURS[grade] || {};
}

// 特別支援クラスの合計時数を計算
function calculateSpecialTotalHours() {
    const inputs = {
        '国語': document.getElementById('special-hours-japanese'),
        '社会': document.getElementById('special-hours-social'),
        '数学': document.getElementById('special-hours-math'),
        '理科': document.getElementById('special-hours-science'),
        '音楽': document.getElementById('special-hours-music'),
        '美術': document.getElementById('special-hours-art'),
        '保健体育': document.getElementById('special-hours-pe'),
        '技術・家庭': document.getElementById('special-hours-tech'),
        '外国語': document.getElementById('special-hours-english'),
        '道徳': document.getElementById('special-hours-moral'),
        '総合的な学習の時間': document.getElementById('special-hours-integrated'),
        '特別活動': document.getElementById('special-hours-special'),
        '自立活動': document.getElementById('special-hours-independence'),
        '生活単元': document.getElementById('special-hours-daily-life')
    };
    
    let total = 0;
    for (const subject in inputs) {
        // 生活単元は知的障害学級以外では計算から除外
        if (subject === '生活単元') {
            const classId = document.getElementById('special-class-select').value;
            const classData = classes.find(c => c.id == classId);
            if (!classData || classData.type !== 'special-intellectual') {
                continue;
            }
        }
        
        const input = inputs[subject];
        if (input) {
            const value = parseFloat(input.value) || 0;
            total += value;
        }
    }
    
    // 合計時数を表示
    const totalElement = document.getElementById('special-total-hours');
    if (totalElement) {
        totalElement.textContent = total.toFixed(1);
    }
    
    // 標準時数との差を計算
    const classId = document.getElementById('special-class-select').value;
    if (classId) {
        const classData = classes.find(c => c.id == classId);
        if (classData) {
            const standardHours = getStandardHours(classData.grade);
            let standardTotal = 0;
            for (const subject in standardHours) {
                standardTotal += standardHours[subject] || 0;
            }
            
            const difference = total - standardTotal;
            const differenceElement = document.getElementById('hours-difference');
            if (differenceElement) {
                differenceElement.textContent = difference.toFixed(1);
                differenceElement.style.color = difference >= 0 ? '#28a745' : '#dc3545';
            }
        }
    }
}

// 特別支援クラスの時数設定を保存
function saveSpecialHours() {
    const classId = document.getElementById('special-class-select').value;
    if (!classId) {
        alert('クラスを選択してください');
        return;
    }
    
    const classData = classes.find(c => c.id == classId);
    
    const hours = {
        '国語': parseFloat(document.getElementById('special-hours-japanese').value) || 0,
        '社会': parseFloat(document.getElementById('special-hours-social').value) || 0,
        '数学': parseFloat(document.getElementById('special-hours-math').value) || 0,
        '理科': parseFloat(document.getElementById('special-hours-science').value) || 0,
        '音楽': parseFloat(document.getElementById('special-hours-music').value) || 0,
        '美術': parseFloat(document.getElementById('special-hours-art').value) || 0,
        '保健体育': parseFloat(document.getElementById('special-hours-pe').value) || 0,
        '技術・家庭': parseFloat(document.getElementById('special-hours-tech').value) || 0,
        '外国語': parseFloat(document.getElementById('special-hours-english').value) || 0,
        '道徳': parseFloat(document.getElementById('special-hours-moral').value) || 0,
        '総合的な学習の時間': parseFloat(document.getElementById('special-hours-integrated').value) || 0,
        '特別活動': parseFloat(document.getElementById('special-hours-special').value) || 0,
        '自立活動': parseFloat(document.getElementById('special-hours-independence').value) || 0
    };
    
    // 知的障害学級の場合のみ生活単元を含める
    if (classData && classData.type === 'special-intellectual') {
        hours['生活単元'] = parseFloat(document.getElementById('special-hours-daily-life').value) || 0;
    }
    
    specialClassHours[classId] = hours;
    
    // ローカルストレージに保存
    localStorage.setItem('specialClassHours', JSON.stringify(specialClassHours));
    
    showNotification('特別支援クラスの時数設定を保存しました', 'success');
}

// 標準時数に戻す
function resetToStandardHours() {
    const classId = document.getElementById('special-class-select').value;
    if (!classId) {
        alert('クラスを選択してください');
        return;
    }
    
    const classData = classes.find(c => c.id == classId);
    if (!classData) return;
    
    // 特別支援クラス用のカスタム時数を削除
    delete specialClassHours[classId];
    
    // 標準時数を再読み込み
    loadSpecialClassHours(classId);
    
    showNotification('標準時数に戻しました', 'info');
}

// 標準学級からコピー
function copyFromStandardClass() {
    const classId = document.getElementById('special-class-select').value;
    if (!classId) {
        alert('特別支援クラスを選択してください');
        return;
    }
    
    const classData = classes.find(c => c.id == classId);
    if (!classData) return;
    
    const standardHours = getStandardHours(classData.grade);
    
    // フォームに標準時数を設定
    for (const subject in standardHours) {
        const inputId = getInputIdForSubject(subject);
        const input = document.getElementById(inputId);
        if (input) {
            input.value = standardHours[subject];
        }
    }
    
    calculateSpecialTotalHours();
    showNotification('標準学級の時数をコピーしました', 'info');
}

// 教科名から入力フィールドIDを取得
function getInputIdForSubject(subject) {
    const mapping = {
        '国語': 'special-hours-japanese',
        '社会': 'special-hours-social', 
        '数学': 'special-hours-math',
        '理科': 'special-hours-science',
        '音楽': 'special-hours-music',
        '美術': 'special-hours-art',
        '保健体育': 'special-hours-pe',
        '技術・家庭': 'special-hours-tech',
        '外国語': 'special-hours-english',
        '道徳': 'special-hours-moral',
        '総合的な学習の時間': 'special-hours-integrated',
        '特別活動': 'special-hours-special',
        '生活単元': 'special-hours-daily-life'
    };
    return mapping[subject];
}

// クラス属性変更関数
function changeClassType(classId, newType) {
    const classData = classes.find(c => c.id === classId);
    if (!classData) {
        alert('クラスが見つかりません');
        return;
    }
    
    const oldType = classData.type || 'regular';
    
    // 属性を更新
    classData.type = newType;
    
    // 特別支援クラスから通常学級に変更された場合、カスタム時数設定を削除するか確認
    if (oldType.startsWith('special-') && newType === 'regular') {
        if (specialClassHours[classId]) {
            const confirmDelete = confirm(`${classData.grade}年${classData.name}のカスタム時数設定があります。\n通常学級に変更すると、この設定は削除されます。\n\n変更を続行しますか？`);
            if (confirmDelete) {
                delete specialClassHours[classId];
                localStorage.setItem('specialClassHours', JSON.stringify(specialClassHours));
                showNotification('カスタム時数設定を削除しました', 'info');
            } else {
                // 変更をキャンセル - 元の属性に戻す
                classData.type = oldType;
                updateClassList();
                return;
            }
        }
    }
    
    // 通常学級から特別支援クラスに変更された場合の名前変更確認
    if (oldType === 'regular' && newType.startsWith('special-')) {
        const typeNames = {
            'special-intellectual': '知的障害学級',
            'special-emotional': '自閉症・情緒障害学級',
            'special-physical': '肢体不自由学級',
            'special-visual': '弱視学級',
            'special-hearing': '難聴学級'
        };
        
        const typeName = typeNames[newType];
        const confirmRename = confirm(`${classData.grade}年${classData.name}を特別支援学級に変更します。\n\nクラス名を「${typeName}」に変更しますか？\n\n「OK」: ${typeName}に変更\n「キャンセル」: 現在の名前を保持`);
        
        if (confirmRename) {
            classData.name = typeName;
        }
    }
    
    // データをローカルストレージに保存
    localStorage.setItem('timetable-data', JSON.stringify({
        teachers: teachers.map(t => ({
            ...t,
            forbiddenTimes: Array.from(t.forbiddenTimes || [])
        })),
        classes: classes,
        rooms: rooms,
        timetable: timetableData
    }));
    
    // UI更新
    updateDataLists();
    
    // 成功メッセージ
    const typeDisplayNames = {
        'regular': '通常学級',
        'special-intellectual': '知的障害学級',
        'special-emotional': '自閉症・情緒障害学級',
        'special-physical': '肢体不自由学級',
        'special-visual': '弱視学級',
        'special-hearing': '難聴学級'
    };
    
    showNotification(`${classData.grade}年${classData.name}を${typeDisplayNames[newType]}に変更しました`, 'success');
}

// デフォルトクラスにリセット
function resetToDefaultClasses() {
    const confirmReset = confirm(
        '現在のクラス設定をすべて削除して、デフォルトクラス（各学年1組〜10組の通常学級）に戻しますか？\n\n' +
        '注意：\n' +
        '・すべての特別支援クラスの時数設定も削除されます\n' +
        '・この操作は取り消せません\n\n' +
        '続行しますか？'
    );
    
    if (!confirmReset) {
        return;
    }
    
    // 特別支援クラスの時数設定もクリア
    specialClassHours = {};
    localStorage.removeItem('specialClassHours');
    
    // デフォルトクラスを再生成
    generateDefaultClasses();
    
    // データを保存
    localStorage.setItem('timetable-data', JSON.stringify({
        teachers: teachers.map(t => ({
            ...t,
            forbiddenTimes: Array.from(t.forbiddenTimes || [])
        })),
        classes: classes,
        rooms: rooms,
        timetable: timetableData
    }));
    
    // UI更新
    updateDataLists();
    
    showNotification('デフォルトクラス（各学年1組〜10組）にリセットしました', 'success');
}

// 新しいクラスを追加
function addNewClass() {
    const grade = prompt('学年を入力してください（1〜3）:');
    if (!grade || isNaN(grade) || grade < 1 || grade > 3) {
        alert('正しい学年（1〜3）を入力してください');
        return;
    }
    
    const className = prompt('クラス名を入力してください（例：4組、A組など）:');
    if (!className || className.trim() === '') {
        alert('クラス名を入力してください');
        return;
    }
    
    // 同じ学年・クラス名の重複チェック
    const existingClass = classes.find(c => 
        c.grade === parseInt(grade) && c.name === className.trim()
    );
    
    if (existingClass) {
        alert(`${grade}年${className.trim()}は既に存在します`);
        return;
    }
    
    // 新しいIDを生成（既存のIDと重複しないように）
    const existingIds = classes.map(c => c.id);
    let newId = parseInt(grade) * 100 + 50; // 50番台から開始
    while (existingIds.includes(newId)) {
        newId++;
    }
    
    // 新しいクラスを追加
    const newClass = {
        id: newId,
        grade: parseInt(grade),
        name: className.trim(),
        type: 'regular' // デフォルトは通常学級
    };
    
    classes.push(newClass);
    
    // データを保存
    localStorage.setItem('timetable-data', JSON.stringify({
        teachers: teachers.map(t => ({
            ...t,
            forbiddenTimes: Array.from(t.forbiddenTimes || [])
        })),
        classes: classes,
        rooms: rooms,
        timetable: timetableData
    }));
    
    // UI更新
    updateDataLists();
    
    showNotification(`${grade}年${className.trim()}を追加しました`, 'success');
}

// 学年・教科固定設定関連の関数

// 学年・教科固定設定の初期化
function initializeGradeSubjectScheduleSettings() {
    // ラジオボタンのイベントリスナー設定
    setupGradeSubjectRadioListeners();
    
    // 保存されている設定を読み込み
    loadGradeSubjectScheduleSettings();
}

// 学年・教科スケジュールラジオボタンのイベントリスナー設定
function setupGradeSubjectRadioListeners() {
    const grades = [1, 2, 3];
    const subjects = ['homeroom', 'moral', 'integrated'];
    
    grades.forEach(grade => {
        subjects.forEach(subject => {
            const radioButtons = document.querySelectorAll(`input[name="grade${grade}-${subject}-schedule"]`);
            const selectionDiv = document.getElementById(`grade${grade}-${subject}-schedule-selection`);
            
            radioButtons.forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.value === 'fixed') {
                        selectionDiv.style.display = 'block';
                    } else {
                        selectionDiv.style.display = 'none';
                        // 自動配置選択時は時間設定をクリア
                        document.getElementById(`grade${grade}-${subject}-day`).value = '';
                        document.getElementById(`grade${grade}-${subject}-period`).value = '';
                    }
                    checkGradeSubjectConflicts();
                });
            });
            
            // 時間選択の変更監視
            const daySelect = document.getElementById(`grade${grade}-${subject}-day`);
            const periodSelect = document.getElementById(`grade${grade}-${subject}-period`);
            
            if (daySelect && periodSelect) {
                daySelect.addEventListener('change', checkGradeSubjectConflicts);
                periodSelect.addEventListener('change', checkGradeSubjectConflicts);
            }
        });
    });
}

// 学年・教科固定設定を読み込み
function loadGradeSubjectScheduleSettings() {
    const savedSchedule = localStorage.getItem('gradeSubjectSchedules');
    if (savedSchedule) {
        try {
            const scheduleData = JSON.parse(savedSchedule);
            
            // 各学年・教科の設定を復元
            const grades = [1, 2, 3];
            const subjects = ['homeroom', 'moral', 'integrated'];
            
            grades.forEach(grade => {
                subjects.forEach(subject => {
                    const gradeSubjectKey = `grade${grade}-${subject}`;
                    const schedule = scheduleData[gradeSubjectKey];
                    
                    if (schedule && schedule.type === 'fixed') {
                        // 固定配置を選択
                        const fixedRadio = document.querySelector(`input[name="grade${grade}-${subject}-schedule"][value="fixed"]`);
                        if (fixedRadio) {
                            fixedRadio.checked = true;
                        }
                        
                        const selectionDiv = document.getElementById(`grade${grade}-${subject}-schedule-selection`);
                        if (selectionDiv) {
                            selectionDiv.style.display = 'block';
                        }
                        
                        // 時間設定を復元
                        const daySelect = document.getElementById(`grade${grade}-${subject}-day`);
                        const periodSelect = document.getElementById(`grade${grade}-${subject}-period`);
                        
                        if (daySelect && schedule.day !== undefined) {
                            daySelect.value = schedule.day;
                        }
                        if (periodSelect && schedule.period !== undefined) {
                            periodSelect.value = schedule.period;
                        }
                    } else {
                        // 自動配置を選択（デフォルト）
                        const autoRadio = document.querySelector(`input[name="grade${grade}-${subject}-schedule"][value="auto"]`);
                        if (autoRadio) {
                            autoRadio.checked = true;
                        }
                        
                        const selectionDiv = document.getElementById(`grade${grade}-${subject}-schedule-selection`);
                        if (selectionDiv) {
                            selectionDiv.style.display = 'none';
                        }
                    }
                });
            });
            
            checkGradeSubjectConflicts();
        } catch (error) {
            console.error('学年・教科設定の読み込みエラー:', error);
        }
    }
}


// 学年・教科スケジュール競合チェック
function checkGradeSubjectConflicts() {
    const grades = [1, 2, 3];
    const subjects = ['homeroom', 'moral', 'integrated'];
    const subjectNames = {
        'homeroom': '学級活動',
        'moral': '道徳', 
        'integrated': '総合的な学習の時間'
    };
    
    const allConflicts = [];
    
    // 各学年で競合をチェック
    grades.forEach(grade => {
        const schedule = {};
        const gradeConflicts = [];
        
        subjects.forEach(subject => {
            const isFixed = document.querySelector(`input[name="grade${grade}-${subject}-schedule"][value="fixed"]`)?.checked;
            if (isFixed) {
                const daySelect = document.getElementById(`grade${grade}-${subject}-day`);
                const periodSelect = document.getElementById(`grade${grade}-${subject}-period`);
                
                if (daySelect && periodSelect) {
                    const day = daySelect.value;
                    const period = periodSelect.value;
                    
                    if (day && period) {
                        const timeSlot = `${day}-${period}`;
                        if (schedule[timeSlot]) {
                            gradeConflicts.push(`${grade}年${subjectNames[schedule[timeSlot]]}と${grade}年${subjectNames[subject]}`);
                        } else {
                            schedule[timeSlot] = subject;
                        }
                    }
                }
            }
        });
        
        if (gradeConflicts.length > 0) {
            allConflicts.push(...gradeConflicts);
        }
    });
    
    // 警告表示を更新
    const warningDiv = document.getElementById('grade-subject-conflict-warning');
    if (warningDiv) {
        if (allConflicts.length > 0) {
            warningDiv.style.display = 'flex';
            const warningText = warningDiv.querySelector('span');
            if (warningText) {
                warningText.textContent = 
                    `設定に競合があります: ${allConflicts.join(', ')}が同じ時間に設定されています。`;
            }
        } else {
            warningDiv.style.display = 'none';
        }
    }
}

// 学年・教科固定設定を保存
function saveGradeSubjectSchedule() {
    // 競合チェック
    checkGradeSubjectConflicts();
    const warningDiv = document.getElementById('grade-subject-conflict-warning');
    if (warningDiv && warningDiv.style.display !== 'none') {
        const confirmSave = confirm(
            '設定に競合があります。競合を無視して保存しますか？'
        );
        if (!confirmSave) {
            return;
        }
    }
    
    const grades = [1, 2, 3];
    const subjects = ['homeroom', 'moral', 'integrated'];
    const gradeSubjectSchedules = {};
    
    grades.forEach(grade => {
        subjects.forEach(subject => {
            const gradeSubjectKey = `grade${grade}-${subject}`;
            const isFixed = document.querySelector(`input[name="grade${grade}-${subject}-schedule"][value="fixed"]`)?.checked;
            
            if (isFixed) {
                const daySelect = document.getElementById(`grade${grade}-${subject}-day`);
                const periodSelect = document.getElementById(`grade${grade}-${subject}-period`);
                
                if (daySelect && periodSelect) {
                    const day = daySelect.value;
                    const period = periodSelect.value;
                    
                    if (day && period) {
                        gradeSubjectSchedules[gradeSubjectKey] = {
                            type: 'fixed',
                            day: parseInt(day),
                            period: parseInt(period)
                        };
                    } else {
                        gradeSubjectSchedules[gradeSubjectKey] = { type: 'auto' };
                    }
                }
            } else {
                gradeSubjectSchedules[gradeSubjectKey] = { type: 'auto' };
            }
        });
    });
    
    // ローカルストレージに保存
    localStorage.setItem('gradeSubjectSchedules', JSON.stringify(gradeSubjectSchedules));
    
    showNotification('学年・教科固定設定を保存しました', 'success');
}

// 学年・教科固定設定をリセット
function resetGradeSubjectSchedule() {
    const confirmReset = confirm('すべての学年・教科の固定設定をリセットしますか？');
    if (!confirmReset) {
        return;
    }
    
    const grades = [1, 2, 3];
    const subjects = ['homeroom', 'moral', 'integrated'];
    
    // すべて自動配置に戻す
    grades.forEach(grade => {
        subjects.forEach(subject => {
            const autoRadio = document.querySelector(`input[name="grade${grade}-${subject}-schedule"][value="auto"]`);
            if (autoRadio) {
                autoRadio.checked = true;
            }
            
            const selectionDiv = document.getElementById(`grade${grade}-${subject}-schedule-selection`);
            if (selectionDiv) {
                selectionDiv.style.display = 'none';
            }
            
            const daySelect = document.getElementById(`grade${grade}-${subject}-day`);
            const periodSelect = document.getElementById(`grade${grade}-${subject}-period`);
            
            if (daySelect) daySelect.value = '';
            if (periodSelect) periodSelect.value = '';
        });
    });
    
    // 保存データからも削除
    localStorage.removeItem('gradeSubjectSchedules');
    
    checkGradeSubjectConflicts();
    showNotification('学年・教科固定設定をリセットしました', 'info');
}

// 学年・教科プレビュー表示
function previewGradeSubjectSchedule() {
    const previewDiv = document.getElementById('grade-subject-preview');
    const contentDiv = document.getElementById('grade-subject-preview-content');
    
    if (!previewDiv || !contentDiv) {
        console.error('プレビュー要素が見つかりません');
        return;
    }
    
    const grades = [1, 2, 3];
    const subjects = ['homeroom', 'moral', 'integrated'];
    const subjectNames = {
        'homeroom': '学級活動',
        'moral': '道徳',
        'integrated': '総合的な学習の時間'
    };
    const dayNames = ['月', '火', '水', '木', '金'];
    
    let previewHTML = '';
    
    grades.forEach(grade => {
        previewHTML += `<h4>${grade}年生</h4>`;
        
        // プレビューテーブル作成
        let tableHTML = '<table class="preview-table"><thead><tr><th>時間目</th>';
        dayNames.forEach(day => {
            tableHTML += `<th>${day}</th>`;
        });
        tableHTML += '</tr></thead><tbody>';
        
        // 6時間目まで表示
        for (let period = 1; period <= 6; period++) {
            tableHTML += `<tr><td>${period}時間目</td>`;
            
            for (let day = 0; day < 5; day++) {
                let cellContent = '';
                let cellClass = '';
                
                // この時間に設定されている教科があるかチェック
                subjects.forEach(subject => {
                    const isFixed = document.querySelector(`input[name="grade${grade}-${subject}-schedule"][value="fixed"]`)?.checked;
                    if (isFixed) {
                        const daySelect = document.getElementById(`grade${grade}-${subject}-day`);
                        const periodSelect = document.getElementById(`grade${grade}-${subject}-period`);
                        
                        if (daySelect && periodSelect) {
                            const selectedDay = parseInt(daySelect.value);
                            const selectedPeriod = parseInt(periodSelect.value);
                            
                            if (selectedDay === day && selectedPeriod === period) {
                                cellContent = subjectNames[subject];
                                cellClass = 'fixed-subject';
                            }
                        }
                    }
                });
                
                tableHTML += `<td class="${cellClass}">${cellContent}</td>`;
            }
            
            tableHTML += '</tr>';
        }
        
        tableHTML += '</tbody></table>';
        previewHTML += tableHTML;
        
        if (grade < 3) {
            previewHTML += '<br>';
        }
    });
    
    contentDiv.innerHTML = previewHTML;
    previewDiv.style.display = 'block';
}