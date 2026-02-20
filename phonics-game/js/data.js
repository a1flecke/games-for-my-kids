class DataManager {
    static async loadLesson(id) {
        const response = await fetch(`./data/lessons/lesson-${String(id).padStart(2, '0')}.json`);
        if (!response.ok) throw new Error(`Lesson ${id} not found`);
        return response.json();
    }

    // Hardcoded metadata for lesson select screen (no fetch needed).
    // Field is `gradeLevel` to match the lesson JSON schema.
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
            { id: 21, title: 'Prefixes — Basic',                   gradeLevel: 4 },
            { id: 22, title: 'Suffixes — -tion, -sion, -ness, -ment', gradeLevel: 4 },
            { id: 23, title: 'Greek Roots I',                      gradeLevel: 4 },
            { id: 24, title: 'Latin Roots I',                      gradeLevel: 4 },
            { id: 25, title: 'Compound Words & Homophones',        gradeLevel: 4 },
            { id: 26, title: 'Advanced Prefixes',                  gradeLevel: 5 },
            { id: 27, title: 'Advanced Suffixes',                  gradeLevel: 5 },
            { id: 28, title: 'Latin Roots II',                     gradeLevel: 5 },
            { id: 29, title: 'Greek Roots II',                     gradeLevel: 5 },
            { id: 30, title: 'Academic Vocabulary — Multisyllabic', gradeLevel: 5 },
        ];
    }
}
