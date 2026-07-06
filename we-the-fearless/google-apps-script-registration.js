/*
  Google Apps Script setup for Fearless Camp registrations.

  How to use:
  1. Create a Google Sheet for registrations.
  2. Open Extensions > Apps Script.
  3. Paste this whole file into Code.gs.
  4. Update SPREADSHEET_ID, ADMIN_TOKEN, and GOOGLE_FORM_OR_DOC_LINK below.
  5. Deploy > New deployment > Web app.
     - Execute as: Me
     - Who has access: Anyone
  6. Copy the Web app URL into events.html and registration.html.

  Important:
  The email sender will be the Google account that deploys this script.
  Deploy it while logged in as thefearlessmovement1@gmail.com.
*/

const SPREADSHEET_ID = "1Ijuin1UknCJzUK04CrdM_y3DWFmmQDF00tiuICZknao";
const SHEET_NAME = "Fearless Camp Registration";
const ADMIN_TOKEN = "FearlessCampAdmin2026";
const GOOGLE_FORM_OR_DOC_LINK = "PASTE_YOUR_GOOGLE_FORM_OR_DOC_LINK_HERE";
const EMAIL_SENDER_NAME = "The Fearless Movement";

function doPost(e) {
  try {
    const data = e.parameter || {};
    const sheet = getRegistrationsSheet_();
    const timestamp = new Date();

    sheet.appendRow([
      timestamp,
      data.name || "",
      data.email || "",
      data.phone || "",
      data.eventName || "",
      data.ticketType || "",
      data.quantity || "",
      data.totalAmount || "",
      data.sourcePage || ""
    ]);

    if (data.email) {
      sendThankYouEmail_(data);
    }

    return json_({
      ok: true,
      message: "Registration saved."
    });
  } catch (error) {
    return json_({
      ok: false,
      message: error.message
    });
  }
}

function doGet(e) {
  const params = e.parameter || {};

  if (params.action !== "list") {
    return jsonp_(params.callback, {
      ok: true,
      message: "Fearless registration endpoint is running."
    });
  }

  if (params.token !== ADMIN_TOKEN) {
    return jsonp_(params.callback, {
      ok: false,
      message: "Unauthorized.",
      registrations: []
    });
  }

  const sheet = getRegistrationsSheet_();
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1).map((row) => ({
    timestamp: formatDate_(row[0]),
    name: row[1],
    email: row[2],
    phone: row[3],
    eventName: row[4],
    ticketType: row[5],
    quantity: row[6],
    totalAmount: row[7],
    sourcePage: row[8]
  })).reverse();

  return jsonp_(params.callback, {
    ok: true,
    registrations: rows
  });
}

function getRegistrationsSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Timestamp",
      "Name",
      "Email",
      "Phone",
      "Event",
      "Ticket Type",
      "Quantity",
      "Total Amount",
      "Source Page"
    ]);
  }

  return sheet;
}

function sendThankYouEmail_(data) {
  const subject = "Thank You for Showing Interest in Fearless Camp";
  const name = data.name || "there";
  const plainBody =
    `Hi ${name},\n\n` +
    "Thank you for showing interest in Fearless Camp.\n\n" +
    "We are excited to have you take this step with us. Kindly complete the form below so we can collect the remaining details required for your registration:\n\n" +
    `${GOOGLE_FORM_OR_DOC_LINK}\n\n` +
    "With love,\n" +
    "The Fearless Movement";

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
      <h2 style="color: #111;">Thank you for showing interest in Fearless Camp</h2>
      <p>Hi ${escapeHtml_(name)},</p>
      <p>Thank you for showing interest in Fearless Camp.</p>
      <p>We are excited to have you take this step with us. Kindly complete the form below so we can collect the remaining details required for your registration:</p>
      <p>
        <a href="${GOOGLE_FORM_OR_DOC_LINK}" style="display: inline-block; background: #ffae00; color: #000; padding: 12px 18px; border-radius: 999px; text-decoration: none; font-weight: bold;">
          Complete Registration Details
        </a>
      </p>
      <p>With love,<br>The Fearless Movement</p>
    </div>
  `;

  MailApp.sendEmail({
    to: data.email,
    subject,
    body: plainBody,
    htmlBody,
    name: EMAIL_SENDER_NAME,
    replyTo: "thefearlessmovement1@gmail.com"
  });
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonp_(callback, payload) {
  const safeCallback = callback && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(callback)
    ? callback
    : "callback";

  return ContentService
    .createTextOutput(`${safeCallback}(${JSON.stringify(payload)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function formatDate_(value) {
  if (!value) return "";

  return Utilities.formatDate(
    new Date(value),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm:ss"
  );
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
