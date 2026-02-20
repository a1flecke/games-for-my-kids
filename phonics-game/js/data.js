class DataManager {
    static async loadLesson(id) {
        const response = await fetch(`./data/lessons/lesson-${String(id).padStart(2, '0')}.json`);
        if (!response.ok) throw new Error(`Lesson ${id} not found`);
        return response.json();
    }

    // Hardcoded metadata for lesson select screen (no fetch needed)
    static getLessonMeta() {
        return [
            { id: 1, title: 'Short Vowels — CVC Words', gradeLevel: 1 },
            { id: 2, title: 'Short Vowels — More CVC', gradeLevel: 1 },
            { id: 3, title: 'Consonant Digraphs', gradeLevel: 1 },
            { id: 4, title: 'L-Blends & S-Blends', gradeLevel: 1 },
            { id: 5, title: 'R-Blends & End Blends', gradeLevel: 1 },
            { id: 6, title: 'Long Vowels — Silent E', gradeLevel: 1 },
            // Sessions 3-4 will fill in lessons 7-30
        ];
    }
}
