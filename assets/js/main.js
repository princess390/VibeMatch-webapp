import supabase from "./supabase.js";
import { findMood, getMoodByKey, getMoodLabels } from "./moods.js";

const TMDB_API_KEY = "55bb82a9225c1d8ac96916c5053e2581";
const TMDB_LANGUAGE = "hu-HU";
const TMDB_REGION = "HU";
const cardItemStore = new Map();

const streamingProviders = {
  8: {
    name: "Netflix",
    searchUrl: title => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`
  },
  337: {
    name: "Disney+",
    searchUrl: title => `https://www.disneyplus.com/search?q=${encodeURIComponent(title)}`
  },
  119: {
    name: "Prime Video",
    searchUrl: title => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(title)}`
  },
  1899: {
    name: "Max",
    searchUrl: title => `https://www.max.com/hu/hu/search?q=${encodeURIComponent(title)}`
  },
  384: {
    name: "HBO Max",
    searchUrl: title => `https://play.hbomax.com/search?q=${encodeURIComponent(title)}`
  },
  350: {
    name: "Apple TV+",
    searchUrl: title => `https://tv.apple.com/hu/search?term=${encodeURIComponent(title)}`
  }
};

const bookStores = {
  Libri: title => `https://www.libri.hu/kereses/?q=${encodeURIComponent(title)}`,
  Bookline: title => `https://bookline.hu/search/search.action?searchfield=${encodeURIComponent(title)}`
};

const popularTranslatedBookQueries = [
  "Harry Potter",
  "Agatha Christie",
  "Stephen King",
  "Colleen Hoover",
  "J. R. R. Tolkien",
  "Frank Herbert",
  "Jane Austen",
  "George Orwell",
  "Yuval Noah Harari",
  "Fredrik Backman",
  "Matt Haig",
  "Dan Brown",
  "Ken Follett",
  "Paulo Coelho",
  "Michelle Obama",
  "John Green",
  "Khaled Hosseini",
  "Suzanne Collins",
  "Andy Weir",
  "Neil Gaiman",
  "Gillian Flynn",
  "Nicholas Sparks",
  "James Clear",
  "Markus Zusak",
  "Roald Dahl"
];

const translatedBookQueriesByMood = {
  romantikus: ["Colleen Hoover", "Jane Austen"],
  melankolikus: ["John Green", "Kazuo Ishiguro"],
  vidam: ["Fredrik Backman", "Helen Fielding"],
  chill: ["Fredrik Backman", "Matt Haig"],
  kalandos: ["Harry Potter", "J. R. R. Tolkien"],
  misztikus: ["Agatha Christie", "Dan Brown"],
  felelmetes: ["Stephen King", "Shirley Jackson"],
  inspiralo: ["Paulo Coelho", "Michelle Obama"],
  gondolkodos: ["George Orwell", "Yuval Noah Harari"],
  nosztalgikus: ["Antoine de Saint-Exupéry", "Lucy Maud Montgomery"],
  energikus: ["Suzanne Collins", "James Dashner"],
  sotet: ["Gillian Flynn", "Stephen King"],
  konnyed: ["Sophie Kinsella", "Fredrik Backman"],
  csaladi: ["Roald Dahl", "Harry Potter"],
  epikus: ["J. R. R. Tolkien", "Frank Herbert"],
  kreativ: ["Neil Gaiman", "Haruki Murakami"],
  akciodus: ["Lee Child", "Dan Brown"],
  vicces: ["Douglas Adams", "Fredrik Backman"],
  nyomozos: ["Agatha Christie", "Arthur Conan Doyle"],
  futurisztikus: ["Frank Herbert", "Andy Weir"],
  tortenelmi: ["Ken Follett", "Markus Zusak"],
  spiritualis: ["Paulo Coelho", "Eckhart Tolle"],
  dramai: ["Khaled Hosseini", "John Green"],
  varazslatos: ["Harry Potter", "Neil Gaiman"],
  feszült: ["Gillian Flynn", "Paula Hawkins"],
  motiváló: ["James Clear", "Michelle Obama"],
  unnepi: ["Charles Dickens", "Matt Haig"],
  bekuckozos: ["Matt Haig", "Fredrik Backman"],
  randis: ["Colleen Hoover", "Nicholas Sparks"],
  tanulos: ["Yuval Noah Harari", "James Clear"]
};

const musicSearchTerms = [
  "top hits",
  "pop",
  "magyar slágerek",
  "dance",
  "chill",
  "romantic"
];

const musicQueriesByMood = {
  romantikus: ["love song", "romantic ballad", "date night", "slow love", "acoustic love"],
  melankolikus: ["sad song", "heartbreak", "breakup song", "lonely", "melancholy", "piano ballad"],
  vidam: ["happy song", "feel good", "summer pop", "upbeat", "good vibes"],
  chill: ["chill", "lofi", "acoustic chill", "calm", "relaxing"],
  chilltime: ["chill", "lofi", "acoustic chill", "calm", "relaxing"],
  kalandos: ["adventure", "epic pop", "road trip", "cinematic", "uplifting"],
  misztikus: ["mysterious", "dark pop", "atmospheric", "cinematic", "moody"],
  felelmetes: ["dark", "horror", "scary", "haunting", "suspense"],
  inspiralo: ["inspirational", "uplifting", "motivational", "anthem", "hopeful"],
  gondolkodos: ["thoughtful", "indie", "ambient", "piano", "deep"],
  nosztalgikus: ["nostalgic", "oldies", "classic hits", "retro", "throwback"],
  autumn: ["cozy", "rainy day", "autumn acoustic", "soft indie", "warm"],
  energikus: ["energetic", "dance", "workout", "party", "upbeat pop"],
  sotet: ["dark", "moody", "alternative", "gritty", "dark pop"],
  konnyed: ["easy listening", "light pop", "feel good", "sunny", "soft pop"],
  csaladi: ["family", "disney", "animated", "kids", "feel good"],
  epikus: ["epic", "cinematic", "orchestral", "trailer music", "powerful"],
  kreativ: ["indie", "alternative", "art pop", "experimental", "creative"],
  akciodus: ["action", "workout", "rock", "intense", "fast"],
  vicces: ["funny song", "comedy", "novelty", "playful", "happy"],
  nyomozos: ["detective", "crime", "suspense", "jazz noir", "mysterious"],
  futurisztikus: ["synthwave", "electronic", "future bass", "sci fi", "cyberpunk"],
  tortenelmi: ["classical", "period drama", "orchestral", "folk", "historical"],
  spiritualis: ["spiritual", "meditation", "mindfulness", "ambient", "peaceful"],
  dramai: ["dramatic", "emotional", "sad song", "power ballad", "cinematic"],
  varazslatos: ["magical", "fantasy", "fairy tale", "orchestral", "dreamy"],
  feszült: ["tense", "suspense", "thriller", "intense", "dark"],
  motiváló: ["motivational", "workout", "success", "powerful", "anthem"],
  unnepi: ["christmas", "holiday", "festive", "winter", "cozy"],
  bekuckozos: ["cozy", "rainy day", "acoustic", "soft indie", "calm"],
  datenight: ["date night", "romantic", "love song", "slow jam", "smooth"],
  randis: ["date night", "romantic", "love song", "slow jam", "smooth"],
  christmas: ["christmas", "holiday", "festive", "winter", "cozy"],
  tanulos: ["study", "focus", "lofi", "instrumental", "ambient"]
};

const curatedMusicCollectionsByMood = {
  romantikus: [
    "All of Me John Legend",
    "Perfect Ed Sheeran",
    "Just the Way You Are Bruno Mars",
    "Make You Feel My Love Adele",
    "Until I Found You Stephen Sanchez",
    "A Thousand Years Christina Perri"
  ],
  melankolikus: [
    "Someone Like You Adele",
    "Fix You Coldplay",
    "drivers license Olivia Rodrigo",
    "Skinny Love Birdy",
    "Let Her Go Passenger",
    "The Night We Met Lord Huron",
    "When I Was Your Man Bruno Mars",
    "Jealous Labrinth"
  ],
  vidam: [
    "Happy Pharrell Williams",
    "Can't Stop the Feeling Justin Timberlake",
    "Good Time Owl City Carly Rae Jepsen",
    "Walking On Sunshine Katrina",
    "Shut Up and Dance Walk The Moon",
    "Levitating Dua Lipa"
  ],
  chill: [
    "Sunset Lover Petit Biscuit",
    "Ocean Eyes Billie Eilish",
    "Holocene Bon Iver",
    "Banana Pancakes Jack Johnson",
    "Lost in Japan Shawn Mendes",
    "Bloom The Paper Kites"
  ],
  chilltime: [
    "Sunset Lover Petit Biscuit",
    "Ocean Eyes Billie Eilish",
    "Holocene Bon Iver",
    "Banana Pancakes Jack Johnson",
    "Lost in Japan Shawn Mendes",
    "Bloom The Paper Kites"
  ],
  kalandos: [
    "Adventure of a Lifetime Coldplay",
    "On Top Of The World Imagine Dragons",
    "The Nights Avicii",
    "Run OneRepublic",
    "Send Me On My Way Rusted Root",
    "Dog Days Are Over Florence"
  ],
  misztikus: [
    "bad guy Billie Eilish",
    "Seven Nation Army The White Stripes",
    "Sweet Dreams Eurythmics",
    "Heathens Twenty One Pilots",
    "Runaway AURORA",
    "Bury a Friend Billie Eilish"
  ],
  felelmetes: [
    "Thriller Michael Jackson",
    "bury a friend Billie Eilish",
    "Disturbia Rihanna",
    "Psycho Killer Talking Heads",
    "Sweet Dreams Marilyn Manson",
    "Bad Moon Rising Creedence Clearwater Revival"
  ],
  inspiralo: [
    "Hall of Fame The Script",
    "Fight Song Rachel Platten",
    "Stronger Kelly Clarkson",
    "Rise Katy Perry",
    "Unstoppable Sia",
    "Believer Imagine Dragons"
  ],
  energikus: [
    "Titanium David Guetta Sia",
    "Don't Start Now Dua Lipa",
    "Blinding Lights The Weeknd",
    "Can't Hold Us Macklemore",
    "Wake Me Up Avicii",
    "Uptown Funk Mark Ronson Bruno Mars"
  ],
  sotet: [
    "Take Me To Church Hozier",
    "Everybody Wants To Rule The World Lorde",
    "Mad World Gary Jules",
    "Control Halsey",
    "In The End Linkin Park",
    "Radioactive Imagine Dragons"
  ],
  konnyed: [
    "Sunday Best Surfaces",
    "Put Your Records On Corinne Bailey Rae",
    "Riptide Vance Joy",
    "I'm Yours Jason Mraz",
    "Budapest George Ezra",
    "Better Together Jack Johnson"
  ],
  epikus: [
    "Radioactive Imagine Dragons",
    "Centuries Fall Out Boy",
    "Warriors Imagine Dragons",
    "Run Boy Run Woodkid",
    "Viva La Vida Coldplay",
    "Pompeii Bastille"
  ],
  akciodus: [
    "Believer Imagine Dragons",
    "Thunderstruck AC DC",
    "Eye of the Tiger Survivor",
    "Till I Collapse Eminem",
    "Seven Nation Army The White Stripes",
    "Can't Hold Us Macklemore"
  ],
  vicces: [
    "Happy Pharrell Williams",
    "Dance Monkey Tones and I",
    "Uptown Funk Mark Ronson",
    "I Gotta Feeling Black Eyed Peas",
    "Good as Hell Lizzo",
    "Sugar Maroon 5"
  ],
  futurisztikus: [
    "Midnight City M83",
    "Strobe Deadmau5",
    "Derezzed Daft Punk",
    "Starboy The Weeknd Daft Punk",
    "Blinding Lights The Weeknd",
    "Genesis Grimes"
  ],
  dramai: [
    "Another Love Tom Odell",
    "Shallow Lady Gaga Bradley Cooper",
    "Say Something A Great Big World",
    "Elastic Heart Sia",
    "Hurt Johnny Cash",
    "Lovely Billie Eilish Khalid"
  ],
  varazslatos: [
    "A Sky Full of Stars Coldplay",
    "Into the Unknown Idina Menzel",
    "Once Upon a Dream Lana Del Rey",
    "Yellow Coldplay",
    "Runaway AURORA",
    "Pure Imagination Gene Wilder"
  ],
  feszült: [
    "Enemy Imagine Dragons",
    "Heathens Twenty One Pilots",
    "Paint It Black The Rolling Stones",
    "In The End Linkin Park",
    "Bad Guy Billie Eilish",
    "Seven Nation Army The White Stripes"
  ],
  motiváló: [
    "Eye of the Tiger Survivor",
    "Unstoppable Sia",
    "Hall of Fame The Script",
    "Lose Yourself Eminem",
    "Stronger Kanye West",
    "The Greatest Sia"
  ],
  unnepi: [
    "All I Want for Christmas Is You Mariah Carey",
    "Last Christmas Wham",
    "Jingle Bell Rock Bobby Helms",
    "Let It Snow Dean Martin",
    "Santa Tell Me Ariana Grande",
    "It's Beginning to Look a Lot like Christmas Michael Buble"
  ],
  christmas: [
    "All I Want for Christmas Is You Mariah Carey",
    "Last Christmas Wham",
    "Jingle Bell Rock Bobby Helms",
    "Let It Snow Dean Martin",
    "Santa Tell Me Ariana Grande",
    "It's Beginning to Look a Lot like Christmas Michael Buble"
  ],
  bekuckozos: [
    "Sweater Weather The Neighbourhood",
    "Holocene Bon Iver",
    "Bloom The Paper Kites",
    "Roslyn Bon Iver St Vincent",
    "Cherry Wine Hozier",
    "The Night We Met Lord Huron"
  ],
  datenight: [
    "Earned It The Weeknd",
    "Adore You Harry Styles",
    "Lover Taylor Swift",
    "Thinking Out Loud Ed Sheeran",
    "Come Away With Me Norah Jones",
    "Die With A Smile Lady Gaga Bruno Mars"
  ],
  randis: [
    "Earned It The Weeknd",
    "Adore You Harry Styles",
    "Lover Taylor Swift",
    "Thinking Out Loud Ed Sheeran",
    "Come Away With Me Norah Jones",
    "Die With A Smile Lady Gaga Bruno Mars"
  ],
  tanulos: [
    "Weightless Marconi Union",
    "Experience Ludovico Einaudi",
    "Nuvole Bianche Ludovico Einaudi",
    "Comptine d'un autre ete Yann Tiersen",
    "River Flows In You Yiruma",
    "Intro The xx"
  ]
};

function createCard(item, isSaved = false) {

  const itemKey = getSavedKey(item);
  const encodedItemKey = encodeURIComponent(itemKey);
  const hasImage = Boolean(item.image);
  const imageSrc = item.image || getPlaceholderImage();
  const description = getCardDescription(item);
  cardItemStore.set(itemKey, item);

  return `
<div class="col-6 col-md-4 col-lg-3">

  <div class="card-item" role="button" tabindex="0"
       onclick='openCardDetailsByKey("${encodedItemKey}")'
       onkeydown='handleCardDetailsKey(event,"${encodedItemKey}")'>

    <button class="card-save ${isSaved ? 'saved' : ''}"
    type="button"
    data-save-key="${encodedItemKey}"
    aria-label="${isSaved ? 'Mentés törlése' : 'Mentés'}"
    onclick='event.stopPropagation();toggleSaveByKey("${encodedItemKey}",this)'>
    ${isSaved ? '♥' : '♡'}
    </button>

    <img src="${imageSrc}"
         class="card-image ${hasImage ? '' : 'placeholder-image'}"
         onload="checkCardImage(this)"
         onerror="usePlaceholderImage(this)">

    <div class="card-body">

      <h5 class="card-title">${item.title}</h5>

      ${description ? `<p class="card-description">${description}</p>` : ""}

      <div class="card-tags">

        <span class="tag tag-type">${item.type}</span>

        <span class="tag tag-platform">
          ${platformLogos[item.platform] ? `<img src="${platformLogos[item.platform]}">` : ""}
          ${item.platform}
        </span>

        ${item.moods ? item.moods.map(mood =>
    `<span class="tag tag-mood">${mood}</span>`
  ).join("") : ""}

      </div>

      <a href="${item.link}" target="_blank" class="card-button" onclick="event.stopPropagation()">
        Megnézem
      </a>

    </div>

  </div>

</div>
`; 
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtml(value) {
  const template = document.createElement("template");
  template.innerHTML = String(value || "");

  return template.content.textContent || template.innerText || "";
}

function getCardDescription(item) {
  const text = stripHtml(item?.description || item?.overview || "").trim();

  return text ? escapeHtml(text) : "";
}

function getFullCardDescription(item) {
  const text = stripHtml(item?.description || item?.overview || "").trim();

  if (text) return escapeHtml(text);

  if (item?.type === "zene") {
    return "Ehhez a zenei találathoz nem érhető el részletes tartalmi leírás, de a cím, az előadó és a hangulati kategória alapján illeszkedik a kereséshez.";
  }

  return "Ehhez a tartalomhoz jelenleg nem érhető el részletes leírás az API-ban.";
}

function ensureCardDetailsModal() {
  let modal = document.getElementById("cardDetailsModal");
  if (modal) return modal;

  document.body.insertAdjacentHTML("beforeend", `
    <div class="modal fade card-details-modal" id="cardDetailsModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="cardDetailsTitle"></h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Bezárás"></button>
          </div>
          <div class="modal-body" id="cardDetailsBody"></div>
        </div>
      </div>
    </div>
  `);

  return document.getElementById("cardDetailsModal");
}

function openCardDetails(item) {
  if (!item) return;

  const modal = ensureCardDetailsModal();
  const title = document.getElementById("cardDetailsTitle");
  const body = document.getElementById("cardDetailsBody");
  const imageSrc = item.image || getPlaceholderImage();
  const description = getFullCardDescription(item);

  title.textContent = item.title || "Részletek";
  body.innerHTML = `
    <div class="card-details-layout">
      <img src="${escapeHtml(imageSrc)}"
           class="card-details-image"
           onerror="usePlaceholderImage(this)">
      <div class="card-details-content">
        <div class="card-tags card-details-tags">
          <span class="tag tag-type">${escapeHtml(item.type || "")}</span>
          <span class="tag tag-platform">
            ${platformLogos[item.platform] ? `<img src="${escapeHtml(platformLogos[item.platform])}">` : ""}
            ${escapeHtml(item.platform || "")}
          </span>
          ${(item.moods || []).map(mood => `<span class="tag tag-mood">${escapeHtml(mood)}</span>`).join("")}
        </div>
        <p class="card-details-description">${description}</p>
        <a href="${escapeHtml(item.link || "#")}" target="_blank" class="card-button card-details-button">
          Megnézem
        </a>
      </div>
    </div>
  `;

  bootstrap.Modal.getOrCreateInstance(modal).show();
}

function openCardDetailsByKey(encodedItemKey) {
  const itemKey = decodeURIComponent(encodedItemKey);
  openCardDetails(cardItemStore.get(itemKey));
}

function handleCardDetailsKey(event, encodedItemKey) {
  if (event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();
  openCardDetailsByKey(encodedItemKey);
}

function showEmptyState(container, message = "Nincs találat ehhez a szűréshez.") {
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <h4>Nincs találat</h4>
      <p>${message}</p>
    </div>
  `;
}

function getPlaceholderImage() {
  return "assets/Images/nincs-kep.jpg";
}

function hasRealImage(item) {
  const image = String(item?.image || "").trim();

  return Boolean(image) && !image.endsWith("nincs-kep.jpg");
}

function prioritizeItemsWithImages(items) {
  return [...(items || [])]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const imageDifference = Number(hasRealImage(b.item)) - Number(hasRealImage(a.item));

      if (imageDifference !== 0) return imageDifference;

      return a.index - b.index;
    })
    .map(({ item }) => item);
}

async function fillMissingItemImage(item) {
  if (!item || hasRealImage(item)) return item;

  if (item.type === "film" || item.type === "sorozat") {
    item.image = await getMoviePoster(item.title);
  }

  if (item.type === "konyv") {
    item.image = await getBookCover(item.title);
  }

  if (item.type === "zene") {
    item.image = await getMusicCover(item.title);
  }

  return item;
}

function canLoadImage(src, timeoutMs = 2500) {
  return new Promise(resolve => {
    if (!src) {
      resolve(false);
      return;
    }

    const image = new Image();
    const timeoutId = setTimeout(() => {
      image.onload = null;
      image.onerror = null;
      resolve(false);
    }, timeoutMs);

    image.onload = () => {
      clearTimeout(timeoutId);
      resolve(image.naturalWidth > 20 && image.naturalHeight > 20);
    };

    image.onerror = () => {
      clearTimeout(timeoutId);
      resolve(false);
    };

    image.src = src;
  });
}

async function keepOnlyItemsWithImages(items) {
  const hydratedItems = await Promise.all((items || []).map(fillMissingItemImage));
  const checks = await Promise.all(hydratedItems.map(async item => ({
    item,
    hasLoadableImage: hasRealImage(item) && await canLoadImage(item.image)
  })));

  return checks
    .filter(({ hasLoadableImage }) => hasLoadableImage)
    .map(({ item }) => item);
}

function shuffleItems(items) {
  return [...(items || [])].sort(() => 0.5 - Math.random());
}

function getContentDuplicateKey(item) {
  const title = item?.originalTitle || item?.title || "";
  let normalizedTitle = String(title)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+[-–—]\s+.*$/, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(the|a|an|az|a)\b/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  if (item?.type === "konyv") {
    normalizedTitle = normalizedTitle
      .replace(/\b(kotet|konyv|resz|evad|sorozat|regeny|puha kotese?u?|kemeny kotese?u?|ebook|hangoskonyv)\b/g, " ")
      .replace(/\b\d+\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return `${item?.type || ""}|${normalizedTitle}`;
}

function uniqueItems(items) {
  const seen = new Set();

  return (items || []).filter(item => {
    const key = getContentDuplicateKey(item);
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

async function fillToMinimumWithImages(items, predicate, minimumCount, maximumCount = minimumCount) {
  const selected = uniqueItems(prioritizeItemsWithImages(await keepOnlyItemsWithImages(items)));

  const selectedKeys = new Set(selected.map(getContentDuplicateKey));
  const candidates = shuffleItems(contents.filter(item =>
    predicate(item) && !selectedKeys.has(getContentDuplicateKey(item))
  )).slice(0, 40);
  const fallbackItems = prioritizeItemsWithImages(await keepOnlyItemsWithImages(candidates));

  return uniqueItems([...selected, ...fallbackItems]).slice(0, maximumCount);
}

async function prepareSectionItems(items, minimumCount, maximumCount = minimumCount) {
  return uniqueItems(prioritizeItemsWithImages(await keepOnlyItemsWithImages(items)))
    .slice(0, maximumCount);
}

function usePlaceholderImage(imageElement) {
  if (!imageElement) return;

  const placeholder = getPlaceholderImage();
  const currentSrc = imageElement.getAttribute("src") || "";

  imageElement.classList.add("placeholder-image");

  if (!currentSrc.endsWith("nincs-kep.jpg")) {
    imageElement.src = placeholder;
  }
}

function checkCardImage(imageElement) {
  if (!imageElement) return;

  const src = imageElement.getAttribute("src") || "";

  if (
    !src ||
    imageElement.naturalWidth <= 1 ||
    imageElement.naturalHeight <= 1
  ) {
    usePlaceholderImage(imageElement);
  }
}

function refreshCardImages(container = document) {
  container.querySelectorAll(".card-image").forEach(imageElement => {
    if (imageElement.complete) {
      checkCardImage(imageElement);
    }
  });
}

async function getMoviePoster(title) {

  const url =
    `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=${TMDB_LANGUAGE}&region=HU&query=${encodeURIComponent(title)}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.results && data.results.length > 0 && data.results[0].poster_path) {
    return "https://image.tmdb.org/t/p/w500" + data.results[0].poster_path;
  }

  return "";
}

async function getBookCover(title) {

  const url =
    `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.docs && data.docs.length > 0 && data.docs[0].cover_i) {
    return `https://covers.openlibrary.org/b/id/${data.docs[0].cover_i}-L.jpg`;
  }

  return "";
}

async function getMusicCover(title) {

  const url =
    `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&entity=song&limit=1`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.results && data.results.length > 0) {
    return data.results[0].artworkUrl100.replace("100x100", "500x500");
  }

  return "";
}

function getPrimaryKeyword(mood) {
  return mood?.apiKeywords?.[0] || mood?.label || "";
}

async function fetchJsonWithTimeout(url, timeoutMs = 4500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

function getRecentDateCutoff(yearsBack = 6) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - yearsBack);
  return date.toISOString().slice(0, 10);
}

async function fetchTmdbDiscoverPage(endpoint, params, page) {
  const pageParams = new URLSearchParams(params);
  pageParams.set("page", String(page));

  const data = await fetchJsonWithTimeout(
    `https://api.themoviedb.org/3/${endpoint}?${pageParams.toString()}`,
    6000
  );

  return data.results || [];
}

function getTmdbProvider(watchProviders) {
  const huProviders = watchProviders?.results?.[TMDB_REGION];
  if (!huProviders) return null;

  const availableProviders = [
    ...(huProviders.flatrate || []),
    ...(huProviders.rent || []),
    ...(huProviders.buy || [])
  ];

  return availableProviders.find(provider => streamingProviders[provider.provider_id]) || null;
}

function getProviderLink(provider, title) {
  const mappedProvider = provider ? streamingProviders[provider.provider_id] : null;
  return mappedProvider?.searchUrl(title) || `https://www.themoviedb.org/search?query=${encodeURIComponent(title)}&language=hu-HU`;
}

function getProviderName(provider) {
  const mappedProvider = provider ? streamingProviders[provider.provider_id] : null;
  return mappedProvider?.name || provider?.provider_name || "TMDB";
}

function getBookTitle(book) {
  return book.title || book.subtitle || book.volumeInfo?.title || "";
}

function getBookAuthor(book) {
  return book.author_name?.[0] || book.volumeInfo?.authors?.[0] || "";
}

function getBookStore(title, index = 0) {
  const storeNames = Object.keys(bookStores);
  const name = storeNames[index % storeNames.length];

  return {
    name,
    link: bookStores[name](title)
  };
}

function getGoogleBookIsbn(book) {
  const identifiers = book.volumeInfo?.industryIdentifiers || [];
  const isbn13 = identifiers.find(identifier => identifier.type === "ISBN_13")?.identifier;
  const isbn10 = identifiers.find(identifier => identifier.type === "ISBN_10")?.identifier;

  return isbn13 || isbn10 || "";
}

function getOpenLibraryCoverFromIsbn(isbn) {
  return isbn ? `https://covers.openlibrary.org/b/isbn/${encodeURIComponent(isbn)}-L.jpg` : "";
}

function getGoogleBookThumbnail(book) {
  const links = book.volumeInfo?.imageLinks || {};
  return (links.thumbnail || links.smallThumbnail || "").replace("http://", "https://");
}

function isHungarianGoogleBook(book) {
  const info = book.volumeInfo || {};
  const title = info.title || "";
  const language = info.language;
  const saleCountry = book.saleInfo?.country;

  return language === "hu" && saleCountry === "HU" && Boolean(title);
}

function scoreBook(book) {
  const info = book.volumeInfo || book;
  const hasOpenLibraryCover = Boolean(getGoogleBookIsbn(book) || book.cover_i);
  const coverBonus = hasOpenLibraryCover ? 120 : 0;
  const ratingBonus = Math.round((info.averageRating || book.ratings_average || 0) * 12);
  const countBonus = Math.min(info.ratingsCount || book.edition_count || 0, 100);
  const recentYear = Number((info.publishedDate || "").slice(0, 4)) || book.first_publish_year;
  const recentBonus = recentYear && recentYear >= 2015 ? 20 : 0;
  const accentBonus = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/.test(info.title || "") ? 20 : 0;
  const hungarianBonus = isHungarianGoogleBook(book) ? 80 : 0;

  return coverBonus + ratingBonus + countBonus + recentBonus + hungarianBonus + accentBonus;
}

function mapOpenLibraryBook(book, moodLabel, index = 0) {
  const title = getBookTitle(book);
  const author = getBookAuthor(book);
  const store = getBookStore(author ? `${title} ${author}` : title, index);

  return {
    title: author ? `${title} - ${author}` : title,
    type: "konyv",
    moods: [moodLabel],
    platform: store.name,
    link: store.link,
    image: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg` : ""
  };
}

function mapGoogleBook(book, moodLabel, index = 0) {
  const info = book.volumeInfo || {};
  const title = info.title || "";
  const author = info.authors?.[0] || "";
  const isbn = getGoogleBookIsbn(book);
  const store = getBookStore(author ? `${title} ${author}` : title, index);

  return {
    title: author ? `${title} - ${author}` : title,
    type: "konyv",
    moods: [moodLabel],
    platform: store.name,
    link: store.link,
    image: getGoogleBookThumbnail(book) || getOpenLibraryCoverFromIsbn(isbn),
    description: info.description || info.subtitle || ""
  };
}

function getTranslatedBookQueries(moodKey, mood) {
  const moodQueries = translatedBookQueriesByMood[moodKey] || [];
  const keyword = getPrimaryKeyword(mood);

  return [...new Set([...moodQueries, keyword].filter(Boolean))].slice(0, 2);
}

function collectGoogleBooks(results) {
  const seen = new Set();
  const books = [];

  results.forEach(result => {
    if (result.status !== "fulfilled") return;

    (result.value.items || []).forEach(book => {
      if (!isHungarianGoogleBook(book)) return;

      const title = getBookTitle(book);
      if (!title) return;

      const key = getContentDuplicateKey({
        type: "konyv",
        title: getBookAuthor(book) ? `${title} - ${getBookAuthor(book)}` : title
      });
      if (seen.has(key)) return;

      seen.add(key);
      books.push(book);
    });
  });

  return books;
}

function diversifyBooksByAuthor(scoredBooks, limit = 24, maxPerAuthor = 1) {
  const selected = [];
  const authorCounts = new Map();

  for (const book of scoredBooks) {
    const author = getBookAuthor(book.rawBook || book.item).toLowerCase() || "ismeretlen";
    const count = authorCounts.get(author) || 0;

    if (count >= maxPerAuthor) continue;

    authorCounts.set(author, count + 1);
    selected.push(book);

    if (selected.length >= limit) return selected;
  }

  for (const book of scoredBooks) {
    if (selected.includes(book)) continue;

    selected.push(book);
    if (selected.length >= limit) break;
  }

  return selected;
}

function getMusicMoodQueries(moodKey, mood) {
  const normalizedKey = moodKey || "";
  const directQueries = musicQueriesByMood[normalizedKey] || [];
  const keywordQueries = (mood?.apiKeywords || [])
    .filter(keyword => /^[a-z0-9\s-]+$/i.test(keyword))
    .slice(0, 2);

  return [...new Set([...directQueries, ...keywordQueries, "popular song"])].slice(0, 6);
}

function getCuratedMusicQueries(moodKey) {
  return curatedMusicCollectionsByMood[moodKey] || [];
}

function songSearchText(song) {
  return [
    song.trackName,
    song.collectionName,
    song.primaryGenreName
  ].filter(Boolean).join(" ").toLowerCase();
}

function scoreSong(song, moodQueries = []) {
  const artworkBonus = song.artworkUrl100 ? 80 : 0;
  const explicitPenalty = song.trackExplicitness === "explicit" ? -10 : 0;
  const recentBonus = song.releaseDate && Number(song.releaseDate.slice(0, 4)) >= 2020 ? 25 : 0;
  const collectionBonus = song.collectionName ? 10 : 0;
  const text = songSearchText(song);
  const moodBonus = moodQueries.reduce((score, query) => {
    const words = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const matches = words.filter(word => text.includes(word)).length;

    return score + matches * 18;
  }, 0);

  return artworkBonus + recentBonus + collectionBonus + moodBonus + explicitPenalty;
}

function scoreCuratedSong(song, preferredQueries = [], moodQueries = []) {
  const normalizedSong = `${song.trackName || ""} ${song.artistName || ""}`.toLowerCase();
  const collectionIndex = preferredQueries.findIndex(query => {
    const words = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);

    return words.length > 0 && words.every(word => normalizedSong.includes(word));
  });
  const collectionBonus = collectionIndex >= 0 ? 500 - collectionIndex * 8 : 0;

  return collectionBonus + scoreSong(song, moodQueries);
}

function mapItunesSong(song, moodLabel) {
  return {
    title: `${song.trackName} - ${song.artistName}`,
    type: "zene",
    moods: [moodLabel],
    platform: "Apple Music",
    link: song.trackViewUrl,
    image: song.artworkUrl100 ? song.artworkUrl100.replace("100x100", "500x500") : ""
  };
}

function collectItunesSongs(results) {
  const seen = new Set();
  const songs = [];

  results.forEach(result => {
    if (result.status !== "fulfilled") return;

    (result.value.results || []).forEach(song => {
      if (!song.trackName || !song.artistName || !song.artworkUrl100 || !song.trackViewUrl) return;

      const key = `${song.trackName}|${song.artistName}`.toLowerCase();
      if (seen.has(key)) return;

      seen.add(key);
      songs.push(song);
    });
  });

  return songs;
}

async function fetchTmdbDetails(type, id) {
  const mediaType = type === "sorozat" ? "tv" : "movie";
  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: TMDB_LANGUAGE,
    append_to_response: "watch/providers"
  });

  const response = await fetch(`https://api.themoviedb.org/3/${mediaType}/${id}?${params.toString()}`);
  return response.json();
}

function scoreTmdbResult(item, result, type) {
  const originalTitle = type === "sorozat" ? result.original_name : result.original_title;
  const hasLocalizedTitle = item.title && originalTitle && item.title !== originalTitle;
  const providerBonus = item.platform !== "TMDB" ? 80 : 0;
  const hungarianBonus = hasLocalizedTitle ? 40 : 0;
  const voteBonus = Math.min(result.vote_count || 0, 3000) / 100;
  const popularityBonus = result.popularity || 0;

  return providerBonus + hungarianBonus + voteBonus + popularityBonus;
}

async function fetchTmdbItems(type, mood) {
  const genres = type === "sorozat" ? mood?.tvGenres : mood?.movieGenres;
  const endpoint = type === "sorozat" ? "discover/tv" : "discover/movie";
  const dateField = type === "sorozat" ? "first_air_date.gte" : "primary_release_date.gte";
  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: TMDB_LANGUAGE,
    region: TMDB_REGION,
    watch_region: TMDB_REGION,
    sort_by: "popularity.desc",
    include_adult: "false",
    include_video: "false",
    "vote_count.gte": "80",
    "vote_average.gte": "5.8",
    "with_watch_monetization_types": "flatrate"
  });

  params.set(dateField, getRecentDateCutoff());

  if (genres?.length) {
    params.set("with_genres", genres.join("|"));
  }

  const pageResults = await Promise.allSettled([1, 2].map(page => fetchTmdbDiscoverPage(endpoint, params, page)));
  const baseResults = pageResults
    .flatMap(result => result.status === "fulfilled" ? result.value : [])
    .filter(result => result.poster_path)
    .slice(0, 18);

  const detailedItems = await Promise.all(baseResults.map(async result => {
    const details = await fetchTmdbDetails(type, result.id);
    const provider = getTmdbProvider(details["watch/providers"]);
    const title = type === "sorozat"
      ? details.name || result.name || details.original_name || result.original_name
      : details.title || result.title || details.original_title || result.original_title;
    const originalTitle = type === "sorozat"
      ? details.original_name || result.original_name
      : details.original_title || result.original_title;
    const linkTitle = title || originalTitle;
    const item = {
      title: title || originalTitle,
      originalTitle,
      type,
      moods: [mood.label],
      platform: getProviderName(provider),
      link: getProviderLink(provider, linkTitle),
      tmdbLink: `https://www.themoviedb.org/${type === "sorozat" ? "tv" : "movie"}/${result.id}?language=hu-HU`,
      image: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : "",
      description: details.overview || result.overview || ""
    };

    return {
      item,
      score: scoreTmdbResult(item, result, type)
    };
  }));

  return detailedItems
    .filter(({ item }) => item.title && item.platform !== "TMDB")
    .sort((a, b) => b.score - a.score)
    .slice(0, 18)
    .map(({ item }) => item);
}

async function fetchPopularTmdbItems(type) {
  const endpoint = type === "sorozat" ? "discover/tv" : "discover/movie";
  const dateField = type === "sorozat" ? "first_air_date.gte" : "primary_release_date.gte";
  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: TMDB_LANGUAGE,
    region: TMDB_REGION,
    watch_region: TMDB_REGION,
    sort_by: "popularity.desc",
    include_adult: "false",
    include_video: "false",
    "vote_count.gte": "150",
    "vote_average.gte": "5.8",
    "with_watch_monetization_types": "flatrate"
  });

  params.set(dateField, getRecentDateCutoff());

  const pageResults = await Promise.allSettled([1, 2, 3].map(page => fetchTmdbDiscoverPage(endpoint, params, page)));
  const baseResults = pageResults
    .flatMap(result => result.status === "fulfilled" ? result.value : [])
    .filter(result => result.poster_path)
    .slice(0, 24);

  const detailedItems = await Promise.all(baseResults.map(async result => {
    const details = await fetchTmdbDetails(type, result.id);
    const provider = getTmdbProvider(details["watch/providers"]);
    const title = type === "sorozat"
      ? details.name || result.name || details.original_name || result.original_name
      : details.title || result.title || details.original_title || result.original_title;
    const originalTitle = type === "sorozat"
      ? details.original_name || result.original_name
      : details.original_title || result.original_title;
    const item = {
      title: title || originalTitle,
      originalTitle,
      type,
      moods: ["Népszerű"],
      platform: getProviderName(provider),
      link: getProviderLink(provider, title || originalTitle),
      tmdbLink: `https://www.themoviedb.org/${type === "sorozat" ? "tv" : "movie"}/${result.id}?language=hu-HU`,
      image: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : "",
      description: details.overview || result.overview || ""
    };

    return {
      item,
      score: scoreTmdbResult(item, result, type)
    };
  }));

  return detailedItems
    .filter(({ item }) => item.title && item.platform !== "TMDB")
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ item }) => item);
}

async function fetchBookItems(mood, moodKey) {
  const queries = getTranslatedBookQueries(moodKey, mood);
  const requests = queries.map(query =>
    fetchJsonWithTimeout(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&langRestrict=hu&country=HU&printType=books&maxResults=20`)
  );
  const results = await Promise.allSettled(requests);

  return uniqueItems(collectGoogleBooks(results)
    .map((book, index) => ({
      item: mapGoogleBook(book, mood.label, index),
      rawBook: book,
      score: scoreBook(book)
    }))
    .filter(({ item }) => item.title)
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map(({ item }) => item));
}

async function fetchMusicItems(mood, moodKey = "") {
  const moodQueries = getMusicMoodQueries(moodKey, mood);
  const curatedQueries = getCuratedMusicQueries(moodKey);
  const searchQueries = [...new Set([...curatedQueries, ...moodQueries])].slice(0, 14);
  const requests = searchQueries.map(query =>
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&country=HU&media=music&limit=25`)
      .then(response => response.json())
  );
  const results = await Promise.allSettled(requests);

  return collectItunesSongs(results)
    .map(song => ({
      item: mapItunesSong(song, mood.label),
      score: scoreCuratedSong(song, curatedQueries, moodQueries)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map(({ item }) => item);
}

async function fetchPopularBookItems() {
  const requests = popularTranslatedBookQueries.map(query =>
    fetchJsonWithTimeout(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&langRestrict=hu&country=HU&printType=books&maxResults=20`)
  );

  const results = await Promise.allSettled(requests);

  const scoredBooks = collectGoogleBooks(results)
    .map((book, index) => ({
      item: mapGoogleBook(book, "Népszerű", index),
      rawBook: book,
      score: scoreBook(book)
    }))
    .filter(({ item }) => item.title)
    .sort((a, b) => b.score - a.score);

  return uniqueItems(diversifyBooksByAuthor(scoredBooks, 24, 1)
    .map(({ item }) => item));
}

async function fetchPopularMusicItems() {
  const requests = musicSearchTerms.map(term =>
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&country=HU&media=music&limit=25`)
      .then(response => response.json())
  );

  const results = await Promise.allSettled(requests);

  return collectItunesSongs(results)
    .map(song => ({
      item: mapItunesSong(song, "Népszerű"),
      score: scoreSong(song)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .map(({ item }) => item);
}

async function fetchApiRecommendations(moodKey, type = "all") {
  const mood = getMoodByKey(moodKey);
  if (!mood) return [];

  const requests = [];

  if (type === "all" || type === "film") requests.push(fetchTmdbItems("film", mood));
  if (type === "all" || type === "sorozat") requests.push(fetchTmdbItems("sorozat", mood));
  if (type === "all" || type === "konyv") requests.push(fetchBookItems(mood, moodKey));
  if (type === "all" || type === "zene") requests.push(fetchMusicItems(mood, moodKey));

  const results = await Promise.allSettled(requests);

  return uniqueItems(results.flatMap(result => result.status === "fulfilled" ? result.value : []));
}

async function fetchPopularByType(type) {
  if (type === "film") return fetchPopularTmdbItems("film");
  if (type === "sorozat") return fetchPopularTmdbItems("sorozat");
  if (type === "konyv") return fetchPopularBookItems();
  if (type === "zene") return fetchPopularMusicItems();

  if (type === "all") {
    const results = await Promise.allSettled([
      fetchPopularTmdbItems("film"),
      fetchPopularTmdbItems("sorozat"),
      fetchPopularBookItems(),
      fetchPopularMusicItems()
    ]);

    return uniqueItems(results.flatMap(result => result.status === "fulfilled" ? result.value : []));
  }

  return [];
}

function filterLocalContents(moodInput, typeInput, platformInput = "all") {
  return contents.filter(item => {
    const moodMatch =
      !moodInput || item.moods.some(mood => mood.toLowerCase() === moodInput.toLowerCase());

    const typeMatch =
      typeInput === "all" || item.type === typeInput;

    const platformMatch =
      platformInput === "all" || item.platform === platformInput;

    return moodMatch && typeMatch && platformMatch;
  });
}

const platformLogos = {
  "Netflix": "assets/Images/logo/netflix.webp",
  "HBO": "assets/Images/logo/hbo.jpg",
  "Spotify": "assets/Images/logo/spotify.png",
  "Disney+": "assets/Images/logo/disney.png",
  "Prime Video": "assets/Images/logo/amazon.jpg",
  "Max": "assets/Images/logo/hbo.jpg",
  "HBO Max": "assets/Images/logo/hbo.jpg",
  "Libri": "assets/Images/logo/libri.jpg",
  "Bookline": "assets/Images/logo/libri.jpg",
  "Open Library": "assets/Images/logo/libri.jpg"

};

const platformClasses = {
  "Netflix": "platform-netflix",
  "HBO": "platform-hbo",
  "Disney+": "platform-disney",
  "Prime Video": "platform-primevideo",
  "Spotify": "platform-spotify",
  "Libri": "platform-libri",
  "Bookline": "platform-bookline"
};

function selectMood(mood) {
  window.location.href = `eredmenyek.html?mood=${encodeURIComponent(mood)}`;
}

async function showResults() {

  const params = new URLSearchParams(window.location.search);

  const moodParam = params.get("mood");
  const tipusParam = params.get("tipus") || params.get("type");

  const moodInput = document.getElementById("moodFilter");
  const typeInput = document.getElementById("typeFilter");

  if (moodParam && moodInput) {
    moodInput.value = moodParam;
  }

  if (tipusParam && typeInput) {
    typeInput.value = tipusParam;
  }

  await applyFilters();
}

function searchMood() {

  const input = document.getElementById("moodSearch").value.toLowerCase();

  let mood = "";
  let type = "";

  /* TÍPUS felismerése */
  if (input.includes("film")) type = "film";
  if (input.includes("sorozat")) type = "sorozat";
  if (input.includes("zene")) type = "zene";
  if (input.includes("konyv")) type = "konyv";

  const foundMood = findMood(input);
  if (foundMood) {
    mood = foundMood[0];
  }

  /* URL paraméterek */
  let url = "eredmenyek.html?";

  if (mood) url += `mood=${encodeURIComponent(mood)}&`;
  if (type) url += `type=${encodeURIComponent(type)}`;

  window.location.href = url;

}

document.addEventListener("DOMContentLoaded", () => {

  generateTodayPicks();
  generatePopularMoviesSeries();
  generatePopularMusic();
  generatePopularBooks();

  const input = document.getElementById("moodSearch");

  if (input) {
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        searchMood();
      }
    });
  }

});

async function renderResults(items) {
  const container = document.getElementById("results");

  if (!container) return;

  items = uniqueItems(prioritizeItemsWithImages(await keepOnlyItemsWithImages(items)));

  container.innerHTML = "";

  if (!items || items.length === 0) {
    showEmptyState(container, "Próbálj másik hangulatot, típust vagy platformot választani.");
    return;
  }

  const savedKeys = await getSavedKeys();

  items.forEach(item => {

    const isSaved = savedKeys.has(getSavedKey(item));

    const platformClass = platformClasses[item.platform] || "";
    const platformLogo = platformLogos[item.platform] || "";

    container.innerHTML += createCard(item, isSaved);

  });

  refreshCardImages(container);
}

async function applyFilters() {
  if (!document.getElementById("results")) return;

  const moodInput = document
    .getElementById("moodFilter")
    .value
    .toLowerCase()
    .trim();

  const typeInput = document
    .getElementById("typeFilter")
    .value;

  const platformInput = document
    .getElementById("platformFilter")
    .value;

  const foundMood = getMoodByKey(moodInput) ? [moodInput, getMoodByKey(moodInput)] : findMood(moodInput);
  let filtered = [];

  if (foundMood && platformInput === "all") {
    filtered = await fetchApiRecommendations(foundMood[0], typeInput);
  }

  if (!foundMood && platformInput === "all") {
    filtered = await fetchPopularByType(typeInput);
  }

  if (filtered.length === 0) {
    filtered = filterLocalContents(moodInput, typeInput, platformInput);
  }

  renderResults(filtered);

}

const placeholderExamples = [
  "romantikus film",
  "misztikus sorozat",
  "kalandos konyv",
  "chill zene"
];

let exampleIndex = 0;

function rotatePlaceholder() {

  const input = document.getElementById("moodSearch");

  if (!input) return;

  input.placeholder = placeholderExamples[exampleIndex];

  exampleIndex++;

  if (exampleIndex >= placeholderExamples.length) {
    exampleIndex = 0;
  }
}

setInterval(rotatePlaceholder, 2500);

async function quickFilter(type) {
  if (!document.getElementById("results")) return;

  const buttons = document.querySelectorAll(".filter-btn");

  buttons.forEach(btn => {
    btn.classList.remove("active");
  });

  const clickedButton = document.querySelector(`[data-type="${type}"]`);

  if (clickedButton) {
    clickedButton.classList.add("active");
  }

  const moodInput = document
    .getElementById("moodFilter")
    .value
    .toLowerCase()
    .trim();

  const platformInput = document
    .getElementById("platformFilter")
    .value;

  const foundMood = getMoodByKey(moodInput) ? [moodInput, getMoodByKey(moodInput)] : findMood(moodInput);
  let filtered = [];

  if (foundMood && platformInput === "all") {
    filtered = await fetchApiRecommendations(foundMood[0], type);
  }

  if (!foundMood && platformInput === "all") {
    filtered = await fetchPopularByType(type);
  }

  if (filtered.length === 0) {
    filtered = filterLocalContents(moodInput, type, platformInput);
  }

  renderResults(filtered);
}

function randomVibe() {

  const allMoods = getMoodLabels().map(mood => mood.key);

  if (allMoods.length === 0) return;

  /* Random hangulat */
  const randomIndex = Math.floor(Math.random() * allMoods.length);
  const randomMood = allMoods[randomIndex];

  /* Átirányítás az eredmények oldalra */
  window.location.href = `eredmenyek.html?mood=${encodeURIComponent(randomMood)}`;

}

let randomPick = null;

function generateRandomRecommendation() {

  if (typeof contents === "undefined" || contents.length === 0) return;

  const randomIndex = Math.floor(Math.random() * contents.length);
  randomPick = contents[randomIndex];

  const title = document.getElementById("randomTitle");
  const mood = document.getElementById("randomMood");

  if (title) title.innerText = randomPick.title;
  if (mood) mood.innerText = "Hangulat: " + randomPick.moods[0];

}

function goToRandom() {

  if (!randomPick) return;

  window.open(randomPick.link, "_blank");

}

document.addEventListener("DOMContentLoaded", generateRandomRecommendation);

async function generateTodayPicks() {

  const container = document.getElementById("todayPicks");

  if (!container) return;

  const types = ["film", "sorozat", "konyv", "zene"];
  let selected = [];

  container.innerHTML = "";

  for (const type of types) {
    let filtered = [];

    try {
      filtered = await fetchPopularByType(type);
    } catch (error) {
      console.error(`${type} ajánló API betöltése sikertelen.`, error);
    }

    if (filtered.length === 0) {
      filtered = contents.filter(item => item.type === type);
    }

    filtered = uniqueItems(await keepOnlyItemsWithImages(filtered));

    const randomIndex = Math.floor(Math.random() * filtered.length);

    const item = filtered[randomIndex];

    if (!item) continue;

    selected.push(item);

  }

  if (selected.length < 4) {
    const moreResults = await Promise.allSettled(types.map(type => fetchPopularByType(type)));
    const extraItems = moreResults.flatMap(result => result.status === "fulfilled" ? result.value : []);
    selected = uniqueItems([...selected, ...await keepOnlyItemsWithImages(extraItems)]).slice(0, 4);
  }

  if (selected.length === 0) {
    showEmptyState(container, "Most nem sikerült képes ajánlókat betölteni.");
    return;
  }

  selected.forEach(item => {
    container.innerHTML += createCard(item);
  });

  refreshCardImages(container);

}

async function generatePopularMoviesSeries() {

  const container = document.getElementById("moviesSlider");

  if (!container) return;

  container.innerHTML = "";

  let selected = [];

  try {
    const [movies, series] = await Promise.all([
      fetchPopularTmdbItems("film"),
      fetchPopularTmdbItems("sorozat")
    ]);

    selected = uniqueItems([...movies, ...series]);
  } catch (error) {
    console.error("Népszerű filmek és sorozatok API betöltése sikertelen.", error);
  }

  if (selected.length === 0) {
    const filtered = contents.filter(item =>
      item.type === "film" || item.type === "sorozat"
    );

    selected = [...filtered].sort(() => 0.5 - Math.random()).slice(0, 10);
  }

  selected = await prepareSectionItems(selected, 10, 10);

  if (selected.length === 0) {
    showEmptyState(container, "Most nem sikerült népszerű filmeket és sorozatokat betölteni.");
    return;
  }

  for (const item of selected) {
    container.innerHTML += createCard(item);
  }

  refreshCardImages(container);

}

function scrollSlider(id, direction) {

  const container = document.getElementById(id);

  if (!container) return;   // ← fontos

  const card = container.querySelector(".card-item");

  if (!card) return;

  const scrollAmount = card.offsetWidth + 24;

  container.scrollBy({
    left: direction * scrollAmount,
    behavior: "smooth"
  });

}

async function generatePopularMusic() {

  const container = document.getElementById("musicSlider");

  if (!container) return;

  container.innerHTML = "";

  let selected = [];

  try {
    selected = await fetchPopularMusicItems();
  } catch (error) {
    console.error("Népszerű zenék API betöltése sikertelen.", error);
  }

  if (selected.length === 0) {
    const filtered = contents.filter(item =>
      item.type === "zene"
    );

    selected = [...filtered].sort(() => 0.5 - Math.random()).slice(0, 10);
  }

  selected = await prepareSectionItems(selected, 10, 10);

  if (selected.length === 0) {
    showEmptyState(container, "Most nem sikerült népszerű zenéket betölteni.");
    return;
  }

  for (const item of selected) {
    container.innerHTML += createCard(item);

  }

  refreshCardImages(container);

}

async function generatePopularBooks() {

  const container = document.getElementById("booksSlider");

  if (!container) return;

  container.innerHTML = "";

  let selected = [];

  try {
    selected = await fetchPopularBookItems();
  } catch (error) {
    console.error("Népszerű könyvek API betöltése sikertelen.", error);
  }

  if (selected.length === 0) {
    const filtered = contents.filter(item =>
      item.type === "konyv"
    );

    selected = [...filtered].sort(() => 0.5 - Math.random()).slice(0, 10);
  }

  selected = await prepareSectionItems(selected, 10, 10);

  if (selected.length === 0) {
    showEmptyState(container, "Most nem sikerült népszerű könyveket betölteni.");
    return;
  }

  for (const item of selected) {
    container.innerHTML += createCard(item);

  }

  refreshCardImages(container);

}

function selectCategory(type) {

  localStorage.removeItem("selectedMood");

  localStorage.setItem("selectedType", type);

  window.location.href = "eredmenyek.html";

}

let savedKeysCache = null;
const saveBusyKeys = new Set();

function getSavedKey(item) {
  return [
    item.title || "",
    item.type || "",
    item.platform || "",
    item.link || ""
  ].map(value => String(value).trim().toLowerCase()).join("|");
}

function getSavedQuery(table, userId, item) {
  return table
    .eq("user_id", userId)
    .eq("title", item.title)
    .eq("type", item.type)
    .eq("platform", item.platform)
    .eq("link", item.link);
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function isSameSavedItem(savedItem, item) {
  const sameBasicFields =
    normalizeText(savedItem.title) === normalizeText(item.title) &&
    normalizeText(savedItem.type) === normalizeText(item.type) &&
    normalizeText(savedItem.platform) === normalizeText(item.platform);

  if (!sameBasicFields) return false;

  if (savedItem.link && item.link) {
    return normalizeText(savedItem.link) === normalizeText(item.link);
  }

  return true;
}

function getSavedItemPayload(userId, item) {
  return {
    user_id: userId,
    title: item.title,
    type: item.type,
    platform: item.platform,
    image: item.image || getPlaceholderImage(),
    link: item.link || "",
    moods: item.moods || [],
    description: item.description || item.overview || ""
  };
}

function getLegacySavedItemPayload(userId, item) {
  return {
    user_id: userId,
    title: item.title,
    type: item.type,
    platform: item.platform,
    image: item.image || getPlaceholderImage()
  };
}

function getSavedDescriptionFallback(item) {
  const type = normalizeText(item?.type);

  if (type === "film") {
    return "Hangulatalapú film ajánlás, amely a választott vibe és a népszerűségi szempontok alapján került a találatok közé.";
  }

  if (type === "sorozat") {
    return "Hangulathoz illő sorozatajánló, amely aktuális és népszerű tartalmak közül került kiválasztásra.";
  }

  if (type === "konyv") {
    return "Magyarul is elérhető könyvajánló, amely a keresett hangulathoz és olvasási élményhez illeszkedik.";
  }

  if (type === "zene") {
    return "Hangulat alapján ajánlott zenei találat, amely a választott vibe-hoz illő dalok közül került kiválasztásra.";
  }

  return "Hangulatalapú ajánlás, amely a VibeMatch keresési és szűrési logikája alapján jelent meg.";
}

function normalizeSavedItemForDisplay(item) {
  return {
    ...item,
    image: item.image || getPlaceholderImage(),
    link: item.link || "#",
    moods: Array.isArray(item.moods) ? item.moods : [],
    description: item.description || item.overview || getSavedDescriptionFallback(item)
  };
}

function getNumericFallbackId(offset = 0) {
  return Date.now() + offset;
}

function stringifySupabaseError(error) {
  if (!error) return "";

  return JSON.stringify({
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  });
}

async function insertSavedItemWithFallback(userId, item) {
  const payloads = [
    getSavedItemPayload(userId, item),
    { id: getNumericFallbackId(), ...getSavedItemPayload(userId, item) },
    getLegacySavedItemPayload(userId, item),
    { id: getNumericFallbackId(1), ...getLegacySavedItemPayload(userId, item) }
  ];

  let lastError = null;

  for (const payload of payloads) {
    const { error } = await supabase
      .from("saved_items")
      .insert([payload]);

    if (!error) return payload;

    lastError = error;
    console.warn("Supabase mentési próba sikertelen:", stringifySupabaseError(error));
  }

  throw lastError;
}

function getLocalSavedStorageKey(userId) {
  return `vibematch_saved_items_${userId}`;
}

function getLocalSavedItems(userId) {
  try {
    return JSON.parse(localStorage.getItem(getLocalSavedStorageKey(userId))) || [];
  } catch (error) {
    return [];
  }
}

function setLocalSavedItems(userId, items) {
  localStorage.setItem(getLocalSavedStorageKey(userId), JSON.stringify(items));
}

function saveLocalItem(userId, item) {
  const items = getLocalSavedItems(userId);
  const key = getSavedKey(item);

  if (!items.some(savedItem => getSavedKey(savedItem) === key)) {
    items.push(item);
    setLocalSavedItems(userId, items);
  }
}

function removeLocalItem(userId, item) {
  const key = getSavedKey(item);
  const items = getLocalSavedItems(userId).filter(savedItem => getSavedKey(savedItem) !== key);
  setLocalSavedItems(userId, items);
}

function toggleLocalItem(userId, item, button) {
  const isSaved = button?.classList.contains("saved") || savedKeysCache?.has(getSavedKey(item));

  if (isSaved) {
    removeLocalItem(userId, item);
    savedKeysCache?.delete(getSavedKey(item));
    updateMatchingSaveButtons(item, false);
    return false;
  }

  saveLocalItem(userId, item);
  if (!savedKeysCache) savedKeysCache = new Set();
  savedKeysCache.add(getSavedKey(item));
  updateMatchingSaveButtons(item, true);
  return true;
}

async function getSavedKeys(forceRefresh = false) {
  if (savedKeysCache && !forceRefresh) return savedKeysCache;

  savedKeysCache = new Set();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return savedKeysCache;

  getLocalSavedItems(user.id).forEach(item => savedKeysCache.add(getSavedKey(item)));

  const { data, error } = await supabase
    .from("saved_items")
    .select("*")
    .eq("user_id", user.id);

  if (error || !data) {
    console.error("Mentett elemek lekérése sikertelen.", stringifySupabaseError(error), error);
    return savedKeysCache;
  }

  data.forEach(item => savedKeysCache.add(getSavedKey(item)));
  return savedKeysCache;
}

function setSaveButtonState(button, isSaved) {
  if (!button) return;

  button.classList.toggle("saved", isSaved);
  button.textContent = isSaved ? "♥" : "♡";
  button.setAttribute("aria-label", isSaved ? "Mentés törlése" : "Mentés");
}

function updateMatchingSaveButtons(item, isSaved) {
  const encodedKey = encodeURIComponent(getSavedKey(item));

  document.querySelectorAll(`.card-save[data-save-key="${encodedKey}"]`).forEach(button => {
    setSaveButtonState(button, isSaved);
  });
}

async function loadSaved() {
  const container = document.getElementById("savedContainer");
  if (!container) return;

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    container.innerHTML = "<p>Nincs bejelentkezett felhasználó.</p>";
    return;
  }

  const { data, error } = await supabase
    .from("saved_items")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("Mentett tartalmak betöltése sikertelen.", stringifySupabaseError(error), error);
  }

  const uniqueItems = [];
  const seenKeys = new Set();

  [...getLocalSavedItems(user.id), ...(data || [])].forEach(item => {
    const displayItem = normalizeSavedItemForDisplay(item);
    const key = getSavedKey(displayItem);
    if (seenKeys.has(key)) return;

    seenKeys.add(key);
    uniqueItems.push(displayItem);
  });

  if (uniqueItems.length === 0) {
    container.innerHTML = "<p>Még nincs mentett tartalmad.</p>";
    return;
  }

  container.innerHTML = uniqueItems.map(item => createCard(item, true)).join("");
  refreshCardImages(container);
  savedKeysCache = seenKeys;
}

async function toggleSave(item, button) {

  const saveKey = getSavedKey(item);
  let currentUser = null;

  if (saveBusyKeys.has(saveKey) || button?.dataset.busy === "true") return;

  saveBusyKeys.add(saveKey);

  if (button) {
    button.dataset.busy = "true";
    button.disabled = true;
  }

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    currentUser = user;

    if (userError || !user) {
      alert("Először jelentkezz be!");
      return;
    }

    const savedItem = getSavedItemPayload(user.id, item);

    const { data: savedRows, error: selectError } = await supabase
      .from("saved_items")
      .select("*")
      .eq("user_id", user.id);

    if (selectError) throw selectError;

    const existing = (savedRows || []).filter(savedRow => isSameSavedItem(savedRow, savedItem));

    if (existing && existing.length > 0) {
      const ids = existing.map(row => row.id).filter(Boolean);
      let deleteQuery = supabase.from("saved_items").delete();

      if (ids.length > 0) {
        deleteQuery = deleteQuery.in("id", ids);
      } else {
        deleteQuery = getSavedQuery(deleteQuery, user.id, savedItem);
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      removeLocalItem(user.id, savedItem);
      savedKeysCache?.delete(getSavedKey(savedItem));
      updateMatchingSaveButtons(savedItem, false);

      const col = button?.closest(".col-6, .col-md-4, .col-lg-3");
      if (document.getElementById("savedContainer") && col) col.remove();
    } else {
      await insertSavedItemWithFallback(user.id, item);

      removeLocalItem(user.id, savedItem);
      if (!savedKeysCache) savedKeysCache = new Set();
      savedKeysCache.add(getSavedKey(savedItem));
      updateMatchingSaveButtons(savedItem, true);
    }

    if (document.getElementById("savedContainer")) {
      await loadSaved();
    }
  } catch (error) {
    console.error("Mentés sikertelen.", stringifySupabaseError(error), error);
    if (currentUser) {
      const fallbackItem = {
        title: item.title,
        type: item.type,
        platform: item.platform,
        image: item.image || getPlaceholderImage(),
        link: item.link,
        moods: item.moods || [],
        description: item.description || item.overview || getSavedDescriptionFallback(item)
      };

      toggleLocalItem(currentUser.id, fallbackItem, button);

      if (document.getElementById("savedContainer")) {
        await loadSaved();
      }

      alert("A Supabase mentés nem sikerült, ezért ezt most helyileg mentettem. A Supabase jogosultságokat később érdemes ellenőrizni.");
    } else {
      alert("A mentés nem sikerült. Próbáld újra később.");
    }
  } finally {
    saveBusyKeys.delete(saveKey);

    if (button) {
      button.dataset.busy = "false";
      button.disabled = false;
    }
  }
}

async function toggleSaveByKey(encodedItemKey, button) {
  const itemKey = decodeURIComponent(encodedItemKey);
  const item = cardItemStore.get(itemKey);

  if (!item) {
    alert("A mentéshez szükséges tartalomadat nem található. Frissítsd az oldalt, majd próbáld újra.");
    return;
  }

  await toggleSave(item, button);
}

window.selectMood = selectMood;
window.searchMood = searchMood;
window.randomVibe = randomVibe;
window.toggleSave = toggleSave;
window.toggleSaveByKey = toggleSaveByKey;
window.openCardDetailsByKey = openCardDetailsByKey;
window.handleCardDetailsKey = handleCardDetailsKey;
window.usePlaceholderImage = usePlaceholderImage;
window.checkCardImage = checkCardImage;
window.quickFilter = quickFilter;
window.applyFilters = applyFilters;
window.scrollSlider = scrollSlider;
window.createCard = createCard;
window.loadSaved = loadSaved;

async function applyUrlFilters() {
  if (!document.getElementById("results")) return;

  const params = new URLSearchParams(window.location.search);

  const mood = params.get("mood");
  const type = params.get("tipus") || params.get("type") || "all";

  const foundMood = mood ? (getMoodByKey(mood) ? [mood, getMoodByKey(mood)] : findMood(mood)) : null;
  let filtered = [];

  /* szűrő mezők beállítása */

  const moodSelect = document.getElementById("moodFilter");
  if (moodSelect && mood) {
    moodSelect.value = mood;
  }

  const typeSelect = document.getElementById("typeFilter");
  if (typeSelect && type) {
    typeSelect.value = type;
  }

  if (foundMood) {
    filtered = await fetchApiRecommendations(foundMood[0], type);
  }

  if (!foundMood) {
    filtered = await fetchPopularByType(type);
  }

  if (filtered.length === 0) {
    filtered = filterLocalContents(mood || "", type, "all");
  }

  /* eredmények betöltése */
  renderResults(filtered);

}

window.addEventListener("load", applyUrlFilters);


document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("results")) {
    showResults();
  }

  if (document.getElementById("savedContainer")) {
    loadSaved();
  }
});

async function updateNavbar() {

  const { data: { user } } = await supabase.auth.getUser();

  const login = document.getElementById("loginLink");
  const register = document.getElementById("registerLink");
  const logout = document.getElementById("logoutLink");

  if (!login || !register || !logout) return;

  if (user) {

    login.style.display = "none";
    register.style.display = "none";
    logout.style.display = "block";

    logout.onclick = async () => {
      await supabase.auth.signOut();
      window.location.href = "index.html";
    };

  } else {

    login.style.display = "block";
    register.style.display = "block";
    logout.style.display = "none";

  }

}

document.addEventListener("DOMContentLoaded", updateNavbar);

const logoutLink = document.getElementById("logoutLink");
if (logoutLink) {
  logoutLink.onclick = async () => {
    await supabase.auth.signOut();
    location.href = "index.html";
  };
}
