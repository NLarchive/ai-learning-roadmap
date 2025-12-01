https://docs.github.com/en/pages/quickstart

Here is the step-by-step guide to doing everything from your terminal.

This guide assumes you have **Git** and the **GitHub CLI (`gh`)** installed.
*(If you don't have the GitHub CLI, run `brew install gh` on Mac or `winget install GitHub.cli` on Windows).*

### Phase 1: Create the Project & Code

First, we will create a folder and the necessary files directly from the command line.

1.  **Create and enter your project folder:**

    ```bash
    mkdir my-portfolio
    cd my-portfolio
    ```

2.  **Create your `index.html` file:**
    You can copy-paste this entire block into your terminal to create the file with content:

    ```bash
    cat <<EOF > index.html
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My GitHub Site</title>
        <link rel="stylesheet" href="style.css">
    </head>
    <body>
        <div class="container">
            <h1>Hello, World!</h1>
            <p>This site is hosted directly from my GitHub repository.</p>
            <a href="https://github.com" class="btn">Check my code</a>
        </div>
    </body>
    </html>
    EOF
    ```

3.  **Create your `style.css` file:**
    Copy-paste this block:

    ```bash
    cat <<EOF > style.css
    body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background-color: #f4f4f9;
        color: #333;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
    }
    .container {
        text-align: center;
        background: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .btn {
        display: inline-block;
        margin-top: 1rem;
        padding: 10px 20px;
        background-color: #0969da;
        color: white;
        text-decoration: none;
        border-radius: 6px;
    }
    .btn:hover {
        background-color: #0752b5;
    }
    EOF
    ```

### Phase 2: Create Repo & Push (The "Sync")

Now we initialize Git and send it to GitHub.

1.  **Initialize Git:**

    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```

2.  **Create the GitHub Repo (Public):**
    This command creates the repo on GitHub and links it to your local folder automatically.
    *Replace `my-portfolio` with your desired repo name.*

    ```bash
    gh repo create my-portfolio --public --source=. --remote=origin --push
    ```

### Phase 3: Enable GitHub Pages (Terminal Magic)

Usually, you have to click buttons in the website settings to turn on "Pages". You can skip that by sending a specific command to the GitHub API right from your terminal.

**Run this command to tell GitHub to serve your `main` branch as a website:**

```bash
gh api "repos/:owner/:repo/pages" --method POST -F "source[branch]=main" -F "source[path]=/"
```

*(Note: `:owner` and `:repo` are magic placeholders; the CLI automatically replaces them with your current repo info).*

### Phase 4: See Your Site

It takes about 1–2 minutes for the site to build. You can check the status and get your URL with this command:

```bash
gh browse
```

*Select `Settings > Pages` in the browser window that opens to see your live URL (usually `https://your-username.github.io/my-portfolio`).*