# HOW TO USE THIS WITH CURSOR

## Quick Start

1. **Open the project** in Cursor: `C:\Users\Acer Nitro 5\Desktop\Cursor Mobul\mobul`

2. **Start a new chat** and paste this prompt:

```
Read LAUNCH_PRD.md and LAUNCH_PROGRESS.md. Begin executing Phase 1, Task 1.1. Update LAUNCH_PROGRESS.md as you complete each task. Continue until you complete all Phase 1 tasks or hit a blocker.
```

3. **Approve or provide input** when Cursor reports completion or asks questions.

4. **To continue**, just say:
```
Continue with the next task.
```

5. **To skip to a specific phase**:
```
Skip to Phase 3 and begin with Task 3.1.
```

---

## File Reference

| File | Purpose |
|------|---------|
| `.cursorrules` | Main AI behavior configuration |
| `LAUNCH_PRD.md` | Complete task instructions (THE PLAN) |
| `LAUNCH_PROGRESS.md` | Progress tracking (Cursor updates this) |
| `.cursor/rules/*.mdc` | Context-specific rules |

---

## Cursor Rules Files

Located in `.cursor/rules/`:

| File | When Active |
|------|-------------|
| `code-review-standards.mdc` | When reviewing .ts/.tsx files |
| `security-audit.mdc` | When auditing security |
| `gift-card-provisioning-system.mdc` | Gift card related work |
| `campaign-condition-model.mdc` | Campaign condition work |
| `organization-hierarchy.mdc` | Multi-tenant work |
| `reward-fulfillment-flow.mdc` | Reward system work |

---

## Prompts for Different Tasks

### To do OAuth implementation:
```
Execute Phase 1 of LAUNCH_PRD.md - OAuth Integration. Complete all 12 tasks and update LAUNCH_PROGRESS.md.
```

### To do code review:
```
Execute Phase 2 of LAUNCH_PRD.md - Code Review. Start with section 2A (Authentication). Review each file according to code-review-standards.mdc.
```

### To do cleanup:
```
Execute Phase 3 of LAUNCH_PRD.md - Cleanup. Start with Task 3.1 (remove workspace images). Continue through all cleanup tasks.
```

### To do security audit:
```
Execute Phase 4 of LAUNCH_PRD.md - Security Hardening. Apply security-audit.mdc standards to each task.
```

### To prepare for production:
```
Execute Phase 5 of LAUNCH_PRD.md - Production Readiness. Run through each verification and create missing documentation.
```

---

## Tips for Best Results

1. **Start fresh sessions** for each phase - prevents context overflow

2. **Check LAUNCH_PROGRESS.md** between sessions to see what's done

3. **If Cursor goes off-track**, say:
```
Stop. Re-read LAUNCH_PRD.md Task [X.X] and execute only that task.
```

4. **For blocking issues**, Cursor will ask. Provide the answer and say "Continue"

5. **To get status**, ask:
```
Show me current progress from LAUNCH_PROGRESS.md
```

---

## After Completion

When all phases are done:

1. Review LAUNCH_PROGRESS.md for any items marked with issues
2. Check "Decisions Needed" section
3. Run final verification:
   ```bash
   npm run build
   npm test
   npm run lint
   ```
4. Do manual testing of OAuth flows
5. Configure Supabase Dashboard (OAuth providers, etc.)

---

## Manual Steps Required

These require human action (Cursor cannot do them):

### Supabase Dashboard Configuration
- Enable Google OAuth provider
- Enable Apple OAuth provider  
- Add redirect URLs
- Configure secrets

### Google Cloud Console
- Create OAuth credentials
- Configure consent screen
- Add authorized domains

### Apple Developer Console
- Create App ID with Sign in with Apple
- Create Services ID
- Generate private key

### Production Deployment
- Set environment variables
- Configure domain/DNS
- Set up monitoring alerts

---

## Support

If issues arise:
1. Check `docs/` folder for relevant documentation
2. Check `public/docs/9-TROUBLESHOOTING/` for known issues
3. Review error messages carefully
4. Ask Cursor to explain what went wrong

---

*This document helps you orchestrate Cursor to execute the launch preparation plan autonomously.*
