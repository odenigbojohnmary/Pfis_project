/**
 * Subscriber notification helper. Writes every notification to the
 * notifications table.
 */

const nodemailer = require("nodemailer");

let transporter = null;

// Lazily creates a nodemailer transporter if SMTP_HOST is set in the environment.
function getTransporter() {
  if (!transporter && process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "1025", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined,
      ignoreTLS: process.env.SMTP_IGNORE_TLS !== "false",
    });
  }
  return transporter;
}

// Sends a notification to all subscribers, logging each attempt in the notifications table.
async function notifySubscribers(pool, message, { incidentId = null, maintenanceId = null } = {}) {
  const [subscribers] = await pool.query("SELECT id, email FROM subscribers");
  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    // Always log — even if the email send fails or SMTP isn't configured.
    await pool.query(
      "INSERT INTO notifications (subscriber_id, incident_id, maintenance_id, message) VALUES (?, ?, ?, ?)",
      [sub.id, incidentId, maintenanceId, message]
    );

    const t = getTransporter();
    if (t) {
      try {
        await t.sendMail({
          from: process.env.SMTP_FROM || "JmZOps <noreply@jmzops.local>",
          to: sub.email,
          subject: "JmZOps status notification",
          text: message,
        });
        sent++;
      } catch (err) {
        failed++;
        console.error(`[notify] failed to email ${sub.email}: ${err.message}`);
      }
    }
  }

  return { recipients: subscribers.length, sent, failed };
}

module.exports = { notifySubscribers };
