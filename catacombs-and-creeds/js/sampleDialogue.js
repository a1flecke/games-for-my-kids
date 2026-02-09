/**
 * sampleDialogue.js - Sample Educational Dialogue
 * Test dialogue sequences about apostles for 3rd-6th graders
 */

const SampleDialogue = {
  
  // Simple greeting sequence (3-4 boxes)
  peterGreeting: [
    {
      speaker: "Apostle Peter",
      portrait: "peter.png",
      text: "Welcome, young believer! Rome is dangerous for Christians.",
      choices: null
    },
    {
      speaker: "Apostle Peter",
      portrait: "peter.png",
      text: "We must meet secretly in these underground tunnels.",
      choices: null
    },
    {
      speaker: "Apostle Peter",
      portrait: "peter.png",
      text: "Jesus called me to be a fisher of people!",
      choices: null
    },
    {
      speaker: "Apostle Peter",
      portrait: "peter.png",
      text: "Will you help spread the good news safely?",
      choices: [
        {
          text: "Yes, I will help!",
          action: () => console.log("Player accepted mission")
        },
        {
          text: "I'm scared",
          action: () => console.log("Player expressed fear")
        },
        {
          text: "Tell me more first",
          action: () => console.log("Player wants more info")
        }
      ]
    }
  ],
  
  // Paul teaching sequence
  paulTeaching: [
    {
      speaker: "Apostle Paul",
      portrait: "paul.png",
      text: "Peace be with you, friend. I am Paul.",
      choices: null
    },
    {
      speaker: "Apostle Paul",
      portrait: "paul.png",
      text: "I once hunted Christians. But Jesus changed my heart!",
      choices: null
    },
    {
      speaker: "Apostle Paul",
      portrait: "paul.png",
      text: "Now I travel everywhere sharing God's love and forgiveness.",
      choices: null
    }
  ],
  
  // Timothy's encouragement
  timothyEncouragement: [
    {
      speaker: "Timothy",
      portrait: "timothy.png",
      text: "Hello! Paul taught me about Jesus when I was young.",
      choices: null
    },
    {
      speaker: "Timothy",
      portrait: "timothy.png",
      text: "You're never too young to follow Jesus and help others!",
      choices: null
    },
    {
      speaker: "Timothy",
      portrait: "timothy.png",
      text: "Let's pray together before you continue your journey.",
      choices: null
    }
  ],
  
  // Lydia's generosity lesson
  lydiaGenerosity: [
    {
      speaker: "Lydia",
      portrait: "lydia.png",
      text: "Welcome to my home. I sell purple cloth in the city.",
      choices: null
    },
    {
      speaker: "Lydia",
      portrait: "lydia.png",
      text: "When I heard about Jesus, my whole family believed!",
      choices: null
    },
    {
      speaker: "Lydia",
      portrait: "lydia.png",
      text: "We share what we have with other believers in need.",
      choices: null
    },
    {
      speaker: "Lydia",
      portrait: "lydia.png",
      text: "Do you have any food to share with the hungry?",
      choices: [
        {
          text: "Yes, here's my bread",
          action: () => console.log("Player shared food")
        },
        {
          text: "No, I need it",
          action: () => console.log("Player kept food")
        }
      ]
    }
  ],
  
  // Quiz about apostles
  apostleQuiz: [
    {
      speaker: "Teacher",
      portrait: "peter.png",
      text: "Let's test your knowledge! Who was a fisherman?",
      choices: [
        {
          text: "Peter",
          action: () => console.log("Correct! +10 points")
        },
        {
          text: "Paul",
          action: () => console.log("Incorrect")
        },
        {
          text: "Lydia",
          action: () => console.log("Incorrect")
        }
      ]
    },
    {
      speaker: "Teacher",
      portrait: "paul.png",
      text: "Who traveled to many cities teaching about Jesus?",
      choices: [
        {
          text: "Paul",
          action: () => console.log("Correct! +10 points")
        },
        {
          text: "Timothy",
          action: () => console.log("Incorrect")
        },
        {
          text: "Peter",
          action: () => console.log("Partially correct")
        }
      ]
    }
  ],
  
  // Danger encounter
  guardEncounter: [
    {
      speaker: "Roman Guard",
      portrait: "peter.png", // Reusing portrait as placeholder
      text: "Stop! These catacombs are forbidden. What are you doing here?",
      choices: [
        {
          text: "I'm a Christian",
          action: () => console.log("Honest answer")
        },
        {
          text: "I got lost",
          action: () => console.log("Made excuse")
        },
        {
          text: "Run away!",
          action: () => console.log("Fled from guard")
        }
      ]
    }
  ]
};
