// 学校教育法施行規則に基づく中学校教科時数計算
class SubjectHoursCalculator {
    constructor() {
        // 中学校の年間標準授業時数（学校教育法施行規則別表第2）
        // 学年別の正確な時数
        this.annualHoursByGrade = {
            '国語': { 1: 140, 2: 140, 3: 105 },
            '社会': { 1: 105, 2: 105, 3: 140 },
            '数学': { 1: 140, 2: 105, 3: 140 },
            '理科': { 1: 105, 2: 140, 3: 140 },
            '音楽': { 1: 45, 2: 35, 3: 35 },
            '美術': { 1: 45, 2: 35, 3: 35 },
            '保健体育': { 1: 105, 2: 105, 3: 105 },
            '技術・家庭': { 1: 70, 2: 70, 3: 35 },
            '外国語': { 1: 140, 2: 140, 3: 140 },
            '道徳': { 1: 35, 2: 35, 3: 35 },
            '総合的な学習の時間': { 1: 50, 2: 70, 3: 70 },
            '特別活動': { 1: 35, 2: 35, 3: 35 }
        };
        
        // 学年の選択肢
        this.grades = [1, 2, 3];
    }

    // 学年別週当たりの授業時数を計算（年間時数÷35週）
    getWeeklyHours(subjectName, grade = null) {
        const subjectHours = this.annualHoursByGrade[subjectName];
        if (!subjectHours) {
            return 0;
        }
        
        if (grade && this.grades.includes(grade)) {
            // 特定学年の時数
            const annualHours = subjectHours[grade];
            return Math.round((annualHours / 35) * 10) / 10;
        } else {
            // 全学年平均の時数
            const totalHours = this.grades.reduce((sum, g) => sum + subjectHours[g], 0);
            const averageHours = totalHours / this.grades.length;
            return Math.round((averageHours / 35) * 10) / 10;
        }
    }

    // 学年別の詳細時数を取得
    getSubjectDetailsByGrade(subjectName) {
        const subjectHours = this.annualHoursByGrade[subjectName];
        if (!subjectHours) {
            return null;
        }

        return this.grades.map(grade => ({
            grade: grade,
            annualHours: subjectHours[grade],
            weeklyHours: this.getWeeklyHours(subjectName, grade)
        }));
    }

    // 複数教科の合計週時数を計算
    getTotalWeeklyHours(subjects, grade = null) {
        return subjects.reduce((total, subject) => {
            return total + this.getWeeklyHours(subject, grade);
        }, 0);
    }

    // 教科リストを取得
    getSubjectList() {
        return Object.keys(this.annualHoursByGrade);
    }

    // 教科の詳細情報を取得（学年別）
    getSubjectInfo(subjectName, grade = null) {
        const subjectHours = this.annualHoursByGrade[subjectName];
        if (!subjectHours) {
            return null;
        }

        if (grade && this.grades.includes(grade)) {
            return {
                name: subjectName,
                grade: grade,
                annualHours: subjectHours[grade],
                weeklyHours: this.getWeeklyHours(subjectName, grade)
            };
        } else {
            return {
                name: subjectName,
                gradeDetails: this.getSubjectDetailsByGrade(subjectName),
                averageWeeklyHours: this.getWeeklyHours(subjectName)
            };
        }
    }

    // 学年別の全教科情報を取得
    getAllSubjectsInfoByGrade(grade) {
        return this.getSubjectList().map(subject => this.getSubjectInfo(subject, grade));
    }

    // 全教科の平均情報を取得
    getAllSubjectsInfo() {
        return this.getSubjectList().map(subject => this.getSubjectInfo(subject));
    }

    // 利用可能な学年リストを取得
    getAvailableGrades() {
        return this.grades;
    }
}