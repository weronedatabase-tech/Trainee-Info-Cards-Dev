// In GAS, ENV_CONFIG is globally available from config.js (which becomes config.gs when pushed via clasp)

const CONSTANTS = {
  get SPREADSHEET_ID() { return ENV_CONFIG.SHEETS[ENV_CONFIG.ACTIVE_ENV]; },
  get PHOTO_FOLDER_ID() { return ENV_CONFIG.DRIVE_FOLDER_ID; },
  SHEETS: {
    TRAINEE_INFO: 'TRAINEE INFO',
    SETTINGS: 'Settings'
  },
  INFO_COLUMN: 'Trainee Info Card Text'
};

/**
 * Creates Custom Menus in the Google Sheet for Administrators
 */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Trainee Info Cards')
    .addItem('Generate Info Text (Active Row)', 'menuGenerateActiveRow')
    .addItem('Generate Info Text (All Trainees)', 'menuGenerateAll')
    .addToUi();
}

function menuGenerateActiveRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getName() !== CONSTANTS.SHEETS.TRAINEE_INFO) {
    SpreadsheetApp.getUi().alert("Please run this from the TRAINEE INFO sheet.");
    return;
  }
  const rowIdx = sheet.getActiveRange().getRow();
  if (rowIdx < 2) {
    SpreadsheetApp.getUi().alert("Please select a valid trainee row.");
    return;
  }
  const data = sheet.getDataRange().getValues();
  const traineeName = String(data[rowIdx - 1][2]).trim();

  if (!traineeName) {
    SpreadsheetApp.getUi().alert("No short name found on this row (Column C).");
    return;
  }

  SpreadsheetApp.getActiveSpreadsheet().toast(`Generating for ${traineeName}...`, "AI Generation", 10);
  try {
    adminGenerateCardText(traineeName);
    SpreadsheetApp.getActiveSpreadsheet().toast(`Successfully generated info card text for ${traineeName}!`, "Success", 5);
  } catch(e) {
    SpreadsheetApp.getUi().alert(`Error: ${e.message}`);
  }
}

function menuGenerateAll() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert('Generate All', 'This may take several minutes and could hit Google Script limits. Proceed?', ui.ButtonSet.YES_NO);
  if (response !== ui.Button.YES) return;

  const trainees = getInitialData().allTrainees;
  SpreadsheetApp.getActiveSpreadsheet().toast(`Starting generation for ${trainees.length} trainees...`, "AI Generation");
  let count = 0;
  for (let t of trainees) {
    try {
      adminGenerateCardText(t);
      count++;
    } catch(e) {
      Logger.log(`Failed for ${t}: ${e.message}`);
    }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast(`Completed generation for ${count} out of ${trainees.length} trainees.`, "Success", 10);
}

/**
 * RUN THIS FUNCTION ONCE IN THE EDITOR TO FORCE PERMISSIONS
 */
function FORCE_AUTHORIZATION() {
  try {
    SpreadsheetApp.openById(CONSTANTS.SPREADSHEET_ID);
    DriveApp.getFolderById(CONSTANTS.PHOTO_FOLDER_ID);
    Logger.log(`SUCCESS: You now have permission to access the ${ENV_CONFIG.ACTIVE_ENV} sheet and Drive folder!`);
  } catch(e) {
    Logger.log(`ERROR: You STILL do not have permission. Check access to ID: ${CONSTANTS.SPREADSHEET_ID}`);
    throw e;
  }
}

function doGet() {
  return ContentService.createTextOutput(`Trainee Info Backend (${ENV_CONFIG.ACTIVE_ENV}) is running properly.`);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) throw new Error("No data received.");
    const request = JSON.parse(e.postData.contents);
    const action = request.action || request.method;
    
    let payload = request.payload;
    if (!payload || typeof payload !== 'object') {
      payload = request;
    }
    
    const password = payload.password || request.password || (typeof request.payload === 'string' ? request.payload : undefined);
    const traineeName = payload.traineeName || request.traineeName;
    const profile = payload.profile || request.profile;
    const newMappings = payload.newMappings || request.newMappings;
    const passwords = payload.passwords || request.passwords;

    let result;
    switch (action) {
      case 'getInitialData': result = getInitialData(); break;
      case 'login': 
        if (!password) throw new Error("Please enter a password.");
        result = loginUser(password); 
        break;
      case 'verifySettingsPassword': result = verifyPassword('Settings', password); break;
      case 'saveAppSettings': result = saveAppSettings(newMappings); break;
      case 'updatePasswords': result = updatePasswords(passwords); break;
      case 'getTraineeCardData': result = getTraineeCardData(traineeName, profile); break;
      case 'adminGenerateCardText': result = adminGenerateCardText(traineeName); break;
      default: throw new Error(`Unknown action requested: ${action}`);
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log(`API Error: ${error.message}`);
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getInitialData() {
  const traineeData = getTraineeData_();
  return { appSettings: getAppSettings_(), allTrainees: getTraineeList_(traineeData), availableFields: getAvailableFields_(traineeData) };
}

function getTraineeData_() {
  try {
    const ss = SpreadsheetApp.openById(CONSTANTS.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONSTANTS.SHEETS.TRAINEE_INFO);
    if (!sheet) throw new Error(`Sheet '${CONSTANTS.SHEETS.TRAINEE_INFO}' not found.`);
    return sheet.getDataRange().getValues();
  } catch (e) {
    throw new Error(`Could not retrieve trainee data. Details: ${e.message}`);
  }
}

function getAppSettings_() {
  try {
    const ss = SpreadsheetApp.openById(CONSTANTS.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONSTANTS.SHEETS.SETTINGS);
    if (!sheet) throw new Error(`Sheet '${CONSTANTS.SHEETS.SETTINGS}' not found.`);
    const data = sheet.getDataRange().getValues();
    const settings = {};
    const profileFieldMappings = {};
    data.forEach(row => {
      const key = row[0], value = row[1];
      if (key.endsWith(' Fields')) profileFieldMappings[key.replace(' Fields', '')] = value.split(',').map(field => field.trim());
    });
    settings.profileDefaultFieldMappings = profileFieldMappings;
    return settings;
  } catch (e) {
    throw new Error(`Could not retrieve app settings. Details: ${e.message}`);
  }
}

function getTraineeList_(data) {
  const names = new Set();
  const PROJECT_COL_INDEX = 1, SHORT_NAME_COL_INDEX = 2;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row.length > SHORT_NAME_COL_INDEX) {
      const projectStatus = String(row[PROJECT_COL_INDEX]).trim(), name = String(row[SHORT_NAME_COL_INDEX]).trim();
      if (name && !/exited/i.test(projectStatus)) names.add(name);
    }
  }
  return [...names].sort();
}

function getAvailableFields_(data) {
  if (!data || data.length === 0) throw new Error(`No data provided`);
  const headers = data[0], SHORT_NAME_COL_INDEX = 2;
  const fieldDisplayLabels = { "Trainee’s Full Name": "Full Name", "Age": "Age", "Gender": "Gender", "Address": "Address", "Contact 1\nRelation (Name)": "Contact 1 Relation (Name)", "Contact 1\nNumber": "Contact 1 Number", "Spoken Language / Dialect": "Spoken Language / Dialect", "Current Medication （经期有没有服药物）": "Current Medication", "Past Medical Conditions (e.g. any Major Operation etc.) （前期病历表）": "Past Medical Conditions", "Dietary Restriction(s) (if any) （食物限制）": "Dietary Restrictions", "Functioning": "Functioning", "Verbal": "Verbal", "Mobility": "Mobility", "Travelling": "Travelling", "Engagement Tips and Fun Facts": "Engagement Tips and Fun Facts", "Current Employment / Weekday Activities": "Current Employment / Weekday Activities", "General Comments Issues and Goals": "General Comments Issues and Goals" };
  const fieldsForSelection =[];
  headers.forEach((originalSheetHeader, index) => {
    const cleanedHeader = String(originalSheetHeader).trim();
    if (!cleanedHeader || index === SHORT_NAME_COL_INDEX || cleanedHeader === "Trainee’s Full Name") return;
    fieldsForSelection.push({ value: originalSheetHeader, label: fieldDisplayLabels[originalSheetHeader] || cleanedHeader.replace(/\r?\n/g, ' ') });
  });
  return fieldsForSelection;
}

function saveAppSettings(newMappings) {
  const ss = SpreadsheetApp.openById(CONSTANTS.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONSTANTS.SHEETS.SETTINGS);
  const data = sheet.getRange("A:B").getValues();
  for (let i = 0; i < data.length; i++) {
    const profileName = data[i][0].replace(' Fields', '');
    if (newMappings[profileName]) sheet.getRange(i + 1, 2).setValue(newMappings[profileName].join(', '));
  }
  return "Settings saved successfully!";
}

function loginUser(password) {
  try {
    const props = PropertiesService.getScriptProperties();
    if (password === props.getProperty('Regular-Volunteer')) return 'Regular Volunteer';
    if (password === props.getProperty('Adhoc-Volunteer')) return 'Adhoc Volunteer';
    if (password === props.getProperty('Settings')) return 'Settings';
    return false;
  } catch (e) {
    return false;
  }
}

function verifyPassword(profile, password) {
  try {
    const expectedPassword = PropertiesService.getScriptProperties().getProperty({ 'Regular Volunteer': 'Regular-Volunteer', 'Adhoc Volunteer': 'Adhoc-Volunteer', 'Settings': 'Settings' }[profile]);
    return expectedPassword !== null && expectedPassword === password;
  } catch (e) { return false; }
}

function updatePasswords(passwords) {
  const props = {}, map = { 'Regular Volunteer': 'Regular-Volunteer', 'Adhoc Volunteer': 'Adhoc-Volunteer', 'Settings': 'Settings' };
  let updated = false;
  for (const p in passwords) if (passwords[p] && map[p]) { props[map[p]] = passwords[p]; updated = true; }
  if (!updated) throw new Error("No passwords provided.");
  PropertiesService.getScriptProperties().setProperties(props, false);
  return "Passwords updated successfully!";
}

/**
 * Get beautifully formatted data array mapping for frontend rendering.
 */
function getTraineeCardData(traineeName, profile) {
  const ss = SpreadsheetApp.openById(CONSTANTS.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONSTANTS.SHEETS.TRAINEE_INFO);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let infoColIdx = headers.indexOf(CONSTANTS.INFO_COLUMN);
  const rowIndex = data.findIndex(r => String(r[2]).trim() === traineeName);
  if (rowIndex === -1) throw new Error("Trainee not found in database.");

  const row = data[rowIndex];
  let infoData = {};

  // First attempt to load pre-generated AI JSON content
  if (infoColIdx !== -1 && row[infoColIdx]) {
    try { infoData = JSON.parse(row[infoColIdx]); } catch(e) {}
  }

  // Fallback map remaining fields from row just in case
  headers.forEach((h, i) => { if (infoData[h] === undefined) infoData[h] = row[i] || ''; });

  // Construct Caregiver contacts mapping manually to consolidate
  let caregiverLines = [];[ {rel: 'Contact 1\nRelation (Name)', num: 'Contact 1\nNumber'},
    {rel: 'Contact 2\nRelation (Name)', num: 'Contact 2\nNumber'},
    {rel: 'Contact 3\nRelation / Name', num: 'Contact 3\nNumber'} ].forEach(c => {
      let r = infoData[c.rel], n = infoData[c.num];
      if (r || n) caregiverLines.push(`${r || ''}${(r && n) ? ' : ' : ''}${n || ''}`);
  });
  if (caregiverLines.length > 0) infoData['caregiverContactInfo'] = caregiverLines.join('\n');

  // Load allowed fields from admin settings
  const settings = getAppSettings_();
  let allowedFields = settings.profileDefaultFieldMappings[profile] || settings.profileDefaultFieldMappings["Adhoc Volunteer / Exposure Session"] ||[];

  // Standard labels for mapping
  const labels = { "Age": "Age", "Gender": "Gender", "Address": "Address", "Spoken Language / Dialect": "Spoken Language / Dialect", "Current Medication （经期有没有服药物）": "Current Medication", "Past Medical Conditions (e.g. any Major Operation etc.) （前期病历表）": "Past Medical Conditions", "Dietary Restriction(s) (if any) （食物限制）": "Dietary Restrictions", "Functioning": "Functioning", "Verbal": "Verbal", "Mobility": "Mobility", "Travelling": "Travelling", "Engagement Tips and Fun Facts": "Engagement Tips and Fun Facts", "Current Employment / Weekday Activities": "Current Employment / Weekday Activities", "General Comments Issues and Goals": "General Comments Issues and Goals", "caregiverContactInfo": "Caregiver Contact Info" };

  // Category Configuration
  const CATEGORY_MAP =[
    { title: "Basic Information", icon: "ph-user-circle", color: "text-blue-500", bgClass: "section-basic", keys:["Age", "Gender", "Address", "Spoken Language / Dialect", "caregiverContactInfo"] },
    { title: "Medical & Dietary", icon: "ph-heartbeat", color: "text-red-500", bgClass: "section-medical", keys:["Current Medication （经期有没有服药物）", "Past Medical Conditions (e.g. any Major Operation etc.) （前期病历表）", "Dietary Restriction(s) (if any) （食物限制）"] },
    { title: "Abilities & Support", icon: "ph-wheelchair", color: "text-purple-500", bgClass: "section-abilities", keys:["Functioning", "Verbal", "Mobility", "Travelling"] },
    { title: "Employment & Activities", icon: "ph-briefcase", color: "text-green-500", bgClass: "section-employment", keys:["Current Employment / Weekday Activities"] },
    { title: "Engagement & Notes", icon: "ph-star", color: "text-yellow-500", bgClass: "section-engagement", keys:["Engagement Tips and Fun Facts", "General Comments Issues and Goals"] }
  ];

  let categories =[];
  CATEGORY_MAP.forEach(cat => {
    let fields = [];
    cat.keys.forEach(k => {
      let val = String(infoData[k] || '').trim();
      let label = labels[k] || k;
      // Caregiver Contact is automatically allowed if "Contact X" was part of regular
      let isAllowed = k === 'caregiverContactInfo' ? allowedFields.some(a => a.includes("Contact")) : allowedFields.includes(label);
      if (isAllowed && val && val !== 'N/A') fields.push({ label: label, value: val });
    });
    if (fields.length > 0) categories.push({ ...cat, fields });
  });

  // Rapid Drive Photo Load
  let photoBase64 = null;
  let photoMime = null;
  try {
    const folder = DriveApp.getFolderById(CONSTANTS.PHOTO_FOLDER_ID);
    const files = folder.searchFiles(`title contains '${traineeName}'`);
    if (files.hasNext()) {
      const file = files.next();
      photoBase64 = Utilities.base64Encode(file.getBlob().getBytes());
      photoMime = file.getBlob().getContentType();
    }
  } catch (e) { Logger.log("Photo load error: " + e.message); }

  return {
    fullName: infoData["Trainee’s Full Name"] || traineeName,
    photoBase64: photoBase64,
    photoMime: photoMime,
    categories: categories
  };
}

/**
 * Triggers AI Generation for a given Trainee and stores it permanently.
 */
function adminGenerateCardText(traineeName) {
  const ss = SpreadsheetApp.openById(CONSTANTS.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONSTANTS.SHEETS.TRAINEE_INFO);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let targetColIndex = headers.indexOf(CONSTANTS.INFO_COLUMN);
  if (targetColIndex === -1) {
    targetColIndex = headers.length;
    sheet.getRange(1, targetColIndex + 1).setValue(CONSTANTS.INFO_COLUMN);
  }

  const rowIndex = data.findIndex((r, idx) => idx > 0 && String(r[2]).trim() === traineeName);
  if (rowIndex === -1) throw new Error(`Trainee "${traineeName}" not found.`);

  const row = data[rowIndex];
  let infoJSON = {};
  const API_KEY = PropertiesService.getScriptProperties().getProperty('Gemini_API_Key');

  headers.forEach((h, i) => {
    let headerName = String(h).trim();
    let val = row[i] ? String(row[i]).trim() : '';

    if (headerName === "Engagement Tips and Fun Facts" && val && val !== 'N/A' && API_KEY) {
      let prompt = `Reformat the following text by organizing it into logical sections with clear subheaders. Ensure the content under each subheader is concise. Do not add any introductory or concluding statements.\n\nText to reformat:\n${val}`;
      infoJSON[headerName] = callGeminiAPI_(API_KEY, prompt) || val;
    } else if (headerName === "General Comments Issues and Goals" && val && val !== 'N/A' && API_KEY) {
      let prompt = `Analyze the following comments and organize them into distinct categories: "Issues", "Goals", and "General Comments". Summarize the key points for each category using bullet points. Ensure the output is concise and does not include any introductory or concluding remarks.\n\nText to analyze:\n${val}`;
      infoJSON[headerName] = callGeminiAPI_(API_KEY, prompt) || val;
    } else {
      infoJSON[headerName] = val;
    }
  });

  sheet.getRange(rowIndex + 1, targetColIndex + 1).setValue(JSON.stringify(infoJSON));
  return true;
}

function callGeminiAPI_(apiKey, prompt) {
  try {
    const response = UrlFetchApp.fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, { method: "post", contentType: "application/json", payload: JSON.stringify({ contents:[{ role: "user", parts: [{ text: prompt }] }] }), muteHttpExceptions: true });
    const json = JSON.parse(response.getContentText());
    if (json.candidates) return json.candidates[0].content.parts[0].text;
  } catch (e) { Logger.log("Gemini Err: " + e.message); }
  return null;
}
