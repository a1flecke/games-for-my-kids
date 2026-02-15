/**
 * Level 5 Dialogue Content - Constantine & Final Challenge
 *
 * NPCs: Constantine (guide), Narrator, Christian Scholar, Imperial Herald,
 *        Palace Guard, Arena Attendant
 *
 * Quest flags set:
 *   met_constantine, learned_chi_rho, heard_vision, heard_edict,
 *   arena_unlocked, boss_defeated_l5, level5_complete, game_complete
 */
window.LEVEL5_DIALOGUES = {

    // ─── Vision Narrative (Act 1 - Underground) ─────────────────────

    vision_narrative: {
        nodes: [
            {
                speaker: 'Narrator',
                text: 'The year is 312 AD. Nearly 300 years have passed since the early church began.',
                next: 'vision_2'
            },
            {
                id: 'vision_2',
                speaker: 'Narrator',
                text: 'A Roman general named Constantine marches toward Rome.',
                next: 'vision_3'
            },
            {
                id: 'vision_3',
                speaker: 'Narrator',
                text: 'The night before battle, he sees a vision in the sky.',
                next: 'vision_4'
            },
            {
                id: 'vision_4',
                speaker: 'Narrator',
                text: 'A cross of light with the words: "In this sign, conquer."',
                next: 'vision_5'
            },
            {
                id: 'vision_5',
                speaker: 'Narrator',
                text: 'This moment changes the history of Christianity forever.',
                setFlags: ['heard_vision']
            }
        ]
    },

    // ─── Chi-Rho Teaching ───────────────────────────────────────────

    chi_rho_teaching: {
        nodes: [
            {
                speaker: 'Christian Scholar',
                text: 'Welcome, young traveler. You have come far through the centuries!',
                next: 'chi_rho_2'
            },
            {
                id: 'chi_rho_2',
                speaker: 'Christian Scholar',
                text: 'Do you see this symbol? It is called the Chi-Rho.',
                next: 'chi_rho_3'
            },
            {
                id: 'chi_rho_3',
                speaker: 'Christian Scholar',
                text: 'Chi and Rho are the first two Greek letters of Christ.',
                next: 'chi_rho_quiz'
            },
            {
                id: 'chi_rho_quiz',
                speaker: 'Christian Scholar',
                text: 'What does the Chi-Rho symbol represent?',
                choices: [
                    {
                        text: 'The name of Christ in Greek letters',
                        next: 'chi_rho_correct'
                    },
                    {
                        text: 'A Roman battle flag',
                        next: 'chi_rho_wrong'
                    }
                ]
            },
            {
                id: 'chi_rho_correct',
                speaker: 'Christian Scholar',
                text: 'Exactly! Constantine placed this on his soldiers\' shields.',
                next: 'chi_rho_grant'
            },
            {
                id: 'chi_rho_wrong',
                speaker: 'Christian Scholar',
                text: 'Not quite. It stands for Christ in Greek letters.',
                next: 'chi_rho_quiz'
            },
            {
                id: 'chi_rho_grant',
                speaker: 'Christian Scholar',
                text: 'Take this knowledge with you. The light is ahead!',
                setFlags: ['learned_chi_rho']
            }
        ]
    },

    // ─── Constantine Meeting (Act 2 - Surface) ─────────────────────

    constantine_intro: {
        nodes: [
            {
                speaker: 'Constantine',
                text: 'Welcome to the surface! For the first time, you walk above ground!',
                next: 'constantine_2'
            },
            {
                id: 'constantine_2',
                speaker: 'Constantine',
                text: 'I am Emperor Constantine. I won the Battle of Milvian Bridge.',
                next: 'constantine_3'
            },
            {
                id: 'constantine_3',
                speaker: 'Constantine',
                text: 'Before that battle, I saw a cross in the sky.',
                next: 'constantine_4'
            },
            {
                id: 'constantine_4',
                speaker: 'Constantine',
                text: 'The words said: "In this sign, conquer." And we did.',
                next: 'constantine_5'
            },
            {
                id: 'constantine_5',
                speaker: 'Constantine',
                text: 'Now I have issued the Edict of Milan. Christians may worship freely!',
                setFlags: ['met_constantine']
            }
        ]
    },

    // ─── Edict of Milan Ceremony ────────────────────────────────────

    edict_herald_intro: {
        nodes: [
            {
                speaker: 'Imperial Herald',
                text: 'Hear ye! The Edict of Milan has been proclaimed!',
                next: 'edict_2'
            },
            {
                id: 'edict_2',
                speaker: 'Imperial Herald',
                text: 'By order of Emperor Constantine, all religions are now free.',
                next: 'edict_3'
            },
            {
                id: 'edict_3',
                speaker: 'Imperial Herald',
                text: 'No more shall Christians hide in catacombs. No more persecution!',
                next: 'edict_4'
            },
            {
                id: 'edict_4',
                speaker: 'Imperial Herald',
                text: 'After 300 years of hardship, the church stands triumphant!',
                setFlags: ['heard_edict']
            }
        ]
    },

    // ─── Palace Guard ───────────────────────────────────────────────

    palace_guard_talk: {
        nodes: [
            {
                speaker: 'Palace Guard',
                text: 'Emperor Constantine changed everything for the Christians.',
                next: 'palace_guard_2'
            },
            {
                id: 'palace_guard_2',
                speaker: 'Palace Guard',
                text: 'He called the Council of Nicaea and built great churches.'
            }
        ]
    },

    // ─── Arena Attendant ────────────────────────────────────────────

    arena_attendant_talk: {
        nodes: [
            {
                speaker: 'Arena Attendant',
                text: 'The General of the old regime lurks ahead.',
                next: 'arena_att_2'
            },
            {
                id: 'arena_att_2',
                speaker: 'Arena Attendant',
                text: 'He wants to bring back the persecutions. You must stop him!',
                next: 'arena_att_3'
            },
            {
                id: 'arena_att_3',
                speaker: 'Arena Attendant',
                text: 'Use everything you have learned on your journey.',
                setFlags: ['arena_unlocked']
            }
        ]
    },

    // ─── Boss Pre-fight & Phase Dialogues ───────────────────────────

    boss_prefight_l5: {
        nodes: [
            {
                speaker: 'The General',
                text: 'So you are the one who crawled through the catacombs!',
                next: 'prefight_l5_2'
            },
            {
                id: 'prefight_l5_2',
                speaker: 'The General',
                text: 'I served the old emperors who crushed your faith. I will do so again!',
                next: 'prefight_l5_3'
            },
            {
                id: 'prefight_l5_3',
                speaker: 'The General',
                text: 'Your journey ends here. Prepare yourself!'
            }
        ]
    },

    boss_victory_l5: {
        nodes: [
            {
                speaker: 'You',
                text: 'The General is defeated! The age of persecution is truly over!',
                next: 'boss_victory_l5_2',
                setFlags: ['boss_defeated_l5']
            },
            {
                id: 'boss_victory_l5_2',
                speaker: 'Constantine',
                text: 'You have proven yourself through every trial, from catacombs to palace.',
                next: 'boss_victory_l5_3'
            },
            {
                id: 'boss_victory_l5_3',
                speaker: 'Constantine',
                text: 'The faith that began in secret has triumphed. Go now — share this story!'
            }
        ]
    },

    // ─── Level Victory & Epilogue ───────────────────────────────────

    victory_l5: {
        nodes: [
            {
                speaker: 'Narrator',
                text: 'You have completed 300 years of church history!',
                next: 'victory_l5_2'
            },
            {
                id: 'victory_l5_2',
                speaker: 'Narrator',
                text: 'From hidden catacombs to the halls of an emperor.',
                next: 'victory_l5_3'
            },
            {
                id: 'victory_l5_3',
                speaker: 'Narrator',
                text: 'You met the apostles, honored the martyrs, and learned the creeds.',
                next: 'victory_l5_4'
            },
            {
                id: 'victory_l5_4',
                speaker: 'Narrator',
                text: 'You studied with the Church Fathers and witnessed Constantine\'s vision.',
                next: 'victory_l5_5',
                setFlags: ['level5_complete', 'game_complete']
            },
            {
                id: 'victory_l5_5',
                speaker: 'Narrator',
                text: 'The early church\'s story of faith, courage, and truth lives on forever!'
            }
        ]
    }
};
