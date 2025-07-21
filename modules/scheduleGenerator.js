// スケジュール生成モジュール
class ScheduleGenerator {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    generateSchedule(options = {}) {
        const { 
            optimization = 'balanced',
            avoidConsecutive = true,
            distributeEvenly = true 
        } = options;

        const schedule = this.createEmptySchedule();
        const subjects = this.prepareSubjects();

        if (subjects.length === 0) {
            throw new Error('科目が設定されていません');
        }

        try {
            this.fillSchedule(schedule, subjects, {
                optimization,
                avoidConsecutive,
                distributeEvenly
            });

            return schedule;
        } catch (error) {
            console.error('Schedule generation failed:', error);
            throw new Error('スケジュール生成に失敗しました');
        }
    }

    createEmptySchedule() {
        const schedule = {};
        const days = ['月', '火', '水', '木', '金'];
        const periods = 6;

        days.forEach(day => {
            schedule[day] = {};
            for (let period = 1; period <= periods; period++) {
                schedule[day][period] = null;
            }
        });

        return schedule;
    }

    prepareSubjects() {
        const subjects = [];
        
        this.dataManager.subjects.forEach(subject => {
            // 各科目の週あたりコマ数を計算
            const teacher = this.dataManager.teachers.find(t => 
                t.subject === subject.name
            );
            
            if (teacher) {
                const hoursPerWeek = teacher.hours;
                for (let i = 0; i < hoursPerWeek; i++) {
                    subjects.push({
                        name: subject.name,
                        color: subject.color,
                        teacher: teacher.name
                    });
                }
            }
        });

        return this.shuffleArray(subjects);
    }

    fillSchedule(schedule, subjects, options) {
        const days = Object.keys(schedule);
        const totalSlots = days.length * 6; // 5日 × 6時限
        
        if (subjects.length > totalSlots) {
            throw new Error('科目数が時間割の枠を超えています');
        }

        let subjectIndex = 0;
        const usedCombinations = new Set();

        // 最適化アルゴリズム実装
        for (const day of days) {
            for (let period = 1; period <= 6; period++) {
                if (subjectIndex >= subjects.length) break;

                const subject = subjects[subjectIndex];
                const combination = `${day}-${period}`;

                // 連続授業回避チェック
                if (options.avoidConsecutive && this.isConsecutive(schedule, day, period, subject.name)) {
                    // 別の科目を探す
                    const alternativeIndex = this.findAlternativeSubject(subjects, subjectIndex, subject.name);
                    if (alternativeIndex !== -1) {
                        [subjects[subjectIndex], subjects[alternativeIndex]] = 
                        [subjects[alternativeIndex], subjects[subjectIndex]];
                    }
                }

                schedule[day][period] = subjects[subjectIndex];
                usedCombinations.add(combination);
                subjectIndex++;
            }
        }
    }

    isConsecutive(schedule, day, period, subjectName) {
        const prevPeriod = period - 1;
        const nextPeriod = period + 1;

        if (prevPeriod >= 1 && schedule[day][prevPeriod]?.name === subjectName) {
            return true;
        }
        if (nextPeriod <= 6 && schedule[day][nextPeriod]?.name === subjectName) {
            return true;
        }

        return false;
    }

    findAlternativeSubject(subjects, currentIndex, subjectToAvoid) {
        for (let i = currentIndex + 1; i < subjects.length; i++) {
            if (subjects[i].name !== subjectToAvoid) {
                return i;
            }
        }
        return -1;
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    validateSchedule(schedule) {
        const errors = [];
        const days = Object.keys(schedule);

        // 教師の重複チェック
        for (const day of days) {
            for (let period = 1; period <= 6; period++) {
                const subject = schedule[day][period];
                if (!subject) continue;

                // 同時間帯での教師重複チェック
                const sameTimeSubjects = days
                    .map(d => schedule[d][period])
                    .filter(s => s && s.teacher === subject.teacher);

                if (sameTimeSubjects.length > 1) {
                    errors.push(`${day}曜日${period}時限目: ${subject.teacher}先生の重複`);
                }
            }
        }

        return errors;
    }
}