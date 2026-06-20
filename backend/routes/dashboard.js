/**
 * routes/dashboard.js
 * --------------------
 * Admin-only aggregate statistics.
 */

const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  const [componentStatusBreakdown] = await req.db.query(
    "SELECT status, COUNT(*) AS count FROM components GROUP BY status"
  );

  const [[{ total: totalIncidents }]] = await req.db.query(
    "SELECT COUNT(*) AS total FROM incidents"
  );

  const [[{ open: openIncidents }]] = await req.db.query(
    "SELECT COUNT(*) AS open FROM incidents WHERE status != 'resolved'"
  );

  const [[avgRow]] = await req.db.query(
    `SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, resolved_at)) AS avg_minutes
     FROM incidents WHERE resolved_at IS NOT NULL`
  );
  const avgResolutionMinutes = avgRow.avg_minutes !== null ? Math.round(avgRow.avg_minutes * 10) / 10 : null;

  const [[{ upcoming: upcomingMaintenance }]] = await req.db.query(
    "SELECT COUNT(*) AS upcoming FROM maintenance WHERE status IN ('scheduled','in_progress')"
  );

  const [[{ total: totalSubscribers }]] = await req.db.query(
    "SELECT COUNT(*) AS total FROM subscribers"
  );

  const [[{ total: totalNotificationsSent }]] = await req.db.query(
    "SELECT COUNT(*) AS total FROM notifications"
  );

  res.json({
    component_status_breakdown: componentStatusBreakdown,
    total_incidents: totalIncidents,
    open_incidents: openIncidents,
    avg_resolution_minutes: avgResolutionMinutes,
    upcoming_maintenance: upcomingMaintenance,
    total_subscribers: totalSubscribers,
    total_notifications_sent: totalNotificationsSent,
  });
});

module.exports = router;
