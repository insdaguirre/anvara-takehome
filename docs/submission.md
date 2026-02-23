# Submission Guide

## ⚠️ Important: Do NOT Fork This Repository

Please follow these instructions carefully to submit your work.

---

## Quick Submission Steps

1. **Clone** the repository
2. **Create** your own public repository
3. **Work** on the challenges
4. **Push** your code
5. **Submit** your repository URL

---

## Detailed Instructions

### Step 1: Clone the Repository

Clone this repository to your local machine:

```bash
git clone https://github.com/anvara-project/take-home.git
cd take-home
```

### Step 2: Create Your Own Repository

Create a **new public repository** on your GitHub account:

1. Go to [GitHub.com](https://github.com) and click "New Repository"
2. Name it something like `anvara-takehome-[yourname]`
3. Make it **PUBLIC** ⚠️ (we need to access it to review, feel free to delete it after)
4. Do NOT initialize with README, .gitignore, or license

### Step 3: Update Remote and Push

Update the remote to point to your new repository:

```bash
# Remove the original remote
git remote remove origin

# Add your new repository as origin
git remote add origin https://github.com/YOUR_USERNAME/anvara-takehome-[yourname].git

# Push all branches and history
git push -u origin main
```

### Step 4: Work on the Challenges

1. Follow the [setup guide](setup.md)
2. Complete the [challenges](challenges/README.md)
3. Commit frequently with clear messages
4. Push your commits regularly

**Good commit example:**

```bash
git add .
git commit -m "Fix: Replace any types with proper interfaces in helpers.ts"
git push
```

### Step 5: Submit Your Repository URL

Once you've completed the challenges:

1. ✅ Make sure all changes are committed and pushed
2. ✅ Verify your repository is **PUBLIC**
3. ✅ Run final checks (see below)
4. ✅ Send the repository URL via email

**Submission format:**

```
Repository: https://github.com/yourname/anvara-takehome-yourname
Name: Your Name
Completed: All 5 core challenges + Bonus 1, Bonus 3
Notes: Added unit tests with 80% coverage. Used React Query for state management.
Time Spent: ~14.5 hours
```

---

## What We'll Review

### ✅ Commit History (20%)

We want to see your problem-solving process:

- Clear, descriptive commit messages
- Logical progression through challenges
- How you approached debugging and fixes

**Good commits:**

```bash
✅ "Fix: Replace any types with proper TypeScript interfaces"
✅ "Add: Campaign CRUD endpoints with authorization"
✅ "Refactor: Convert sponsor dashboard to Server Components"
```

**Avoid:**

```bash
❌ "fix"
❌ "changes"
❌ "update"
```

### ✅ Code Quality (30%)

- TypeScript type safety (no `any` types)
- Clean, readable, well-organized code
- Proper error handling
- Following best practices
- Consistent formatting

### ✅ Functionality (40%)

- Completed challenges work correctly
- Application runs without errors
- Features work as specified
- Authentication and authorization work correctly
- Tests pass (if you added any)

**Note:** You don't need to complete all challenges! We evaluate based on the quality of what you complete and how far you progress.

### ✅ Documentation (10%)

- Clear commit messages
- Comments explaining complex logic
- Any additional notes or README updates
- Bonus challenge documentation

---

## Pre-Submission Checklist

Before submitting, verify:

### Tests & Quality

- [x] `pnpm typecheck` passes with no errors
- [x] `pnpm lint` passes with no errors
- [x] `pnpm format` has been run
- [x] `pnpm test` passes (if you added tests)
- [x] `pnpm dev` starts both frontend and backend
- [x] Can log in as sponsor and publisher
- [x] All features work in the browser

### Repository

- [x] All changes are committed
- [x] All commits are pushed to GitHub
- [x] Repository is **PUBLIC**
- [x] No sensitive data (passwords, API keys) committed
- [x] `.env` file is NOT committed (should be in `.gitignore`)

### Documentation

- [x] Commit messages are clear and descriptive
- [x] Added any necessary comments to complex code
- [x] Updated README if you made significant changes
- [x] Noted which bonus challenges you completed

---

## Common Issues

### Issue: Repository is Private

**Solution:** Go to Settings → Danger Zone → Change visibility → Make public

### Issue: Forgot to Push Changes

**Solution:**

```bash
git status  # Check uncommitted changes
git add .
git commit -m "Your message"
git push
```

### Issue: Can't Push to Repository

**Solution:**

```bash
# Verify remote URL
git remote -v

# Should show YOUR repository, not the original
# If not, repeat Step 3 above
```

### Issue: TypeCheck Fails

**Solution:** This is expected initially! Challenge 1 is to fix these errors. Make sure you've completed all challenges before submitting.

---

## Time Expectations

- Work at your own pace - there's no time limit
- Submit when you feel you've shown your best work
- Where you stop helps us understand your current skill level
- Quality matters more than quantity

Some candidates complete 2-3 challenges, others finish all 5 plus bonuses. Both are valuable outcomes!

---

## What Happens Next?

After you submit:

1. **We'll clone your repository** and review your code
2. **We'll run the setup** to verify everything works
3. **We'll review your commits** to understand your approach
4. **We'll test your implementation** in the browser
5. **We'll provide feedback** asap

---

## Tips for Success

### 🎯 Complete What You Can

Work through the challenges in order (1 → 2 → 3 → 4 → 5) and complete as many as you can. Each challenge builds on previous ones and helps us evaluate different skill areas.

**Don't stress about finishing everything!** Where you stop is meaningful data for us:

- Stopping after Challenge 2-3? That's okay - we can see your frontend and TypeScript skills
- Made it to Challenge 4-5? Great - you've shown full-stack capabilities
- Finished everything? Awesome - tackle the bonus challenges!

The goal is to see your best work, not to race through everything.

### 💾 Commit Frequently

Make small, focused commits as you work through each challenge. This helps us understand your problem-solving process.

### 📝 Write Clear Commit Messages

Follow the pattern: `Type: Brief description`

- **Fix**: Bug fixes
- **Add**: New features
- **Refactor**: Code improvements
- **Docs**: Documentation changes
- **Test**: Adding tests

### 🧪 Test Your Work

Before submitting:

- Test in the browser with both demo accounts
- Verify all CRUD operations work
- Check the console for errors
- Run the type checker and linter

### 🚫 Don't Commit Sensitive Data

The `.env` file should NOT be committed. Make sure it's in `.gitignore`.

### 💬 Add Notes

If you made interesting decisions or want to highlight something, add a note in your submission email or update the README.

---

## Questions?

If you have questions about:

- **Setup issues**: Check the [setup guide](setup.md)
- **Challenge requirements**: Review the [challenges documentation](challenges/README.md)
- **Submission process**: Email [nick@anvara.com](mailto:nick@anvara.com)

---

## Good Luck! 🚀

Take your time, work at your own pace, and complete as many challenges as you can. **There's no time limit** - submit whenever you feel you've shown us your best work.

Remember: we're evaluating the quality of what you complete and your problem-solving approach, not racing to finish everything. Whether you complete 2 challenges or 6, we're excited to see your work!

And if you made it this far here's a hint. Maybe there's more than five?

Show us what you can do! 💪

---

[← Back to Documentation](README.md)
