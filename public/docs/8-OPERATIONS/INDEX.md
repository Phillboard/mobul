# Operations Guide

## Overview

Operational procedures for running, monitoring, and maintaining the ACE Engage platform in production.

---

## Quick Navigation

### Deployment & Configuration
- [Edge Function Deployment](EDGE_FUNCTION_DEPLOYMENT.md) - Deploy and manage edge functions
- [Apply Safe Migrations](APPLY_SAFE_MIGRATIONS.md) - Database migration procedures
- [Deploy Edge Functions](DEPLOY_EDGE_FUNCTIONS.md) - Automated deployment

### Monitoring & Alerts
- [Monitoring Setup](MONITORING_SETUP.md) - Configure system monitoring
- [Configure Monitoring Alerts](CONFIGURE_MONITORING_ALERTS.md) - Set up alerting
- [Apply Monitoring Migrations](APPLY_MONITORING_MIGRATIONS.md) - Install monitoring infrastructure
- [Performance Guide](PERFORMANCE_GUIDE.md) - Optimize system performance

### Security & Compliance
- [Security Hardening](SECURITY_HARDENING.md) - Production security checklist
- [Security Audit](SECURITY_AUDIT_HARDENING.md) - Security audit procedures

### Disaster Recovery
- [Backup Procedures](BACKUP_PROCEDURES.md) - Database backup and restore
- [Disaster Recovery](DISASTER_RECOVERY.md) - DR procedures and runbooks
- [Incident Response](INCIDENT_RESPONSE.md) - Incident handling procedures

### Special Features
- [Wallet Pass Setup](WALLET_PASS_SETUP.md) - Apple/Google Wallet integration
- [Migration Guide](MIGRATION_GUIDE.md) - Database migration best practices

---

## Operations Checklist

### Daily Tasks
- [ ] Check system health dashboard
- [ ] Review error logs (< 1% error rate)
- [ ] Monitor gift card inventory levels
- [ ] Check SMS delivery success rate (> 95%)
- [ ] Review performance metrics

### Weekly Tasks
- [ ] Review security alerts
- [ ] Check database growth
- [ ] Optimize slow queries
- [ ] Update documentation
- [ ] Test backup restore

### Monthly Tasks
- [ ] Security audit
- [ ] Rotate credentials
- [ ] Review access logs
- [ ] Capacity planning
- [ ] Update runbooks

---

## Emergency Procedures

### System Down

1. **Check Status Pages:**
   - Supabase: https://status.supabase.com
   - Twilio: https://status.twilio.com
   - Vercel: https://status.vercel.com

2. **Review Recent Changes:**
   - Check last deployment
   - Review recent migrations
   - Check configuration changes

3. **Emergency Rollback:**
   ```bash
   # Rollback edge functions
   git checkout PREVIOUS_COMMIT
   supabase functions deploy
   
   # Rollback database (if needed)
   # Use migration rollback procedures
   ```

4. **Notify Stakeholders:**
   - Post in status channel
   - Update status page
   - Notify affected users

### Data Loss Event

1. **Stop all writes** immediately
2. **Identify scope** of data loss
3. **Restore from backup** (see Disaster Recovery)
4. **Verify restoration** before resuming
5. **Document incident** for review

### Security Breach

1. **Isolate affected systems**
2. **Rotate all credentials**  
3. **Review access logs**
4. **Notify security team**
5. **Follow incident response** procedures

---

## Monitoring Dashboards

### System Health
- **URL:** `/admin/system-health`
- **Metrics:** Database, Edge Functions, External Services
- **Alerts:** Real-time error notifications

### Performance Metrics
- **Edge Function Response Times**
- **Database Query Performance**
- **API Integration Status**
- **Resource Utilization**

### Business Metrics
- **Campaign Performance**
- **Gift Card Redemption Rates**
- **SMS Delivery Success**
- **User Engagement**

---

## Support Contacts

### Internal
- **DevOps Team:** devops@mobulace.com
- **On-Call:** Use PagerDuty
- **Security:** security@mobulace.com

### External
- **Supabase Support:** Dashboard → Support
- **Twilio Support:** https://support.twilio.com
- **Tillo Support:** support@tillo.io

---

## Related Documentation

- [Developer Guide](../4-DEVELOPER-GUIDE/)
- [Architecture](../2-ARCHITECTURE/)
- [Troubleshooting](../9-TROUBLESHOOTING/)

---

**Last Updated:** December 4, 2024
