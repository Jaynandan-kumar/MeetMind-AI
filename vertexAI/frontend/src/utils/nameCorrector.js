// Dictionary of common development terms, components, and project keywords
const COMMON_WORDS = [
    "vehicle", "booking", "card", "clock", "analog", "digital", "calculator",
    "dashboard", "ecommerce", "store", "shop", "portfolio", "weather", "chat",
    "app", "website", "system", "management", "tracker", "music", "player",
    "video", "editor", "blog", "social", "media", "game", "restaurant",
    "food", "delivery", "hotel", "travel", "fitness", "finance", "crypto",
    "wallet", "todo", "task", "notes", "quiz", "recipe", "estate", "learning",
    "education", "login", "auth", "profile", "admin", "panel", "counter",
    "timer", "stopwatch", "generator", "converter", "gallery", "scanner",
    "form", "invoice", "schedule", "calendar", "reminder", "portal", "hub",
    "feed", "board", "clone", "platform", "service", "library", "search",
    "movie", "anime", "fitness", "workout", "expense", "budget", "crm"
];

// Common typo corrections map
const TYPO_MAP = {
    "vehile": "vehicle",
    "vehicl": "vehicle",
    "vechile": "vehicle",
    "vechile": "vehicle",
    "bokking": "booking",
    "boking": "booking",
    "clok": "clock",
    "anlog": "analog",
    "anolog": "analog",
    "calcutor": "calculator",
    "calculater": "calculator",
    "ecomerce": "ecommerce",
    "eccomerce": "ecommerce",
    "dashbord": "dashboard",
    "dashbaord": "dashboard",
    "portflio": "portfolio",
    "portfolo": "portfolio",
    "resturant": "restaurant",
    "restaurent": "restaurant",
    "managment": "management",
    "managemnt": "management",
    "todoo": "todo",
    "trackr": "tracker",
    "socail": "social",
    "weathr": "weather",
    "wether": "weather",
    "creat": "create",
    "crete": "create",
    "chatapp": "chat app",
    "discription": "description"
};

// Calculate Levenshtein distance between two strings
function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

// Remove consecutive repeated letters (e.g. "carddd" -> "card", "bookingff" -> "booking")
function deduplicateLetters(word) {
    // Replace 3 or more of same letter with 1 (e.g. "carddd" -> "card")
    let cleaned = word.replace(/(.)\1{2,}/g, "$1");
    // Replace double consonant at the end if not standard (e.g. "bookingff" -> "booking")
    if (cleaned.length > 4 && /(ff|dd|gg|kk|mm|nn|pp|tt|ww|yy)$/i.test(cleaned)) {
        cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
}

// Capitalize first letter of each word
function toTitleCase(str) {
    return str
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

// Words that should never be fuzzy-matched
const PRESERVED_WORDS = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "up", "about", "into", "over", "after", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "do", "does",
    "did", "will", "would", "shall", "should", "may", "might", "must", "can",
    "could", "this", "that", "these", "those", "my", "your", "his", "her",
    "its", "our", "their", "not", "no", "yes", "all", "any", "some"
]);

// Correct a single word using map, dedup, and fuzzy matching
function correctWord(rawWord) {
    const lower = rawWord.toLowerCase();

    // Preserve basic grammar words
    if (PRESERVED_WORDS.has(lower)) {
        return lower;
    }
    
    // Check direct typo map
    if (TYPO_MAP[lower]) {
        return TYPO_MAP[lower];
    }

    // Check after deduplicating repeated letters
    const deduped = deduplicateLetters(lower);
    if (TYPO_MAP[deduped]) {
        return TYPO_MAP[deduped];
    }
    if (COMMON_WORDS.includes(deduped)) {
        return deduped;
    }

    // Fuzzy Levenshtein match against vocabulary
    let bestMatch = rawWord;
    let minDistance = 3; // Max tolerance

    for (const dictWord of COMMON_WORDS) {
        const dist = levenshteinDistance(deduped, dictWord);
        if (dist < minDistance) {
            minDistance = dist;
            bestMatch = dictWord;
        }
    }

    return bestMatch;
}

// Generate smart project name suggestions from user input
export function getSmartNameSuggestions(input) {
    if (!input || !input.trim() || input.trim().length < 3) {
        return [];
    }

    const words = input.trim().split(/\s+/);
    const correctedWords = words.map(correctWord);
    const correctedName = toTitleCase(correctedWords.join(" "));

    const suggestions = [];

    // Variation 1: Direct correction
    if (correctedName) {
        suggestions.push(correctedName);
    }

    // Variation 2: Add "App" or "System" if not already present
    const lower = correctedName.toLowerCase();
    if (!lower.includes("app") && !lower.includes("system") && !lower.includes("card") && !lower.includes("dashboard")) {
        suggestions.push(`${correctedName} App`);
    } else if (lower.endsWith("card") && !lower.includes("app")) {
        suggestions.push(`${correctedName} App`);
    }

    // Variation 3: Concise version if more than 2 words
    if (correctedWords.length >= 3) {
        const concise = toTitleCase(correctedWords.slice(0, 2).join(" "));
        if (!suggestions.includes(concise)) {
            suggestions.push(concise);
        }
    }

    // Filter out duplicates and items that are exactly identical to raw input
    const cleanRaw = input.trim();
    return suggestions.filter(s => s.toLowerCase() !== cleanRaw.toLowerCase()).slice(0, 3);
}

// Check if a token is keyboard smash / junk (e.g. "fdfdfvdv", "asdfghjk", "zzzz")
function isJunkWord(w) {
    if (w.length >= 4 && !/[aeiouy]/i.test(w)) return true;
    if (/(.)\1{3,}/.test(w)) return true;
    if (/^(fdf|asdf|qwer|zxcv|hjkl|jkl|ghjk)/i.test(w) && w.length >= 5) return true;
    return false;
}

// Common sentence words typo map
const SENTENCE_TYPO_MAP = {
    ...TYPO_MAP,
    "im": "I'm",
    "i": "I",
    "giun": "going",
    "g": "to",
    "gona": "going to",
    "gonna": "going to",
    "buld": "build",
    "buid": "build",
    "buiild": "build",
    "usign": "using",
    "useing": "using",
    "wit": "with",
    "wth": "with",
    "implentation": "implementation",
    "implemention": "implementation",
    "interactiv": "interactive",
    "interective": "interactive",
    "feture": "feature",
    "fetures": "features",
    "desing": "design",
    "modren": "modern",
    "resposive": "responsive",
    "responsve": "responsive",
    "vihacele": "vehicle",
    "vehical": "vehicle",
    "bokking": "booking",
    "boking": "booking"
};

// Generate smart description suggestions from user input
export function getSmartDescriptionSuggestions(input, projectName = "") {
    if (!input || !input.trim() || input.trim().length < 4) {
        if (projectName && projectName.trim().length >= 3) {
            const cleanTitle = projectName.trim();
            return [
                `A modern and responsive ${cleanTitle} web application.`,
                `Interactive ${cleanTitle} built with clean UI and smooth user experience.`
            ];
        }
        return [];
    }

    const rawWords = input.trim().split(/\s+/);
    // Filter out junk/gibberish words
    const validWords = rawWords.filter(w => !isJunkWord(w));

    // Correct typos
    const correctedWords = validWords.map(w => {
        const lower = w.toLowerCase().replace(/[^a-z0-9']/g, "");
        if (SENTENCE_TYPO_MAP[lower]) {
            return SENTENCE_TYPO_MAP[lower];
        }
        return correctWord(w);
    });

    let sentence = correctedWords.join(" ");

    // Clean up phrasing: e.g. "I'm going to or build" -> "I'm going to build"
    sentence = sentence
        .replace(/going to or build/gi, "going to build")
        .replace(/going to to/gi, "going to")
        .replace(/\b(or build)\b/gi, "to build")
        .replace(/\s+/g, " ")
        .trim();

    // Ensure first letter is capitalized
    if (sentence.length > 0) {
        sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
        if (!sentence.endsWith(".")) {
            sentence += ".";
        }
    }

    const suggestions = [];

    // Variation 1: Cleaned & grammar corrected direct sentence
    if (sentence && sentence.toLowerCase() !== input.trim().toLowerCase()) {
        suggestions.push(sentence);
    }

    // Variation 2: Professional overview based on project name or keywords
    const subject = projectName && projectName.trim().length >= 3
        ? projectName.trim()
        : (correctedWords.filter(w => !["I'm", "going", "to", "build", "a", "an", "the"].includes(w)).join(" ") || "project");

    const proSummary = `A modern and responsive ${toTitleCase(subject)} with clean UI and interactive features.`;
    if (!suggestions.includes(proSummary)) {
        suggestions.push(proSummary);
    }

    // Variation 3: Concise feature description
    const conciseSummary = `${toTitleCase(subject)} implementation with intuitive user experience.`;
    if (!suggestions.includes(conciseSummary) && suggestions.length < 3) {
        suggestions.push(conciseSummary);
    }

    return suggestions.filter(s => s.toLowerCase() !== input.trim().toLowerCase()).slice(0, 3);
}

// ---------------------------------------------------------------------
// Word-level Spelling Suggestions for Interactive Popup (like Image 2)
// ---------------------------------------------------------------------
const COMMON_ENGLISH_WORDS = [
    "a", "about", "above", "across", "act", "active", "activity", "add", "after",
    "again", "against", "age", "ago", "air", "all", "almost", "alone", "along",
    "already", "also", "although", "always", "am", "among", "amount", "an",
    "and", "another", "answer", "any", "anyone", "anything", "appear", "apple",
    "apply", "area", "arm", "around", "art", "as", "ask", "at", "attack",
    "author", "auto", "available", "away", "baby", "back", "bad", "bag",
    "balance", "ball", "bank", "bar", "base", "basic", "basis", "be", "beat",
    "beautiful", "because", "become", "bed", "before", "begin", "behavior",
    "behind", "believe", "benefit", "best", "better", "between", "beyond", "big",
    "bill", "bird", "bit", "black", "block", "blood", "blue", "board", "body",
    "book", "born", "both", "bottom", "box", "boy", "break", "brief", "bring",
    "brother", "build", "building", "burn", "business", "busy", "but", "buy",
    "by", "call", "camera", "camp", "can", "cancer", "candidate", "capital",
    "car", "card", "care", "career", "carry", "case", "catch", "cause",
    "cell", "center", "central", "century", "certain", "chair", "chance",
    "change", "character", "charge", "check", "child", "choice", "choose",
    "church", "city", "claim", "class", "clean", "clear", "clearly", "close",
    "cloud", "cold", "collection", "college", "color", "come", "commercial",
    "common", "community", "company", "compare", "complete", "computer", "concern",
    "condition", "conference", "connect", "consider", "contain", "continue",
    "control", "cool", "copy", "cost", "could", "country", "couple", "course",
    "court", "cover", "create", "crime", "cross", "cry", "culture", "current",
    "customer", "cut", "daily", "dark", "data", "date", "daughter", "day",
    "dead", "deal", "dealer", "dear", "death", "debate", "decade", "decide",
    "decision", "deep", "defer", "defense", "defy", "degree", "deliver",
    "demand", "describe", "description", "design", "detail", "determine", "develop",
    "device", "differ", "different", "difficult", "direct", "direction", "director",
    "discover", "discuss", "disease", "do", "doctor", "dog", "door", "down",
    "draw", "dream", "drive", "drop", "drug", "during", "each", "early",
    "east", "easy", "eat", "economic", "economy", "edge", "education", "effect",
    "effort", "eight", "either", "election", "electric", "element", "else",
    "email", "employee", "end", "energy", "enjoy", "enough", "enter", "entire",
    "environment", "equal", "especially", "establish", "even", "evening", "event",
    "ever", "every", "everyone", "everything", "evidence", "exact", "example",
    "executive", "exist", "expect", "experience", "expert", "explain", "eye",
    "face", "fact", "factor", "fail", "fall", "family", "far", "fast", "father",
    "fear", "federal", "feel", "feeling", "few", "field", "fight", "figure",
    "fill", "film", "final", "finally", "financial", "find", "fine", "finger",
    "finish", "fire", "firm", "first", "fish", "five", "floor", "fly", "focus",
    "follow", "food", "foot", "for", "force", "foreign", "forget", "form",
    "former", "forward", "four", "free", "friend", "from", "front", "full",
    "fund", "future", "game", "garden", "gas", "general", "generation", "get",
    "girl", "give", "glass", "go", "goal", "good", "government", "great",
    "green", "ground", "group", "grow", "growth", "guess", "gun", "guy",
    "hair", "half", "hand", "hang", "happen", "happy", "hard", "have", "he",
    "head", "health", "hear", "heart", "heat", "heavy", "help", "her", "here",
    "herself", "high", "him", "himself", "his", "history", "hit", "hold",
    "home", "hope", "hospital", "hot", "hotel", "hour", "house", "how",
    "however", "huge", "human", "hundred", "husband", "i", "idea", "identify",
    "if", "image", "imagine", "impact", "important", "improve", "in", "include",
    "including", "increase", "indeed", "indicate", "individual", "industry",
    "information", "inside", "instead", "institution", "interest", "interesting",
    "international", "interview", "into", "investment", "involve", "issue",
    "it", "item", "its", "itself", "job", "join", "just", "keep", "key",
    "kid", "kill", "kind", "kitchen", "know", "knowledge", "land", "language",
    "large", "last", "late", "later", "laugh", "law", "lawyer", "lay", "lead",
    "leader", "learn", "least", "leave", "left", "leg", "legal", "less",
    "let", "letter", "level", "lie", "life", "light", "like", "likely", "line",
    "list", "listen", "little", "live", "local", "long", "look", "lose",
    "loss", "lot", "love", "low", "machine", "magazine", "main", "maintain",
    "major", "majority", "make", "man", "manage", "management", "manager",
    "many", "market", "marriage", "material", "matter", "may", "maybe", "me",
    "mean", "measure", "media", "medical", "meet", "meeting", "member",
    "memory", "mention", "message", "method", "middle", "might", "military",
    "million", "mind", "minute", "miss", "mission", "model", "modern", "moment",
    "money", "month", "more", "morning", "most", "mother", "mouth", "move",
    "movement", "movie", "mr", "mrs", "much", "music", "must", "my", "myself",
    "name", "nation", "national", "natural", "nature", "near", "nearly",
    "necessary", "need", "network", "never", "new", "news", "newspaper",
    "next", "nice", "night", "no", "none", "nor", "north", "not", "note",
    "nothing", "notice", "now", "number", "occur", "of", "off", "offer",
    "office", "officer", "official", "often", "oh", "oil", "ok", "okay", "old",
    "on", "once", "one", "only", "onto", "open", "operation", "opportunity",
    "option", "or", "order", "organization", "other", "others", "our",
    "out", "outside", "over", "own", "owner", "page", "pain", "painting",
    "paper", "parent", "part", "participant", "particular", "particularly",
    "partner", "party", "pass", "past", "patient", "pattern", "pay", "peace",
    "people", "per", "perform", "performance", "perhaps", "period", "person",
    "personal", "phone", "physical", "pick", "picture", "piece", "place",
    "plan", "plant", "play", "player", "point", "police", "policy", "political",
    "politics", "poor", "popular", "population", "position", "positive",
    "possible", "power", "practice", "prepare", "present", "president",
    "pressure", "pretty", "prevent", "price", "private", "probably", "problem",
    "process", "produce", "product", "production", "professional", "professor",
    "program", "project", "property", "protect", "prove", "provide", "public",
    "pull", "purpose", "push", "put", "quality", "question", "quickly", "quite",
    "race", "radio", "raise", "range", "rate", "rather", "reach", "read",
    "ready", "real", "reality", "realize", "really", "reason", "receive",
    "recent", "recently", "recognize", "record", "red", "reduce", "reflect",
    "region", "relate", "relationship", "religious", "remain", "remember",
    "remove", "report", "represent", "require", "research", "resource",
    "respond", "response", "responsibility", "rest", "result", "return",
    "reveal", "rich", "right", "rise", "risk", "road", "rock", "role", "room",
    "rule", "run", "safe", "same", "save", "say", "scene", "school", "science",
    "scientist", "score", "sea", "season", "seat", "second", "section",
    "security", "see", "seek", "seem", "sell", "send", "senior", "sense",
    "series", "serious", "serve", "service", "set", "seven", "several", "sex",
    "sexual", "shake", "share", "she", "shoot", "short", "shot", "should",
    "shoulder", "show", "side", "sign", "significant", "similar", "simple",
    "simply", "since", "sing", "single", "sister", "sit", "site", "situation",
    "six", "size", "skill", "skin", "small", "smile", "so", "social", "society",
    "soldier", "some", "somebody", "someone", "something", "sometimes", "son",
    "song", "soon", "sort", "sound", "source", "south", "space", "speak",
    "special", "specific", "speech", "spend", "sport", "spring", "staff",
    "stage", "stand", "standard", "star", "start", "state", "statement",
    "station", "stay", "step", "still", "stock", "stop", "store", "story",
    "strategy", "street", "strong", "structure", "student", "study", "stuff",
    "style", "subject", "success", "successful", "such", "suddenly", "suffer",
    "suggest", "summer", "support", "sure", "surface", "system", "table",
    "take", "talk", "task", "tax", "teach", "teacher", "team", "technology",
    "television", "tell", "ten", "tend", "term", "test", "than", "thank",
    "that", "the", "their", "them", "themselves", "then", "theory", "there",
    "these", "they", "thing", "think", "third", "this", "those", "though",
    "thought", "thousand", "threat", "three", "through", "throughout", "throw",
    "thus", "tidy", "tied", "tide", "time", "title", "to", "today", "together",
    "tonight", "too", "top", "total", "tough", "toward", "town", "trade",
    "traditional", "training", "travel", "treat", "treatment", "tree", "trial",
    "trip", "trouble", "true", "truth", "try", "turn", "tv", "two", "type",
    "under", "understand", "unit", "until", "up", "upon", "us", "use",
    "usually", "value", "various", "very", "victim", "view", "violence",
    "visit", "voice", "vote", "wait", "walk", "wall", "want", "war", "watch",
    "water", "way", "we", "weapon", "wear", "week", "weight", "well", "west",
    "western", "what", "whatever", "when", "where", "whether", "which",
    "while", "white", "who", "whole", "whom", "whose", "why", "wide", "wife",
    "will", "win", "wind", "window", "wish", "with", "within", "without",
    "woman", "wonder", "word", "work", "worker", "world", "worry", "would",
    "write", "writer", "wrong", "yard", "yeah", "year", "yes", "yet", "you",
    "young", "your", "yourself",
    // Tech keywords
    "api", "backend", "frontend", "server", "client", "model", "view", "controller",
    "component", "page", "button", "input", "modal", "table", "header",
    "footer", "sidebar", "navbar", "dropdown", "responsive", "modern", "interactive",
    "clean", "smooth", "intuitive", "feature", "features", "implementation",
    "design", "interface", "experience", "user", "build", "create", "setup",
    "workspace", "project", "code", "file", "folder", "branch", "git"
];

const ALL_WORDS_LIST = Array.from(new Set([...COMMON_WORDS, ...COMMON_ENGLISH_WORDS]));
const ALL_WORDS_SET = new Set(ALL_WORDS_LIST);

const WORD_TYPO_MAP = {
    ...TYPO_MAP,
    ...SENTENCE_TYPO_MAP,
    "deffe": ["defer", "differ", "defy"],
    "tidd": ["tidy", "tied", "tide"],
    "vihacke": ["vehicle"],
    "vihacele": ["vehicle"],
    "vehical": ["vehicle"],
    "vechile": ["vehicle"],
    "bokking": ["booking"],
    "boking": ["booking"],
    "crd": ["card"],
    "desing": ["design"],
    "implentation": ["implementation"]
};

export function getWordSpellingSuggestions(rawWord) {
    if (!rawWord || typeof rawWord !== 'string') {
        return { isMisspelled: false, suggestions: [], isJunk: false };
    }

    const clean = rawWord.toLowerCase().trim().replace(/[^a-z0-9']/g, "");
    if (!clean || clean.length < 2) {
        return { isMisspelled: false, suggestions: [], isJunk: false };
    }

    // Numbers are valid
    if (/^\d+$/.test(clean)) {
        return { isMisspelled: false, suggestions: [], isJunk: false };
    }

    // Exact word in dictionary
    if (ALL_WORDS_SET.has(clean)) {
        return { isMisspelled: false, suggestions: [], isJunk: false };
    }

    // Direct mapping
    if (WORD_TYPO_MAP[clean]) {
        const val = WORD_TYPO_MAP[clean];
        return {
            isMisspelled: true,
            word: rawWord,
            suggestions: Array.isArray(val) ? val : [val],
            isJunk: false
        };
    }

    // Deduplicated repeated letters
    const deduped = deduplicateLetters(clean);
    if (WORD_TYPO_MAP[deduped]) {
        const val = WORD_TYPO_MAP[deduped];
        return {
            isMisspelled: true,
            word: rawWord,
            suggestions: Array.isArray(val) ? val : [val],
            isJunk: false
        };
    }
    if (ALL_WORDS_SET.has(deduped)) {
        return {
            isMisspelled: true,
            word: rawWord,
            suggestions: [deduped],
            isJunk: false
        };
    }

    const isJunk = isJunkWord(clean);

    // Fuzzy match
    const matches = [];
    const maxDist = clean.length <= 4 ? 2 : (clean.length <= 7 ? 2 : 3);

    for (const dictWord of ALL_WORDS_LIST) {
        if (Math.abs(dictWord.length - clean.length) > maxDist) continue;
        const dist = levenshteinDistance(clean, dictWord);
        if (dist <= maxDist) {
            matches.push({ word: dictWord, dist });
        }
    }

    matches.sort((a, b) => {
        if (a.dist !== b.dist) return a.dist - b.dist;
        return a.word.length - b.word.length;
    });

    const suggestions = matches.slice(0, 3).map(m => m.word);

    return {
        isMisspelled: true,
        word: rawWord,
        suggestions,
        isJunk: isJunk || (suggestions.length === 0 && clean.length >= 5)
    };
}

