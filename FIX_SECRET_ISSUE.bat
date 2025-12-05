@echo off
echo ============================================
echo  Git Secret Removal Script
echo ============================================
echo.

cd /d "c:\Users\Acer Nitro 5\Desktop\Cursor Mobul\mobul"

echo Step 1: Creating backup branch...
git branch backup-before-secret-removal
echo.

echo Step 2: Checking current state...
git log --oneline -5
echo.

echo Step 3: Removing secret file from all history...
echo This may take a few minutes...
git filter-branch -f --index-filter "git rm --cached --ignore-unmatch temp-google-wallet-secret.json" --prune-empty -- --all
echo.

echo Step 4: Cleaning up references...
git for-each-ref --format="delete %%(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now
echo.

echo Step 5: Force pushing to remote...
git push --force origin main
echo.

echo Step 6: Final verification...
git log --all -- temp-google-wallet-secret.json
echo.

echo ============================================
echo  Complete! Press any key to exit...
echo ============================================
pause
