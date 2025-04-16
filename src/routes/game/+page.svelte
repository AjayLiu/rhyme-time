<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  // Define the Rhyme type
  type Rhyme = {
    word: string;
    numSyllables: number;
    tags: string[];
  };

  interface Synonym {
    word: string;
    tags: string[];
  }

  interface Round {
    targetWord: string;
    rhymes: Rhyme[];
    foundRhymes: Set<string>;
    score: number;
    combo: number;
    longestStreak: number;
    highestScoringRhyme: { word: string; points: number };
  }

  // Game state
  let inputWord = "";
  let rounds: Round[] = [];
  let currentRound: Round | null = null;
  let currentRoundIndex = 0;

  let targetWord = rounds[currentRoundIndex]?.targetWord || "";
  let rhymes = rounds[currentRoundIndex]?.rhymes || [];
  let topSynonym: Synonym | null = null;
  let foundRhymes = new Set();
  let score = 0;
  let combo = 0;
  let loading = false;
  let loadingSynonyms = false;
  let error: string | null = null;
  let gameStarted = false;
  let gameOver = false;

  // Stats tracking
  let longestStreak = 0;
  let highestScoringRhyme = { word: "", points: 0 };

  // Timer variables
  let timeLeft = 60; // 1 minute in seconds
  let timerInterval: NodeJS.Timeout | undefined = undefined;
  let timeDisplay = formatTime(timeLeft);

  // Game configuration
  const TIME_BONUS_PER_RHYME = 1; // seconds added per rhyme
  const TIME_PENALTY_FOR_SWITCH = 10; // seconds deducted for switching words
  const COMBO_THRESHOLD = 3; // consecutive rhymes needed for combo bonus to start

  // Format seconds into MM:SS
  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  }

  // Start the game timer
  function startTimer() {
    timerInterval = setInterval(() => {
      timeLeft -= 1;
      timeDisplay = formatTime(timeLeft);

      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  // Add time to the timer
  function addTime(seconds: number) {
    timeLeft += seconds;
    timeDisplay = formatTime(timeLeft);
  }

  // End the game
  function endGame() {
    clearInterval(timerInterval);
    gameOver = true;
    timeLeft = 0;
    timeDisplay = formatTime(timeLeft);
  }

  // Reset the game
  function resetGame() {
    targetWord = "";
    inputWord = "";
    rhymes = [];
    topSynonym = null;
    foundRhymes = new Set();
    score = 0;
    combo = 0;
    longestStreak = 0;
    highestScoringRhyme = { word: "", points: 0 };
    timeLeft = 60;
    timeDisplay = formatTime(timeLeft);
    gameStarted = false;
    gameOver = false;
    error = null;
    clearInterval(timerInterval);
  }

  // Calculate the combo multiplier
  function getComboMultiplier() {
    if (combo < COMBO_THRESHOLD) return 1;
    return 1 + Math.floor((combo - COMBO_THRESHOLD + 1) / 2) * 0.5;
  }

  // Calculate points for a rhyme based on syllables and frequency
  function calculatePoints(rhyme: Rhyme | undefined) {
    if (!rhyme) return 0;

    // Extract frequency from tags (format "f:7.308138")
    const freqTag = rhyme.tags.find((tag) => tag.startsWith("f:"));
    let frequency = 0;
    if (freqTag) {
      frequency = parseFloat(freqTag.substring(2));
    }

    // Base points: More syllables = more points
    let points = rhyme.numSyllables * 5;

    // Frequency bonus: Rarer words (lower frequency) get more points
    if (frequency > 0) {
      const frequencyBonus = Math.max(0, 10 - Math.min(10, frequency));
      points += Math.round(frequencyBonus * 2);
    }

    // Apply combo multiplier
    const multiplier = getComboMultiplier();
    const finalPoints = Math.round(points * multiplier);

    return Math.max(1, finalPoints);
  }

  // Fetch rhymes from Datamuse API
  async function fetchRhymes(targetWord: string | null = null) {
    if (targetWord === null) return;

    if (!targetWord.trim()) {
      error = "Please enter a word to start the game";
      return;
    }

    error = null;
    loading = true;

    try {
      const response = await fetch(
        `https://api.datamuse.com/words?rel_rhy=${encodeURIComponent(targetWord.trim())}&max=300&md=f`
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      if (data.length === 0) {
        error = `No rhymes found for "${targetWord}". Try another word!`;
        return;
      }

      // Filter and process rhymes
      rhymes = data.filter(
        (rhyme: Rhyme) =>
          rhyme.word &&
          rhyme.numSyllables &&
          Array.isArray(rhyme.tags) &&
          rhyme.tags.some((tag) => tag.startsWith("f:"))
      );

      // Sort rhymes by syllables (descending) then alphabetically
      rhymes.sort((a, b) => {
        if (b.numSyllables !== a.numSyllables) {
          return b.numSyllables - a.numSyllables;
        }
        return a.word.localeCompare(b.word);
      });

      // If this is the first time, start the game
      if (!gameStarted) {
        gameStarted = true;
        startTimer();

        // Also fetch synonyms for the starting word
        fetchTopSynonym(targetWord);
      }
    } catch (err: any) {
      error = `Error fetching rhymes: ${err.message}`;
      rhymes = [];
    } finally {
      loading = false;
    }
  }

  // Fetch top synonym from Datamuse API
  async function fetchTopSynonym(targetWord: string | null = null) {
    let wordToFetch = targetWord || "";
    if (!gameStarted) {
      wordToFetch = inputWord;
    }

    if (!wordToFetch.trim()) return;

    loadingSynonyms = true;
    topSynonym = null;

    try {
      const response = await fetch(
        `https://api.datamuse.com/words?rel_syn=${encodeURIComponent(wordToFetch.trim())}&max=10&md=f`
      );

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      // Find the first valid synonym
      topSynonym =
        data.find(
          (syn: Synonym) =>
            syn.word &&
            syn.word !== wordToFetch &&
            Array.isArray(syn.tags) &&
            syn.tags.some((tag) => tag.startsWith("f:"))
        ) || null;
    } catch (err) {
      console.error("Error fetching synonyms:", err);
      topSynonym = null;
    } finally {
      loadingSynonyms = false;
    }
  }

  // Switch to the top synonym as the target word
  function switchToSynonym() {
    if (!topSynonym) return;

    // Apply time penalty
    timeLeft = Math.max(1, timeLeft - TIME_PENALTY_FOR_SWITCH);
    timeDisplay = formatTime(timeLeft);

    // Update word and reset game state
    targetWord = topSynonym.word;
    foundRhymes = new Set();
    combo = 0; // Reset combo only when switching words

    // Fetch new rhymes and synonyms
    fetchRhymes(topSynonym.word);
    fetchTopSynonym(topSynonym.word);

    // Show notification
    error = `Switched to "${topSynonym.word}"! -${TIME_PENALTY_FOR_SWITCH} seconds penalty applied.`;
    setTimeout(() => {
      if (
        error ===
        `Switched to "${topSynonym?.word}"! -${TIME_PENALTY_FOR_SWITCH} seconds penalty applied.`
      ) {
        error = null;
      }
    }, 2000);
  }

  // Handle start game form submission
  function handleStartGame(e: Event) {
    e.preventDefault();
    targetWord = inputWord;
    inputWord = "";
    fetchRhymes(targetWord);
  }

  // Handle guessing a rhyme
  function handleGuess(e: Event) {
    e.preventDefault();

    if (!inputWord.trim() || gameOver) return;

    // Convert to lowercase for comparison
    const guess = inputWord.trim().toLowerCase();

    // Check if already found
    if (foundRhymes.has(guess)) {
      error = `You've already found "${guess}"!`;
      inputWord = "";
      return;
    }

    // Find the rhyme in our list
    const foundRhyme = rhymes.find((r) => r.word.toLowerCase() === guess);

    if (foundRhyme) {
      // Increment combo
      combo++;
      longestStreak = Math.max(longestStreak, combo);

      // Calculate points with combo multiplier
      const multiplier = getComboMultiplier();
      const points = calculatePoints(foundRhyme);
      score += points;

      // Update stats
      if (points > highestScoringRhyme.points) {
        highestScoringRhyme = { word: foundRhyme.word, points: points };
      }

      // Add time bonus
      addTime(TIME_BONUS_PER_RHYME);

      // Add to found rhymes
      foundRhymes.add(guess);

      // Show success message briefly
      const comboText =
        combo >= COMBO_THRESHOLD ? ` Combo x${multiplier.toFixed(1)}!` : "";
      error = `+${points} points for "${guess}"! +${TIME_BONUS_PER_RHYME}s${comboText}`;
      setTimeout(() => {
        if (
          error ===
          `+${points} points for "${guess}"! +${TIME_BONUS_PER_RHYME}s${comboText}`
        ) {
          error = null;
        }
      }, 1500);
    } else if (guess === targetWord.toLowerCase()) {
      error = "That's the original word! Try to find rhymes.";
    } else {
      error = `"${guess}" is not a rhyme for "${targetWord}".`;
    }

    // Clear input
    inputWord = "";
  }

  // Clean up on component destruction
  onDestroy(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  });

  onMount(() => {
    // Focus on the input field when the component mounts
    const inputField = document.getElementById("wordInput") as HTMLInputElement;
    if (inputField) {
      inputField.focus();
    }
  });

  // Group rhymes by syllable count for display
  function getRhymesByGroup() {
    const groups: Record<number, Rhyme[]> = {};
    rhymes.forEach((rhyme: Rhyme) => {
      const syllables = rhyme.numSyllables;
      if (!groups[syllables]) {
        groups[syllables] = [];
      }
      groups[syllables].push(rhyme);
    });
    return groups;
  }
</script>

<main>
  <div class="container">
    <h1>Rhyme Time</h1>
    <p class="description">
      Find as many rhymes in 60 seconds. Build combos for bonus points!
    </p>

    {#if !gameStarted}
      <!-- Game Setup Screen -->
      <form on:submit={handleStartGame} class="setup-form">
        <div class="input-group">
          <input
            id="wordInput"
            type="text"
            bind:value={inputWord}
            placeholder="Enter a word to find rhymes for..."
            aria-label="Word to rhyme"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Loading..." : "Start Game"}
          </button>
        </div>

        {#if error}
          <p class="error">{error}</p>
        {/if}

        {#if loading}
          <div class="loading">
            <div class="spinner"></div>
            <p>Looking for rhymes...</p>
          </div>
        {/if}
      </form>
    {:else}
      <!-- Game Play Screen -->
      <div class="game-area">
        <div class="game-header">
          <div class="game-stats">
            <div class="target-word">
              <span>Target word:</span>
              <strong>{targetWord}</strong>
            </div>
            <div class="stats-right">
              <div class="score">Score: {score}</div>
              <div class="combo" class:active={combo >= COMBO_THRESHOLD}>
                Combo: {combo}
                {combo >= COMBO_THRESHOLD
                  ? `(x${getComboMultiplier().toFixed(1)})`
                  : ""}
              </div>
              <div class="timer" class:warning={timeLeft <= 10}>
                Time: {timeDisplay}
              </div>
            </div>
          </div>

          {#if topSynonym && !gameOver}
            <div class="synonym-bar">
              <div class="synonym-option">
                <span>
                  Stuck? Switch to <strong>{topSynonym.word}</strong>
                  (-{TIME_PENALTY_FOR_SWITCH}s)
                </span>
                <button class="switch-btn" on:click={switchToSynonym}>
                  Switch
                </button>
              </div>
            </div>
          {/if}

          {#if !gameOver}
            <form on:submit={handleGuess} class="guess-form">
              <div class="input-group">
                <input
                  type="text"
                  bind:value={inputWord}
                  placeholder="Type a rhyme..."
                  aria-label="Guess a rhyme"
                  autocomplete="off"
                  autofocus
                />
                <button type="submit">Submit</button>
              </div>
            </form>
          {/if}

          {#if error}
            <p
              class:success={error.includes("+") && error.includes("points")}
              class:warning={error.includes("Switched")}
              class:error={!error.includes("+") &&
                !error.includes("points") &&
                !error.includes("Switched")}
            >
              {error}
            </p>
          {/if}
        </div>

        <div class="game-content">
          {#if gameOver}
            <!-- Game Over Screen -->
            <div class="game-over">
              <h2>Time's Up!</h2>
              <p>
                You found {foundRhymes.size}
                {foundRhymes.size === 1 ? "rhyme" : "rhymes"} for "{targetWord}"
              </p>
              <p class="final-score">Final Score: {score}</p>

              <div class="stats-highlights">
                <div class="stat-item">
                  <span class="stat-label">Longest Streak:</span>
                  <span class="stat-value">{longestStreak}</span>
                </div>
                {#if highestScoringRhyme.word}
                  <div class="stat-item">
                    <span class="stat-label">Best Scoring Rhyme:</span>
                    <span class="stat-value"
                      >{highestScoringRhyme.word} (+{highestScoringRhyme.points})</span
                    >
                  </div>
                {/if}
              </div>

              <div class="actions">
                <button on:click={resetGame} class="retry-btn"
                  >Play Again</button
                >
              </div>

              <!-- Stats Display -->
              <div class="stats-display">
                <h3>Game Stats</h3>
                <div class="stat-grid">
                  <div class="stat-row">
                    <span class="stat-name">Longest Streak:</span>
                    <span class="stat-value">{longestStreak}</span>
                  </div>
                  {#if highestScoringRhyme.word}
                    <div class="stat-row">
                      <span class="stat-name">Best Score:</span>
                      <span class="stat-value"
                        >{highestScoringRhyme.word} (+{highestScoringRhyme.points})</span
                      >
                    </div>
                  {/if}
                </div>
              </div>

              <!-- All Rhymes Display -->
              <div class="all-rhymes">
                <h3>All Possible Rhymes ({rhymes.length})</h3>
                <div class="rhyme-groups">
                  {#each Object.entries(getRhymesByGroup()).sort((a, b) => parseInt(b[0]) - parseInt(a[0])) as [syllables, syllableRhymes]}
                    <div class="rhyme-group">
                      <h4>
                        {syllables}
                        {parseInt(syllables) === 1 ? "Syllable" : "Syllables"} ({syllableRhymes.length})
                      </h4>
                      <div class="rhyme-group-words">
                        {#each syllableRhymes as rhyme}
                          <span
                            class="rhyme-word"
                            class:found={foundRhymes.has(rhyme.word)}
                          >
                            {rhyme.word}
                          </span>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              {#if foundRhymes.size > 0}
                <div class="found-rhymes">
                  <h3>Rhymes you found:</h3>
                  <ul>
                    {#each [...foundRhymes] as found}
                      {#if rhymes.find((r) => r.word === found)}
                        {@const rhymeData : Rhyme | undefined = rhymes.find(
                          (r) => r.word === found
                        )}
                        {@const points = calculatePoints(rhymeData)}
                        <li>
                          <span class="found-word">{found}</span>
                          <span class="found-details">
                            {rhymeData?.numSyllables}
                            {rhymeData?.numSyllables === 1
                              ? "syllable"
                              : "syllables"} |
                            {points} points
                          </span>
                        </li>
                      {/if}
                    {/each}
                  </ul>
                </div>
              {/if}

              <div class="missed-rhymes">
                <h3>
                  You missed {rhymes.length - foundRhymes.size} possible rhymes
                </h3>
                <p class="missed-note">Here are all the missed rhymes:</p>
                <ul class="sample-missed">
                  {#each rhymes.filter((r) => !foundRhymes.has(r.word)) as missed}
                    <li>
                      {missed.word} ({missed.numSyllables}
                      {missed.numSyllables === 1 ? "syllable" : "syllables"})
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
          {:else}
            <!-- Game Interface -->
            <div class="game-interface">
              {#if foundRhymes.size > 0}
                <div class="found-rhymes">
                  <h3>Rhymes you found:</h3>
                  <ul>
                    {#each [...foundRhymes] as found}
                      {#if rhymes.find((r) => r.word === found)}
                        {@const rhymeData : Rhyme | undefined = rhymes.find(
                          (r) => r.word === found
                        )}
                        {@const points = calculatePoints(rhymeData)}
                        <li>
                          <span class="found-word">{found}</span>
                          <span class="found-details">
                            {rhymeData?.numSyllables}
                            {rhymeData?.numSyllables === 1
                              ? "syllable"
                              : "syllables"} |
                            {points} points
                          </span>
                        </li>
                      {/if}
                    {/each}
                  </ul>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f5f7fa;
    margin: 0;
    padding: 0;
    color: #333;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  h1 {
    color: #2c3e50;
    text-align: center;
    margin-bottom: 0.5rem;
  }

  h2 {
    color: #2c3e50;
    text-align: center;
    margin-top: 0;
  }

  h3 {
    color: #2c3e50;
    margin-bottom: 1rem;
    font-size: 18px;
  }

  h4 {
    color: #34495e;
    margin: 0.5rem 0;
    font-size: 16px;
  }

  .description {
    text-align: center;
    color: #7f8c8d;
    margin-bottom: 2rem;
  }

  .setup-form {
    background-color: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }

  .input-group {
    display: flex;
    margin-bottom: 1rem;
  }

  input {
    flex: 1;
    padding: 12px 15px;
    font-size: 16px;
    border: 2px solid #ddd;
    border-radius: 4px 0 0 4px;
    outline: none;
    transition: border-color 0.3s;
  }

  .guess-form input {
    font-size: 18px;
  }

  input:focus {
    border-color: #3498db;
  }

  button {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 12px 20px;
    cursor: pointer;
    font-size: 16px;
    border-radius: 0 4px 4px 0;
    transition: background-color 0.3s;
    white-space: nowrap;
  }

  button:hover {
    background-color: #2980b9;
  }

  button:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }

  .error {
    color: #e74c3c;
    text-align: center;
    padding: 10px;
    background-color: #fadbd8;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .success {
    color: #27ae60;
    text-align: center;
    padding: 10px;
    background-color: #d5f5e3;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .warning {
    color: #f39c12;
    text-align: center;
    padding: 10px;
    background-color: #fef9e7;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 2rem 0;
  }

  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border-left-color: #3498db;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .game-area {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .game-header {
    padding: 1.5rem;
    border-bottom: 1px solid #eee;
  }

  .game-stats {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 10px;
  }

  .stats-right {
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: flex-end;
  }

  .target-word {
    font-size: 16px;
  }

  .target-word strong {
    font-size: 24px;
    color: #2c3e50;
    display: block;
    margin-top: 5px;
  }

  .synonym-bar {
    background-color: #f8f9fa;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 1rem;
  }

  .synonym-option {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .switch-btn {
    background-color: #f39c12;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 8px 15px;
    font-size: 14px;
    cursor: pointer;
  }

  .switch-btn:hover {
    background-color: #e67e22;
  }

  .score {
    font-size: 18px;
    font-weight: bold;
    color: #27ae60;
  }

  .combo {
    font-size: 16px;
    color: #7f8c8d;
  }

  .combo.active {
    font-weight: bold;
    color: #f39c12;
    animation: pulse 1s infinite;
  }

  .timer {
    font-size: 18px;
    font-weight: bold;
    color: #3498db;
  }

  .timer.warning {
    color: #e74c3c;
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
    100% {
      opacity: 1;
    }
  }

  .game-content {
    padding: 1.5rem;
    max-height: 60vh;
    overflow-y: auto;
  }

  .game-interface {
    display: grid;
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .found-container {
    min-height: 100px;
  }

  .no-rhymes {
    color: #7f8c8d;
    text-align: center;
    margin-top: 1rem;
  }

  .rhyme-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .rhyme-card {
    background: #f8f9fa;
    padding: 12px;
    border-radius: 4px;
    border-left: 3px solid #27ae60;
    min-width: 100px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .card-word {
    font-weight: 500;
    font-size: 16px;
    margin-bottom: 5px;
  }

  .card-points {
    font-size: 14px;
    color: #27ae60;
    font-weight: bold;
  }

  .game-over {
    text-align: center;
  }

  .final-score {
    font-size: 24px;
    font-weight: bold;
    color: #27ae60;
    margin: 1rem 0;
  }

  .stats-highlights {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 1rem 0;
    background-color: #f8f9fa;
    padding: 15px;
    border-radius: 8px;
  }

  .stat-item {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px dashed #ddd;
    padding-bottom: 5px;
  }

  .stat-label {
    font-weight: bold;
    color: #34495e;
  }

  .stat-value {
    color: #27ae60;
  }

  .retry-btn {
    background-color: #27ae60;
    color: white;
    border: none;
    padding: 12px 30px;
    font-size: 18px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.3s;
    margin-bottom: 2rem;
  }

  .retry-btn:hover {
    background-color: #219653;
  }

  .found-rhymes,
  .missed-rhymes {
    margin-top: 2rem;
    text-align: left;
  }

  .found-rhymes ul,
  .sample-missed {
    list-style-type: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
  }

  .found-rhymes li {
    background: #f8f9fa;
    padding: 10px 15px;
    border-radius: 4px;
    border-left: 3px solid #27ae60;
  }

  .found-details {
    display: block;
    font-size: 12px;
    color: #7f8c8d;
    margin-top: 3px;
  }

  .sample-missed li {
    background: #f8f9fa;
    padding: 10px 15px;
    border-radius: 4px;
    border-left: 3px solid #e74c3c;
  }

  .missed-note {
    color: #7f8c8d;
    font-size: 14px;
    margin-bottom: 10px;
  }

  .stats-display {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 15px;
  }

  .stat-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    padding-bottom: 5px;
    border-bottom: 1px dashed #ddd;
  }

  .stat-name {
    font-weight: 500;
    color: #34495e;
  }

  .stat-value {
    color: #27ae60;
    font-weight: 500;
  }

  .all-rhymes {
    background-color: #f8f9fa;
    border-radius: 8px;
    padding: 15px;
  }

  .rhyme-groups {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .rhyme-group {
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
  }

  .rhyme-group:last-child {
    border-bottom: none;
  }

  .rhyme-group-words {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }

  .rhyme-word {
    display: inline-block;
    background-color: #ecf0f1;
    color: #7f8c8d;
    padding: 5px 10px;
    border-radius: 20px;
    font-size: 14px;
    white-space: nowrap;
  }

  .rhyme-word.found {
    background-color: #d5f5e3;
    color: #27ae60;
    font-weight: 500;
  }

  @media (max-width: 600px) {
    .container {
      padding: 1rem;
    }

    .input-group {
      flex-direction: column;
    }

    input {
      border-radius: 4px;
      margin-bottom: 10px;
    }

    button {
      border-radius: 4px;
      width: 100%;
    }

    .game-stats {
      flex-direction: column;
      align-items: flex-start;
    }

    .stats-right {
      align-items: flex-start;
      width: 100%;
      margin-top: 10px;
    }

    .found-rhymes ul,
    .sample-missed {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }

    .rhyme-word {
      font-size: 13px;
      padding: 4px 8px;
    }
  }
</style>
