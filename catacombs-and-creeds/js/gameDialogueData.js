/**
 * Catacombs & Creeds - Educational Dialogue Content
 * Sample dialogue data for early Christian church history lessons
 */

const GameDialogue = {
  
  // Tutorial/Introduction
  tutorial: {
    introduction: [
      {
        speaker: 'Narrator',
        portrait: 'narrator.png',
        text: 'Welcome to Rome in the year 64 AD.'
      },
      {
        speaker: 'Narrator',
        portrait: 'narrator.png',
        text: 'Christians face danger from the Roman Empire.'
      },
      {
        speaker: 'Narrator',
        portrait: 'narrator.png',
        text: 'They meet secretly in underground tunnels called catacombs.'
      }
    ],
    
    controls: [
      {
        speaker: 'Guide',
        portrait: 'guide.png',
        text: 'Use arrow keys to move around the catacombs.'
      },
      {
        speaker: 'Guide',
        portrait: 'guide.png',
        text: 'Press SPACE to talk with people you meet.'
      },
      {
        speaker: 'Guide',
        portrait: 'guide.png',
        text: 'Press T to turn on voice reading.'
      }
    ]
  },
  
  // Main Characters
  characters: {
    peter: {
      greeting: {
        speaker: 'Apostle Peter',
        portrait: 'peter.png',
        text: 'Peace be with you, young believer!'
      },
      
      aboutPeter: [
        {
          speaker: 'Apostle Peter',
          portrait: 'peter.png',
          text: 'I was a fisherman before Jesus called me.'
        },
        {
          speaker: 'Apostle Peter',
          portrait: 'peter.png',
          text: 'Jesus said I would fish for people instead!'
        },
        {
          speaker: 'Apostle Peter',
          portrait: 'peter.png',
          text: 'Now I lead the church here in Rome.'
        }
      ],
      
      teachingQuiz: {
        speaker: 'Apostle Peter',
        portrait: 'peter.png',
        text: 'What did Jesus tell his followers to do?',
        choices: [
          {
            text: 'Love one another',
            action: () => {
              return {
                speaker: 'Apostle Peter',
                portrait: 'peter.png',
                text: 'Correct! Jesus taught us to love each other.'
              };
            }
          },
          {
            text: 'Fight their enemies',
            action: () => {
              return {
                speaker: 'Apostle Peter',
                portrait: 'peter.png',
                text: 'No, Jesus taught peace and love, not fighting.'
              };
            }
          },
          {
            text: 'Hide from everyone',
            action: () => {
              return {
                speaker: 'Apostle Peter',
                portrait: 'peter.png',
                text: 'No, we share the good news, but safely!'
              };
            }
          }
        ]
      }
    },
    
    paul: {
      greeting: {
        speaker: 'Apostle Paul',
        portrait: 'paul.png',
        text: 'The Lord be with you, friend.'
      },
      
      aboutPaul: [
        {
          speaker: 'Apostle Paul',
          portrait: 'paul.png',
          text: 'I once hunted Christians before Jesus changed my heart.'
        },
        {
          speaker: 'Apostle Paul',
          portrait: 'paul.png',
          text: 'Jesus appeared to me in a bright light!'
        },
        {
          speaker: 'Apostle Paul',
          portrait: 'paul.png',
          text: 'Now I travel everywhere sharing the good news.'
        }
      ],
      
      faithLesson: [
        {
          speaker: 'Apostle Paul',
          portrait: 'paul.png',
          text: 'Faith means trusting God even when afraid.'
        },
        {
          speaker: 'Apostle Paul',
          portrait: 'paul.png',
          text: 'We face danger, but God is with us.'
        }
      ]
    },
    
    timothy: {
      greeting: {
        speaker: 'Timothy',
        portrait: 'timothy.png',
        text: 'Hello! Are you here to learn about Jesus?'
      },
      
      youngBeliever: [
        {
          speaker: 'Timothy',
          portrait: 'timothy.png',
          text: 'Paul taught me about Jesus when I was young.'
        },
        {
          speaker: 'Timothy',
          portrait: 'timothy.png',
          text: 'You are never too young to follow Jesus!'
        }
      ]
    },
    
    lydia: {
      greeting: {
        speaker: 'Lydia',
        portrait: 'lydia.png',
        text: 'Welcome to our gathering, little one.'
      },
      
      aboutLydia: [
        {
          speaker: 'Lydia',
          portrait: 'lydia.png',
          text: 'I sell purple cloth in the marketplace.'
        },
        {
          speaker: 'Lydia',
          portrait: 'lydia.png',
          text: 'My whole family became Christians together!'
        },
        {
          speaker: 'Lydia',
          portrait: 'lydia.png',
          text: 'We help other believers in need.'
        }
      ]
    }
  },
  
  // Educational Quizzes
  quizzes: {
    earlychurch: {
      question1: {
        speaker: 'Teacher',
        portrait: 'teacher.png',
        text: 'Where did early Christians meet in Rome?',
        choices: [
          {
            text: 'In the catacombs',
            action: () => ({ correct: true, points: 10 })
          },
          {
            text: 'In the palace',
            action: () => ({ correct: false, points: 0 })
          },
          {
            text: 'In the arena',
            action: () => ({ correct: false, points: 0 })
          }
        ]
      },
      
      question2: {
        speaker: 'Teacher',
        portrait: 'teacher.png',
        text: 'Why did Christians meet secretly?',
        choices: [
          {
            text: 'Romans persecuted them',
            action: () => ({ correct: true, points: 10 })
          },
          {
            text: 'They liked caves',
            action: () => ({ correct: false, points: 0 })
          },
          {
            text: 'It was a game',
            action: () => ({ correct: false, points: 0 })
          }
        ]
      },
      
      question3: {
        speaker: 'Teacher',
        portrait: 'teacher.png',
        text: 'Who was the first leader of the church?',
        choices: [
          {
            text: 'Peter',
            action: () => ({ correct: true, points: 10 })
          },
          {
            text: 'Caesar',
            action: () => ({ correct: false, points: 0 })
          },
          {
            text: 'Nero',
            action: () => ({ correct: false, points: 0 })
          }
        ]
      }
    },
    
    discipleship: {
      question1: {
        speaker: 'Teacher',
        portrait: 'teacher.png',
        text: 'How many disciples did Jesus choose?',
        choices: [
          {
            text: '12 disciples',
            action: () => ({ correct: true, points: 10 })
          },
          {
            text: '7 disciples',
            action: () => ({ correct: false, points: 0 })
          },
          {
            text: '100 disciples',
            action: () => ({ correct: false, points: 0 })
          }
        ]
      },
      
      question2: {
        speaker: 'Teacher',
        portrait: 'teacher.png',
        text: 'What does disciple mean?',
        choices: [
          {
            text: 'A student or follower',
            action: () => ({ correct: true, points: 10 })
          },
          {
            text: 'A soldier',
            action: () => ({ correct: false, points: 0 })
          },
          {
            text: 'A teacher',
            action: () => ({ correct: false, points: 0 })
          }
        ]
      }
    }
  },
  
  // Story Events
  events: {
    meetGuard: {
      encounter: [
        {
          speaker: 'Roman Guard',
          portrait: 'guard.png',
          text: 'Stop! What are you doing here?'
        },
        {
          speaker: 'Roman Guard',
          portrait: 'guard.png',
          text: 'These tunnels are forbidden to enter.',
          choices: [
            {
              text: 'I am a Christian',
              action: () => 'honesty'
            },
            {
              text: 'I got lost',
              action: () => 'excuse'
            },
            {
              text: 'Say nothing',
              action: () => 'silence'
            }
          ]
        }
      ],
      
      honesty: [
        {
          speaker: 'Roman Guard',
          portrait: 'guard.png',
          text: 'Your courage impresses me. I respect your faith.'
        },
        {
          speaker: 'Roman Guard',
          portrait: 'guard.png',
          text: 'Go quickly. I will look the other way.'
        }
      ],
      
      excuse: [
        {
          speaker: 'Roman Guard',
          portrait: 'guard.png',
          text: 'You seem nervous. Are you lying to me?'
        },
        {
          speaker: 'Roman Guard',
          portrait: 'guard.png',
          text: 'Leave now before I change my mind!'
        }
      ],
      
      silence: [
        {
          speaker: 'Roman Guard',
          portrait: 'guard.png',
          text: 'Silence will not help you. Speak!'
        },
        {
          speaker: 'Roman Guard',
          portrait: 'guard.png',
          text: 'Next time, answer when questioned!'
        }
      ]
    },
    
    secretMeeting: [
      {
        speaker: 'Believer',
        portrait: 'believer.png',
        text: 'Welcome to our secret worship service.'
      },
      {
        speaker: 'Believer',
        portrait: 'believer.png',
        text: 'We gather to pray and sing quietly.'
      },
      {
        speaker: 'Believer',
        portrait: 'believer.png',
        text: 'We share bread just as Jesus taught us.'
      }
    ],
    
    helpingHand: {
      opportunity: [
        {
          speaker: 'Hungry Child',
          portrait: 'child.png',
          text: 'I am so hungry. Do you have any food?'
        },
        {
          speaker: 'Hungry Child',
          portrait: 'child.png',
          text: 'My family has not eaten in days.',
          choices: [
            {
              text: 'Share your bread',
              action: () => 'generous'
            },
            {
              text: 'Give nothing',
              action: () => 'selfish'
            },
            {
              text: 'Find help',
              action: () => 'helpful'
            }
          ]
        }
      ],
      
      generous: [
        {
          speaker: 'Hungry Child',
          portrait: 'child.png',
          text: 'Thank you! You are so kind and generous!'
        },
        {
          speaker: 'Apostle Peter',
          portrait: 'peter.png',
          text: 'Well done! Jesus taught us to help those in need.'
        }
      ],
      
      helpful: [
        {
          speaker: 'Hungry Child',
          portrait: 'child.png',
          text: 'Thank you for finding help for my family!'
        },
        {
          speaker: 'Apostle Paul',
          portrait: 'paul.png',
          text: 'You showed wisdom by seeking help for others.'
        }
      ]
    },
    
    persecution: [
      {
        speaker: 'Narrator',
        portrait: 'narrator.png',
        text: 'Emperor Nero blames Christians for a great fire.'
      },
      {
        speaker: 'Narrator',
        portrait: 'narrator.png',
        text: 'Many Christians are arrested and face danger.'
      },
      {
        speaker: 'Apostle Peter',
        portrait: 'peter.png',
        text: 'We must stay strong in our faith, no matter what!'
      }
    ]
  },
  
  // Historical Facts
  facts: {
    catacombs: [
      {
        speaker: 'Historian',
        portrait: 'historian.png',
        text: 'Catacombs are underground burial tunnels beneath Rome.'
      },
      {
        speaker: 'Historian',
        portrait: 'historian.png',
        text: 'Christians used them as secret meeting places.'
      },
      {
        speaker: 'Historian',
        portrait: 'historian.png',
        text: 'There are over 40 catacombs in Rome!'
      }
    ],
    
    symbols: [
      {
        speaker: 'Historian',
        portrait: 'historian.png',
        text: 'Early Christians used secret symbols to identify each other.'
      },
      {
        speaker: 'Historian',
        portrait: 'historian.png',
        text: 'The fish symbol was very popular and meaningful.'
      },
      {
        speaker: 'Historian',
        portrait: 'historian.png',
        text: 'It stood for Jesus Christ, God\'s Son, Savior.'
      }
    ],
    
    persecution: [
      {
        speaker: 'Historian',
        portrait: 'historian.png',
        text: 'Emperor Nero persecuted Christians starting in 64 AD.'
      },
      {
        speaker: 'Historian',
        portrait: 'historian.png',
        text: 'Despite danger, Christianity continued to grow and spread.'
      }
    ]
  },
  
  // Daily Life
  dailyLife: {
    worship: [
      {
        speaker: 'Elder',
        portrait: 'elder.png',
        text: 'We gather before dawn to worship together.'
      },
      {
        speaker: 'Elder',
        portrait: 'elder.png',
        text: 'We sing hymns, pray, and read Scripture.'
      },
      {
        speaker: 'Elder',
        portrait: 'elder.png',
        text: 'Then we share a simple meal in fellowship.'
      }
    ],
    
    baptism: [
      {
        speaker: 'Deacon',
        portrait: 'deacon.png',
        text: 'New believers are baptized with water.'
      },
      {
        speaker: 'Deacon',
        portrait: 'deacon.png',
        text: 'Baptism shows they follow Jesus publicly.'
      }
    ]
  }
};

// Export for use in game
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameDialogue;
}
