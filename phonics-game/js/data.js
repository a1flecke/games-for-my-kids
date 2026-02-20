class DataManager {
    static async loadLesson(id) {
        const response = await fetch(`./data/lessons/lesson-${String(id).padStart(2, '0')}.json`);
        if (!response.ok) throw new Error(`Lesson ${id} not found`);
        return response.json();
    }

    // Hardcoded metadata for lesson select screen (no fetch needed)
    static getLessonMeta() {
        return [
            { id: 1,  title: 'Short Vowels — CVC Words',          gradeLevel: 1 },
            { id: 2,  title: 'Short Vowels — More CVC',            gradeLevel: 1 },
            { id: 3,  title: 'Consonant Digraphs',                 gradeLevel: 1 },
            { id: 4,  title: 'L-Blends & S-Blends',               gradeLevel: 1 },
            { id: 5,  title: 'R-Blends & End Blends',             gradeLevel: 1 },
            { id: 6,  title: 'Long Vowels — Silent E',            gradeLevel: 1 },
            { id: 7,  title: 'Long-A Vowel Teams',                 gradeLevel: 2 },
            { id: 8,  title: 'Long-E Vowel Teams',                 gradeLevel: 2 },
            { id: 9,  title: 'Long-O Vowel Teams',                 gradeLevel: 2 },
            { id: 10, title: 'Long-I and Long-U Teams',            gradeLevel: 2 },
            { id: 11, title: 'R-Controlled — ar, or',             gradeLevel: 2 },
            { id: 12, title: 'R-Controlled — er, ir, ur',         gradeLevel: 2 },
            { id: 13, title: 'Diphthongs — oi, oy',               gradeLevel: 2 },
            { id: 14, title: 'Diphthongs — ou, ow',               gradeLevel: 2 },
            { id: 15, title: 'Silent Letters — kn, wr, gn',       gradeLevel: 3 },
            { id: 16, title: 'Silent GH Patterns',                 gradeLevel: 3 },
            { id: 17, title: 'Soft C and Soft G',                  gradeLevel: 3 },
            { id: 18, title: 'Syllable Types — Closed and Open',   gradeLevel: 3 },
            { id: 19, title: 'VCE and Vowel Team Syllables',       gradeLevel: 3 },
            { id: 20, title: 'Common Suffixes',                    gradeLevel: 3 },
            // Session 4 will fill in lessons 21-30
        ];
    }
}
