/**
 * Level 1 Dialogue Content - The Catacombs
 *
 * All dialogue sequences for Level 1.
 * DialogueIds must match the NPC dialogueId fields in level1.json.
 *
 * Node format: { speaker, portrait, text, choices, setFlag, nextDialogue }
 * Text longer than 15 words will be auto-split by the DialogueSystem.
 */

window.LEVEL1_DIALOGUES = {

    // ── Peter the Guide (starting chamber NPC) ───────────────────────

    peter_intro: [
        {
            speaker: 'Peter',
            portrait: 'peter',
            text: 'Welcome, young friend! I am Peter, your guide through these catacombs beneath Rome.'
        },
        {
            speaker: 'Peter',
            portrait: 'peter',
            text: 'The year is 64 AD. Christians must meet in secret to stay safe from the Roman Empire.'
        },
        {
            speaker: 'Peter',
            portrait: 'peter',
            text: 'Your mission is to find the three apostles hidden in these tunnels. They each carry an Apostle Coin.'
        },
        {
            speaker: 'Peter',
            portrait: 'peter',
            text: 'Collect all three coins to unlock the path forward. Be brave, and watch out for Roman guards!',
            setFlag: 'met_peter_guide'
        }
    ],

    // ── Apostle Peter ────────────────────────────────────────────────

    apostle_peter_quest: [
        {
            speaker: 'Apostle Peter',
            portrait: 'peter_apostle',
            text: 'Peace be with you, young believer! I am Peter, one of the twelve apostles of Jesus.'
        },
        {
            speaker: 'Apostle Peter',
            portrait: 'peter_apostle',
            text: 'Before Jesus called me, I was a simple fisherman on the Sea of Galilee.'
        },
        {
            speaker: 'Apostle Peter',
            portrait: 'peter_apostle',
            text: 'Jesus said I was the rock on which he would build his church. That is a big responsibility!'
        },
        {
            speaker: 'Apostle Peter',
            portrait: 'peter_apostle',
            text: 'Do you know what it means to be a rock for others?',
            choices: [
                {
                    text: 'Being strong and reliable',
                    nextDialogue: 'apostle_peter_correct'
                },
                {
                    text: 'Being hard and cold',
                    nextDialogue: 'apostle_peter_gentle'
                },
                {
                    text: 'I am not sure',
                    nextDialogue: 'apostle_peter_explain'
                }
            ]
        }
    ],

    apostle_peter_correct: [
        {
            speaker: 'Apostle Peter',
            portrait: 'peter_apostle',
            text: 'Exactly right! A rock is steady and trustworthy. Others can depend on it.'
        },
        {
            speaker: 'Apostle Peter',
            portrait: 'peter_apostle',
            text: 'Here is an Apostle Coin for your wisdom. Keep being strong for others!',
            setFlag: 'coin_peter'
        }
    ],

    apostle_peter_gentle: [
        {
            speaker: 'Apostle Peter',
            portrait: 'peter_apostle',
            text: 'Not quite! A rock means being strong and dependable, not cold.'
        },
        {
            speaker: 'Apostle Peter',
            portrait: 'peter_apostle',
            text: 'Jesus wanted me to be someone people could count on, someone steady and faithful.'
        },
        {
            speaker: 'Apostle Peter',
            portrait: 'peter_apostle',
            text: 'Take this Apostle Coin and remember to be strong for those who need you!',
            setFlag: 'coin_peter'
        }
    ],

    apostle_peter_explain: [
        {
            speaker: 'Apostle Peter',
            portrait: 'peter_apostle',
            text: 'That is okay! Being a rock means being strong and reliable for others.'
        },
        {
            speaker: 'Apostle Peter',
            portrait: 'peter_apostle',
            text: 'People can depend on a rock. It does not move when storms come.'
        },
        {
            speaker: 'Apostle Peter',
            portrait: 'peter_apostle',
            text: 'Here is an Apostle Coin. Remember to stand firm, even when things are hard!',
            setFlag: 'coin_peter'
        }
    ],

    // ── Apostle James ────────────────────────────────────────────────

    apostle_james_quest: [
        {
            speaker: 'Apostle James',
            portrait: 'james',
            text: 'Greetings, traveler! I am James, one of the first apostles called by Jesus.'
        },
        {
            speaker: 'Apostle James',
            portrait: 'james',
            text: 'My brother John and I were fishing when Jesus invited us to follow him. We left our nets behind!'
        },
        {
            speaker: 'Apostle James',
            portrait: 'james',
            text: 'Jesus taught us that faith is not just words. Faith means doing good things for others.'
        },
        {
            speaker: 'Apostle James',
            portrait: 'james',
            text: 'We spread the good news by helping people and showing kindness everywhere we went.'
        },
        {
            speaker: 'Apostle James',
            portrait: 'james',
            text: 'How do you think we should show our faith?',
            choices: [
                {
                    text: 'By helping others',
                    nextDialogue: 'apostle_james_correct'
                },
                {
                    text: 'By hiding from danger',
                    nextDialogue: 'apostle_james_courage'
                },
                {
                    text: 'By talking about it',
                    nextDialogue: 'apostle_james_both'
                }
            ]
        }
    ],

    apostle_james_correct: [
        {
            speaker: 'Apostle James',
            portrait: 'james',
            text: 'Yes! Actions speak louder than words. When we help others, we show God\'s love.'
        },
        {
            speaker: 'Apostle James',
            portrait: 'james',
            text: 'Take this Apostle Coin. Let it remind you to put your faith into action!',
            setFlag: 'coin_james'
        }
    ],

    apostle_james_courage: [
        {
            speaker: 'Apostle James',
            portrait: 'james',
            text: 'Staying safe is important. But true faith also means being brave enough to help others.'
        },
        {
            speaker: 'Apostle James',
            portrait: 'james',
            text: 'Even in dangerous times, we show love through our actions, not just our hiding.'
        },
        {
            speaker: 'Apostle James',
            portrait: 'james',
            text: 'Here is an Apostle Coin for your journey. Be brave and do good!',
            setFlag: 'coin_james'
        }
    ],

    apostle_james_both: [
        {
            speaker: 'Apostle James',
            portrait: 'james',
            text: 'Talking about faith is good! But the best way is to show it through kind actions.'
        },
        {
            speaker: 'Apostle James',
            portrait: 'james',
            text: 'When people see us helping others, they understand what we believe.'
        },
        {
            speaker: 'Apostle James',
            portrait: 'james',
            text: 'Take this Apostle Coin. Remember, actions and words together are powerful!',
            setFlag: 'coin_james'
        }
    ],

    // ── Apostle John ─────────────────────────────────────────────────

    apostle_john_quest: [
        {
            speaker: 'Apostle John',
            portrait: 'john',
            text: 'Hello, young one! I am John, sometimes called the apostle of love.'
        },
        {
            speaker: 'Apostle John',
            portrait: 'john',
            text: 'Jesus taught us many things. But the most important lesson was about love.'
        },
        {
            speaker: 'Apostle John',
            portrait: 'john',
            text: 'He said the greatest commandment is to love God and to love each other.'
        },
        {
            speaker: 'Apostle John',
            portrait: 'john',
            text: 'Love is not just a feeling. It means choosing to be kind, even when it is hard.'
        },
        {
            speaker: 'Apostle John',
            portrait: 'john',
            text: 'What do you think is the most important thing Jesus taught?',
            choices: [
                {
                    text: 'To love one another',
                    nextDialogue: 'apostle_john_correct'
                },
                {
                    text: 'To be the strongest',
                    nextDialogue: 'apostle_john_gentle'
                },
                {
                    text: 'To win every battle',
                    nextDialogue: 'apostle_john_peace'
                }
            ]
        }
    ],

    apostle_john_correct: [
        {
            speaker: 'Apostle John',
            portrait: 'john',
            text: 'You understand perfectly! Love is the greatest gift we can share with the world.'
        },
        {
            speaker: 'Apostle John',
            portrait: 'john',
            text: 'Take this Apostle Coin. Let love guide everything you do!',
            setFlag: 'coin_john'
        }
    ],

    apostle_john_gentle: [
        {
            speaker: 'Apostle John',
            portrait: 'john',
            text: 'Strength is good, but Jesus taught that love is even more powerful than strength.'
        },
        {
            speaker: 'Apostle John',
            portrait: 'john',
            text: 'The strongest thing you can do is choose to love others, even your enemies.'
        },
        {
            speaker: 'Apostle John',
            portrait: 'john',
            text: 'Here is an Apostle Coin. Remember, love is the greatest strength!',
            setFlag: 'coin_john'
        }
    ],

    apostle_john_peace: [
        {
            speaker: 'Apostle John',
            portrait: 'john',
            text: 'Jesus did not teach us to fight. He taught us to make peace and show love.'
        },
        {
            speaker: 'Apostle John',
            portrait: 'john',
            text: 'True victory comes from loving others, not from defeating them.'
        },
        {
            speaker: 'Apostle John',
            portrait: 'john',
            text: 'Take this Apostle Coin and carry the message of peace and love!',
            setFlag: 'coin_john'
        }
    ],

    // ── Roman Guard Encounter ────────────────────────────────────────

    roman_guard: [
        {
            speaker: 'Roman Guard',
            portrait: 'guard',
            text: 'Halt! What are you doing in these tunnels? They are forbidden!'
        },
        {
            speaker: 'Roman Guard',
            portrait: 'guard',
            text: 'Answer me! Are you one of those Christians?',
            choices: [
                {
                    text: 'Yes, I follow Jesus.',
                    nextDialogue: 'roman_guard_honest'
                },
                {
                    text: 'I got lost down here.',
                    nextDialogue: 'roman_guard_excuse'
                },
                {
                    text: 'Say nothing.',
                    nextDialogue: 'roman_guard_silent'
                }
            ]
        }
    ],

    roman_guard_honest: [
        {
            speaker: 'Roman Guard',
            portrait: 'guard',
            text: 'A Christian? Your honesty is... surprising. Most people lie when they are afraid.'
        },
        {
            speaker: 'Roman Guard',
            portrait: 'guard',
            text: 'I respect your courage. Go quickly, before I change my mind.',
            setFlag: 'guard_honest'
        }
    ],

    roman_guard_excuse: [
        {
            speaker: 'Roman Guard',
            portrait: 'guard',
            text: 'Lost? Down here? You seem nervous. I think you are hiding something.'
        },
        {
            speaker: 'Roman Guard',
            portrait: 'guard',
            text: 'Fine. Leave now and do not let me catch you here again!',
            setFlag: 'guard_excuse'
        }
    ],

    roman_guard_silent: [
        {
            speaker: 'Roman Guard',
            portrait: 'guard',
            text: 'Silence? You refuse to speak? That takes nerve.'
        },
        {
            speaker: 'Roman Guard',
            portrait: 'guard',
            text: 'I do not have time for this. Move along before I call for backup!',
            setFlag: 'guard_silent'
        }
    ],

    // ── Boss Pre-fight (Roman Centurion) ─────────────────────────────

    boss_prefight: [
        {
            speaker: 'Roman Centurion',
            portrait: 'centurion',
            text: 'So, you have made it this far. I am the centurion who guards these tunnels.'
        },
        {
            speaker: 'Roman Centurion',
            portrait: 'centurion',
            text: 'Emperor Nero has ordered us to stop all Christians from meeting in secret.'
        },
        {
            speaker: 'Roman Centurion',
            portrait: 'centurion',
            text: 'You will not pass through here easily. Prepare yourself!'
        }
    ],

    // ── Victory Dialogue (stub) ──────────────────────────────────────

    victory: [
        {
            speaker: 'Peter',
            portrait: 'peter',
            text: 'You did it! You collected all three Apostle Coins and made it through the catacombs!'
        },
        {
            speaker: 'Peter',
            portrait: 'peter',
            text: 'The early Christians faced many dangers, but their faith and love kept them strong.'
        },
        {
            speaker: 'Peter',
            portrait: 'peter',
            text: 'You have shown great courage today. The next part of your journey awaits!'
        }
    ]
};
