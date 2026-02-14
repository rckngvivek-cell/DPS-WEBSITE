const navToggle = document.getElementById("navToggle");
const primaryNav = document.getElementById("primaryNav");
const chatbot = document.getElementById("chatbot");
const chatLog = document.getElementById("chatLog");
const chatForm = document.getElementById("chatForm");
const chatFields = document.getElementById("chatFields");
const chatError = document.getElementById("chatError");
const chatAction = document.getElementById("chatAction");
const stepCount = document.getElementById("stepCount");
const ringValue = document.getElementById("ringValue");
const botStateLabel = document.getElementById("botStateLabel");
const resumeSaved = document.getElementById("resumeSaved");
const restartFlow = document.getElementById("restartFlow");
const backStep = document.getElementById("backStep");
const downloadReceipt = document.getElementById("downloadReceipt");
const saveStatus = document.getElementById("saveStatus");
const journeyList = Array.from(document.querySelectorAll("#journeyList li"));

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (prefersReducedMotion) {
  document.body.classList.add("reduced-motion");
}

if (navToggle && primaryNav) {
  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    primaryNav.classList.toggle("open", !expanded);
  });
}

const OPENING_MESSAGE =
  "Welcome to Delhi Public School K. Asthan. I will guide you through the structured admission process.";
const FINAL_MESSAGE =
  "Your application has been successfully received. Welcome to Delhi Public School K. Asthan.";
const STORAGE_KEY = "dps_admission_flow_v2";

const STATES = {
  IDLE: "Idle",
  GREETING: "Greeting",
  COLLECTING: "Collecting",
  VALIDATING: "Validating",
  REVIEW: "Review",
  CONSENT: "Consent",
  SUBMITTING: "Submitting",
  CLOSED: "Closed"
};

const bot = {
  state: STATES.IDLE,
  stepIndex: 0,
  data: {},
  draft: {},
  referenceId: "",
  submittedAt: "",
  logs: [],
  announcedSteps: new Set()
};

const steps = [
  {
    id: "class_selection",
    label: "Class Selection",
    prompt: "Please select the class for admission.",
    fields: [
      {
        key: "classSelection",
        label: "Class",
        type: "select",
        options: [
          "Nursery",
          "LKG",
          "UKG",
          "Class 1",
          "Class 2",
          "Class 3",
          "Class 4",
          "Class 5",
          "Class 6",
          "Class 7",
          "Class 8",
          "Class 9",
          "Class 10"
        ]
      }
    ]
  },
  {
    id: "student_personal_details",
    label: "Student Personal Details",
    prompt: "Please provide student personal details.",
    fields: [
      { key: "studentName", label: "Full Name", type: "text" },
      { key: "dateOfBirth", label: "Date of Birth", type: "date" },
      {
        key: "gender",
        label: "Gender",
        type: "select",
        options: ["Female", "Male", "Other"]
      }
    ]
  },
  {
    id: "parent_guardian_information",
    label: "Parent/Guardian Information",
    prompt: "Please provide parent or guardian details.",
    fields: [
      { key: "guardianName", label: "Parent/Guardian Name", type: "text" },
      {
        key: "relationship",
        label: "Relationship",
        type: "select",
        options: ["Father", "Mother", "Guardian", "Other"]
      }
    ]
  },
  {
    id: "contact_details",
    label: "Contact Details",
    prompt: "Please enter contact details.",
    fields: [
      { key: "mobileNumber", label: "Mobile Number", type: "tel" },
      { key: "emailAddress", label: "Email Address", type: "email" }
    ]
  },
  {
    id: "residential_address",
    label: "Residential Address",
    prompt: "Please enter residential address.",
    fields: [{ key: "residentialAddress", label: "Address", type: "textarea" }]
  },
  {
    id: "previous_school_information",
    label: "Previous School Information (if applicable)",
    prompt: "Please provide previous school information.",
    fields: [
      {
        key: "previousSchoolApplicable",
        label: "Applicable",
        type: "select",
        options: ["No", "Yes"]
      },
      {
        key: "previousSchoolName",
        label: "Previous School Name",
        type: "text",
        optional: true
      }
    ]
  },
  {
    id: "document_confirmation",
    label: "Document Confirmation",
    prompt: "Please confirm document readiness.",
    fields: [
      {
        key: "documentConfirmation",
        label: "Document Status",
        type: "select",
        options: [
          "All required documents are ready",
          "Need guidance on pending documents"
        ]
      }
    ]
  },
  {
    id: "final_review",
    label: "Final Review",
    prompt: "Review all submitted information.",
    review: true
  },
  {
    id: "consent_confirmation",
    label: "Consent Confirmation",
    prompt: "Please provide consent for submission.",
    fields: [
      {
        key: "consentConfirmation",
        label: "I confirm that all details are accurate and authorized for submission.",
        type: "checkbox"
      }
    ]
  },
  {
    id: "submission_acknowledgment",
    label: "Submission Acknowledgment",
    prompt: "Submit your application.",
    submit: true
  }
];

function setState(newState) {
  bot.state = newState;
  chatbot.dataset.state = newState;
  botStateLabel.textContent = newState;
}

function markSaveStatus(message) {
  if (!saveStatus) {
    return;
  }

  saveStatus.textContent = message;
}

function serializeBot() {
  return {
    state: bot.state,
    stepIndex: bot.stepIndex,
    data: bot.data,
    draft: bot.draft,
    referenceId: bot.referenceId,
    submittedAt: bot.submittedAt,
    logs: bot.logs,
    announcedSteps: Array.from(bot.announcedSteps)
  };
}

function saveSnapshot() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeBot()));
  markSaveStatus(`Draft saved at ${new Date().toLocaleTimeString()}.`);
}

function loadSnapshot() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const snapshot = JSON.parse(raw);
    if (!snapshot || typeof snapshot !== "object") {
      return null;
    }

    return snapshot;
  } catch {
    return null;
  }
}

function resetUI() {
  chatLog.innerHTML = "";
  chatFields.innerHTML = "";
  chatError.textContent = "";
  chatAction.disabled = false;
  backStep.disabled = false;
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
  markSaveStatus("Draft storage cleared.");
}

function addChatEntry(text, role = "bot", persist = true) {
  const entry = document.createElement("div");
  entry.className = `chat-entry ${role}`;
  entry.textContent = text;
  chatLog.appendChild(entry);
  chatLog.scrollTop = chatLog.scrollHeight;

  if (!prefersReducedMotion) {
    entry.classList.add("is-new");
    window.setTimeout(() => entry.classList.remove("is-new"), 520);
  }

  if (persist) {
    bot.logs.push({ role, text });
  }
}

function restoreLogEntries(entries) {
  chatLog.innerHTML = "";
  entries.forEach((entry) => {
    addChatEntry(entry.text, entry.role, false);
  });
}

function getCurrentStep() {
  return steps[bot.stepIndex];
}

function updateProgress() {
  const total = steps.length;
  const displayStep = bot.state === STATES.CLOSED ? total : Math.min(bot.stepIndex + 1, total);
  const ratio = displayStep / total;
  const circumference = 339.292;

  stepCount.textContent = String(displayStep);
  ringValue.style.strokeDashoffset = String(circumference * (1 - ratio));
}

function updateJourneyState() {
  journeyList.forEach((item, index) => {
    item.classList.remove("active-step", "done-step");
    if (index < bot.stepIndex) {
      item.classList.add("done-step");
    }
    if (index === bot.stepIndex && bot.state !== STATES.CLOSED) {
      item.classList.add("active-step");
    }
    if (bot.state === STATES.CLOSED) {
      item.classList.add("done-step");
    }
  });
}

function getStepValue(stepId, key) {
  const fromDraft = bot.draft[stepId]?.[key];
  if (fromDraft !== undefined && fromDraft !== null && fromDraft !== "") {
    return fromDraft;
  }
  return bot.data[key] ?? "";
}

function renderInputField(step, field) {
  const existingValue = getStepValue(step.id, field.key);

  if (field.type === "checkbox") {
    const checked = existingValue === true || existingValue === "Confirmed";
    return `
      <label>
        <input type="checkbox" name="${field.key}" ${checked ? "checked" : ""}>
        ${field.label}
      </label>
    `;
  }

  if (field.type === "textarea") {
    return `
      <label>
        ${field.label}
        <textarea name="${field.key}" ${field.optional ? "" : "required"}>${existingValue}</textarea>
      </label>
    `;
  }

  if (field.type === "select") {
    const options = field.options
      .map((option) => {
        const selected = option === existingValue ? "selected" : "";
        return `<option value="${option}" ${selected}>${option}</option>`;
      })
      .join("");

    return `
      <label>
        ${field.label}
        <select name="${field.key}" ${field.optional ? "" : "required"}>
          <option value="">Select</option>
          ${options}
        </select>
      </label>
    `;
  }

  return `
    <label>
      ${field.label}
      <input type="${field.type}" name="${field.key}" value="${existingValue}" ${field.optional ? "" : "required"}>
    </label>
  `;
}

function renderReview() {
  const summaryItems = [
    ["Class", bot.data.classSelection],
    ["Student Name", bot.data.studentName],
    ["Date of Birth", bot.data.dateOfBirth],
    ["Gender", bot.data.gender],
    ["Parent/Guardian Name", bot.data.guardianName],
    ["Relationship", bot.data.relationship],
    ["Mobile Number", bot.data.mobileNumber],
    ["Email Address", bot.data.emailAddress],
    ["Residential Address", bot.data.residentialAddress],
    ["Previous School Applicable", bot.data.previousSchoolApplicable],
    ["Previous School Name", bot.data.previousSchoolName || "Not Applicable"],
    ["Document Status", bot.data.documentConfirmation]
  ];

  const lines = summaryItems
    .map(([label, value]) => `<p><strong>${label}:</strong> ${value || "-"}</p>`)
    .join("");

  chatFields.innerHTML = `<div class="field-grid">${lines}</div>`;
  chatAction.textContent = "Confirm and Continue";
}

function renderSubmissionPrompt() {
  chatFields.innerHTML =
    '<div class="field-grid"><p>Click submit to complete the structured admission flow.</p></div>';
  chatAction.textContent = "Submit Application";
}

function announceStep(step) {
  if (bot.announcedSteps.has(step.id)) {
    return;
  }

  addChatEntry(`${step.label}: ${step.prompt}`);
  bot.announcedSteps.add(step.id);
}

function renderStep() {
  const step = getCurrentStep();
  if (!step) {
    return;
  }

  chatError.textContent = "";
  announceStep(step);

  if (step.review) {
    setState(STATES.REVIEW);
    renderReview();
    backStep.disabled = bot.stepIndex === 0;
    updateProgress();
    updateJourneyState();
    saveSnapshot();
    return;
  }

  if (step.submit) {
    setState(STATES.SUBMITTING);
    renderSubmissionPrompt();
    backStep.disabled = false;
    updateProgress();
    updateJourneyState();
    saveSnapshot();
    return;
  }

  setState(step.id === "consent_confirmation" ? STATES.CONSENT : STATES.COLLECTING);
  chatFields.innerHTML = `<div class="field-grid">${step.fields.map((field) => renderInputField(step, field)).join("")}</div>`;
  chatAction.textContent = "Continue";
  backStep.disabled = bot.stepIndex === 0;
  updateProgress();
  updateJourneyState();
  saveSnapshot();
}

function collectValues(step) {
  const values = {};
  if (!step.fields) {
    return values;
  }

  for (const field of step.fields) {
    const element = chatForm.elements[field.key];
    if (!element) {
      continue;
    }

    if (field.type === "checkbox") {
      values[field.key] = element.checked;
    } else {
      const rawValue = String(element.value || "").trim();
      values[field.key] = field.key === "mobileNumber" ? normalizeMobileNumber(rawValue) : rawValue;
    }
  }

  return values;
}

function storeDraft(step, values) {
  bot.draft[step.id] = values;
  saveSnapshot();
}

function normalizeMobileNumber(value) {
  const digits = String(value || "").replace(/\D+/g, "");
  return digits.slice(0, 10);
}

function calculateAgeFromDob(dobValue) {
  if (!dobValue) {
    return null;
  }

  const dob = new Date(dobValue);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

function generateReferenceId() {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DPSKA-${stamp}-${random}`;
}

function validateStep(step, values) {
  for (const field of step.fields || []) {
    const value = values[field.key];

    if (field.type === "checkbox") {
      if (!value) {
        return {
          valid: false,
          message: `Invalid input detected. Please complete: ${field.label}`
        };
      }
      continue;
    }

    if (!field.optional && !value) {
      return {
        valid: false,
        message: `Invalid input detected. Please complete: ${field.label}`
      };
    }

    if (field.key === "dateOfBirth" && value) {
      const age = calculateAgeFromDob(value);
      if (age === null || age < 2 || age > 20) {
        return {
          valid: false,
          message: "Invalid input detected. Date of Birth must indicate age between 2 and 20 years."
        };
      }
    }

    if (field.key === "mobileNumber" && value && !/^\d{10}$/.test(value.replace(/\s+/g, ""))) {
      return {
        valid: false,
        message: "Invalid input detected. Mobile Number must contain 10 digits."
      };
    }

    if (field.key === "emailAddress" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return {
        valid: false,
        message: "Invalid input detected. Email Address format is incorrect."
      };
    }
  }

  if (
    step.id === "previous_school_information" &&
    values.previousSchoolApplicable === "Yes" &&
    !values.previousSchoolName
  ) {
    return {
      valid: false,
      message: "Invalid input detected. Please provide Previous School Name."
    };
  }

  return { valid: true };
}

function persistStepData(step, values) {
  Object.entries(values).forEach(([key, value]) => {
    if (key === "consentConfirmation") {
      bot.data[key] = value ? "Confirmed" : "Pending";
      return;
    }
    bot.data[key] = value;
  });

  delete bot.draft[step.id];
}

function summarizeUserResponse(step, values) {
  if (step.review) {
    return "Final Review confirmed.";
  }

  if (step.submit) {
    return "Submission Acknowledgment confirmed.";
  }

  const summary = Object.entries(values)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" | ")
    .replace(/\s+/g, " ");

  return `${step.label} completed. ${summary}`;
}

function finalizeSubmission() {
  bot.referenceId = bot.referenceId || generateReferenceId();
  bot.submittedAt = new Date().toISOString();
  setState(STATES.CLOSED);
  chatFields.innerHTML = "";
  chatAction.textContent = "Application Submitted";
  chatAction.disabled = true;
  backStep.disabled = true;
  addChatEntry(`Application Reference: ${bot.referenceId}`);
  addChatEntry(`Submission Time: ${new Date(bot.submittedAt).toLocaleString()}`);
  addChatEntry(FINAL_MESSAGE);
  updateProgress();
  updateJourneyState();
  markSaveStatus("Final submission completed and stored.");
  saveSnapshot();
}

function advanceStep() {
  bot.stepIndex += 1;

  if (bot.stepIndex >= steps.length) {
    finalizeSubmission();
    return;
  }

  renderStep();
}

function rewindStep() {
  if (bot.state === STATES.CLOSED || bot.stepIndex === 0) {
    return;
  }

  bot.stepIndex -= 1;
  addChatEntry(`Returning to ${steps[bot.stepIndex].label}.`, "bot");
  renderStep();
}

function startBot() {
  resetUI();
  bot.stepIndex = 0;
  bot.data = {};
  bot.draft = {};
  bot.referenceId = "";
  bot.submittedAt = "";
  bot.logs = [];
  bot.announcedSteps = new Set();

  setState(STATES.GREETING);
  addChatEntry(OPENING_MESSAGE);
  markSaveStatus("Draft status: active.");
  renderStep();
}

function restoreFromSnapshot(snapshot) {
  resetUI();

  bot.stepIndex = Math.min(Math.max(Number(snapshot.stepIndex || 0), 0), steps.length - 1);
  bot.data = snapshot.data || {};
  bot.draft = snapshot.draft || {};
  bot.referenceId = snapshot.referenceId || "";
  bot.submittedAt = snapshot.submittedAt || "";
  bot.logs = Array.isArray(snapshot.logs) ? snapshot.logs : [];
  bot.announcedSteps = new Set(snapshot.announcedSteps || []);
  setState(snapshot.state || STATES.IDLE);

  restoreLogEntries(bot.logs);

  if (bot.state === STATES.CLOSED) {
    chatAction.textContent = "Application Submitted";
    chatAction.disabled = true;
    backStep.disabled = true;
    updateProgress();
    updateJourneyState();
    markSaveStatus("Restored completed submission.");
    return;
  }

  addChatEntry(`Saved application restored. Resuming from Step ${bot.stepIndex + 1}.`);
  markSaveStatus("Draft restored from browser storage.");
  renderStep();
}

function getReceiptText() {
  const lines = [
    "Delhi Public School K. Asthan - Admission Receipt",
    `Generated: ${new Date().toLocaleString()}`,
    `Current State: ${bot.state}`,
    `Application Reference: ${bot.referenceId || "Pending"}`,
    `Submitted At: ${bot.submittedAt ? new Date(bot.submittedAt).toLocaleString() : "Pending"}`,
    "",
    `Class: ${bot.data.classSelection || "-"}`,
    `Student Name: ${bot.data.studentName || "-"}`,
    `Date of Birth: ${bot.data.dateOfBirth || "-"}`,
    `Gender: ${bot.data.gender || "-"}`,
    `Parent/Guardian Name: ${bot.data.guardianName || "-"}`,
    `Relationship: ${bot.data.relationship || "-"}`,
    `Mobile Number: ${bot.data.mobileNumber || "-"}`,
    `Email Address: ${bot.data.emailAddress || "-"}`,
    `Residential Address: ${bot.data.residentialAddress || "-"}`,
    `Previous School Applicable: ${bot.data.previousSchoolApplicable || "-"}`,
    `Previous School Name: ${bot.data.previousSchoolName || "Not Applicable"}`,
    `Document Status: ${bot.data.documentConfirmation || "-"}`,
    `Consent: ${bot.data.consentConfirmation || "Pending"}`
  ];

  if (bot.state === STATES.CLOSED) {
    lines.push("", FINAL_MESSAGE);
  }

  return lines.join("\n");
}

chatForm.addEventListener("input", () => {
  const step = getCurrentStep();
  if (!step || step.review || step.submit || bot.state === STATES.CLOSED) {
    return;
  }

  const draftValues = collectValues(step);
  storeDraft(step, draftValues);
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (bot.state === STATES.CLOSED) {
    return;
  }

  const step = getCurrentStep();
  if (!step) {
    return;
  }

  setState(STATES.VALIDATING);

  if (step.review) {
    addChatEntry("Final Review confirmed.", "user");
    advanceStep();
    return;
  }

  if (step.submit) {
    addChatEntry("Submission Acknowledgment confirmed.", "user");
    advanceStep();
    return;
  }

  const values = collectValues(step);
  storeDraft(step, values);
  const validation = validateStep(step, values);

  if (!validation.valid) {
    chatError.textContent = validation.message;
    addChatEntry(validation.message);
    setState(step.id === "consent_confirmation" ? STATES.CONSENT : STATES.COLLECTING);
    saveSnapshot();
    return;
  }

  persistStepData(step, values);
  addChatEntry(summarizeUserResponse(step, values), "user");
  advanceStep();
});

backStep.addEventListener("click", rewindStep);

restartFlow.addEventListener("click", () => {
  clearStorage();
  startBot();
});

resumeSaved.addEventListener("click", () => {
  const snapshot = loadSnapshot();
  if (!snapshot) {
    addChatEntry("No saved application was found for this browser session.");
    markSaveStatus("No saved draft found.");
    return;
  }

  restoreFromSnapshot(snapshot);
});

downloadReceipt.addEventListener("click", () => {
  if (Object.keys(bot.data).length === 0) {
    addChatEntry("Receipt not available yet. Complete at least one step first.");
    return;
  }

  const text = getReceiptText();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "dps-admission-receipt.txt";
  link.click();
  URL.revokeObjectURL(url);
});

window.addEventListener("beforeunload", () => {
  if (bot.state !== STATES.CLOSED) {
    const step = getCurrentStep();
    if (step && !step.review && !step.submit) {
      storeDraft(step, collectValues(step));
    }
  }
  saveSnapshot();
});

const existingSnapshot = loadSnapshot();
if (existingSnapshot) {
  restoreFromSnapshot(existingSnapshot);
} else {
  startBot();
}
