/**
 * Level 2 Dialogue Content - The Persecutions
 *
 * All dialogue sequences for Level 2.
 * DialogueIds must match the NPC dialogueId fields in level2.json.
 *
 * Node format: { speaker, portrait, text, choices, setFlag, nextDialogue }
 * Text longer than 15 words will be auto-split by the DialogueSystem.
 */

window.LEVEL2_DIALOGUES = {

    // ── Polycarp (shrine room NPC, main guide for Level 2) ──────────

    polycarp_intro: [
        {
            speaker: 'Polycarp',
            portrait: 'polycarp',
            text: 'Welcome, brave traveler. I am Polycarp, Bishop of Smyrna.'
        },
        {
            speaker: 'Polycarp',
            portrait: 'polycarp',
            text: 'These tunnels are more dangerous now. Roman patrols search for Christians everywhere.'
        },
        {
            speaker: 'Polycarp',
            portrait: 'polycarp',
            text: 'You must be careful. Guards have torches and can see in a cone of light ahead of them.'
        },
        {
            speaker: 'Polycarp',
            portrait: 'polycarp',
            text: 'Hide in the dark alcoves along the walls. Guards cannot see you there.'
        },
        {
            speaker: 'Polycarp',
            portrait: 'polycarp',
            text: 'Find the four spirits of the martyrs in these catacombs. Each will give you a Martyr Token.'
        },
        {
            speaker: 'Polycarp',
            portrait: 'polycarp',
            text: 'Collect all four tokens to unlock the escape tunnel. Be brave and stay hidden!',
            setFlag: 'met_polycarp'
        }
    ],

    // ── Martyr Stories (each awards a Martyr Token) ─────────────────

    martyr_polycarp_story: [
        {
            speaker: 'Spirit of Polycarp',
            portrait: 'polycarp',
            text: 'I am the spirit of Polycarp. I was a student of the Apostle John himself.'
        },
        {
            speaker: 'Spirit of Polycarp',
            portrait: 'polycarp',
            text: 'When I was 86 years old, the Romans told me to deny Christ or die.'
        },
        {
            speaker: 'Spirit of Polycarp',
            portrait: 'polycarp',
            text: 'I told them: I have served Christ for 86 years. He has never done me wrong. How can I deny my King?'
        },
        {
            speaker: 'Spirit of Polycarp',
            portrait: 'polycarp',
            text: 'What would you do if someone told you to give up something you believe in?',
            choices: [
                {
                    text: 'Stand firm in what I believe',
                    nextDialogue: 'martyr_polycarp_correct'
                },
                {
                    text: 'I would be too scared',
                    nextDialogue: 'martyr_polycarp_encourage'
                },
                {
                    text: 'I am not sure',
                    nextDialogue: 'martyr_polycarp_explain'
                }
            ]
        }
    ],

    martyr_polycarp_correct: [
        {
            speaker: 'Spirit of Polycarp',
            portrait: 'polycarp',
            text: 'That is the spirit! Standing firm takes great courage, but it is always worth it.'
        },
        {
            speaker: 'Spirit of Polycarp',
            portrait: 'polycarp',
            text: 'Take this Martyr Token. Remember that courage comes from knowing what you believe.',
            setFlag: 'token_polycarp'
        }
    ],

    martyr_polycarp_encourage: [
        {
            speaker: 'Spirit of Polycarp',
            portrait: 'polycarp',
            text: 'Being afraid is normal. Even I felt fear. But courage is not the absence of fear.'
        },
        {
            speaker: 'Spirit of Polycarp',
            portrait: 'polycarp',
            text: 'Courage is doing the right thing even when you are scared. You are braver than you think!',
            setFlag: 'token_polycarp'
        }
    ],

    martyr_polycarp_explain: [
        {
            speaker: 'Spirit of Polycarp',
            portrait: 'polycarp',
            text: 'That is an honest answer. The important thing is to think about what matters most to you.'
        },
        {
            speaker: 'Spirit of Polycarp',
            portrait: 'polycarp',
            text: 'When you know what you believe, you can find the strength to stand for it. Take this token.',
            setFlag: 'token_polycarp'
        }
    ],

    martyr_ignatius_story: [
        {
            speaker: 'Spirit of Ignatius',
            portrait: 'ignatius',
            text: 'Peace be with you. I am Ignatius, Bishop of Antioch.'
        },
        {
            speaker: 'Spirit of Ignatius',
            portrait: 'ignatius',
            text: 'I was taken to Rome in chains. Along the way, I wrote letters to encourage other Christians.'
        },
        {
            speaker: 'Spirit of Ignatius',
            portrait: 'ignatius',
            text: 'Even in chains, I wanted to help others keep their faith strong.'
        },
        {
            speaker: 'Spirit of Ignatius',
            portrait: 'ignatius',
            text: 'What do you think is the best way to encourage others?',
            choices: [
                {
                    text: 'By being kind and writing encouraging words',
                    nextDialogue: 'martyr_ignatius_correct'
                },
                {
                    text: 'By telling them what to do',
                    nextDialogue: 'martyr_ignatius_gentle'
                },
                {
                    text: 'By showing them through your actions',
                    nextDialogue: 'martyr_ignatius_actions'
                }
            ]
        }
    ],

    martyr_ignatius_correct: [
        {
            speaker: 'Spirit of Ignatius',
            portrait: 'ignatius',
            text: 'Yes! Kind words can lift someone up even in the darkest times. My letters gave hope to many.'
        },
        {
            speaker: 'Spirit of Ignatius',
            portrait: 'ignatius',
            text: 'Take this Martyr Token. Never underestimate the power of kind words!',
            setFlag: 'token_ignatius'
        }
    ],

    martyr_ignatius_gentle: [
        {
            speaker: 'Spirit of Ignatius',
            portrait: 'ignatius',
            text: 'Sometimes people need guidance. But the best leaders encourage with kindness, not commands.'
        },
        {
            speaker: 'Spirit of Ignatius',
            portrait: 'ignatius',
            text: 'Here is a Martyr Token. Remember to lead with love and gentleness.',
            setFlag: 'token_ignatius'
        }
    ],

    martyr_ignatius_actions: [
        {
            speaker: 'Spirit of Ignatius',
            portrait: 'ignatius',
            text: 'That is also true! Actions and words together make the strongest encouragement.'
        },
        {
            speaker: 'Spirit of Ignatius',
            portrait: 'ignatius',
            text: 'Take this Martyr Token. Show your faith through both actions and kind words!',
            setFlag: 'token_ignatius'
        }
    ],

    martyr_perpetua_story: [
        {
            speaker: 'Spirit of Perpetua',
            portrait: 'perpetua',
            text: 'Hello, young one. I am Perpetua, a noblewoman from Carthage.'
        },
        {
            speaker: 'Spirit of Perpetua',
            portrait: 'perpetua',
            text: 'I was a new mother when I was arrested for being a Christian. My father begged me to deny my faith.'
        },
        {
            speaker: 'Spirit of Perpetua',
            portrait: 'perpetua',
            text: 'But I could not deny who I was. I wrote a diary about my experiences so others could learn from them.'
        },
        {
            speaker: 'Spirit of Perpetua',
            portrait: 'perpetua',
            text: 'Sometimes doing the right thing means making hard choices. What matters most to you?',
            choices: [
                {
                    text: 'Staying true to yourself',
                    nextDialogue: 'martyr_perpetua_correct'
                },
                {
                    text: 'Making everyone happy',
                    nextDialogue: 'martyr_perpetua_gentle'
                },
                {
                    text: 'I do not know yet',
                    nextDialogue: 'martyr_perpetua_encourage'
                }
            ]
        }
    ],

    martyr_perpetua_correct: [
        {
            speaker: 'Spirit of Perpetua',
            portrait: 'perpetua',
            text: 'Being true to yourself and what you believe is one of the bravest things anyone can do.'
        },
        {
            speaker: 'Spirit of Perpetua',
            portrait: 'perpetua',
            text: 'Take this Martyr Token. Always remember who you are.',
            setFlag: 'token_perpetua'
        }
    ],

    martyr_perpetua_gentle: [
        {
            speaker: 'Spirit of Perpetua',
            portrait: 'perpetua',
            text: 'Wanting to make others happy shows a kind heart. But sometimes we must choose what is right over what is easy.'
        },
        {
            speaker: 'Spirit of Perpetua',
            portrait: 'perpetua',
            text: 'Take this Martyr Token. Being kind and being brave can go together.',
            setFlag: 'token_perpetua'
        }
    ],

    martyr_perpetua_encourage: [
        {
            speaker: 'Spirit of Perpetua',
            portrait: 'perpetua',
            text: 'That is okay! You are still growing and learning. The important thing is to keep thinking about it.'
        },
        {
            speaker: 'Spirit of Perpetua',
            portrait: 'perpetua',
            text: 'Here is a Martyr Token. As you grow, you will discover what matters most to you.',
            setFlag: 'token_perpetua'
        }
    ],

    martyr_felicity_story: [
        {
            speaker: 'Spirit of Felicity',
            portrait: 'felicity',
            text: 'Greetings, friend. I am Felicity. I was arrested alongside my dear friend Perpetua.'
        },
        {
            speaker: 'Spirit of Felicity',
            portrait: 'felicity',
            text: 'I was a servant, not a noble like Perpetua. But our faith made us equals.'
        },
        {
            speaker: 'Spirit of Felicity',
            portrait: 'felicity',
            text: 'In God\'s eyes, it does not matter if you are rich or poor, strong or weak. Everyone has equal worth.'
        },
        {
            speaker: 'Spirit of Felicity',
            portrait: 'felicity',
            text: 'Do you believe that everyone deserves to be treated with respect?',
            choices: [
                {
                    text: 'Yes, everyone is equal and deserves respect',
                    nextDialogue: 'martyr_felicity_correct'
                },
                {
                    text: 'Only important people matter',
                    nextDialogue: 'martyr_felicity_gentle'
                },
                {
                    text: 'I try to treat people fairly',
                    nextDialogue: 'martyr_felicity_fair'
                }
            ]
        }
    ],

    martyr_felicity_correct: [
        {
            speaker: 'Spirit of Felicity',
            portrait: 'felicity',
            text: 'That is beautiful! When we treat everyone with respect, we make the world a better place.'
        },
        {
            speaker: 'Spirit of Felicity',
            portrait: 'felicity',
            text: 'Take this Martyr Token. Carry the message of equality and respect!',
            setFlag: 'token_felicity'
        }
    ],

    martyr_felicity_gentle: [
        {
            speaker: 'Spirit of Felicity',
            portrait: 'felicity',
            text: 'Every person is important, not just those who seem powerful. A servant and a noble can be the closest of friends.'
        },
        {
            speaker: 'Spirit of Felicity',
            portrait: 'felicity',
            text: 'Here is a Martyr Token. Remember that true importance comes from how you treat others.',
            setFlag: 'token_felicity'
        }
    ],

    martyr_felicity_fair: [
        {
            speaker: 'Spirit of Felicity',
            portrait: 'felicity',
            text: 'Trying to be fair is a wonderful start! Keep working at it and you will grow in kindness.'
        },
        {
            speaker: 'Spirit of Felicity',
            portrait: 'felicity',
            text: 'Take this Martyr Token. Fairness and love together can change the world!',
            setFlag: 'token_felicity'
        }
    ],

    // ── Ichthys Teaching (Elder Marcus) ─────────────────────────────

    ichthys_teaching: [
        {
            speaker: 'Elder Marcus',
            portrait: 'marcus',
            text: 'Come closer, child. I want to show you something important.'
        },
        {
            speaker: 'Elder Marcus',
            portrait: 'marcus',
            text: 'Do you see this symbol? It looks like a simple fish.'
        },
        {
            speaker: 'Elder Marcus',
            portrait: 'marcus',
            text: 'We call it the Ichthys. In Greek, each letter of that word stands for something special.'
        },
        {
            speaker: 'Elder Marcus',
            portrait: 'marcus',
            text: 'I stands for Iesous (Jesus). Ch for Christos (Christ). Th for Theou (God). Y for Yios (Son). S for Soter (Savior).'
        },
        {
            speaker: 'Elder Marcus',
            portrait: 'marcus',
            text: 'When two Christians meet, one draws half the fish in the dirt. If the other completes it, they know they share the same faith.'
        },
        {
            speaker: 'Elder Marcus',
            portrait: 'marcus',
            text: 'It is our secret code in these dangerous times. Remember the fish symbol!',
            setFlag: 'learned_ichthys'
        }
    ],

    // ── Guard Encounters ────────────────────────────────────────────

    guard_encounter: [
        {
            speaker: 'Roman Patrol',
            portrait: 'guard',
            text: 'Stop right there! These tunnels are restricted by order of the Prefect!'
        },
        {
            speaker: 'Roman Patrol',
            portrait: 'guard',
            text: 'What business do you have down here?',
            choices: [
                {
                    text: 'I am just passing through.',
                    nextDialogue: 'guard_passing'
                },
                {
                    text: 'I am looking for friends.',
                    nextDialogue: 'guard_friends'
                },
                {
                    text: 'Say nothing.',
                    nextDialogue: 'guard_silent'
                }
            ]
        }
    ],

    guard_passing: [
        {
            speaker: 'Roman Patrol',
            portrait: 'guard',
            text: 'Passing through? Nobody passes through here without permission. You look suspicious!'
        },
        {
            speaker: 'Roman Patrol',
            portrait: 'guard',
            text: 'Get out of here before I arrest you!',
            setFlag: 'guard_encounter_done'
        }
    ],

    guard_friends: [
        {
            speaker: 'Roman Patrol',
            portrait: 'guard',
            text: 'Friends? Down here? You must mean those Christians. We are hunting them, you know.'
        },
        {
            speaker: 'Roman Patrol',
            portrait: 'guard',
            text: 'Leave now or you will join them in chains!',
            setFlag: 'guard_encounter_done'
        }
    ],

    guard_silent: [
        {
            speaker: 'Roman Patrol',
            portrait: 'guard',
            text: 'Silence! Your refusal to speak tells me everything. Move along before I sound the alarm!',
            setFlag: 'guard_encounter_done'
        }
    ],

    // ── Boss Pre-fight (Prefect) ────────────────────────────────────

    boss_prefight_l2: [
        {
            speaker: 'Roman Prefect',
            portrait: 'centurion',
            text: 'So you are the one causing trouble in my catacombs.'
        },
        {
            speaker: 'Roman Prefect',
            portrait: 'centurion',
            text: 'The Emperor has ordered that all Christian gatherings be crushed. I intend to obey.'
        },
        {
            speaker: 'Roman Prefect',
            portrait: 'centurion',
            text: 'You will not escape these tunnels. Prepare to face Roman justice!'
        }
    ],

    // ── Boss Victory ────────────────────────────────────────────────

    boss_victory_l2: [
        {
            speaker: 'Roman Prefect',
            portrait: 'centurion',
            text: 'Impossible! How can one so young defeat a Roman Prefect?'
        },
        {
            speaker: 'Roman Prefect',
            portrait: 'centurion',
            text: 'Perhaps... perhaps the faith of these Christians gives them a strength I do not understand. Go. The tunnel is open.',
            setFlag: 'boss_defeated_l2'
        }
    ],

    // ── Victory Dialogue ────────────────────────────────────────────

    victory_l2: [
        {
            speaker: 'Polycarp',
            portrait: 'polycarp',
            text: 'You have done it! All four Martyr Tokens are collected and the Prefect is defeated!'
        },
        {
            speaker: 'Polycarp',
            portrait: 'polycarp',
            text: 'The martyrs taught us that faith means standing strong even in the hardest times.'
        },
        {
            speaker: 'Polycarp',
            portrait: 'polycarp',
            text: 'Polycarp showed courage. Ignatius showed kindness. Perpetua showed truth. Felicity showed equality.'
        },
        {
            speaker: 'Polycarp',
            portrait: 'polycarp',
            text: 'Take these lessons with you as you continue your journey. The next challenge awaits!',
            setFlag: 'level2_complete'
        }
    ]
};
