(function () {
  'use strict';

  const STORAGE_KEY = 'compliment_library';

  let content = null;
  let state = {
    name: '',
    readBooks: [],
    currentBook: null,
    currentPage: -1,
    currentScreen: 'welcome'
  };

  const screens = {
    welcome: document.getElementById('welcome-screen'),
    library: document.getElementById('library-screen'),
    reading: document.getElementById('reading-screen'),
    diary: document.getElementById('diary-screen')
  };

  function init() {
    loadState();
    fetch('content.json')
      .then(r => r.json())
      .then(data => {
        content = data;
        if (state.name) {
          showScreen('library');
          renderLibrary();
        } else {
          showScreen('welcome');
          setupWelcome();
        }
      })
      .catch(err => {
        console.error('Failed to load content:', err);
      });
  }

  // ===== STATE MANAGEMENT =====

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        name: state.name,
        readBooks: state.readBooks
      }));
    } catch (e) {}
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state.name = parsed.name || '';
        state.readBooks = parsed.readBooks || [];
      }
    } catch (e) {}
  }

  function isBookRead(bookId) {
    return state.readBooks.includes(bookId);
  }

  function markBookRead(bookId) {
    if (!isBookRead(bookId)) {
      state.readBooks.push(bookId);
      saveState();
      checkAchievements();
    }
  }

  function allNormalBooksRead() {
    if (!content) return false;
    const allIds = [];
    content.shelves.forEach(s => s.books.forEach(b => allIds.push(b.id)));
    return allIds.every(id => state.readBooks.includes(id));
  }

  function allBooksRead() {
    if (!content) return false;
    const allIds = [];
    content.shelves.forEach(s => s.books.forEach(b => allIds.push(b.id)));
    if (content.finalVolume) allIds.push(content.finalVolume.id);
    return allIds.every(id => state.readBooks.includes(id));
  }

  function shelfComplete(shelfId) {
    if (!content) return false;
    const shelf = content.shelves.find(s => s.id === shelfId);
    if (!shelf) return false;
    return shelf.books.every(b => state.readBooks.includes(b.id));
  }

  function getUnlockedAchievements() {
    const unlocked = [];
    if (!content) return unlocked;
    const allBooks = [];
    content.shelves.forEach(s => s.books.forEach(b => allBooks.push(b)));

    if (state.readBooks.length > 0) unlocked.push('first_book');
    if (isBookRead('smile')) unlocked.push('smile_done');
    if (shelfComplete('appearance')) unlocked.push('shelf_appearance');
    if (shelfComplete('character')) unlocked.push('shelf_character');
    if (allBooksRead()) unlocked.push('all_books');
    return unlocked;
  }

  function checkAchievements() {
    const unlocked = getUnlockedAchievements();
    const stored = loadSavedAchievements();
    const newOnes = unlocked.filter(id => !stored.includes(id));
    localStorage.setItem(STORAGE_KEY + '_achievements', JSON.stringify(unlocked));
    newOnes.forEach(id => {
      const ach = content.achievements.find(a => a.id === id);
      if (ach) notify('Достижение: ' + ach.title);
    });
    if (allNormalBooksRead()) {
      showFinalVolume();
    }
  }

  function loadSavedAchievements() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY + '_achievements') || '[]');
    } catch (e) { return []; }
  }

  // ===== SCREEN MANAGEMENT =====

  function showScreen(name) {
    Object.keys(screens).forEach(key => {
      screens[key].classList.toggle('active', key === name);
    });
    state.currentScreen = name;
    document.body.style.overflow = name === 'reading' || name === 'diary' ? 'hidden' : '';
  }

  // ===== WELCOME SCREEN =====

  function setupWelcome() {
    const nameInput = document.getElementById('nameInput');
    const getCardBtn = document.getElementById('getCardBtn');
    const cardNameDisplay = document.getElementById('cardNameDisplay');
    const cardSeal = document.getElementById('cardSeal');
    const scrollHint = document.getElementById('scrollHint');
    const libraryCard = document.getElementById('libraryCard');

    nameInput.addEventListener('input', function () {
      getCardBtn.disabled = !this.value.trim();
    });

    getCardBtn.addEventListener('click', function () {
      const name = nameInput.value.trim();
      if (!name) return;
      state.name = name;
      saveState();

      nameInput.style.display = 'none';
      cardNameDisplay.textContent = name;
      cardNameDisplay.classList.add('visible');
      getCardBtn.style.display = 'none';
      libraryCard.classList.add('issued');
      cardSeal.classList.add('visible');

      document.getElementById('cardNumber').textContent =
        '№' + String(Math.floor(Math.random() * 9000) + 1000);

      scrollHint.classList.add('visible');

      setTimeout(() => {
        showScreen('library');
        renderLibrary();
      }, 2500);
    });

    getCardBtn.disabled = true;

    if (state.name) {
      nameInput.value = state.name;
      nameInput.style.display = 'none';
      cardNameDisplay.textContent = state.name;
      cardNameDisplay.classList.add('visible');
      getCardBtn.style.display = 'none';
      libraryCard.classList.add('issued');
      cardSeal.classList.add('visible');
      document.getElementById('cardNumber').textContent =
        '№' + String(Math.floor(Math.random() * 9000) + 1000);
      scrollHint.classList.add('visible');
    }
  }

  // ===== LIBRARY SCREEN =====

  function renderLibrary() {
    if (!content) return;
    const container = document.getElementById('shelvesContainer');
    const ladderSteps = document.getElementById('ladderSteps');
    const title = document.getElementById('libraryTitle');
    title.textContent = content.libraryName;

    container.innerHTML = '';
    ladderSteps.innerHTML = '';

    content.shelves.forEach((shelf, index) => {
      const shelfEl = document.createElement('div');
      shelfEl.className = 'shelf';
      shelfEl.dataset.shelfId = shelf.id;

      let booksHtml = '';
      shelf.books.forEach(book => {
        const read = isBookRead(book.id);
        booksHtml += `
          <div class="book-item ${read ? 'read' : ''}" data-book-id="${book.id}">
            <div class="book-spine-visual">
              <div class="book-title-short">${book.title}</div>
              <div class="book-for">Для ${state.name}</div>
            </div>
            <div class="book-item-label">${book.title}</div>
          </div>
        `;
      });

      shelfEl.innerHTML = `
        <div class="shelf-header">
          <div class="shelf-title">${shelf.title}</div>
          <div class="shelf-divider"></div>
        </div>
        <div class="shelf-books">${booksHtml}</div>
      `;

      container.appendChild(shelfEl);

      const step = document.createElement('div');
      step.className = 'ladder-step' + (index === 0 ? ' active' : '');
      step.dataset.target = '#shelf-' + index;
      step.innerHTML = `<span class="step-label">${shelf.title}</span>`;
      step.addEventListener('click', function () {
        shelfEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      ladderSteps.appendChild(step);

      shelfEl.querySelectorAll('.book-item').forEach(el => {
        el.addEventListener('click', function () {
          const bookId = this.dataset.bookId;
          openBook(bookId);
        });
      });
    });

    updateScrollSpy();

    if (allNormalBooksRead()) {
      showFinalVolume();
    }
  }

  let scrollSpyHandler = null;

  function updateScrollSpy() {
    const container = document.getElementById('library-screen');
    const steps = document.querySelectorAll('.ladder-step');
    const shelves = document.querySelectorAll('.shelf');

    if (scrollSpyHandler) {
      container.removeEventListener('scroll', scrollSpyHandler);
    }

    scrollSpyHandler = function () {
      let activeIndex = 0;
      shelves.forEach((shelf, i) => {
        const rect = shelf.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.5) {
          activeIndex = i;
        }
      });
      steps.forEach((step, i) => {
        step.classList.toggle('active', i === activeIndex);
      });
    };

    container.addEventListener('scroll', scrollSpyHandler);
  }

  // ===== FINAL VOLUME =====

  function showFinalVolume() {
    if (!content || !content.finalVolume) return;
    const container = document.getElementById('shelvesContainer');
    const existing = container.querySelector('.shelf.final-shelf');
    if (existing) return;

    const shelfEl = document.createElement('div');
    shelfEl.className = 'shelf final-shelf';
    shelfEl.innerHTML = `
      <div class="shelf-header">
        <div class="shelf-title">Особое издание</div>
        <div class="shelf-divider"></div>
      </div>
      <div class="shelf-books">
        <div class="book-item final ${isBookRead(content.finalVolume.id) ? 'read' : ''}" data-book-id="${content.finalVolume.id}">
          <div class="book-spine-visual">
            <div class="book-title-short">${content.finalVolume.title}</div>
            <div class="book-for">Для ${state.name}</div>
          </div>
          <div class="book-item-label">${content.finalVolume.subtitle}</div>
        </div>
      </div>
    `;

    container.appendChild(shelfEl);

    shelfEl.querySelector('.book-item').addEventListener('click', function () {
      openBook(content.finalVolume.id);
    });

    const ladderSteps = document.getElementById('ladderSteps');
    const step = document.createElement('div');
    step.className = 'ladder-step';
    step.dataset.target = '#final-shelf';
    step.innerHTML = `<span class="step-label">Финальный том</span>`;
    step.addEventListener('click', function () {
      shelfEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    ladderSteps.appendChild(step);
  }

  // ===== BOOK READING =====

  function findBook(bookId) {
    if (!content) return null;
    for (const shelf of content.shelves) {
      for (const book of shelf.books) {
        if (book.id === bookId) return book;
      }
    }
    if (content.finalVolume && content.finalVolume.id === bookId) {
      return content.finalVolume;
    }
    return null;
  }

  function getVolumeNumber(bookId) {
    if (!content) return '';
    let count = 1;
    for (const shelf of content.shelves) {
      for (const book of shelf.books) {
        if (book.id === bookId) return 'Том ' + romanNumeral(count);
        count++;
      }
    }
    if (content.finalVolume && content.finalVolume.id === bookId) {
      return 'Финальный том';
    }
    return '';
  }

  function romanNumeral(n) {
    const map = [
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ];
    let result = '';
    for (const [value, numeral] of map) {
      while (n >= value) {
        result += numeral;
        n -= value;
      }
    }
    return result;
  }

  let isAnimatingPage = false;

  function openBook(bookId) {
    const book = findBook(bookId);
    if (!book) return;

    state.currentBook = bookId;
    state.currentPage = -1;

    const cover = document.getElementById('bookCover');
    const coverVolume = document.getElementById('coverVolume');
    const coverTitle = document.getElementById('coverTitle');
    const coverFor = document.getElementById('coverFor');
    const bookWrapper = document.getElementById('bookWrapper');
    const pageText = document.getElementById('pageText');
    const pageNumber = document.getElementById('pageNumber');
    const bookEnd = document.getElementById('bookEnd');
    const bookPage = document.getElementById('bookPageContent');
    const pagePrev = document.getElementById('pagePrev');
    const pageNext = document.getElementById('pageNext');
    const closeBtn = document.getElementById('closeBookBtn');

    coverVolume.textContent = getVolumeNumber(bookId);
    coverTitle.textContent = book.title;
    coverFor.textContent = 'Для ' + state.name;

    cover.classList.remove('flipped');
    bookEnd.classList.remove('active');
    bookPage.classList.remove('active');
    bookWrapper.classList.add('opening');

    showScreen('reading');
    pagePrev.disabled = true;
    pageNext.disabled = true;

    setTimeout(() => {
      bookWrapper.classList.remove('opening');
      pageNext.disabled = false;
      pagePrev.disabled = true;
      pageNext.textContent = '›';
    }, 1200);

    pageNext.onclick = function () { nextPage(book); };
    pagePrev.onclick = function () { prevPage(book); };
    closeBtn.onclick = function () { closeBook(bookId); };
  }

  function nextPage(book) {
    if (isAnimatingPage) return;
    const totalPages = book.pages.length;
    const cover = document.getElementById('bookCover');
    const bookPage = document.getElementById('bookPageContent');
    const pageText = document.getElementById('pageText');
    const pageNumber = document.getElementById('pageNumber');
    const bookEnd = document.getElementById('bookEnd');
    const pagePrev = document.getElementById('pagePrev');
    const pageNext = document.getElementById('pageNext');

    if (state.currentPage === -1) {
      isAnimatingPage = true;
      cover.classList.add('flipped');
      state.currentPage = 0;
      setTimeout(() => {
        bookPage.classList.add('active');
        pageText.textContent = book.pages[0];
        pageNumber.textContent = 'Страница 1';
        pagePrev.disabled = false;
        pageNext.disabled = false;
        isAnimatingPage = false;
      }, 600);
      return;
    }

    if (state.currentPage < totalPages - 1) {
      isAnimatingPage = true;
      pagePrev.disabled = true;
      pageNext.disabled = true;
      bookPage.classList.remove('active');
      bookPage.classList.add('exit-left');

      setTimeout(() => {
        state.currentPage++;
        pageText.textContent = book.pages[state.currentPage];
        pageNumber.textContent = 'Страница ' + (state.currentPage + 1);
        bookPage.classList.remove('exit-left');
        bookPage.classList.add('enter-from-right');
        bookPage.classList.add('active');

        setTimeout(() => {
          bookPage.classList.remove('enter-from-right');
          pagePrev.disabled = false;
          pageNext.disabled = false;
          isAnimatingPage = false;
        }, 500);
      }, 400);
      return;
    }

    if (state.currentPage === totalPages - 1) {
      bookPage.classList.remove('active');
      bookPage.classList.add('exit-left');
      state.currentPage = totalPages;

      setTimeout(() => {
        bookPage.classList.remove('exit-left', 'active');
        bookEnd.classList.add('active');
        pageNext.textContent = '✓';
        pageNext.disabled = true;
        isAnimatingPage = false;
        markBookRead(book.id);
        checkAchievements();
      }, 400);
    }
  }

  function prevPage(book) {
    if (isAnimatingPage) return;
    const totalPages = book.pages.length;
    const cover = document.getElementById('bookCover');
    const bookPage = document.getElementById('bookPageContent');
    const pageText = document.getElementById('pageText');
    const pageNumber = document.getElementById('pageNumber');
    const bookEnd = document.getElementById('bookEnd');
    const pagePrev = document.getElementById('pagePrev');
    const pageNext = document.getElementById('pageNext');

    if (state.currentPage === totalPages) {
      bookEnd.classList.remove('active');
      state.currentPage = totalPages - 1;
      bookPage.classList.add('enter-from-left');
      bookPage.classList.add('active');
      pageText.textContent = book.pages[state.currentPage];
      pageNumber.textContent = 'Страница ' + (state.currentPage + 1);
      pageNext.textContent = '›';
      pageNext.disabled = false;
      return;
    }

    if (state.currentPage === 0) {
      isAnimatingPage = true;
      pagePrev.disabled = true;
      pageNext.disabled = true;
      bookPage.classList.remove('active');
      bookPage.classList.add('exit-right');

      setTimeout(() => {
        state.currentPage = -1;
        cover.classList.remove('flipped');
        bookPage.classList.remove('exit-right');
        pagePrev.disabled = true;
        pageNext.disabled = false;
        isAnimatingPage = false;
      }, 400);
      return;
    }

    if (state.currentPage > 0) {
      isAnimatingPage = true;
      pagePrev.disabled = true;
      pageNext.disabled = true;
      bookPage.classList.remove('active');
      bookPage.classList.add('exit-right');

      setTimeout(() => {
        state.currentPage--;
        pageText.textContent = book.pages[state.currentPage];
        pageNumber.textContent = 'Страница ' + (state.currentPage + 1);
        bookPage.classList.remove('exit-right');
        bookPage.classList.add('enter-from-left');
        bookPage.classList.add('active');

        setTimeout(() => {
          bookPage.classList.remove('enter-from-left');
          pagePrev.disabled = false;
          pageNext.disabled = false;
          isAnimatingPage = false;
        }, 500);
      }, 400);
    }
  }

  function closeBook(bookId) {
    showScreen('library');
    renderLibrary();
    state.currentBook = null;
    state.currentPage = -1;
  }

  // ===== DIARY =====

  function renderDiary() {
    if (!content) return;
    const nameEl = document.getElementById('diaryReaderName');
    const progressEl = document.getElementById('diaryProgress');
    const achievementsEl = document.getElementById('achievementsList');

    nameEl.textContent = 'Читатель: ' + state.name;

    const allBooks = [];
    content.shelves.forEach(s => s.books.forEach(b => allBooks.push(b)));
    if (content.finalVolume) allBooks.push(content.finalVolume);
    const total = allBooks.length;
    const read = allBooks.filter(b => isBookRead(b.id)).length;
    const pct = total > 0 ? Math.round((read / total) * 100) : 0;

    progressEl.innerHTML = `
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${pct}%"></div>
      </div>
      <div class="progress-text">Прочитано ${read} из ${total} книг (${pct}%)</div>
    `;

    const unlocked = getUnlockedAchievements();
    const savedUnlocked = loadSavedAchievements();
    const allUnlockedIds = [...new Set([...unlocked, ...savedUnlocked])];

    achievementsEl.innerHTML = '';
    content.achievements.forEach(ach => {
      const isUnlocked = allUnlockedIds.includes(ach.id);
      const div = document.createElement('div');
      div.className = 'achievement' + (isUnlocked ? ' unlocked' : '');
      div.innerHTML = `
        <div class="achievement-icon">${isUnlocked ? '☑' : '☐'}</div>
        <div class="achievement-info">
          <div class="achievement-title">${ach.title}</div>
          <div class="achievement-desc">${isUnlocked ? 'Выполнено' : ach.description}</div>
        </div>
      `;
      achievementsEl.appendChild(div);
    });
  }

  // ===== NOTIFICATION =====

  function notify(message) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'notification';
    el.textContent = message;
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.add('visible');
    });

    setTimeout(() => {
      el.classList.remove('visible');
      setTimeout(() => el.remove(), 600);
    }, 3000);
  }

  // ===== EVENT BINDING =====

  function bindEvents() {
    document.getElementById('diaryBtn').addEventListener('click', function () {
      renderDiary();
      showScreen('diary');
    });

    document.getElementById('diaryCloseBtn').addEventListener('click', function () {
      showScreen('library');
    });

    document.getElementById('backToLibraryBtn').addEventListener('click', function () {
      closeBook(state.currentBook);
    });

    screens.diary.addEventListener('click', function (e) {
      if (e.target === this) showScreen('library');
    });

    document.addEventListener('keydown', function (e) {
      if (state.currentScreen === 'reading') {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          document.getElementById('pageNext').click();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          document.getElementById('pagePrev').click();
        } else if (e.key === 'Escape') {
          closeBook(state.currentBook);
        }
      }
      if (state.currentScreen === 'diary' && e.key === 'Escape') {
        showScreen('library');
      }
    });
  }

  // ===== INIT =====

  bindEvents();
  init();
})();
