// Punctuation Defender - Game Logic

const game = {
    currentLevel: 0,
    score: 0,
    lives: 3,
    streak: 0,
    virusHealth: 100,
    currentQuestion: 0,
    correctAnswers: 0,
    totalQuestions: 0,
    
    // Game state
    init() {
        this.loadProgress();
        this.showStart();
    },
    
    // Screen Management
    showStart() {
        this.hideAllScreens();
        document.getElementById('startScreen').classList.add('active');
    },
    
    showLevelSelect() {
        this.hideAllScreens();
        this.renderLevelGrid();
        this.updateOverallProgress();
        document.getElementById('levelSelect').classList.add('active');
    },
    
    showGame() {
        this.hideAllScreens();
        document.getElementById('gameScreen').classList.add('active');
    },
    
    showVictory() {
        this.hideAllScreens();
        document.getElementById('victoryScreen').classList.add('active');
    },
    
    showGameOver() {
        this.hideAllScreens();
        document.getElementById('gameOverScreen').classList.add('active');
    },
    
    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
    },
    
    // Level Management
    startLevel(levelIndex) {
        if (levelIndex > 0 && !this.isLevelUnlocked(levelIndex)) {
            alert('Complete previous levels first!');
            return;
        }
        
        this.currentLevel = levelIndex;
        this.score = 0;
        this.lives = 3;
        this.streak = 0;
        this.virusHealth = 100;
        this.currentQuestion = 0;
        this.correctAnswers = 0;
        this.totalQuestions = levels[levelIndex].questions.length;
        
        this.showGame();
        this.showLessonIntro();
    },
    
    showLessonIntro() {
        const level = levels[this.currentLevel];
        document.getElementById('lessonIntro').style.display = 'block';
        document.getElementById('questionArea').style.display = 'none';
        document.getElementById('lessonTitle').textContent = level.name;
        document.getElementById('lessonExplanation').innerHTML = level.explanation;
        document.getElementById('currentLevel').textContent = this.currentLevel + 1;
        this.updateStats();
    },
    
    startQuestions() {
        document.getElementById('lessonIntro').style.display = 'none';
        document.getElementById('questionArea').style.display = 'block';
        this.loadQuestion();
    },
    
    loadQuestion() {
        const level = levels[this.currentLevel];
        const questions = level.questions;
        
        if (this.currentQuestion >= questions.length) {
            this.levelComplete();
            return;
        }
        
        const q = questions[this.currentQuestion];
        document.getElementById('questionText').textContent = q.question;
        
        const answerArea = document.getElementById('answerArea');
        answerArea.innerHTML = '';
        
        q.answers.forEach((answer, index) => {
            const btn = document.createElement('div');
            btn.className = 'answer-btn';
            btn.textContent = answer;
            btn.onclick = () => this.checkAnswer(index);
            btn.tabIndex = 0;
            btn.onkeypress = (e) => {
                if (e.key === 'Enter') this.checkAnswer(index);
            };
            answerArea.appendChild(btn);
        });
        
        document.getElementById('feedback').textContent = '';
        document.getElementById('feedback').className = 'feedback';
        this.updateStats();
    },
    
    checkAnswer(selectedIndex) {
        const level = levels[this.currentLevel];
        const q = level.questions[this.currentQuestion];
        const answerButtons = document.querySelectorAll('.answer-btn');
        const feedback = document.getElementById('feedback');
        
        // Disable all buttons
        answerButtons.forEach(btn => {
            btn.style.pointerEvents = 'none';
        });
        
        if (selectedIndex === q.correct) {
            // Correct answer
            answerButtons[selectedIndex].classList.add('correct');
            feedback.textContent = this.getEncouragement();
            feedback.className = 'feedback correct show';
            
            this.correctAnswers++;
            this.streak++;
            this.score += 100 + (this.streak * 10);
            
            // Damage virus
            this.virusHealth = Math.max(0, this.virusHealth - (100 / this.totalQuestions));
            
            this.playSound('correct');
        } else {
            // Wrong answer
            answerButtons[selectedIndex].classList.add('incorrect');
            answerButtons[q.correct].classList.add('correct');
            feedback.innerHTML = `❌ ${q.explanation}`;
            feedback.className = 'feedback incorrect show';
            
            this.lives--;
            this.streak = 0;
            
            this.playSound('incorrect');
            
            if (this.lives <= 0) {
                setTimeout(() => this.gameOver(), 2000);
                return;
            }
        }
        
        this.updateStats();
        
        setTimeout(() => {
            this.currentQuestion++;
            this.loadQuestion();
        }, 2500);
    },
    
    updateStats() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('currentLevel').textContent = this.currentLevel + 1;
        document.getElementById('streak').textContent = this.streak;
        
        const heartsArray = ['❤️', '❤️', '❤️'];
        for (let i = 0; i < (3 - this.lives); i++) {
            heartsArray[i] = '🖤';
        }
        document.getElementById('lives').textContent = heartsArray.join('');
        
        const healthPercent = this.virusHealth;
        document.getElementById('virusHealth').style.width = healthPercent + '%';
    },
    
    getEncouragement() {
        const messages = [
            '✅ Perfect! You crushed that virus!',
            '✅ Excellent! The grammar is strong with you!',
            '✅ Amazing! Punctuation saved!',
            '✅ Outstanding! Keep it up!',
            '✅ Brilliant! You\'re unstoppable!',
            '✅ Fantastic! The virus doesn\'t stand a chance!',
            '✅ Superb! You\'re a grammar hero!',
            '✅ Incredible! Punctuation defender indeed!'
        ];
        return messages[Math.floor(Math.random() * messages.length)];
    },
    
    levelComplete() {
        const accuracy = Math.round((this.correctAnswers / this.totalQuestions) * 100);
        let stars = 0;
        
        if (accuracy >= 90) stars = 3;
        else if (accuracy >= 75) stars = 2;
        else if (accuracy >= 60) stars = 1;
        
        // Save progress
        const progress = this.loadProgress();
        if (!progress[this.currentLevel] || progress[this.currentLevel].stars < stars) {
            progress[this.currentLevel] = {
                completed: true,
                stars: stars,
                score: this.score
            };
            this.saveProgress(progress);
        }
        
        // Show victory screen
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('accuracy').textContent = accuracy;
        
        let starDisplay = '';
        for (let i = 0; i < stars; i++) {
            starDisplay += '⭐';
        }
        document.getElementById('starDisplay').textContent = starDisplay;
        
        const badgeEarned = document.getElementById('badgeEarned');
        if (stars === 3) {
            badgeEarned.innerHTML = '<div class="badge-earned">🏆 Perfect Score Badge Earned!</div>';
        } else {
            badgeEarned.innerHTML = '';
        }
        
        this.showVictory();
    },
    
    gameOver() {
        document.getElementById('gameOverScore').textContent = this.score;
        this.showGameOver();
    },
    
    nextLevel() {
        if (this.currentLevel < levels.length - 1) {
            this.startLevel(this.currentLevel + 1);
        } else {
            alert('🎉 Congratulations! You\'ve completed all missions and saved the internet!');
            this.showLevelSelect();
        }
    },
    
    retryLevel() {
        this.startLevel(this.currentLevel);
    },
    
    // Level Grid Rendering
    renderLevelGrid() {
        const grid = document.getElementById('levelGrid');
        grid.innerHTML = '';
        
        const progress = this.loadProgress();
        
        levels.forEach((level, index) => {
            const card = document.createElement('div');
            card.className = 'level-card';
            
            const isUnlocked = this.isLevelUnlocked(index);
            const isCompleted = progress[index] && progress[index].completed;
            
            if (isCompleted) {
                card.classList.add('completed');
            } else if (!isUnlocked) {
                card.classList.add('locked');
            }
            
            card.innerHTML = `
                <div class="level-number">${index + 1}</div>
                <div class="level-name">${level.name}</div>
                <div class="level-stars">${this.getStarsDisplay(index)}</div>
            `;
            
            if (isUnlocked) {
                card.onclick = () => this.startLevel(index);
            }
            
            grid.appendChild(card);
        });
    },
    
    getStarsDisplay(levelIndex) {
        const progress = this.loadProgress();
        if (!progress[levelIndex]) return '🔒';
        
        const stars = progress[levelIndex].stars || 0;
        return '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
    },
    
    isLevelUnlocked(levelIndex) {
        if (levelIndex === 0) return true;
        const progress = this.loadProgress();
        return progress[levelIndex - 1] && progress[levelIndex - 1].completed;
    },
    
    updateOverallProgress() {
        const progress = this.loadProgress();
        let completed = 0;
        
        for (let i = 0; i < levels.length; i++) {
            if (progress[i] && progress[i].completed) {
                completed++;
            }
        }
        
        const percent = Math.round((completed / levels.length) * 100);
        document.getElementById('progressPercent').textContent = percent;
        document.getElementById('overallProgress').style.width = percent + '%';
    },
    
    // Progress Management
    loadProgress() {
        const saved = localStorage.getItem('punctuationDefenderProgress');
        return saved ? JSON.parse(saved) : {};
    },
    
    saveProgress(progress) {
        localStorage.setItem('punctuationDefenderProgress', JSON.stringify(progress));
    },
    
    resetProgress() {
        if (confirm('Are you sure you want to reset all progress?')) {
            localStorage.removeItem('punctuationDefenderProgress');
            this.showLevelSelect();
        }
    },
    
    // Sound Effects (simple)
    playSound(type) {
        // Simple audio feedback using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        if (type === 'correct') {
            oscillator.frequency.value = 523.25; // C5
            gainNode.gain.value = 0.1;
            oscillator.start();
            setTimeout(() => {
                oscillator.frequency.value = 659.25; // E5
            }, 50);
            oscillator.stop(audioContext.currentTime + 0.15);
        } else {
            oscillator.frequency.value = 200;
            gainNode.gain.value = 0.1;
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.2);
        }
    }
};

// Level Data - All 15 Lessons
const levels = [
    {
        name: 'Periods & Capitals',
        explanation: `
            <strong>Mission Briefing:</strong>
            <p>Every sentence needs to start with a capital letter and end with a period!</p>
            <div class="example">
                <div class="correct">✓ The dog barked loudly.</div>
                <div class="incorrect">✗ the dog barked loudly</div>
            </div>
            <p>The period (.) tells readers to stop and take a breath. It's like a stop sign for sentences!</p>
        `,
        questions: [
            {
                question: 'Which sentence is written correctly?',
                answers: [
                    'the cat sat on the mat',
                    'The cat sat on the mat.',
                    'The cat sat on the mat',
                    'the cat sat on the mat.'
                ],
                correct: 1,
                explanation: 'Correct! Sentences start with capitals and end with periods.'
            },
            {
                question: 'What\'s wrong with this sentence: "my friend loves pizza"',
                answers: [
                    'Nothing - it\'s perfect!',
                    'It needs a capital M and a period at the end',
                    'It only needs a period',
                    'It only needs a capital M'
                ],
                correct: 1,
                explanation: 'Right! It needs both a capital letter at the start AND a period at the end.'
            },
            {
                question: 'Fix this sentence: "we went to the park"',
                answers: [
                    'We went to the park.',
                    'we went to the park.',
                    'We went to the park',
                    'we Went to the park.'
                ],
                correct: 0,
                explanation: 'Perfect! Capital W at the start, period at the end.'
            },
            {
                question: 'Which one is correct?',
                answers: [
                    'Summer is my favorite season',
                    'summer is my favorite season.',
                    'Summer is my favorite season.',
                    'summer is my Favorite season.'
                ],
                correct: 2,
                explanation: 'Excellent! Capital S starts the sentence, period ends it.'
            },
            {
                question: 'Choose the correctly written sentence:',
                answers: [
                    'The movie starts at seven',
                    'the movie starts at seven.',
                    'The movie starts at seven.',
                    'the Movie starts at seven'
                ],
                correct: 2,
                explanation: 'Great job! You\'re mastering periods and capitals!'
            }
        ]
    },
    {
        name: 'Question Marks',
        explanation: `
            <strong>Mission Briefing:</strong>
            <p>When you ask a question, you need a question mark (?) at the end!</p>
            <div class="example">
                <div class="correct">✓ Where is my backpack?</div>
                <div class="incorrect">✗ Where is my backpack.</div>
            </div>
            <p>Question marks show that you're asking something. They make your voice go up at the end!</p>
        `,
        questions: [
            {
                question: 'Which sentence needs a question mark?',
                answers: [
                    'I love reading books',
                    'What time is lunch',
                    'The sky is blue',
                    'My name is Sarah'
                ],
                correct: 1,
                explanation: 'Yes! "What time is lunch?" is asking a question.'
            },
            {
                question: 'Is this correct? "Can you help me."',
                answers: [
                    'Yes, it\'s perfect',
                    'No, it needs a question mark instead of a period',
                    'No, it needs an exclamation point',
                    'Yes, but only sometimes'
                ],
                correct: 1,
                explanation: 'Correct! Questions need question marks, not periods.'
            },
            {
                question: 'Which is written correctly?',
                answers: [
                    'How are you.',
                    'How are you?',
                    'How are you!',
                    'how are you?'
                ],
                correct: 1,
                explanation: 'Perfect! Questions start with capitals and end with question marks.'
            },
            {
                question: 'Fix this sentence: "Where did you go yesterday."',
                answers: [
                    'Where did you go yesterday?',
                    'Where did you go yesterday!',
                    'where did you go yesterday?',
                    'It\'s already correct'
                ],
                correct: 0,
                explanation: 'Great! It\'s asking a question, so it needs a question mark.'
            },
            {
                question: 'Which sentence is asking a question?',
                answers: [
                    'I wonder if it will rain.',
                    'Did you finish your homework?',
                    'Please close the door.',
                    'What a beautiful day!'
                ],
                correct: 1,
                explanation: 'Excellent! "Did you finish your homework?" is directly asking.'
            }
        ]
    },
    {
        name: 'Exclamation Points',
        explanation: `
            <strong>Mission Briefing:</strong>
            <p>Exclamation points (!) show strong feelings like excitement, surprise, or urgency!</p>
            <div class="example">
                <div class="correct">✓ Watch out!</div>
                <div class="correct">✓ That's amazing!</div>
                <div class="incorrect">✗ I like pizza! (too much excitement for a simple statement)</div>
            </div>
            <p>Use them when you really mean it - not for every sentence!</p>
        `,
        questions: [
            {
                question: 'Which sentence BEST uses an exclamation point?',
                answers: [
                    'I ate breakfast!',
                    'Look out for that car!',
                    'The book is on the table!',
                    'My favorite color is blue!'
                ],
                correct: 1,
                explanation: 'Yes! This is urgent and needs strong emotion.'
            },
            {
                question: 'Is this correct? "I can\'t believe we won the game!"',
                answers: [
                    'Yes - this shows excitement',
                    'No - it should be a period',
                    'No - it should be a question mark',
                    'It could be any punctuation'
                ],
                correct: 0,
                explanation: 'Right! Winning is exciting and deserves an exclamation point!'
            },
            {
                question: 'Which sentence should NOT have an exclamation point?',
                answers: [
                    'Happy birthday!',
                    'That was incredible!',
                    'The store opens at nine.',
                    'Congratulations on your award!'
                ],
                correct: 2,
                explanation: 'Correct! Regular information doesn\'t need exclamation points.'
            },
            {
                question: 'Choose the sentence with correct punctuation:',
                answers: [
                    'What an awesome surprise.',
                    'What an awesome surprise?',
                    'What an awesome surprise!',
                    'what an awesome surprise!'
                ],
                correct: 2,
                explanation: 'Perfect! This shows excitement with proper capitalization too!'
            },
            {
                question: 'Which is the BEST punctuation? "Help me carry these heavy boxes___"',
                answers: [
                    '.',
                    '?',
                    '!',
                    'No punctuation needed'
                ],
                correct: 2,
                explanation: 'Great! This is an urgent request that needs emphasis!'
            }
        ]
    },
    {
        name: 'Commas in Lists',
        explanation: `
            <strong>Mission Briefing:</strong>
            <p>When you list three or more things, use commas (,) to separate them!</p>
            <div class="example">
                <div class="correct">✓ I bought apples, bananas, and oranges.</div>
                <div class="incorrect">✗ I bought apples bananas and oranges.</div>
            </div>
            <p>The comma before "and" is called the Oxford comma. It helps make your list clear!</p>
        `,
        questions: [
            {
                question: 'Which sentence uses commas correctly in a list?',
                answers: [
                    'I like pizza tacos and burgers.',
                    'I like pizza, tacos, and burgers.',
                    'I like, pizza tacos and burgers.',
                    'I like pizza tacos, and burgers.'
                ],
                correct: 1,
                explanation: 'Perfect! Each item in the list is separated by commas.'
            },
            {
                question: 'Fix this sentence: "My favorite colors are red blue and green."',
                answers: [
                    'My favorite colors are red, blue and green.',
                    'My favorite colors are red blue, and green.',
                    'My favorite colors are red, blue, and green.',
                    'It\'s already correct'
                ],
                correct: 2,
                explanation: 'Great! Commas after red and blue make the list clear.'
            },
            {
                question: 'How many commas does this list need? "We visited Paris London Rome and Madrid."',
                answers: [
                    'No commas needed',
                    'One comma',
                    'Two commas',
                    'Three commas'
                ],
                correct: 3,
                explanation: 'Right! Paris, London, Rome, and Madrid - three commas!'
            },
            {
                question: 'Which is correct?',
                answers: [
                    'She plays soccer basketball and tennis.',
                    'She plays, soccer, basketball, and tennis.',
                    'She plays soccer, basketball, and tennis.',
                    'She plays soccer basketball, and tennis.'
                ],
                correct: 2,
                explanation: 'Excellent! Commas separate each sport in the list.'
            },
            {
                question: 'Do you need commas here? "I have a dog and a cat."',
                answers: [
                    'Yes - I have a dog, and a cat.',
                    'No - only two items don\'t need commas',
                    'Yes - I have, a dog, and a cat.',
                    'Sometimes'
                ],
                correct: 1,
                explanation: 'Correct! Lists of only two items don\'t need commas before "and"!'
            }
        ]
    },
    {
        name: 'Commas in Compound Sentences',
        explanation: `
            <strong>Mission Briefing:</strong>
            <p>When you join two complete sentences with words like "and," "but," or "so," put a comma before those words!</p>
            <div class="example">
                <div class="correct">✓ I studied hard, and I passed the test.</div>
                <div class="incorrect">✗ I studied hard and I passed the test.</div>
            </div>
            <p>Think of it as giving readers a quick pause before the second part!</p>
        `,
        questions: [
            {
                question: 'Where does the comma go? "I wanted to play outside but it started raining."',
                answers: [
                    'I wanted to play outside, but it started raining.',
                    'I wanted to play, outside but it started raining.',
                    'I wanted to, play outside but it started raining.',
                    'No comma needed'
                ],
                correct: 0,
                explanation: 'Perfect! Comma goes before "but" when joining two sentences.'
            },
            {
                question: 'Which sentence is punctuated correctly?',
                answers: [
                    'She finished her homework and she went to bed.',
                    'She finished her homework, and she went to bed.',
                    'She finished, her homework and she went to bed.',
                    'She finished her homework and, she went to bed.'
                ],
                correct: 1,
                explanation: 'Great! The comma goes before "and" between two complete thoughts.'
            },
            {
                question: 'Does this need a comma? "The sun was shining so we went to the beach."',
                answers: [
                    'No comma needed',
                    'Yes - after "sun"',
                    'Yes - before "so"',
                    'Yes - after "beach"'
                ],
                correct: 2,
                explanation: 'Correct! "The sun was shining, so we went to the beach."'
            },
            {
                question: 'Which is correct?',
                answers: [
                    'I called my friend but she didn\'t answer.',
                    'I called my friend, but she didn\'t answer.',
                    'I called, my friend but she didn\'t answer.',
                    'I called my friend but, she didn\'t answer.'
                ],
                correct: 1,
                explanation: 'Yes! Comma before "but" when connecting two sentences.'
            },
            {
                question: 'Fix this: "The game was exciting yet we lost by one point."',
                answers: [
                    'The game was exciting, yet we lost by one point.',
                    'The game was, exciting yet we lost by one point.',
                    'The game was exciting yet, we lost by one point.',
                    'It\'s already correct'
                ],
                correct: 0,
                explanation: 'Excellent! "Yet" is joining two sentences, so it needs a comma before it.'
            }
        ]
    },
    {
        name: 'Apostrophes in Contractions',
        explanation: `
            <strong>Mission Briefing:</strong>
            <p>A contraction combines two words by removing some letters. An apostrophe (') shows where letters are missing!</p>
            <div class="example">
                <div class="correct">✓ do not → don't</div>
                <div class="correct">✓ I am → I'm</div>
                <div class="correct">✓ they are → they're</div>
                <div class="incorrect">✗ dont (missing apostrophe!)</div>
            </div>
            <p>The apostrophe is like a placeholder for the missing letters!</p>
        `,
        questions: [
            {
                question: 'What\'s the correct contraction for "can not"?',
                answers: [
                    'ca\'nt',
                    'cant',
                    'can\'t',
                    'cann\'t'
                ],
                correct: 2,
                explanation: 'Perfect! "Can\'t" - the apostrophe replaces the "no" in "not".'
            },
            {
                question: 'Which contraction is spelled correctly?',
                answers: [
                    'were\'nt',
                    'weren\'t',
                    'werent',
                    'wer\'ent'
                ],
                correct: 1,
                explanation: 'Great! "Weren\'t" is the correct way to write "were not".'
            },
            {
                question: 'How do you write "she will" as a contraction?',
                answers: [
                    'shel\'l',
                    'she\'l',
                    'she\'ll',
                    'shell'
                ],
                correct: 2,
                explanation: 'Correct! "She\'ll" - the apostrophe replaces "wi" from "will".'
            },
            {
                question: 'What\'s wrong with this? "Im going to the store."',
                answers: [
                    'Nothing - it\'s perfect',
                    'It needs an apostrophe: I\'m',
                    'It should be "I am" - no contractions allowed',
                    'It needs a comma'
                ],
                correct: 1,
                explanation: 'Yes! "I\'m" needs an apostrophe between the I and m.'
            },
            {
                question: 'Which sentence uses contractions correctly?',
                answers: [
                    'They\'re going to bring they\'re lunch.',
                    'Theyre going to bring their lunch.',
                    'They\'re going to bring their lunch.',
                    'Their going to bring they\'re lunch.'
                ],
                correct: 2,
                explanation: 'Excellent! "They\'re" = they are. "Their" shows possession.'
            }
        ]
    },
    {
        name: 'Apostrophes for Possession',
        explanation: `
            <strong>Mission Briefing:</strong>
            <p>Use an apostrophe + s ('s) to show that something belongs to someone!</p>
            <div class="example">
                <div class="correct">✓ The dog's bone (the bone belongs to the dog)</div>
                <div class="correct">✓ Sarah's backpack (the backpack belongs to Sarah)</div>
                <div class="incorrect">✗ The dogs bone (whose bone is it?)</div>
            </div>
            <p>For plural words ending in s, just add the apostrophe: the dogs' park</p>
        `,
        questions: [
            {
                question: 'Which is correct?',
                answers: [
                    'The cats toy',
                    'The cat\'s toy',
                    'The cats\' toy',
                    'The cat toy'
                ],
                correct: 1,
                explanation: 'Perfect! One cat owns the toy, so it\'s "cat\'s".'
            },
            {
                question: 'How do you show that a book belongs to James?',
                answers: [
                    'James book',
                    'James\' book',
                    'James\'s book',
                    'Both B and C are correct'
                ],
                correct: 3,
                explanation: 'Great! Both "James\'" and "James\'s" are acceptable for names ending in s.'
            },
            {
                question: 'Fix this: "The teachers desk was covered in papers."',
                answers: [
                    'The teacher\'s desk was covered in papers.',
                    'The teachers\' desk was covered in papers.',
                    'The teachers desk\' was covered in papers.',
                    'It\'s already correct'
                ],
                correct: 0,
                explanation: 'Right! One teacher\'s desk needs an apostrophe before the s.'
            },
            {
                question: 'Which shows that multiple students own laptops?',
                answers: [
                    'The student\'s laptops',
                    'The students laptops',
                    'The students\' laptops',
                    'The students\'\' laptops'
                ],
                correct: 2,
                explanation: 'Excellent! Plural students already ends in s, so apostrophe goes after!'
            },
            {
                question: 'What\'s the difference? "The girl\'s bags" vs "The girls\' bags"',
                answers: [
                    'They mean the same thing',
                    'First = one girl; Second = multiple girls',
                    'First = multiple girls; Second = one girl',
                    'Neither is correct'
                ],
                correct: 1,
                explanation: 'Perfect! Apostrophe before s = one owner. After s = multiple owners!'
            }
        ]
    },
    {
        name: 'Quotation Marks in Dialogue',
        explanation: `
            <strong>Mission Briefing:</strong>
            <p>Quotation marks (" ") show the exact words someone said. They go around the spoken words!</p>
            <div class="example">
                <div class="correct">✓ "I love this game," said Maria.</div>
                <div class="correct">✓ Alex asked, "Can you help me?"</div>
                <div class="incorrect">✗ I love this game, said Maria.</div>
            </div>
            <p>Put punctuation inside the quotation marks at the end!</p>
        `,
        questions: [
            {
                question: 'Which uses quotation marks correctly?',
                answers: [
                    'The teacher said, "Open your books."',
                    'The teacher said, Open your books.',
                    'The teacher "said," Open your books.',
                    'The teacher said, "Open your books".'
                ],
                correct: 0,
                explanation: 'Perfect! The spoken words go inside quotation marks, period goes inside too!'
            },
            {
                question: 'Fix this dialogue: She whispered I have a secret.',
                answers: [
                    'She whispered, "I have a secret."',
                    'She "whispered" I have a secret.',
                    'She whispered I have a secret".',
                    'She whispered "I have a secret"'
                ],
                correct: 0,
                explanation: 'Great! Comma before the quote, quotes around the spoken words!'
            },
            {
                question: 'Where should the comma go? "Let\'s go to the park"___ suggested Tom.',
                answers: [
                    'After "park" inside the quotes',
                    'After "park" outside the quotes',
                    'Before the word "Let\'s"',
                    'No comma needed'
                ],
                correct: 0,
                explanation: 'Yes! "Let\'s go to the park," suggested Tom. - comma goes inside!'
            },
            {
                question: 'Which is correct?',
                answers: [
                    '"Do you want pizza?" asked Sam',
                    '"Do you want pizza? asked Sam"',
                    '"Do you want pizza" asked Sam?',
                    '"Do you want pizza?" asked Sam.'
                ],
                correct: 3,
                explanation: 'Correct! Question mark inside quotes, period after "Sam"!'
            },
            {
                question: 'How do you write this? Mom said that it\'s time for dinner.',
                answers: [
                    'Mom said, "It\'s time for dinner."',
                    'Mom "said that it\'s time for dinner."',
                    'Mom said that "it\'s time for dinner."',
                    'No quotes needed - it\'s not exact words'
                ],
                correct: 0,
                explanation: 'Perfect! When you show exact words, use quotation marks!'
            }
        ]
    },
    {
        name: 'Colons in Lists',
        explanation: `
            <strong>Mission Briefing:</strong>
            <p>A colon (:) introduces a list or explanation. It comes after a complete sentence!</p>
            <div class="example">
                <div class="correct">✓ I need three things: pencils, paper, and erasers.</div>
                <div class="correct">✓ Remember this: practice makes perfect.</div>
                <div class="incorrect">✗ I need: pencils, paper, and erasers. (incomplete sentence before colon)</div>
            </div>
            <p>Think of the colon as an arrow pointing to what comes next!</p>
        `,
        questions: [
            {
                question: 'Which sentence uses a colon correctly?',
                answers: [
                    'My favorite fruits are: apples, oranges, and grapes.',
                    'I have three favorite fruits: apples, oranges, and grapes.',
                    'My favorite: fruits are apples, oranges, and grapes.',
                    'My favorite fruits are apples: oranges, and grapes.'
                ],
                correct: 1,
                explanation: 'Perfect! Complete sentence before the colon, then the list!'
            },
            {
                question: 'Does this need a colon? "She needed milk eggs and bread from the store."',
                answers: [
                    'Yes - after "needed"',
                    'Yes - after "store"',
                    'No - the sentence is complete',
                    'Yes - but needs commas too'
                ],
                correct: 2,
                explanation: 'Right! No complete sentence before the list, so no colon needed here.'
            },
            {
                question: 'Fix this sentence: "Pack these items a sleeping bag, a flashlight, and snacks."',
                answers: [
                    'Pack these items: a sleeping bag, a flashlight, and snacks.',
                    'Pack: these items a sleeping bag, a flashlight, and snacks.',
                    'Pack these items a sleeping bag: a flashlight, and snacks.',
                    'It\'s already correct'
                ],
                correct: 0,
                explanation: 'Great! "Pack these items" is complete, so add a colon before the list!'
            },
            {
                question: 'Which uses a colon correctly?',
                answers: [
                    'The recipe needs: flour, sugar, and butter.',
                    'The recipe needs flour: sugar, and butter.',
                    'For the recipe, you need: flour, sugar, and butter.',
                    'You need these ingredients: flour, sugar, and butter.'
                ],
                correct: 3,
                explanation: 'Excellent! "You need these ingredients" is a complete thought!'
            },
            {
                question: 'When should you NOT use a colon?',
                answers: [
                    'Before a list of three items',
                    'After an incomplete sentence',
                    'To introduce an explanation',
                    'After a complete sentence'
                ],
                correct: 1,
                explanation: 'Yes! The sentence before the colon must be complete!'
            }
        ]
    },
    {
        name: 'Semicolons',
        explanation: `
            <strong>Mission Briefing:</strong>
            <p>A semicolon (;) connects two related complete sentences that could stand alone!</p>
            <div class="example">
                <div class="correct">✓ I finished my homework; then I played video games.</div>
                <div class="correct">✓ The rain stopped; the sun came out.</div>
                <div class="incorrect">✗ I finished my homework; and played games. (second part isn't complete)</div>
            </div>
            <p>It's stronger than a comma but not as final as a period!</p>
        `,
        questions: [
            {
                question: 'Which sentence uses a semicolon correctly?',
                answers: [
                    'I woke up early; and ate breakfast.',
                    'I woke up early; I ate breakfast.',
                    'I woke up early; because I was hungry.',
                    'I woke up; early and ate breakfast.'
                ],
                correct: 1,
                explanation: 'Perfect! Both parts are complete sentences that are related!'
            },
            {
                question: 'Can you use a semicolon here? "The movie was long it lasted three hours."',
                answers: [
                    'No - needs a comma',
                    'No - needs a period',
                    'Yes - The movie was long; it lasted three hours.',
                    'Yes - but only with "and"'
                ],
                correct: 2,
                explanation: 'Great! Both parts are complete and closely related!'
            },
            {
                question: 'Which is INCORRECT?',
                answers: [
                    'She loves reading; her favorite genre is mystery.',
                    'The test was hard; everyone studied well.',
                    'He ran fast; winning the race.',
                    'It\'s cold outside; I\'ll wear a jacket.'
                ],
                correct: 2,
                explanation: 'Right! "Winning the race" isn\'t a complete sentence.'
            },
            {
                question: 'Could you replace the semicolon with a period? "I practice daily; my skills improve."',
                answers: [
                    'No - semicolons are required',
                    'Yes - both parts are complete sentences',
                    'No - it would be grammatically wrong',
                    'Only if you add "and"'
                ],
                correct: 1,
                explanation: 'Correct! Semicolons join related sentences, but periods work too!'
            },
            {
                question: 'Which sentence needs a semicolon?',
                answers: [
                    'I like pizza and pasta.',
                    'When it rains, I stay inside.',
                    'The concert was amazing we had great seats.',
                    'Because I studied hard, I passed.'
                ],
                correct: 2,
                explanation: 'Yes! "The concert was amazing; we had great seats." - two complete thoughts!'
            }
        ]
    },
    {
        name: 'Parentheses',
        explanation: `
            <strong>Mission Briefing:</strong>
            <p>Parentheses ( ) add extra information that isn't essential to the sentence!</p>
            <div class="example">
                <div class="correct">✓ My friend (the one from summer camp) called me today.</div>
                <div class="correct">✓ The test (which was really hard) is finally over.</div>
            </div>
            <p>You could remove what's in parentheses and the sentence still makes sense!</p>
        `,
        questions: [
            {
                question: 'Which uses parentheses correctly?',
                answers: [
                    'The movie (it was about space was amazing).',
                    'The movie (it was about space) was amazing.',
                    'The (movie) it was about space was amazing.',
                    'The movie it was (about space was amazing).'
                ],
                correct: 1,
                explanation: 'Perfect! The extra info goes inside, sentence works without it!'
            },
            {
                question: 'What should go in parentheses? "My sister who is 16 just got her license."',
                answers: [
                    '(My sister)',
                    '(who is 16)',
                    '(just got her license)',
                    'Nothing needs parentheses'
                ],
                correct: 1,
                explanation: 'Great! Age is extra info. "My sister (who is 16) just got her license."'
            },
            {
                question: 'Is this correct? "I visited Chicago (my favorite city.) last summer."',
                answers: [
                    'Yes - perfect punctuation',
                    'No - period goes outside: (my favorite city).',
                    'No - period goes after summer',
                    'No - needs no period at all'
                ],
                correct: 1,
                explanation: 'Right! The period for the whole sentence goes at the end, not inside!'
            },
            {
                question: 'Which sentence DOESN\'T need parentheses?',
                answers: [
                    'My dog (a golden retriever) loves to swim.',
                    'The park (the one near my house) has a playground.',
                    'I need to study for the test tomorrow.',
                    'The recipe (from my grandma) is delicious.'
                ],
                correct: 2,
                explanation: 'Correct! This sentence has no extra information to set apart!'
            },
            {
                question: 'Fix this: "The concert see the poster was sold out."',
                answers: [
                    'The concert (see the poster) was sold out.',
                    'The (concert see the poster) was sold out.',
                    'The concert see (the poster) was sold out.',
                    'The concert see the poster (was sold out).'
                ],
                correct: 0,
                explanation: 'Yes! "See the poster" is extra info about the concert!'
            }
        ]
    },
    {
        name: 'Hyphens & Dashes',
        explanation: `
            <strong>Mission Briefing:</strong>
            <p>Hyphens (-) connect words. Dashes (—) are longer and set off information!</p>
            <div class="example">
                <div class="correct">✓ My ten-year-old sister loves reading. (hyphen)</div>
                <div class="correct">✓ I finally finished—it took forever—my project. (dashes)</div>
                <div class="correct">✓ She's a well-known author. (hyphen)</div>
            </div>
            <p>Hyphens make compound words. Dashes are like super-commas or parentheses!</p>
        `,
        questions: [
            {
                question: 'Which needs a hyphen?',
                answers: [
                    'My best friend',
                    'A twenty foot whale',
                    'The blue car',
                    'Her favorite book'
                ],
                correct: 1,
                explanation: 'Right! "Twenty-foot" works together to describe the whale!'
            },
            {
                question: 'Is this correct? "My mother in law is visiting."',
                answers: [
                    'Yes - perfect as is',
                    'No - needs: mother-in-law',
                    'No - needs: mother—in—law',
                    'No - should be one word'
                ],
                correct: 1,
                explanation: 'Great! "Mother-in-law" uses hyphens because it\'s a compound word!'
            },
            {
                question: 'Which sentence uses hyphens correctly?',
                answers: [
                    'She gave a-very-long speech.',
                    'She gave a very-long speech.',
                    'She gave a very long speech.',
                    'She gave-a-very-long speech.'
                ],
                correct: 2,
                explanation: 'Correct! "Very" is an adverb and doesn\'t need a hyphen here!'
            },
            {
                question: 'Fix this: "The up to date information is online."',
                answers: [
                    'The up-to-date information is online.',
                    'The up to-date information is online.',
                    'The up-to date information is online.',
                    'It\'s already correct'
                ],
                correct: 0,
                explanation: 'Perfect! When multiple words work as one adjective, hyphenate them!'
            },
            {
                question: 'Which needs hyphens?',
                answers: [
                    'A bright red apple',
                    'The first place winner',
                    'A well written story',
                    'The big blue house'
                ],
                correct: 2,
                explanation: 'Yes! "Well-written" needs a hyphen when it comes before the noun!'
            }
        ]
    },
    {
        name: 'Mixed Punctuation Review',
        explanation: `
            <strong>Mission Briefing:</strong>
            <p>Time to combine everything you've learned! This level tests multiple punctuation marks!</p>
            <div class="example">
                <div class="correct">✓ "Where are you going?" Sarah asked.</div>
                <div class="correct">✓ I need supplies: paper, pens, and markers.</div>
                <div class="correct">✓ My brother's car (the blue one) is parked outside.</div>
            </div>
            <p>Remember all the rules - you've got this!</p>
        `,
        questions: [
            {
                question: 'Which sentence has ALL correct punctuation?',
                answers: [
                    'My friend said "lets go to the movies".',
                    'My friend said, "Let\'s go to the movies."',
                    'My friend said, "Lets go to the movies".',
                    '"My friend said, let\'s go to the movies."'
                ],
                correct: 1,
                explanation: 'Perfect! Comma, quotation marks, capital letter, and apostrophe all correct!'
            },
            {
                question: 'Fix ALL errors: "I cant wait for summer I love swimming"',
                answers: [
                    'I can\'t wait for summer; I love swimming.',
                    'I cant wait for summer, I love swimming.',
                    'I can\'t wait for summer I love swimming.',
                    'I cant wait for summer; I love swimming.'
                ],
                correct: 0,
                explanation: 'Excellent! Needs apostrophe in "can\'t" and semicolon between sentences!'
            },
            {
                question: 'Which is completely correct?',
                answers: [
                    'The students homework (all 20 pages) is due Friday.',
                    'The student\'s homework (all 20 pages) is due Friday.',
                    'The students\' homework (all 20 pages) is due Friday.',
                    'The students homework (all 20 pages), is due Friday.'
                ],
                correct: 2,
                explanation: 'Great! Multiple students\' homework - apostrophe after the s, parentheses correct!'
            },
            {
                question: 'What punctuation is needed? "Watch out___ theres a bee___"',
                answers: [
                    '! , !',
                    '— there\'s, .',
                    '! There\'s, !',
                    ', theres .'
                ],
                correct: 2,
                explanation: 'Yes! "Watch out! There\'s a bee!" - exclamation, capital, apostrophe!'
            },
            {
                question: 'Which sentence is perfect?',
                answers: [
                    'My favorite activities are: reading, hiking and gaming.',
                    'My favorite activities are reading, hiking, and gaming.',
                    'My favorite activities are, reading hiking and gaming.',
                    'My favorite activities are reading; hiking; and gaming.'
                ],
                correct: 1,
                explanation: 'Perfect! No colon needed, commas in list are correct!'
            },
            {
                question: 'Fix this: "she asked can we leave early"',
                answers: [
                    'She asked, "Can we leave early?"',
                    'She asked "can we leave early?"',
                    '"She asked, can we leave early?"',
                    'She asked, can we leave early.'
                ],
                correct: 0,
                explanation: 'Excellent! Capital S, comma, quotes, capital C, question mark inside!'
            }
        ]
    },
    {
        name: 'Advanced Comma Usage',
        explanation: `
            <strong>Mission Briefing:</strong>
            <p>Commas have more uses! Use them after introductory words and to set off extra information!</p>
            <div class="example">
                <div class="correct">✓ After school, I went to practice. (introductory phrase)</div>
                <div class="correct">✓ My teacher, Mrs. Johnson, is really kind. (extra info)</div>
                <div class="correct">✓ Yes, I finished my homework. (introductory word)</div>
            </div>
            <p>Commas help separate ideas and make sentences clearer!</p>
        `,
        questions: [
            {
                question: 'Where does the comma go? "Before dinner I always wash my hands."',
                answers: [
                    'Before, dinner I always wash my hands.',
                    'Before dinner, I always wash my hands.',
                    'Before dinner I, always wash my hands.',
                    'No comma needed'
                ],
                correct: 1,
                explanation: 'Perfect! Comma after the introductory phrase "Before dinner"!'
            },
            {
                question: 'Which uses commas correctly?',
                answers: [
                    'My best friend Alex loves soccer.',
                    'My best friend, Alex loves soccer.',
                    'My best friend Alex, loves soccer.',
                    'My best friend, Alex, loves soccer.'
                ],
                correct: 3,
                explanation: 'Great! "Alex" is extra info, so commas go before and after!'
            },
            {
                question: 'Fix this: "However I think we should wait."',
                answers: [
                    'However, I think we should wait.',
                    'However I, think we should wait.',
                    'However I think, we should wait.',
                    'It\'s already correct'
                ],
                correct: 0,
                explanation: 'Yes! Introductory words like "However" need a comma after them!'
            },
            {
                question: 'Which sentence needs commas around the middle part?',
                answers: [
                    'The movie was very exciting.',
                    'My sister plays basketball.',
                    'The book which I just finished was amazing.',
                    'We walked to the park.'
                ],
                correct: 2,
                explanation: 'Right! "The book, which I just finished, was amazing." - extra info!'
            },
            {
                question: 'Does this need a comma? "In the morning we eat breakfast together."',
                answers: [
                    'No comma needed',
                    'Yes - after "In"',
                    'Yes - after "morning"',
                    'Yes - after "breakfast"'
                ],
                correct: 2,
                explanation: 'Correct! "In the morning," is an introductory phrase!'
            }
        ]
    },
    {
        name: 'FINAL BOSS - Master Challenge',
        explanation: `
            <strong>FINAL MISSION BRIEFING:</strong>
            <p>This is it! The Grammar Glitch virus is at full power!</p>
            <p>You'll face questions testing EVERYTHING you've learned:</p>
            <ul style="text-align: left; margin: 15px auto; max-width: 500px;">
                <li>Periods, question marks, exclamation points</li>
                <li>Commas in all their forms</li>
                <li>Apostrophes for contractions and possession</li>
                <li>Quotation marks, colons, semicolons</li>
                <li>Parentheses, hyphens, and more!</li>
            </ul>
            <p>Defeat this final challenge and save the internet! 💪</p>
        `,
        questions: [
            {
                question: 'Which sentence is 100% correct?',
                answers: [
                    'My teacher said, "Don\'t forget your homework."',
                    'My teacher said "Dont forget your homework".',
                    'My teacher said, "Dont forget your homework".',
                    'My teacher said "Don\'t forget your homework".'
                ],
                correct: 0,
                explanation: 'Perfect! Comma, quotes, capital, apostrophe, and period all correct!'
            },
            {
                question: 'Fix ALL punctuation: "I need these items a notebook pens and a calculator"',
                answers: [
                    'I need these items: a notebook, pens, and a calculator.',
                    'I need these items a notebook, pens, and a calculator.',
                    'I need these items; a notebook, pens, and a calculator.',
                    'I need these items, a notebook pens and a calculator.'
                ],
                correct: 0,
                explanation: 'Excellent! Colon after complete sentence, commas in the list!'
            },
            {
                question: 'Which has perfect punctuation?',
                answers: [
                    'The girls\' bikes were parked outside their ready to ride.',
                    'The girl\'s bikes were parked outside; they\'re ready to ride.',
                    'The girls\' bikes were parked outside; they\'re ready to ride.',
                    'The girls bikes were parked outside, their ready to ride.'
                ],
                correct: 2,
                explanation: 'Amazing! Plural possession, semicolon, and correct "they\'re"!'
            },
            {
                question: 'What\'s wrong with: "Yes I think, its a great idea"?',
                answers: [
                    'Nothing - it\'s perfect',
                    'Needs comma after Yes, apostrophe in it\'s, exclamation point',
                    'Needs comma after Yes, change to "it\'s," period at end',
                    'Just needs a period at the end'
                ],
                correct: 2,
                explanation: 'Brilliant! "Yes, I think it\'s a great idea." - all fixed!'
            },
            {
                question: 'Which sentence uses ALL punctuation correctly?',
                answers: [
                    'My friends: Jake, Emma and Luis, are coming over.',
                    'My friends (Jake, Emma, and Luis) are coming over.',
                    'My friends; Jake, Emma and Luis are coming over.',
                    'My friends Jake, Emma, and Luis are coming over.'
                ],
                correct: 1,
                explanation: 'Perfect! Parentheses for the list of names, commas inside!'
            },
            {
                question: 'Fix this complex sentence: "After lunch we studied math however we didnt finish"',
                answers: [
                    'After lunch, we studied math; however, we didn\'t finish.',
                    'After lunch we studied math, however we didn\'t finish.',
                    'After lunch, we studied math however, we didnt finish.',
                    'After lunch we studied math; however we didn\'t finish.'
                ],
                correct: 0,
                explanation: 'Outstanding! Comma after intro, semicolon, comma after however, apostrophe!'
            },
            {
                question: 'Which is completely correct?',
                answers: [
                    'The well known author whose 45 years old, is giving a speech.',
                    'The well-known author (who\'s 45 years old) is giving a speech.',
                    'The well known author (whose 45 years old) is giving a speech.',
                    'The well-known author whose 45 years old is giving a speech.'
                ],
                correct: 1,
                explanation: 'Incredible! Hyphen, parentheses, apostrophe in "who\'s" - all perfect!'
            },
            {
                question: 'Ultimate challenge! Fix EVERYTHING: "she asked do you have my book its blue"',
                answers: [
                    'She asked, "Do you have my book? It\'s blue."',
                    'She asked "Do you have my book? Its blue".',
                    'She asked, "Do you have my book its blue?"',
                    '"She asked, Do you have my book? It\'s blue."'
                ],
                correct: 0,
                explanation: 'LEGENDARY! Capital, comma, quotes, capitals inside, question mark, apostrophe!'
            },
            {
                question: 'Which advanced sentence is flawless?',
                answers: [
                    'My sister who\'s really smart said, "I\'ll help you study."',
                    'My sister, who\'s really smart, said "I\'ll help you study."',
                    'My sister, who\'s really smart, said, "I\'ll help you study."',
                    'My sister who\'s really smart, said, "I\'ll help you study".'
                ],
                correct: 2,
                explanation: 'MASTERFUL! Commas around extra info, comma before quote, all apostrophes!'
            },
            {
                question: 'Final question! Which is absolutely perfect?',
                answers: [
                    'Remember this: you\'re capable, you\'re strong, and you\'re ready.',
                    'Remember this; you\'re capable you\'re strong and you\'re ready.',
                    'Remember this you\'re capable, you\'re strong and you\'re ready.',
                    'Remember this: your capable, your strong, and your ready.'
                ],
                correct: 0,
                explanation: '🎉 VICTORY! Colon, apostrophes, commas in list - YOU DID IT! You\'re a true Punctuation Defender!'
            }
        ]
    }
];

// Initialize game on load
window.addEventListener('DOMContentLoaded', () => {
    game.init();
});
