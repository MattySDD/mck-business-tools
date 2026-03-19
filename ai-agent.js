// ═══════════════════════════════════════════════════════════
// MCK AI QUOTE ASSISTANT + VOICE-GUIDED JOB INTAKE
// Uses OpenAI-compatible API + Web Speech API
// INTELLIGENCE UPGRADE: auto-correct, skip, yes/no, context
// ═══════════════════════════════════════════════════════════

// ── AI SYSTEM PROMPTS ─────────────────────────────────────

const AI_SYSTEM_PROMPT = `You are the Micro Cement King AI Quote Assistant. You help extract job details from natural language descriptions and verify quote pricing.

RULES:
- All prices are ex GST unless stated
- Phone: 0468 053 819
- Three systems: Solidro (premium), Micro Cement (standard), Rusico (external)
- Surface types: Floor, Feature Wall, Wet Area, Bench Top, External
- Pricing tiers (ex GST):
  Floors: 0-25sqm $365/sqm, 25-70sqm $305/sqm, 70-120+sqm $250/sqm
  Feature Walls: 15-30sqm $300/sqm, 30-60sqm $260/sqm, 60+sqm $220/sqm, min $3,000
  Wet Areas/Bathrooms/Benchtops: 15-30sqm $460/sqm, 30-60sqm $360/sqm, 60-100sqm $320/sqm, 100+sqm $280/sqm, min $7,000
- Payment: 50% deposit on acceptance, 25% at practical completion of base coat, 25% on final completion
- Defects liability: 12 months
- Variations require written approval before work commences
- Minimum 4-day process on every job

When extracting job details, return a JSON block with:
{
  "client_name": "",
  "client_phone": "",
  "client_email": "",
  "project_address": "",
  "surfaces": [
    { "description": "", "type": "Floor|Feature Wall|Wet Area|Bench Top|External", "sqm": 0, "system": "solidro|micro_cement|rusico" }
  ],
  "notes": ""
}

When checking a quote, verify margins, market rates, and flag any issues.
Be direct and concise. No fluff.`;

const INTAKE_SYSTEM_PROMPT = `You are the MCK Job Intake Assistant for Micro Cement King, a premium microcement and decorative coatings business on the Gold Coast, QLD.

KNOWLEDGE BASE:
- Three systems: Solidro (premium, Ideal Works), Micro Cement (Microtopping from Ideal Works + other suppliers), Rusico (external surfaces)
- Solidro: Solidro Zero base coat, Solidro Top finish coat at 2.5 sqm/kg
- Micro Cement: MT-BC-W base, MT-FC-W finish, MT-POL polymer
- Rusico: Rusico Primer, Rusico Base, Rusico Finish, Rusico Sealer
- Surface types: floors, feature walls, wet areas, bathrooms, benchtops, external
- Pricing tiers (ex GST, do NOT quote exact prices to clients):
  Floors: 0-25sqm $365, 25-70sqm $305, 70-120+sqm $250
  Feature Walls: 15-30sqm $300, 30-60sqm $260, 60+sqm $220, min $3,000
  Wet Areas: 15-30sqm $460, 30-60sqm $360, 60-100sqm $320, 100+sqm $280, min $7,000
- Payment: 50% deposit on acceptance, 25% at practical completion of base coat, 25% on final completion
- Defects liability: 12 months
- Minimum charges apply per surface type
- Variations require written approval before work commences
- Minimum 4-day process on every job regardless of team size

SCOPE: Only answer questions related to MCK jobs, pricing, surfaces, products, and processes.
If asked anything outside this scope, redirect: "That's outside what I can help with — let me connect you with the team."

TONE: Confident, professional, direct. Not robotic. Not overly chatty. Like a sharp admin who knows the business inside out.`;


// ═══════════════════════════════════════════════════════════
// INTELLIGENCE LAYER — Auto-correct, Skip, Yes/No, Context
// ═══════════════════════════════════════════════════════════

const INTELLIGENCE = {
  // Email auto-correction
  fixEmail(text) {
    let email = text.trim();
    // "matty at gmail dot com" → matty@gmail.com
    email = email.replace(/\s+at\s+/gi, '@');
    email = email.replace(/\s+dot\s+/gi, '.');
    // Remove spaces around @ and .
    email = email.replace(/\s*@\s*/g, '@');
    email = email.replace(/\s*\.\s*/g, '.');
    // Common domain corrections
    email = email.replace(/gee?\s*mail/gi, 'gmail');
    email = email.replace(/hot\s*mail/gi, 'hotmail');
    email = email.replace(/out\s*look/gi, 'outlook');
    email = email.replace(/eye?\s*cloud/gi, 'icloud');
    email = email.replace(/yah+oo/gi, 'yahoo');
    // If no @ but has common domain patterns, try to fix
    if (!email.includes('@') && /gmail|hotmail|outlook|icloud|yahoo/i.test(email)) {
      email = email.replace(/(gmail|hotmail|outlook|icloud|yahoo)/gi, '@$1');
    }
    // Add .com if missing after common domains
    if (/@(gmail|hotmail|outlook|yahoo)$/i.test(email)) {
      email += '.com';
    }
    if (/@icloud$/i.test(email)) {
      email += '.com';
    }
    // .com.au patterns
    email = email.replace(/\.com\s*\.?\s*au/gi, '.com.au');
    // Remove any remaining spaces
    email = email.replace(/\s+/g, '');
    return email.toLowerCase();
  },

  // Phone number formatting
  fixPhone(text) {
    let phone = text.trim();
    // Remove all non-digit characters except +
    let digits = phone.replace(/[^\d+]/g, '');
    // If starts with +61, convert to 0
    if (digits.startsWith('+61')) {
      digits = '0' + digits.substring(3);
    }
    // Format as 04XX XXX XXX
    if (digits.length === 10 && digits.startsWith('0')) {
      return digits.substring(0, 4) + ' ' + digits.substring(4, 7) + ' ' + digits.substring(7);
    }
    return phone; // Return original if can't format
  },

  // Check if answer is a skip/pass
  isSkip(text) {
    const lower = text.toLowerCase().trim();
    return ['skip', 'pass', 'n/a', 'na', 'none', 'no', 'not sure', 'dont know', "don't know", 'next', 'move on', '-', ''].includes(lower);
  },

  // Check if answer is affirmative (for yes/no questions)
  isYes(text) {
    const lower = text.toLowerCase().trim();
    return ['yes', 'y', 'yep', 'yeah', 'yea', 'correct', "that's right", 'thats right', 'right', 'affirmative', 'sure', 'absolutely', 'confirmed', 'confirm', 'ok', 'okay', 'yup', 'ya'].includes(lower);
  },

  // Check if answer is negative
  isNo(text) {
    const lower = text.toLowerCase().trim();
    return ['no', 'n', 'nope', 'nah', 'wrong', 'incorrect', 'not right', 'negative', 'redo', 'again', 'try again', 'retry'].includes(lower);
  },

  // Smart field validation
  validateField(key, value) {
    if (key === 'client_email') {
      const fixed = this.fixEmail(value);
      // Basic email validation
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fixed)) {
        return { valid: true, value: fixed, message: null };
      }
      return { valid: false, value: value, message: `"${value}" doesn't look like a valid email. Try again or say "skip" to move on.` };
    }
    if (key === 'client_phone') {
      const fixed = this.fixPhone(value);
      const digits = fixed.replace(/\D/g, '');
      if (digits.length >= 8) {
        return { valid: true, value: fixed, message: null };
      }
      return { valid: false, value: value, message: `"${value}" doesn't look like a valid phone number. Try again or say "skip" to move on.` };
    }
    if (key.startsWith('sqm_')) {
      const num = parseFloat(value.replace(/[^\d.]/g, ''));
      if (num > 0 && num < 10000) {
        return { valid: true, value: String(num), message: null };
      }
      return { valid: false, value: value, message: `I need a number in square metres. How many sqm is this area?` };
    }
    return { valid: true, value: value, message: null };
  },

  // Context-aware assumptions
  inferSurfaces(text) {
    const lower = text.toLowerCase();
    const surfaces = [];
    const seen = new Set();

    const patterns = [
      { regex: /\bfloor[s]?\b/i, type: 'Floor', label: 'Floor' },
      { regex: /\bliving\b/i, type: 'Floor', label: 'Living Area Floor' },
      { regex: /\bkitchen\s*floor\b/i, type: 'Floor', label: 'Kitchen Floor' },
      { regex: /\bhallway\b/i, type: 'Floor', label: 'Hallway Floor' },
      { regex: /\bfeature\s*wall[s]?\b/i, type: 'Feature Wall', label: 'Feature Wall' },
      { regex: /\baccent\s*wall[s]?\b/i, type: 'Feature Wall', label: 'Accent Wall' },
      { regex: /\bfireplace\s*wall\b/i, type: 'Feature Wall', label: 'Fireplace Wall' },
      { regex: /\bwet\s*area[s]?\b/i, type: 'Wet Area', label: 'Wet Area' },
      { regex: /\bbathroom[s]?\b/i, type: 'Wet Area', label: 'Bathroom' },
      { regex: /\bensuite[s]?\b/i, type: 'Wet Area', label: 'Ensuite' },
      { regex: /\bshower[s]?\b/i, type: 'Wet Area', label: 'Shower' },
      { regex: /\blaundry\b/i, type: 'Wet Area', label: 'Laundry' },
      { regex: /\bbench\s*top[s]?\b/i, type: 'Bench Top', label: 'Benchtop' },
      { regex: /\bbenchtop[s]?\b/i, type: 'Bench Top', label: 'Benchtop' },
      { regex: /\bkitchen\s*bench\b/i, type: 'Bench Top', label: 'Kitchen Bench' },
      { regex: /\bisland\s*bench\b/i, type: 'Bench Top', label: 'Island Bench' },
      { regex: /\bvanity\b/i, type: 'Bench Top', label: 'Vanity Top' },
      { regex: /\bexternal\b/i, type: 'External', label: 'External Area' },
      { regex: /\bfacade[s]?\b/i, type: 'External', label: 'Facade' },
      { regex: /\bbalcon[yies]+\b/i, type: 'External', label: 'Balcony' },
      { regex: /\boutdoor\b/i, type: 'External', label: 'Outdoor Area' },
      { regex: /\bpool\s*(?:deck|surround|area)\b/i, type: 'External', label: 'Pool Surround' },
      // Generic "wall" only if no "feature" nearby
      { regex: /(?<!feature\s)\bwall[s]?\b(?!\s*feature)/i, type: 'Feature Wall', label: 'Wall' },
    ];

    patterns.forEach(p => {
      if (p.regex.test(lower)) {
        const key = p.label;
        if (!seen.has(key)) {
          seen.add(key);
          surfaces.push({ type: p.type, label: p.label });
        }
      }
    });

    return surfaces;
  },

  // Smart system inference from answer
  inferSystem(text) {
    const lower = text.toLowerCase();
    if (lower.includes('solidro') || lower.includes('solid')) return { key: 'solidro', label: 'Solidro' };
    if (lower.includes('micro cement') || lower.includes('microcement') || lower.includes('micro') || lower.includes('microtopping') || lower.includes('mt-')) return { key: 'micro_cement', label: 'Micro Cement' };
    if (lower.includes('rusico') || lower.includes('external')) return { key: 'rusico', label: 'Rusico' };
    // Default to Solidro if unclear
    return { key: 'solidro', label: 'Solidro' };
  },

  // Smart crew inference
  inferCrew(text) {
    const lower = text.toLowerCase();
    if (lower.includes('solo') || lower.includes('one') || lower.includes('patty only') || lower.includes('single')) return { key: 'solo', label: 'Solo (Patty)' };
    if (lower.includes('full') || lower.includes('three') || lower.includes('3') || lower.includes('all') || lower.includes('labourer') || lower.includes('big')) return { key: 'full', label: 'Full Crew (3-man + labour)' };
    if (lower.includes('dual') || lower.includes('two') || lower.includes('2') || lower.includes('standard') || lower.includes('pair')) return { key: 'standard', label: 'Dual Team (Patty + Hayden/Micky)' };
    // Default
    return { key: 'standard', label: 'Dual Team (Patty + Hayden/Micky)' };
  },

  // Smart substrate inference
  inferSubstrate(text) {
    const lower = text.toLowerCase();
    if (lower.includes('level') || lower.includes('good') || lower.includes('fine') || lower.includes('ready') || lower.includes('smooth') || lower.includes('self-level') || lower.includes('self level')) {
      return { isLevelled: true, description: 'Levelled — good condition' };
    }
    if (lower.includes('full prep') || lower.includes('bad') || lower.includes('rough') || lower.includes('damaged') || lower.includes('crack') || lower.includes('repair') || lower.includes('grind')) {
      return { isLevelled: false, description: 'Needs full prep' };
    }
    // Default to needs prep if unclear
    return { isLevelled: false, description: text };
  },

  // Generate contextual confirmation message
  getConfirmMessage(key, value) {
    if (key === 'client_name') return `Client name: <strong>${value}</strong>. Correct?`;
    if (key === 'client_phone') return `Phone: <strong>${value}</strong>. Correct?`;
    if (key === 'client_email') return `Email: <strong>${value}</strong>. Correct?`;
    if (key === 'project_address') return `Site address: <strong>${value}</strong>. Correct?`;
    if (key === 'surfaces') return `Surfaces: <strong>${value}</strong>. Correct?`;
    if (key === 'system') return `System: <strong>${value}</strong>. Correct?`;
    if (key === 'substrate') return `Substrate: <strong>${value}</strong>. Correct?`;
    if (key === 'crew') return `Crew: <strong>${value}</strong>. Correct?`;
    if (key === 'notes') return `Notes: <strong>${value}</strong>. Correct?`;
    if (key.startsWith('sqm_')) return `<strong>${value} sqm</strong>. Correct?`;
    return `Got: <strong>"${value}"</strong>. Correct?`;
  }
};


// ═══════════════════════════════════════════════════════════
// VOICE INTAKE ENGINE
// ═══════════════════════════════════════════════════════════

const INTAKE_QUESTIONS = [
  { key: 'client_name',    question: "What is the client's full name?", skippable: false },
  { key: 'project_address', question: "What is the job site address?", skippable: false },
  { key: 'client_phone',   question: "What is the client's phone number?", skippable: true },
  { key: 'client_email',   question: "What is the client's email address?", skippable: true },
  { key: 'surfaces',       question: "What surface areas are we quoting? For example: floors, feature walls, wet areas, bathrooms, benchtops, external — tell me all of them.", skippable: false },
  // Dynamic sqm questions inserted per surface
  { key: 'system',         question: "What system are we using — Solidro, Micro Cement, or Rusico?", skippable: false },
  { key: 'substrate',      question: "Is the substrate levelled and in good condition, or does it need full prep?", skippable: false },
  { key: 'crew',           question: "What crew are we sending — solo, dual team, or full crew?", skippable: false },
  { key: 'notes',          question: "Any special notes, finishes, or variations for this job?", skippable: true },
];

const intakeState = {
  active: false,
  currentStep: 0,
  totalSteps: 0,
  questions: [],
  answers: {},
  surfaceList: [],
  surfaceSqm: {},
  speakEnabled: false,
  waitingForConfirm: false,
  pendingAnswer: '',
  pendingKey: '',
  retryCount: 0,
};

// ── SPEECH RECOGNITION ────────────────────────────────────

let recognition = null;
let isListening = false;

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return false;
  }
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-AU';
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    const input = document.getElementById('ai-input');
    if (input) input.value = transcript;

    // If final result, auto-submit
    if (event.results[event.results.length - 1].isFinal) {
      setTimeout(() => {
        stopListening();
        if (intakeState.active) {
          handleIntakeAnswer();
        }
      }, 400);
    }
  };

  recognition.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    stopListening();
    if (event.error === 'not-allowed') {
      addIntakeMessage('Microphone access denied. Please allow microphone access or type your answer.', 'system');
    }
  };

  recognition.onend = () => {
    if (isListening) {
      stopListening();
    }
  };

  return true;
}

function startListening() {
  if (!recognition) {
    if (!initSpeechRecognition()) {
      addIntakeMessage('Voice input not supported in this browser. Please type your answers.', 'system');
      return;
    }
  }
  try {
    recognition.start();
    isListening = true;
    updateMicButton(true);
  } catch (e) {
    console.warn('Could not start recognition:', e);
  }
}

function stopListening() {
  if (recognition && isListening) {
    try { recognition.stop(); } catch(e) {}
  }
  isListening = false;
  updateMicButton(false);
}

function toggleMic() {
  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
}

function updateMicButton(active) {
  const btn = document.getElementById('intake-mic-btn');
  if (!btn) return;
  if (active) {
    btn.classList.add('mic-active');
    btn.innerHTML = '<span class="mic-pulse"></span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
  } else {
    btn.classList.remove('mic-active');
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
  }
}

// ── SPEECH SYNTHESIS ──────────────────────────────────────

function speakText(text) {
  if (!intakeState.speakEnabled) return;
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.0;
  utter.pitch = 1.0;
  utter.lang = 'en-AU';
  const voices = window.speechSynthesis.getVoices();
  const auVoice = voices.find(v => v.lang === 'en-AU') || voices.find(v => v.lang.startsWith('en'));
  if (auVoice) utter.voice = auVoice;
  window.speechSynthesis.speak(utter);
}

// ── INTAKE CHAT UI ────────────────────────────────────────

function addIntakeMessage(text, type) {
  const area = document.getElementById('intake-chat-area');
  if (!area) return;
  const div = document.createElement('div');
  div.className = 'ai-message ai-' + type;
  if (type === 'response' || type === 'system') {
    div.innerHTML = text;
  } else {
    div.textContent = text;
  }
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function updateProgress() {
  const bar = document.getElementById('intake-progress-bar');
  const label = document.getElementById('intake-progress-label');
  if (!bar || !label) return;
  const pct = intakeState.totalSteps > 0 ? ((intakeState.currentStep) / intakeState.totalSteps * 100) : 0;
  bar.style.width = Math.min(pct, 100) + '%';
  label.textContent = `QUESTION ${Math.min(intakeState.currentStep + 1, intakeState.totalSteps)} OF ${intakeState.totalSteps}`;
}

// ── INTAKE FLOW ───────────────────────────────────────────

function startIntake() {
  // Reset state
  intakeState.active = true;
  intakeState.currentStep = 0;
  intakeState.answers = {};
  intakeState.surfaceList = [];
  intakeState.surfaceSqm = {};
  intakeState.waitingForConfirm = false;
  intakeState.pendingAnswer = '';
  intakeState.pendingKey = '';
  intakeState.retryCount = 0;

  // Build initial question list
  intakeState.questions = INTAKE_QUESTIONS.map(q => ({...q}));
  intakeState.totalSteps = intakeState.questions.length;

  // Show intake UI
  document.getElementById('intake-section').style.display = 'block';
  document.getElementById('intake-start-btn').style.display = 'none';
  document.getElementById('intake-input-area').style.display = 'flex';
  document.getElementById('intake-progress').style.display = 'block';
  document.getElementById('intake-populate-area').style.display = 'none';

  // Clear chat
  const area = document.getElementById('intake-chat-area');
  area.innerHTML = '';

  addIntakeMessage("Starting MCK Job Intake. I'll run through the details — speak or type your answers. Say <strong>\"skip\"</strong> to skip optional fields.", 'system');

  // Check speech support
  const hasSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!hasSpeech) {
    addIntakeMessage('Voice input not supported in this browser. Type your answers below.', 'system');
    const micBtn = document.getElementById('intake-mic-btn');
    if (micBtn) micBtn.style.display = 'none';
  }

  // Ask first question
  setTimeout(() => askCurrentQuestion(), 600);
}

function askCurrentQuestion() {
  if (intakeState.currentStep >= intakeState.questions.length) {
    finishIntake();
    return;
  }

  updateProgress();
  const q = intakeState.questions[intakeState.currentStep];

  // Add skip hint for skippable questions
  let questionText = q.question;
  if (q.skippable) {
    questionText += ' <span style="color:#888;font-size:12px;">(say "skip" to move on)</span>';
  }

  addIntakeMessage(questionText, 'response');
  speakText(q.question);

  // Focus input
  const input = document.getElementById('ai-input');
  if (input) { input.value = ''; input.focus(); }
}

function handleIntakeAnswer() {
  const input = document.getElementById('ai-input');
  const answer = (input ? input.value.trim() : '');
  if (!answer) return;
  if (input) input.value = '';

  // If we're waiting for a confirmation
  if (intakeState.waitingForConfirm) {
    handleConfirmation(answer);
    return;
  }

  // Show user's answer
  addIntakeMessage(answer, 'user');

  const q = intakeState.questions[intakeState.currentStep];

  // ── SKIP HANDLING ──
  if (INTELLIGENCE.isSkip(answer)) {
    if (q.skippable) {
      addIntakeMessage('Skipped. Moving on.', 'system');
      intakeState.answers[q.key] = '';
      intakeState.currentStep++;
      intakeState.retryCount = 0;
      setTimeout(() => askCurrentQuestion(), 300);
      return;
    } else {
      addIntakeMessage(`This field is required. ${q.question.split('?')[0]}?`, 'system');
      return;
    }
  }

  // ── SMART PROCESSING ──
  let processedAnswer = answer;

  // Auto-correct email
  if (q.key === 'client_email') {
    processedAnswer = INTELLIGENCE.fixEmail(answer);
    if (processedAnswer !== answer.toLowerCase().trim()) {
      addIntakeMessage(`Auto-corrected to: <strong>${processedAnswer}</strong>`, 'system');
    }
  }

  // Auto-format phone
  if (q.key === 'client_phone') {
    processedAnswer = INTELLIGENCE.fixPhone(answer);
    if (processedAnswer !== answer) {
      addIntakeMessage(`Formatted: <strong>${processedAnswer}</strong>`, 'system');
    }
  }

  // Validate field
  const validation = INTELLIGENCE.validateField(q.key, processedAnswer);
  if (!validation.valid) {
    intakeState.retryCount++;
    if (intakeState.retryCount >= 3 && q.skippable) {
      addIntakeMessage("Having trouble with this one. Skipping — you can update it later.", 'system');
      intakeState.answers[q.key] = '';
      intakeState.currentStep++;
      intakeState.retryCount = 0;
      setTimeout(() => askCurrentQuestion(), 300);
      return;
    }
    addIntakeMessage(validation.message, 'system');
    return;
  }

  processedAnswer = validation.value;

  // Store pending and ask for confirmation
  intakeState.pendingAnswer = processedAnswer;
  intakeState.pendingKey = q.key;
  intakeState.waitingForConfirm = true;

  // Build contextual confirmation
  const confirmMsg = INTELLIGENCE.getConfirmMessage(q.key, processedAnswer);
  addIntakeMessage(confirmMsg, 'response');
  speakText(`Is that correct?`);
}

function handleConfirmation(answer) {
  addIntakeMessage(answer, 'user');
  intakeState.waitingForConfirm = false;

  if (INTELLIGENCE.isYes(answer)) {
    // Confirmed — process the answer
    intakeState.retryCount = 0;
    processConfirmedAnswer(intakeState.pendingKey, intakeState.pendingAnswer);
  } else if (INTELLIGENCE.isNo(answer)) {
    // Not confirmed — re-ask
    addIntakeMessage("No worries — try again.", 'system');
    speakText("No worries. Try again.");
    setTimeout(() => askCurrentQuestion(), 400);
  } else {
    // Ambiguous — treat as a new answer (user might be correcting inline)
    addIntakeMessage("I'll take that as a correction. Let me process it.", 'system');
    intakeState.waitingForConfirm = false;
    // Re-process the new answer as if it was the original
    const q = intakeState.questions[intakeState.currentStep];
    let processedAnswer = answer;

    if (q.key === 'client_email') processedAnswer = INTELLIGENCE.fixEmail(answer);
    if (q.key === 'client_phone') processedAnswer = INTELLIGENCE.fixPhone(answer);

    const validation = INTELLIGENCE.validateField(q.key, processedAnswer);
    if (validation.valid) {
      intakeState.pendingAnswer = validation.value;
      intakeState.pendingKey = q.key;
      intakeState.waitingForConfirm = true;
      const confirmMsg = INTELLIGENCE.getConfirmMessage(q.key, validation.value);
      addIntakeMessage(confirmMsg, 'response');
    } else {
      addIntakeMessage(validation.message, 'system');
    }
  }
}

function processConfirmedAnswer(key, answer) {
  intakeState.answers[key] = answer;

  if (key === 'surfaces') {
    // Parse surfaces using the intelligence layer
    const parsed = INTELLIGENCE.inferSurfaces(answer);
    intakeState.surfaceList = parsed;

    if (parsed.length === 0) {
      addIntakeMessage("I couldn't identify specific surfaces from that. Please list them clearly — e.g. \"floors, bathroom, feature wall\".", 'system');
      speakText("Please list the surface types clearly.");
      intakeState.retryCount++;
      if (intakeState.retryCount >= 3) {
        addIntakeMessage("Let me add a generic surface. You can update the details in the calculator.", 'system');
        intakeState.surfaceList = [{ type: 'Floor', label: 'Floor' }];
      } else {
        return; // Re-ask same question
      }
    }

    addIntakeMessage(`Got it — <strong>${parsed.map(s => s.label).join(', ')}</strong>. I'll ask the sqm for each.`, 'system');

    // Insert dynamic sqm questions after current position
    const sqmQuestions = parsed.map(s => ({
      key: 'sqm_' + s.label.toLowerCase().replace(/\s+/g, '_'),
      question: `How many square metres is the <strong>${s.label}</strong>?`,
      surfaceType: s.type,
      surfaceLabel: s.label,
      skippable: false,
    }));

    const insertAt = intakeState.currentStep + 1;
    intakeState.questions.splice(insertAt, 0, ...sqmQuestions);
    intakeState.totalSteps = intakeState.questions.length;
  }

  if (key.startsWith('sqm_')) {
    const sqmVal = parseFloat(answer.replace(/[^\d.]/g, ''));
    const q = intakeState.questions[intakeState.currentStep];
    if (q && q.surfaceType && sqmVal > 0) {
      intakeState.surfaceSqm[q.surfaceLabel || q.surfaceType] = {
        sqm: sqmVal,
        label: q.surfaceLabel || q.surfaceType,
        type: q.surfaceType,
      };
    }
  }

  // Move to next
  intakeState.currentStep++;
  setTimeout(() => askCurrentQuestion(), 500);
}

function finishIntake() {
  intakeState.active = false;
  updateProgress();

  // Build summary
  const data = buildIntakeData();
  let summaryHTML = '<div style="border:1px solid var(--gold);padding:16px;border-radius:8px;margin:8px 0;">';
  summaryHTML += '<strong style="color:var(--gold);font-size:16px;">JOB INTAKE SUMMARY</strong><br><br>';
  summaryHTML += `<strong>Client:</strong> ${data.client_name || '—'}<br>`;
  summaryHTML += `<strong>Phone:</strong> ${data.client_phone || '—'}<br>`;
  summaryHTML += `<strong>Email:</strong> ${data.client_email || '—'}<br>`;
  summaryHTML += `<strong>Address:</strong> ${data.project_address || '—'}<br><br>`;

  summaryHTML += '<strong>Surfaces:</strong><br>';
  if (data.surfaces.length > 0) {
    data.surfaces.forEach(s => {
      summaryHTML += `&nbsp;&nbsp;• ${s.description} — <strong>${s.sqm} sqm</strong><br>`;
    });
  } else {
    summaryHTML += '&nbsp;&nbsp;No surfaces identified<br>';
  }

  summaryHTML += `<br><strong>System:</strong> ${data.system_label}`;
  summaryHTML += `<br><strong>Substrate:</strong> ${data.substrate}`;
  summaryHTML += `<br><strong>Crew:</strong> ${data.crew_label}`;
  summaryHTML += `<br><strong>Notes:</strong> ${data.notes || 'None'}`;
  summaryHTML += '</div>';

  addIntakeMessage(summaryHTML, 'response');
  speakText('Job intake complete. Review the summary and click Populate All Fields when ready.');

  // Show populate button
  document.getElementById('intake-populate-area').style.display = 'block';
  document.getElementById('intake-input-area').style.display = 'none';

  // Update progress to 100%
  const bar = document.getElementById('intake-progress-bar');
  const label = document.getElementById('intake-progress-label');
  if (bar) bar.style.width = '100%';
  if (label) label.textContent = 'INTAKE COMPLETE';
}

function buildIntakeData() {
  const a = intakeState.answers;

  // System inference
  const sysInfo = INTELLIGENCE.inferSystem(a.system || 'solidro');

  // Build surfaces array
  const surfaces = [];
  Object.entries(intakeState.surfaceSqm).forEach(([label, info]) => {
    surfaces.push({
      description: 'Microcement — ' + info.label,
      type: info.type,
      sqm: info.sqm,
      system: sysInfo.key,
    });
  });

  // Crew inference
  const crewInfo = INTELLIGENCE.inferCrew(a.crew || 'standard');

  // Substrate inference
  const subInfo = INTELLIGENCE.inferSubstrate(a.substrate || '');

  return {
    client_name: a.client_name || '',
    client_phone: a.client_phone || '',
    client_email: a.client_email || '',
    project_address: a.project_address || '',
    surfaces: surfaces,
    system_key: sysInfo.key,
    system_label: sysInfo.label,
    crew_key: crewInfo.key,
    crew_label: crewInfo.label,
    is_levelled: subInfo.isLevelled,
    substrate: subInfo.description,
    notes: a.notes || '',
  };
}


// ═══════════════════════════════════════════════════════════
// AUTO-POPULATE
// ═══════════════════════════════════════════════════════════

function populateAllFields() {
  const data = buildIntakeData();

  // ── 1. POPULATE CALCULATOR TAB ──────────────────────────

  // Clear existing surfaces
  document.getElementById('surface-lines').innerHTML = '';
  // Reset lineCount so IDs are fresh
  if (typeof lineCount !== 'undefined') lineCount = 0;

  // Add each surface
  if (data.surfaces.length > 0) {
    data.surfaces.forEach(s => {
      let typeVal = s.type;
      // Normalize type
      if (typeVal === 'Bathroom' || typeVal === 'Ensuite' || typeVal === 'Shower' || typeVal === 'Laundry') typeVal = 'Wet Area';
      if (typeVal === 'Kitchen Bench' || typeVal === 'Benchtop' || typeVal === 'Island Bench' || typeVal === 'Vanity Top') typeVal = 'Bench Top';
      if (typeVal === 'Walls' || typeVal === 'Accent Wall' || typeVal === 'Fireplace Wall') typeVal = 'Feature Wall';
      if (typeVal === 'Facade' || typeVal === 'Balcony' || typeVal === 'Outdoor Area' || typeVal === 'Pool Surround') typeVal = 'External';

      if (typeof addSurfaceLine === 'function') addSurfaceLine(typeVal, data.system_key);

      // Set sqm and name on the last added line
      const allLines = document.querySelectorAll('.surface-line');
      const lastLine = allLines[allLines.length - 1];
      if (lastLine) {
        const id = lastLine.id.replace('surface-line-', '');
        const sqmInput = document.getElementById('sqm-' + id);
        if (sqmInput) sqmInput.value = s.sqm;
        const nameInput = document.getElementById('name-' + id);
        if (nameInput) nameInput.value = s.description;

        // Set levelled checkbox if applicable
        if (data.is_levelled && typeVal === 'Floor') {
          const cb = document.getElementById('levelled-' + id);
          if (cb) cb.checked = true;
        }
      }
    });
  }

  // Set crew
  const crewOptions = document.querySelectorAll('#crew-grid .crew-option');
  crewOptions.forEach(el => {
    el.classList.remove('active');
    if (el.dataset.key === data.crew_key) {
      el.classList.add('active');
    }
  });
  if (typeof CREW_CONFIGS !== 'undefined' && CREW_CONFIGS[data.crew_key]) {
    if (typeof crewConfig !== 'undefined') crewConfig = CREW_CONFIGS[data.crew_key];
  }

  // Set prep
  const prepMult = data.is_levelled ? 1.0 : 1.2;
  const prepOptions = document.querySelectorAll('#prep-grid .crew-option');
  prepOptions.forEach(el => {
    el.classList.remove('active');
    if (parseFloat(el.dataset.mult) === prepMult) {
      el.classList.add('active');
    }
  });
  if (typeof prepMultiplier !== 'undefined') prepMultiplier = prepMult;

  // Recalculate
  if (typeof recalc === 'function') recalc();

  // ── 2. POPULATE QUOTE TAB ──────────────────────────────

  const fields = {
    'q-client-name': data.client_name,
    'q-client-phone': data.client_phone,
    'q-client-email': data.client_email,
    'q-project-address': data.project_address,
    'q-site-contact': data.client_name,
  };

  Object.entries(fields).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val) el.textContent = val;
  });

  // Scope
  const scopeEl = document.getElementById('q-scope');
  if (scopeEl) {
    const scopeText = data.surfaces.map(s => s.description + ' (' + s.sqm + ' sqm)').join(', ');
    scopeEl.textContent = scopeText + (data.notes ? '. ' + data.notes : '');
  }

  // Substrate
  const subEl = document.getElementById('q-substrate');
  if (subEl) subEl.textContent = data.substrate;

  // Colour/finish
  const colEl = document.getElementById('q-colour-finish');
  if (colEl) colEl.textContent = data.system_label + ' System';

  // Clear and add pricing lines
  const pricingBody = document.getElementById('q-pricing-body');
  if (pricingBody) {
    pricingBody.innerHTML = '';
    data.surfaces.forEach(s => {
      if (typeof addQuoteLine === 'function') {
        addQuoteLine(s.description, s.sqm, 'sqm', '');
      }
    });
  }

  // ── 3. SHOW BANNERS ────────────────────────────────────

  showAutoPopulateBanner('tab-calculator');
  showAutoPopulateBanner('tab-quote');

  // ── 4. CONFIRMATION ────────────────────────────────────

  addIntakeMessage('All fields populated. Review the <strong>Calculator</strong> and <strong>Quote</strong> tabs.', 'system');
  speakText('All fields populated. Review the Calculator and Quote tabs.');

  // Reset intake UI
  document.getElementById('intake-start-btn').style.display = 'block';
  document.getElementById('intake-start-btn').textContent = 'START NEW INTAKE';
}

function showAutoPopulateBanner(tabId) {
  const tab = document.getElementById(tabId);
  if (!tab) return;
  const existing = tab.querySelector('.auto-populate-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.className = 'auto-populate-banner';
  banner.innerHTML = '<span class="apb-icon">&#9889;</span> AUTO-POPULATED FROM AI INTAKE — REVIEW BEFORE SENDING';
  tab.insertBefore(banner, tab.firstChild);

  setTimeout(() => {
    if (banner.parentNode) banner.style.opacity = '0.5';
  }, 30000);
}

function toggleSpeakQuestions() {
  intakeState.speakEnabled = !intakeState.speakEnabled;
  const btn = document.getElementById('speak-toggle-btn');
  if (btn) {
    btn.classList.toggle('active', intakeState.speakEnabled);
    btn.textContent = intakeState.speakEnabled ? 'SPEAK QUESTIONS: ON' : 'SPEAK QUESTIONS: OFF';
  }
  if (intakeState.speakEnabled && 'speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
  }
}

function cancelIntake() {
  intakeState.active = false;
  intakeState.waitingForConfirm = false;
  stopListening();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();

  document.getElementById('intake-section').style.display = 'none';
  document.getElementById('intake-start-btn').style.display = 'block';
  document.getElementById('intake-start-btn').textContent = 'START JOB INTAKE';
  document.getElementById('intake-input-area').style.display = 'none';
  document.getElementById('intake-progress').style.display = 'none';
  document.getElementById('intake-populate-area').style.display = 'none';

  addIntakeMessage('Intake cancelled.', 'system');
}


// ═══════════════════════════════════════════════════════════
// EXISTING FREE-CHAT AI FUNCTIONS (preserved)
// ═══════════════════════════════════════════════════════════

function addChatMessage(text, type) {
  const area = document.getElementById('ai-chat-area-free');
  if (!area) return;
  const div = document.createElement('div');
  div.className = 'ai-message ai-' + type;
  div.textContent = text;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

function addChatHTML(html, type) {
  const area = document.getElementById('ai-chat-area-free');
  if (!area) return;
  const div = document.createElement('div');
  div.className = 'ai-message ai-' + type;
  div.innerHTML = html;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

async function callAI(userMessage) {
  const apiKey = window.MCK_API_KEY || '';
  if (!apiKey) {
    return {
      success: false,
      message: 'API key not configured. To enable AI features, set window.MCK_API_KEY before loading this script, or use the manual extraction below.'
    };
  }
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });
    if (!response.ok) throw new Error('API returned ' + response.status);
    const data = await response.json();
    return { success: true, message: data.choices[0].message.content };
  } catch (err) {
    return { success: false, message: 'AI API error: ' + err.message + '. Using manual extraction instead.' };
  }
}

function extractJobManually(text) {
  const result = { client_name: '', project_address: '', surfaces: [], notes: '' };
  const nameMatch = text.match(/(?:for|client|name[:\s]+)([A-Z][a-z]+ [A-Z][a-z]+)/i);
  if (nameMatch) result.client_name = nameMatch[1];
  const addrMatch = text.match(/(?:at|address[:\s]+)([0-9]+[^,.]+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Parade|Pde|Court|Ct|Crescent|Cres|Boulevard|Blvd|Way|Lane|Ln|Place|Pl)[^,.]*)/i);
  if (addrMatch) result.project_address = addrMatch[1].trim();
  const surfacePatterns = [
    { regex: /(?:bathroom\s+)?floor[s]?\s+(\d+(?:\.\d+)?)\s*(?:sqm|m2|sq)/gi, type: 'Floor' },
    { regex: /(?:feature\s+)?wall[s]?\s+(\d+(?:\.\d+)?)\s*(?:sqm|m2|sq)/gi, type: 'Feature Wall' },
    { regex: /(?:wet\s+area|bathroom|ensuite|shower)[s]?\s+(?:wall[s]?\s+)?(\d+(?:\.\d+)?)\s*(?:sqm|m2|sq)/gi, type: 'Wet Area' },
    { regex: /(?:bench\s*top|benchtop|kitchen\s+bench)[s]?\s+(\d+(?:\.\d+)?)\s*(?:sqm|m2|sq)/gi, type: 'Bench Top' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:sqm|m2|sq)\s+(?:of\s+)?(?:bathroom\s+)?floor/gi, type: 'Floor' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:sqm|m2|sq)\s+(?:of\s+)?(?:feature\s+)?wall/gi, type: 'Feature Wall' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:sqm|m2|sq)\s+(?:of\s+)?(?:wet\s+area|bathroom|ensuite)/gi, type: 'Wet Area' },
    { regex: /(\d+(?:\.\d+)?)\s*(?:sqm|m2|sq)\s+(?:of\s+)?(?:bench\s*top|benchtop)/gi, type: 'Bench Top' },
  ];
  const found = new Set();
  surfacePatterns.forEach(p => {
    let m;
    while ((m = p.regex.exec(text)) !== null) {
      const sqm = parseFloat(m[1]);
      const key = p.type + '-' + sqm;
      if (!found.has(key) && sqm > 0) {
        found.add(key);
        result.surfaces.push({ description: 'Microcement — ' + p.type, type: p.type, sqm: sqm, system: text.toLowerCase().includes('micro cement') ? 'micro_cement' : 'solidro' });
      }
    }
  });
  return result;
}

function populateQuoteFromData(data) {
  if (typeof switchTab === 'function') switchTab('quote');
  if (data.client_name) { const el = document.getElementById('q-client-name'); if (el) el.textContent = data.client_name; }
  if (data.client_phone) { const el = document.getElementById('q-client-phone'); if (el) el.textContent = data.client_phone; }
  if (data.client_email) { const el = document.getElementById('q-client-email'); if (el) el.textContent = data.client_email; }
  if (data.project_address) { const el = document.getElementById('q-project-address'); if (el) el.textContent = data.project_address; }
  const pricingBody = document.getElementById('q-pricing-body');
  if (pricingBody) pricingBody.innerHTML = '';
  if (data.surfaces && data.surfaces.length > 0) {
    data.surfaces.forEach(s => { if (typeof addQuoteLine === 'function') addQuoteLine(s.description || ('Microcement — ' + s.type), s.sqm || '', 'sqm', ''); });
  }
  document.getElementById('surface-lines').innerHTML = '';
  if (data.surfaces && data.surfaces.length > 0) {
    data.surfaces.forEach(s => {
      if (typeof addSurfaceLine === 'function') addSurfaceLine(s.type, s.system);
      const allLines = document.querySelectorAll('.surface-line');
      const lastLine = allLines[allLines.length - 1];
      if (lastLine) {
        const id = lastLine.id.replace('surface-line-', '');
        const sqmInput = document.getElementById('sqm-' + id);
        if (sqmInput && s.sqm) sqmInput.value = s.sqm;
        const nameInput = document.getElementById('name-' + id);
        if (nameInput) nameInput.value = s.description || (s.type + ' — ' + (s.sqm || '') + 'sqm');
      }
    });
    if (typeof recalc === 'function') recalc();
  }
}

async function aiProcessJobFree() {
  const input = document.getElementById('ai-input-free').value.trim();
  if (!input) return;
  addChatMessage(input, 'user');
  document.getElementById('ai-input-free').value = '';
  addChatMessage('Processing...', 'system');
  const aiResult = await callAI('Extract job details from this description and return JSON:\n\n' + input);
  if (aiResult.success) {
    try {
      const jsonMatch = aiResult.message.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        addChatHTML('<strong>Extracted:</strong><br>' +
          (data.client_name ? 'Client: ' + data.client_name + '<br>' : '') +
          (data.project_address ? 'Address: ' + data.project_address + '<br>' : '') +
          (data.surfaces ? 'Surfaces: ' + data.surfaces.map(s => s.type + ' ' + s.sqm + 'sqm').join(', ') : '') +
          (data.notes ? '<br>Notes: ' + data.notes : ''), 'response');
        populateQuoteFromData(data);
        addChatMessage('Quote populated. Switch to the Quote Generator tab to review and set pricing.', 'system');
        return;
      }
    } catch (e) {}
    addChatHTML(aiResult.message.replace(/\n/g, '<br>'), 'response');
  } else {
    addChatMessage(aiResult.message, 'system');
    const data = extractJobManually(input);
    if (data.surfaces.length > 0) {
      addChatHTML('<strong>Manual Extraction:</strong><br>' +
        (data.client_name ? 'Client: ' + data.client_name + '<br>' : '') +
        (data.project_address ? 'Address: ' + data.project_address + '<br>' : '') +
        'Surfaces: ' + data.surfaces.map(s => s.type + ' ' + s.sqm + 'sqm').join(', '), 'response');
      populateQuoteFromData(data);
      addChatMessage('Quote populated from manual extraction. Review and set pricing in the Quote Generator tab.', 'system');
    } else {
      addChatMessage('Could not extract surfaces. Please include surface types and sqm values. Example: "bathroom floor 12sqm, feature walls 8sqm"', 'error');
    }
  }
}

async function aiCheckQuoteFree() {
  const input = document.getElementById('ai-input-free').value.trim();
  if (!input) {
    addChatMessage('Paste a quote or describe the job pricing to check.', 'error');
    return;
  }
  addChatMessage(input, 'user');
  document.getElementById('ai-input-free').value = '';
  const aiResult = await callAI('Check this quote for margin issues, market rate compliance, and any red flags. MCK pricing tiers: Floors 0-25sqm $365, 25-70sqm $305, 70+sqm $250. Feature Walls 15-30sqm $300, 30-60sqm $260, 60+sqm $220. Wet Areas 15-30sqm $460, 30-60sqm $360, 60-100sqm $320, 100+sqm $280. Minimum target margin is 40%.\n\n' + input);
  if (aiResult.success) {
    addChatHTML(aiResult.message.replace(/\n/g, '<br>'), 'response');
  } else {
    addChatMessage(aiResult.message, 'error');
    addChatMessage('To check a quote manually: enter the total sell price in the Margin Calculator\'s "Custom Sell Price" field to see your actual margin.', 'system');
  }
}


// ═══════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Handle Enter key in intake input
  const aiInput = document.getElementById('ai-input');
  if (aiInput) {
    aiInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (intakeState.active) {
          handleIntakeAnswer();
        }
      }
    });
  }

  // Handle Enter key in free-chat input
  const freeInput = document.getElementById('ai-input-free');
  if (freeInput) {
    freeInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        aiProcessJobFree();
      }
    });
  }

  // Pre-load voices for TTS
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };
  }

  // Init speech recognition
  initSpeechRecognition();
});
