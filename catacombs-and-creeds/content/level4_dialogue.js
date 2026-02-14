/**
 * Level 4 Dialogue Content - Church Fathers & Abilities
 *
 * NPCs: Monastery Monk (guide), Augustine, Jerome, Ambrose,
 *        Library Guardian, Scholar
 *
 * Quest flags set:
 *   met_monastery_monk, learned_augustine_wisdom, learned_jerome_translation,
 *   learned_ambrose_courage, library_unlocked, boss_defeated_l4, level4_complete,
 *   decoded_latin_1, decoded_latin_2, hidden_wall_revealed, barrier_broken
 */
window.LEVEL4_DIALOGUES = {

    // ─── Monastery Monk (Guide) ───────────────────────────────────

    monastery_monk_intro: {
        nodes: [
            {
                speaker: 'Monk Guide',
                text: 'Welcome to the Monastery, young traveler!',
                next: 'monastery_monk_2'
            },
            {
                id: 'monastery_monk_2',
                speaker: 'Monk Guide',
                text: 'Three great Church Fathers dwell here. Each can teach you a powerful ability.',
                next: 'monastery_monk_3'
            },
            {
                id: 'monastery_monk_3',
                speaker: 'Monk Guide',
                text: 'Find Augustine, Jerome, and Ambrose. Learn from them all.',
                next: 'monastery_monk_4'
            },
            {
                id: 'monastery_monk_4',
                speaker: 'Monk Guide',
                text: 'Only then can you enter the Forbidden Library and face what lurks within.',
                setFlags: ['met_monastery_monk']
            }
        ]
    },

    // ─── Augustine ────────────────────────────────────────────────

    augustine_intro: {
        nodes: [
            {
                speaker: 'Augustine',
                text: 'I am Augustine of Hippo. I wrote about seeking God through the mind.',
                next: 'augustine_2'
            },
            {
                id: 'augustine_2',
                speaker: 'Augustine',
                text: 'In my Confessions, I told how I turned from a sinful life to follow Christ.',
                next: 'augustine_3'
            },
            {
                id: 'augustine_3',
                speaker: 'Augustine',
                text: 'In City of God, I wrote that God\'s kingdom is greater than any earthly empire.',
                next: 'augustine_quiz'
            },
            {
                id: 'augustine_quiz',
                speaker: 'Augustine',
                text: 'Tell me: what did I teach about seeking God?',
                choices: [
                    {
                        text: 'We find God by searching with our hearts and minds',
                        next: 'augustine_correct'
                    },
                    {
                        text: 'We find God only through fighting enemies',
                        next: 'augustine_wrong'
                    }
                ]
            },
            {
                id: 'augustine_correct',
                speaker: 'Augustine',
                text: 'Yes! Our hearts are restless until they rest in God.',
                next: 'augustine_grant'
            },
            {
                id: 'augustine_wrong',
                speaker: 'Augustine',
                text: 'Not quite. God is found through love and truth, not fighting.',
                next: 'augustine_quiz'
            },
            {
                id: 'augustine_grant',
                speaker: 'Augustine',
                text: 'I grant you the Wisdom to see what is hidden. Press 4 to reveal secret passages!',
                setFlags: ['learned_augustine_wisdom', 'scroll_augustine']
            }
        ]
    },

    // ─── Jerome ───────────────────────────────────────────────────

    jerome_intro: {
        nodes: [
            {
                speaker: 'Jerome',
                text: 'I am Jerome. I spent decades translating the Bible into Latin.',
                next: 'jerome_2'
            },
            {
                id: 'jerome_2',
                speaker: 'Jerome',
                text: 'My translation, the Vulgate, let common people read Scripture.',
                next: 'jerome_3'
            },
            {
                id: 'jerome_3',
                speaker: 'Jerome',
                text: 'I believed everyone should be able to understand God\'s word.',
                next: 'jerome_quiz'
            },
            {
                id: 'jerome_quiz',
                speaker: 'Jerome',
                text: 'Why was translating the Bible so important?',
                choices: [
                    {
                        text: 'So everyone could read and understand God\'s word',
                        next: 'jerome_correct'
                    },
                    {
                        text: 'To keep the words secret from ordinary people',
                        next: 'jerome_wrong'
                    }
                ]
            },
            {
                id: 'jerome_correct',
                speaker: 'Jerome',
                text: 'Exactly! Knowledge of God should not be hidden from anyone.',
                next: 'jerome_grant'
            },
            {
                id: 'jerome_wrong',
                speaker: 'Jerome',
                text: 'No! I wanted the opposite. God\'s word is for everyone.',
                next: 'jerome_quiz'
            },
            {
                id: 'jerome_grant',
                speaker: 'Jerome',
                text: 'I grant you the gift of Translation. Press 5 to decode Latin inscriptions!',
                setFlags: ['learned_jerome_translation', 'scroll_jerome']
            }
        ]
    },

    // ─── Ambrose ──────────────────────────────────────────────────

    ambrose_intro: {
        nodes: [
            {
                speaker: 'Ambrose',
                text: 'I am Ambrose, Bishop of Milan. I stood firm against an emperor.',
                next: 'ambrose_2'
            },
            {
                id: 'ambrose_2',
                speaker: 'Ambrose',
                text: 'When Emperor Theodosius ordered a massacre, I refused him communion.',
                next: 'ambrose_3'
            },
            {
                id: 'ambrose_3',
                speaker: 'Ambrose',
                text: 'I told him that even an emperor must answer to God for his actions.',
                next: 'ambrose_quiz'
            },
            {
                id: 'ambrose_quiz',
                speaker: 'Ambrose',
                text: 'What does it mean to have courage in faith?',
                choices: [
                    {
                        text: 'Standing for what is right, even against the powerful',
                        next: 'ambrose_correct'
                    },
                    {
                        text: 'Always agreeing with whoever is in charge',
                        next: 'ambrose_wrong'
                    }
                ]
            },
            {
                id: 'ambrose_correct',
                speaker: 'Ambrose',
                text: 'Yes! True courage means defending truth, no matter the cost.',
                next: 'ambrose_grant'
            },
            {
                id: 'ambrose_wrong',
                speaker: 'Ambrose',
                text: 'No. Courage means speaking truth to power, not bowing to it.',
                next: 'ambrose_quiz'
            },
            {
                id: 'ambrose_grant',
                speaker: 'Ambrose',
                text: 'I grant you Courage to break through barriers. Press 6 to smash them!',
                setFlags: ['learned_ambrose_courage', 'scroll_ambrose']
            }
        ]
    },

    // ─── Library Guardian ─────────────────────────────────────────

    library_guardian_intro: {
        nodes: [
            {
                speaker: 'Library Guardian',
                text: 'The Forbidden Library is sealed by ancient wards.',
                next: 'guardian_check'
            },
            {
                id: 'guardian_check',
                speaker: 'Library Guardian',
                text: 'Only one who has learned from all three Church Fathers may enter.',
                next: 'guardian_wait'
            },
            {
                id: 'guardian_wait',
                speaker: 'Library Guardian',
                text: 'Seek Augustine, Jerome, and Ambrose. Return when you are ready.'
            }
        ]
    },

    library_guardian_unlock: {
        nodes: [
            {
                speaker: 'Library Guardian',
                text: 'You carry the wisdom of all three Church Fathers!',
                next: 'guardian_open'
            },
            {
                id: 'guardian_open',
                speaker: 'Library Guardian',
                text: 'The Forbidden Library opens before you. Beware the Corrupt Prefect within.',
                setFlags: ['library_unlocked']
            }
        ]
    },

    // ─── Scholar ──────────────────────────────────────────────────

    monastery_scholar: {
        nodes: [
            {
                speaker: 'Scholar',
                text: 'The Church Fathers shaped our faith. Their writings guide us still.',
                next: 'scholar_2'
            },
            {
                id: 'scholar_2',
                speaker: 'Scholar',
                text: 'Augustine, Jerome, and Ambrose each served God in a different way.'
            }
        ]
    },

    // ─── Latin Inscriptions ───────────────────────────────────────

    latin_decoded_1: {
        nodes: [
            {
                speaker: 'Inscription',
                text: '"Credo in unum Deum" — I believe in one God.',
                next: 'latin_1_teach'
            },
            {
                id: 'latin_1_teach',
                speaker: 'Inscription',
                text: 'Jerome translated this from Greek so all could understand.',
                setFlags: ['decoded_latin_1']
            }
        ]
    },

    latin_decoded_2: {
        nodes: [
            {
                speaker: 'Inscription',
                text: '"Sola Scriptura" — Scripture alone guides our faith.',
                next: 'latin_2_teach'
            },
            {
                id: 'latin_2_teach',
                speaker: 'Inscription',
                text: 'Jerome believed the Bible should be the foundation of Christian life.',
                setFlags: ['decoded_latin_2']
            }
        ]
    },

    // ─── Boss Pre-fight & Victory ─────────────────────────────────

    boss_prefight_l4: {
        nodes: [
            {
                speaker: 'Corrupt Prefect',
                text: 'You dare enter my domain? I will burn every book and silence every teacher!',
                next: 'prefight_l4_2'
            },
            {
                id: 'prefight_l4_2',
                speaker: 'Corrupt Prefect',
                text: 'The writings of your Church Fathers will be ashes when I am done!'
            }
        ]
    },

    boss_victory_l4: {
        nodes: [
            {
                speaker: 'You',
                text: 'The Corrupt Prefect is defeated! The monastery\'s wisdom is safe.',
                next: 'boss_victory_l4_2',
                setFlags: ['boss_defeated_l4']
            },
            {
                id: 'boss_victory_l4_2',
                speaker: 'Monastery Monk',
                text: 'You have protected the teachings of the Church Fathers. Well done!'
            }
        ]
    },

    // ─── Level Victory ────────────────────────────────────────────

    victory_l4: {
        nodes: [
            {
                speaker: 'Narrator',
                text: 'With all three abilities and the Prefect defeated, the way forward opens!',
                next: 'victory_l4_2'
            },
            {
                id: 'victory_l4_2',
                speaker: 'Narrator',
                text: 'The Church Fathers\' wisdom, translation, and courage guide your path.',
                next: 'victory_l4_3',
                setFlags: ['level4_complete']
            },
            {
                id: 'victory_l4_3',
                speaker: 'Narrator',
                text: 'Onward to the final challenge — the age of Constantine awaits!'
            }
        ]
    }
};
