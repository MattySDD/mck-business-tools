// ═══════════════════════════════════════════════════════════
// MCK AI QUOTE ASSISTANT + VOICE-GUIDED JOB INTAKE
// Uses OpenAI-compatible API + Web Speech API
// ═══════════════════════════════════════════════════════════

// ── AI SYSTEM PROMPTS ─────────────────────────────────────

const AI_SYSTEM_PROMPT = `You are the Micro Cement King AI Quote Assistant. You help extract job details from natural language descriptions and verify quote pricing.

RULES:
- All prices are ex GST unless stated
- Phone: 0468 053 819
- Systems: Solidro (premium) or Microtopping (value)
- Surface types: Floor, Feature Wall, Wet Area, Bench Top
- Gold Coast market rates: Feature Walls $280-$500/sqm, Floors $200-$400/sqm, Wet Areas $350-$600/sqm, Bench Tops $300-$500/sqm
- Deposit: 5% if contract >$20k, 10% if under $20k
- Material payment: 50% before start
- Final: remaining balance within 3 business days

When extracting job details, return a JSON block with:
{
  "client_name": "",
  "client_phone": "",
  "client_email": "",
  "project_address": "",
  "surfaces": [
    { "description": "", "type": "Floor|Feature Wall|Wet Area|Bench Top", "sqm": 0, "system": "solidro|microtopping" }
  ],
  "notes": ""
}

When checking a quote, verify margins, market rates, and flag any issues.
Be direct and concise. No fluff.`;

const INTAKE_SYSTEM_PROMPT = `You are the MCK Job Intake Assistant for Micro Cement King, a premium microcement and decorative coatings business on the Gold Coast, QLD. You are an expert in microcement floors, feature walls, wet areas, bathrooms, benchtops, Venetian plaster, and specialty finishes. You know the Solidro system (Solidro Zero base coat, Solidro Top finish coat at 2.5 sqm/kg), the Microtopping system (MT-BC-W base, MT-FC-W finish, MT-POL polymer), and all Ideal Works products. You only answer questions related to MCK jobs, pricing, surfaces, products, and processes. If asked anything outside this scope, redirect the conversation back to the job intake. Never give generic advice. Always think in terms of sqm, surface types, prep requirements, and material quantities. MCK pricing: Floors over 60sqm = $100/sqm, under 60sqm = $160/sqm, min $7,500. Feature walls over 20sqm = $120/sqm, under 20sqm = $180/sqm, min $5,000. Wet areas/bathrooms/benchtops over 20sqm = $160/sqm, under 20sqm = $300/sqm, min $7,500. Combined areas eliminate individual minimums.`;


// ═══════════════════════════════════════════════════════════
// VOICE INTAKE ENGINE
// ═══════════════════════════════════════════════════════════

const INTAKE_QUESTIONS = [
  { key: 'client_name',    question: "What is the client's full name?" },
  { key: 'client_phone',   question: "What is the client's phone number?" },
  { key: 'client_email',   question: "What is the client's email address?" },
  { key: 'project_address', question: "What is the job site address?" },
  { key: 'surfaces',       question: "What surface areas are we quoting? For example: floors, feature walls, wet areas, bathrooms, benchtops — tell me all of them." },
  // Dynamic sqm questions inserted per surface
  { key: 'system',         question: "What system are we using — Solidro, Microtopping, or another product?" },
  { key: 'substrate',      question: "Is the floor substrate levelled and in good condition, or does it need full prep?" },
  { key: 'crew',           question: "What crew are we sending — solo applicator, standard crew, or full crew?" },
  { key: 'notes',          question: "Any special notes, finishes, or variations for this job?" },
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
  // Try to pick an Australian or English voice
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

  // Build initial question list (before dynamic sqm questions)
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

  addIntakeMessage("Starting MCK Job Intake. I'll ask you a series of questions to collect all job details. You can speak or type your answers.", 'system');

  // Check speech support
  const hasSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  if (!hasSpeech) {
    addIntakeMessage('Voice input is not supported in this browser. You can type all your answers below.', 'system');
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
  addIntakeMessage(q.question, 'response');
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

  // Store pending and ask for confirmation
  intakeState.pendingAnswer = answer;
  intakeState.pendingKey = q.key;
  intakeState.waitingForConfirm = true;

  // Build confirmation message
  let confirmMsg = `I heard: <strong>"${answer}"</strong> — Is that correct? (Yes / No)`;
  addIntakeMessage(confirmMsg, 'response');
  speakText(`I heard: ${answer}. Is that correct?`);
}

function handleConfirmation(answer) {
  const lower = answer.toLowerCase().trim();
  addIntakeMessage(answer, 'user');

  intakeState.waitingForConfirm = false;

  if (lower.startsWith('y') || lower === 'correct' || lower === 'yep' || lower === 'yeah' || lower === 'that\'s right' || lower === 'right') {
    // Confirmed — process the answer
    processConfirmedAnswer(intakeState.pendingKey, intakeState.pendingAnswer);
  } else {
    // Not confirmed — re-ask
    addIntakeMessage("No worries. Let's try that again.", 'system');
    speakText("No worries. Let's try that again.");
    setTimeout(() => askCurrentQuestion(), 400);
  }
}

function processConfirmedAnswer(key, answer) {
  intakeState.answers[key] = answer;

  if (key === 'surfaces') {
    // Parse surfaces from the answer and inject dynamic sqm questions
    const parsed = parseSurfaces(answer);
    intakeState.surfaceList = parsed;

    if (parsed.length === 0) {
      addIntakeMessage("I couldn't identify specific surfaces. Let me ask differently — please list each surface type (floor, feature wall, wet area, benchtop).", 'system');
      speakText("I couldn't identify specific surfaces. Please list each surface type.");
      return; // Re-ask same question
    }

    addIntakeMessage(`Got it — ${parsed.map(s => s.label).join(', ')}. Now I'll ask the sqm for each.`, 'system');

    // Insert dynamic sqm questions after current position
    const sqmQuestions = parsed.map(s => ({
      key: 'sqm_' + s.type.toLowerCase().replace(/\s/g, '_'),
      question: `How many square metres is the ${s.label}?`,
      surfaceType: s.type,
      surfaceLabel: s.label,
    }));

    // Insert after current step (surfaces question)
    const insertAt = intakeState.currentStep + 1;
    intakeState.questions.splice(insertAt, 0, ...sqmQuestions);
    intakeState.totalSteps = intakeState.questions.length;
  }

  if (key.startsWith('sqm_')) {
    // Parse sqm value
    const sqmVal = parseFloat(answer.replace(/[^\d.]/g, ''));
    const q = intakeState.questions[intakeState.currentStep];
    if (q && q.surfaceType && sqmVal > 0) {
      intakeState.surfaceSqm[q.surfaceType] = {
        sqm: sqmVal,
        label: q.surfaceLabel || q.surfaceType,
      };
    }
  }

  // Move to next
  intakeState.currentStep++;
  setTimeout(() => askCurrentQuestion(), 500);
}

function parseSurfaces(text) {
  const lower = text.toLowerCase();
  const surfaces = [];
  const seen = new Set();

  const patterns = [
    { regex: /\bfloor[s]?\b/i, type: 'Floor', label: 'Floor' },
    { regex: /\bfeature\s*wall[s]?\b/i, type: 'Feature Wall', label: 'Feature Wall' },
    { regex: /\bwet\s*area[s]?\b/i, type: 'Wet Area', label: 'Wet Area' },
    { regex: /\bbathroom[s]?\b/i, type: 'Wet Area', label: 'Bathroom' },
    { regex: /\bensuite[s]?\b/i, type: 'Wet Area', label: 'Ensuite' },
    { regex: /\bshower[s]?\b/i, type: 'Wet Area', label: 'Shower' },
    { regex: /\bbench\s*top[s]?\b/i, type: 'Bench Top', label: 'Benchtop' },
    { regex: /\bkitchen\s*bench\b/i, type: 'Bench Top', label: 'Kitchen Bench' },
    { regex: /\bwall[s]?\b(?!.*feature)/i, type: 'Feature Wall', label: 'Walls' },
  ];

  patterns.forEach(p => {
    if (p.regex.test(lower) && !seen.has(p.type + p.label)) {
      // For wet areas, allow multiple labels but same type
      const key = p.label;
      if (!seen.has(key)) {
        seen.add(key);
        surfaces.push({ type: p.type, label: p.label });
      }
    }
  });

  return surfaces;
}

function finishIntake() {
  intakeState.active = false;
  updateProgress();

  // Build summary
  const data = buildIntakeData();
  let summaryHTML = '<strong>JOB INTAKE SUMMARY</strong><br><br>';
  summaryHTML += `<strong>Client:</strong> ${data.client_name || '—'}<br>`;
  summaryHTML += `<strong>Phone:</strong> ${data.client_phone || '—'}<br>`;
  summaryHTML += `<strong>Email:</strong> ${data.client_email || '—'}<br>`;
  summaryHTML += `<strong>Address:</strong> ${data.project_address || '—'}<br><br>`;

  summaryHTML += '<strong>Surfaces:</strong><br>';
  if (data.surfaces.length > 0) {
    data.surfaces.forEach(s => {
      summaryHTML += `&nbsp;&nbsp;• ${s.description} — ${s.sqm} sqm<br>`;
    });
  } else {
    summaryHTML += '&nbsp;&nbsp;No surfaces identified<br>';
  }

  summaryHTML += `<br><strong>System:</strong> ${data.system_label || '—'}`;
  summaryHTML += `<br><strong>Substrate:</strong> ${data.substrate || '—'}`;
  summaryHTML += `<br><strong>Crew:</strong> ${data.crew_label || '—'}`;
  summaryHTML += `<br><strong>Notes:</strong> ${data.notes || '—'}`;

  addIntakeMessage(summaryHTML, 'response');
  speakText('Job intake complete. Here is your summary. Click Populate All Fields when ready.');

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
  const sys = (a.system || 'solidro').toLowerCase();
  let systemKey = 'solidro';
  let systemLabel = 'Solidro';
  if (sys.includes('micro') || sys.includes('mt')) {
    systemKey = 'microtopping';
    systemLabel = 'Microtopping';
  }

  // Build surfaces array
  const surfaces = [];
  Object.entries(intakeState.surfaceSqm).forEach(([type, info]) => {
    surfaces.push({
      description: 'Microcement — ' + info.label,
      type: type,
      sqm: info.sqm,
      system: systemKey,
    });
  });

  // Determine crew
  let crewKey = 'standard';
  let crewLabel = 'Standard Crew (Patty + Hayden/Micky)';
  const crewAnswer = (a.crew || '').toLowerCase();
  if (crewAnswer.includes('solo') || crewAnswer.includes('patty only') || crewAnswer.includes('one')) {
    crewKey = 'solo';
    crewLabel = 'Solo (Patty Only)';
  } else if (crewAnswer.includes('full') || crewAnswer.includes('three') || crewAnswer.includes('all') || crewAnswer.includes('labourer')) {
    crewKey = 'full';
    crewLabel = 'Full Crew (Patty + Hayden/Micky + Labourer)';
  }

  // Determine substrate
  const subAnswer = (a.substrate || '').toLowerCase();
  const isLevelled = subAnswer.includes('level') || subAnswer.includes('good') || subAnswer.includes('fine') || subAnswer.includes('ready');

  return {
    client_name: a.client_name || '',
    client_phone: a.client_phone || '',
    client_email: a.client_email || '',
    project_address: a.project_address || '',
    surfaces: surfaces,
    system_key: systemKey,
    system_label: systemLabel,
    crew_key: crewKey,
    crew_label: crewLabel,
    is_levelled: isLevelled,
    substrate: a.substrate || '',
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
  lineCount = 0;

  // Add each surface
  if (data.surfaces.length > 0) {
    data.surfaces.forEach(s => {
      // Map type string to the correct value
      let typeVal = s.type;
      // Normalize type
      if (typeVal === 'Bathroom' || typeVal === 'Ensuite' || typeVal === 'Shower') typeVal = 'Wet Area';
      if (typeVal === 'Kitchen Bench' || typeVal === 'Benchtop') typeVal = 'Bench Top';
      if (typeVal === 'Walls') typeVal = 'Feature Wall';

      addSurfaceLine(typeVal, data.system_key);

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
    crewConfig = CREW_CONFIGS[data.crew_key];
  }

  // Set prep
  if (!data.is_levelled) {
    // Complex prep
    const prepOptions = document.querySelectorAll('#prep-grid .crew-option');
    prepOptions.forEach(el => {
      el.classList.remove('active');
      if (parseFloat(el.dataset.mult) === 1.2) {
        el.classList.add('active');
      }
    });
    prepMultiplier = 1.2;
  } else {
    const prepOptions = document.querySelectorAll('#prep-grid .crew-option');
    prepOptions.forEach(el => {
      el.classList.remove('active');
      if (parseFloat(el.dataset.mult) === 1.0) {
        el.classList.add('active');
      }
    });
    prepMultiplier = 1.0;
  }

  // Recalculate
  if (typeof recalc === 'function') recalc();

  // ── 2. POPULATE QUOTE TAB ──────────────────────────────

  // Client details
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
  // Remove existing banner if any
  const existing = tab.querySelector('.auto-populate-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.className = 'auto-populate-banner';
  banner.innerHTML = '<span class="apb-icon">&#9889;</span> AUTO-POPULATED FROM AI INTAKE — REVIEW BEFORE SENDING';
  tab.insertBefore(banner, tab.firstChild);

  // Auto-dismiss after 30 seconds
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
  // Load voices if enabling
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
        result.surfaces.push({ description: 'Microcement — ' + p.type, type: p.type, sqm: sqm, system: text.toLowerCase().includes('microtopping') ? 'microtopping' : 'solidro' });
      }
    }
  });
  const sys = text.toLowerCase().includes('microtopping') ? 'microtopping' : 'solidro';
  result.surfaces.forEach(s => s.system = sys);
  return result;
}

function populateQuoteFromData(data) {
  switchTab('quote');
  if (data.client_name) document.getElementById('q-client-name').textContent = data.client_name;
  if (data.client_phone) document.getElementById('q-client-phone').textContent = data.client_phone;
  if (data.client_email) document.getElementById('q-client-email').textContent = data.client_email;
  if (data.project_address) document.getElementById('q-project-address').textContent = data.project_address;
  document.getElementById('q-pricing-body').innerHTML = '';
  if (data.surfaces && data.surfaces.length > 0) {
    data.surfaces.forEach(s => { addQuoteLine(s.description || ('Microcement — ' + s.type), s.sqm || '', 'sqm', ''); });
  }
  document.getElementById('surface-lines').innerHTML = '';
  if (data.surfaces && data.surfaces.length > 0) {
    data.surfaces.forEach(s => {
      addSurfaceLine(s.type, s.system);
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
    recalc();
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
  const aiResult = await callAI('Check this quote for margin issues, market rate compliance, and any red flags. Gold Coast market rates: Feature Walls $280-$500/sqm, Floors $200-$400/sqm, Wet Areas $350-$600/sqm, Bench Tops $300-$500/sqm. Minimum target margin is 40%.\n\n' + input);
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
