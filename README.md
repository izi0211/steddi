# T1Dy – test app setup

T1Dy installs on an iPhone home screen and runs full screen like a normal app.
The AI features (meal photos, suggestions) run through a small server on Netlify that holds your Claude API key, so the key is never visible in the app.

## 1. Get a Claude API key
1. Go to console.anthropic.com, sign up, and add a small amount of credit (£5 is plenty for testing).
2. Under Settings > Limits, set a low monthly spend limit.
3. Under API keys, create a key and copy it. Keep it private.

## 2. Put the files on GitHub
1. Make a free account at github.com.
2. Create a new repository called `steddi` (Private is fine).
3. Click "uploading an existing file" and drag in everything from this folder, including the `netlify` folder. Commit.

## 3. Put it online with Netlify (free)
1. Sign in at netlify.com with your GitHub account.
2. Add new project > Import an existing project > GitHub > pick `steddi`. Leave the build settings as they are. Deploy.
3. Go to Project configuration > Environment variables > Add a variable:
   - Key: `ANTHROPIC_API_KEY`
   - Value: your key from step 1
4. Go to Deploys > Trigger deploy > Deploy project, so the key takes effect.
5. Your link will look like `https://steddi-xxxx.netlify.app`. You can rename it under Project configuration > Change project name.

## 4. Add it to an iPhone
1. Open the link in **Safari**.
2. Tap Share, then **Add to Home Screen**, then Add.
3. Open T1Dy from the home screen icon.

## Good to know
- Each person's data stays on their own phone. Deleting the app from the home screen deletes their data.
- Anyone with the link can use the AI, which spends your credit. Only share the link with testers, and keep the spend limit on.
- Without the API key the app still works, using its own built-in suggestions; photo carbs need the key.
- To update the app, replace the files on GitHub. Netlify redeploys automatically.
- T1Dy is a prototype, not a medical device.
