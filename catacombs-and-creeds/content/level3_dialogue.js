/**
 * Level 3 Dialogue Content - The Grand Library
 *
 * All dialogue sequences for Level 3: Creeds & Puzzles.
 * Features Athanasius as guide, 5 Bishops with Creed Fragments,
 * puzzle introduction, and Arius boss dialogue.
 */

window.LEVEL3_DIALOGUES = {

    // ── Athanasius (guide NPC near entrance) ──────────────────────────

    athanasius_intro: [
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'Welcome to the Grand Library, young traveler! I am Athanasius, Bishop of Alexandria.'
        },
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'The year is 325 AD. The church is divided over a great question: Who is Jesus?'
        },
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'A teacher named Arius says Jesus was created by God and is not truly divine.'
        },
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'But we believe Jesus is of one being with the Father, fully God and fully human.'
        },
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'Five bishops in this library each hold a fragment of the Nicene Creed. Find them all!'
        },
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'Once you have all five fragments, bring them to the Council Lectern to assemble the Creed.',
            setFlag: 'met_athanasius'
        }
    ],

    // ── Bishop Basil (Fragment 1: "We believe in one God") ─────────

    bishop_basil_quest: [
        {
            speaker: 'Bishop Basil',
            portrait: 'bishop',
            text: 'Greetings, young seeker! I am Basil, Bishop of Caesarea.'
        },
        {
            speaker: 'Bishop Basil',
            portrait: 'bishop',
            text: 'The Creed begins with the most important truth: We believe in one God.'
        },
        {
            speaker: 'Bishop Basil',
            portrait: 'bishop',
            text: 'This means there is only one God, not many like the Romans believe.'
        },
        {
            speaker: 'Bishop Basil',
            portrait: 'bishop',
            text: 'Why is it important to say we believe in ONE God?',
            choices: [
                {
                    text: 'It unites all Christians in one faith',
                    nextDialogue: 'bishop_basil_correct'
                },
                {
                    text: 'Because one is a lucky number',
                    nextDialogue: 'bishop_basil_gentle'
                },
                {
                    text: 'I am not sure',
                    nextDialogue: 'bishop_basil_explain'
                }
            ]
        }
    ],

    bishop_basil_correct: [
        {
            speaker: 'Bishop Basil',
            portrait: 'bishop',
            text: 'Exactly! Believing in one God brings all Christians together. It is the foundation of our faith.'
        },
        {
            speaker: 'Bishop Basil',
            portrait: 'bishop',
            text: 'Here is the first Creed Fragment. Guard it well!',
            setFlag: 'fragment_1'
        }
    ],

    bishop_basil_gentle: [
        {
            speaker: 'Bishop Basil',
            portrait: 'bishop',
            text: 'It is not about numbers! Saying one God means there is only one true God who made everything.'
        },
        {
            speaker: 'Bishop Basil',
            portrait: 'bishop',
            text: 'This belief unites Christians and sets us apart from those who worship many gods.'
        },
        {
            speaker: 'Bishop Basil',
            portrait: 'bishop',
            text: 'Take this Creed Fragment and remember: there is only one God!',
            setFlag: 'fragment_1'
        }
    ],

    bishop_basil_explain: [
        {
            speaker: 'Bishop Basil',
            portrait: 'bishop',
            text: 'That is fine! Saying one God means we all worship the same Creator.'
        },
        {
            speaker: 'Bishop Basil',
            portrait: 'bishop',
            text: 'It unites believers everywhere under one truth. It is the start of everything we believe.'
        },
        {
            speaker: 'Bishop Basil',
            portrait: 'bishop',
            text: 'Here is the first Creed Fragment. May it guide your journey!',
            setFlag: 'fragment_1'
        }
    ],

    // ── Bishop Gregory (Fragment 2: "The Father Almighty") ─────────

    bishop_gregory_quest: [
        {
            speaker: 'Bishop Gregory',
            portrait: 'bishop',
            text: 'Welcome, friend! I am Gregory, Bishop of Nazianzus.'
        },
        {
            speaker: 'Bishop Gregory',
            portrait: 'bishop',
            text: 'The next part of the Creed says: The Father Almighty.'
        },
        {
            speaker: 'Bishop Gregory',
            portrait: 'bishop',
            text: 'God is called Father because He is the source of all creation. He made everything!'
        },
        {
            speaker: 'Bishop Gregory',
            portrait: 'bishop',
            text: 'And Almighty means God is powerful beyond anything we can imagine.',
            choices: [
                {
                    text: 'God created everything!',
                    nextDialogue: 'bishop_gregory_correct'
                },
                {
                    text: 'Does that mean God is like my dad?',
                    nextDialogue: 'bishop_gregory_explain'
                }
            ]
        }
    ],

    bishop_gregory_correct: [
        {
            speaker: 'Bishop Gregory',
            portrait: 'bishop',
            text: 'Yes! God is the Creator of all things, seen and unseen. Nothing exists without Him.'
        },
        {
            speaker: 'Bishop Gregory',
            portrait: 'bishop',
            text: 'Take this second Creed Fragment!',
            setFlag: 'fragment_2'
        }
    ],

    bishop_gregory_explain: [
        {
            speaker: 'Bishop Gregory',
            portrait: 'bishop',
            text: 'In a way, yes! A father cares for and creates a family. God cares for all of creation.'
        },
        {
            speaker: 'Bishop Gregory',
            portrait: 'bishop',
            text: 'But God is even greater. He is Almighty, meaning nothing is too hard for Him.'
        },
        {
            speaker: 'Bishop Gregory',
            portrait: 'bishop',
            text: 'Here is the second Creed Fragment. Remember God the Father loves you!',
            setFlag: 'fragment_2'
        }
    ],

    // ── Bishop Ambrose (Fragment 3: "And in one Lord Jesus Christ") ──

    bishop_ambrose_quest: [
        {
            speaker: 'Bishop Ambrose',
            portrait: 'bishop',
            text: 'Peace be with you! I am Ambrose, Bishop of Milan.'
        },
        {
            speaker: 'Bishop Ambrose',
            portrait: 'bishop',
            text: 'The Creed continues: And in one Lord Jesus Christ.'
        },
        {
            speaker: 'Bishop Ambrose',
            portrait: 'bishop',
            text: 'Jesus is called Lord because He has authority over all things. He is the one sent by God.'
        },
        {
            speaker: 'Bishop Ambrose',
            portrait: 'bishop',
            text: 'What does it mean that Jesus is Lord?',
            choices: [
                {
                    text: 'He has authority and we follow Him',
                    nextDialogue: 'bishop_ambrose_correct'
                },
                {
                    text: 'He was a wise teacher only',
                    nextDialogue: 'bishop_ambrose_gentle'
                }
            ]
        }
    ],

    bishop_ambrose_correct: [
        {
            speaker: 'Bishop Ambrose',
            portrait: 'bishop',
            text: 'Wonderful! Jesus is not just a teacher but the Lord of all. We follow and trust Him.'
        },
        {
            speaker: 'Bishop Ambrose',
            portrait: 'bishop',
            text: 'Here is the third Creed Fragment!',
            setFlag: 'fragment_3'
        }
    ],

    bishop_ambrose_gentle: [
        {
            speaker: 'Bishop Ambrose',
            portrait: 'bishop',
            text: 'Jesus was a wise teacher, but He is much more than that!'
        },
        {
            speaker: 'Bishop Ambrose',
            portrait: 'bishop',
            text: 'Calling Jesus Lord means He is divine, with authority from God the Father.'
        },
        {
            speaker: 'Bishop Ambrose',
            portrait: 'bishop',
            text: 'Take this third Creed Fragment. Jesus is Lord of all!',
            setFlag: 'fragment_3'
        }
    ],

    // ── Bishop Cyril (Fragment 4: "Of one being with the Father") ───

    bishop_cyril_quest: [
        {
            speaker: 'Bishop Cyril',
            portrait: 'bishop',
            text: 'Hello, young one! I am Cyril, Bishop of Jerusalem.'
        },
        {
            speaker: 'Bishop Cyril',
            portrait: 'bishop',
            text: 'This is the most debated part of the Creed: Of one being with the Father.'
        },
        {
            speaker: 'Bishop Cyril',
            portrait: 'bishop',
            text: 'Arius says Jesus was created and is less than God. But we say Jesus is of one being, the same substance, as God.'
        },
        {
            speaker: 'Bishop Cyril',
            portrait: 'bishop',
            text: 'This is what Athanasius fights so hard to defend! Jesus is truly and fully God.',
            choices: [
                {
                    text: 'Jesus is equal to God the Father',
                    nextDialogue: 'bishop_cyril_correct'
                },
                {
                    text: 'This is confusing',
                    nextDialogue: 'bishop_cyril_explain'
                }
            ]
        }
    ],

    bishop_cyril_correct: [
        {
            speaker: 'Bishop Cyril',
            portrait: 'bishop',
            text: 'Yes! Of one being means Jesus shares the same divine nature as the Father. He is fully God!'
        },
        {
            speaker: 'Bishop Cyril',
            portrait: 'bishop',
            text: 'Here is the fourth Creed Fragment. This truth is worth defending!',
            setFlag: 'fragment_4'
        }
    ],

    bishop_cyril_explain: [
        {
            speaker: 'Bishop Cyril',
            portrait: 'bishop',
            text: 'It is okay to find this hard! Big ideas about God can be confusing.'
        },
        {
            speaker: 'Bishop Cyril',
            portrait: 'bishop',
            text: 'Think of it this way: the Father and the Son are like two candles lit from the same flame.'
        },
        {
            speaker: 'Bishop Cyril',
            portrait: 'bishop',
            text: 'The light is the same! Take this fourth Creed Fragment and keep thinking about it.',
            setFlag: 'fragment_4'
        }
    ],

    // ── Bishop Augustine (Fragment 5: "Who came down from heaven") ──

    bishop_augustine_quest: [
        {
            speaker: 'Bishop Augustine',
            portrait: 'bishop',
            text: 'Greetings, pilgrim! I am Augustine, Bishop of Hippo.'
        },
        {
            speaker: 'Bishop Augustine',
            portrait: 'bishop',
            text: 'The final part of our fragment says: Who came down from heaven.'
        },
        {
            speaker: 'Bishop Augustine',
            portrait: 'bishop',
            text: 'This means Jesus was not born as an ordinary human. He left heaven to be with us!'
        },
        {
            speaker: 'Bishop Augustine',
            portrait: 'bishop',
            text: 'Why would God come down from heaven to live among people?',
            choices: [
                {
                    text: 'Because God loves us and wanted to save us',
                    nextDialogue: 'bishop_augustine_correct'
                },
                {
                    text: 'Because heaven was boring',
                    nextDialogue: 'bishop_augustine_gentle'
                },
                {
                    text: 'To learn what it is like to be human',
                    nextDialogue: 'bishop_augustine_partial'
                }
            ]
        }
    ],

    bishop_augustine_correct: [
        {
            speaker: 'Bishop Augustine',
            portrait: 'bishop',
            text: 'Beautiful answer! God loved the world so much that He sent Jesus to save us.'
        },
        {
            speaker: 'Bishop Augustine',
            portrait: 'bishop',
            text: 'Here is the fifth and final Creed Fragment!',
            setFlag: 'fragment_5'
        }
    ],

    bishop_augustine_gentle: [
        {
            speaker: 'Bishop Augustine',
            portrait: 'bishop',
            text: 'Ha! Heaven is wonderful, not boring! Jesus came because of love, not boredom.'
        },
        {
            speaker: 'Bishop Augustine',
            portrait: 'bishop',
            text: 'God loved people so much that Jesus chose to come down and live among us.'
        },
        {
            speaker: 'Bishop Augustine',
            portrait: 'bishop',
            text: 'Take this final Creed Fragment! Now go assemble the Creed!',
            setFlag: 'fragment_5'
        }
    ],

    bishop_augustine_partial: [
        {
            speaker: 'Bishop Augustine',
            portrait: 'bishop',
            text: 'That is partly true! Jesus did experience human life. But the main reason was love.'
        },
        {
            speaker: 'Bishop Augustine',
            portrait: 'bishop',
            text: 'God loved the world so much that Jesus came to save us and show us the way.'
        },
        {
            speaker: 'Bishop Augustine',
            portrait: 'bishop',
            text: 'Here is the final Creed Fragment. Go assemble the Creed at the Council Lectern!',
            setFlag: 'fragment_5'
        }
    ],

    // ── Council Lectern (puzzle trigger) ────────────────────────────

    puzzle_intro: [
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'The Council Lectern! This is where the Creed must be assembled.'
        },
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'Place the five fragments in the correct order to form the Nicene Creed.'
        },
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'The Creed starts with what we believe about God, then about Jesus, then about His nature.',
            setFlag: 'puzzle_explained'
        }
    ],

    puzzle_not_ready: [
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'You need all five Creed Fragments before you can assemble the Creed here.'
        },
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'Speak with all five bishops in the library to collect them.'
        }
    ],

    puzzle_complete: [
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'You have assembled the Nicene Creed! The truth stands united!'
        },
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'The door to the Debate Hall is now open. Go and face Arius!',
            setFlag: 'puzzle_solved'
        }
    ],

    // ── Boss Pre-fight (Arius) ──────────────────────────────────────

    boss_prefight_l3: [
        {
            speaker: 'Arius',
            portrait: 'arius',
            text: 'So, you come to challenge me? I am Arius, and my teaching has spread across the empire!'
        },
        {
            speaker: 'Arius',
            portrait: 'arius',
            text: 'I say that Jesus was created by God. He is great, but He is not equal to the Father!'
        },
        {
            speaker: 'Arius',
            portrait: 'arius',
            text: 'Your little creed cannot stop my arguments. Let us debate this once and for all!'
        }
    ],

    // ── Boss Victory (Arius defeated) ───────────────────────────────

    boss_victory_l3: [
        {
            speaker: 'Arius',
            portrait: 'arius',
            text: 'I... I cannot overcome the truth you carry. The Creed is stronger than my arguments.'
        },
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'The Council of Nicaea has spoken! Jesus is of one being with the Father.'
        },
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'You have defended the faith bravely. This creed will be spoken for thousands of years!',
            setFlag: 'boss_defeated_l3'
        }
    ],

    // ── Victory Dialogue (at exit stairs) ───────────────────────────

    victory_l3: [
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'You have completed the Creed and defeated Arius! The truth of the faith is preserved!'
        },
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'The Nicene Creed teaches us that God is one, Jesus is Lord, and they share the same divine nature.'
        },
        {
            speaker: 'Athanasius',
            portrait: 'athanasius',
            text: 'These words will guide Christians for centuries to come. Your journey continues!',
            setFlag: 'level3_complete'
        }
    ]
};
