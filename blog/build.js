const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'generated');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Function to parse frontmatter
function parseFrontmatter(content) {
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const match = content.match(frontmatterRegex);
    
    if (!match) return null;
    
    const frontmatter = match[1];
    const metadata = {};
    
    frontmatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
            // Remove quotes and trim
            const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
            metadata[key.trim()] = value;
        }
    });
    
    return {
        metadata,
        content: content.slice(match[0].length).trim()
    };
}

// Read all markdown files
const articlesDir = path.join(__dirname, 'articles');
const articles = fs.readdirSync(articlesDir)
    .filter(file => file.endsWith('.md'));

// Process each article
articles.forEach(articleFile => {
    const content = fs.readFileSync(path.join(articlesDir, articleFile), 'utf-8');
    const parsed = parseFrontmatter(content);
    const metadata = parsed?.metadata || {};
    const htmlContent = marked(parsed?.content || content);
    
    // Create HTML file
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>${metadata.title || articleFile.replace('.md', '')} - Stefano Zanella's Blog</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${metadata.excerpt || ''}">
    <meta name="author" content="${metadata.author || 'Stefano Zanella'}">
    <meta name="date" content="${metadata.date || ''}">
</head>
<body>
    <article>
        <header>
            <h1>${metadata.title || articleFile.replace('.md', '')}</h1>
            ${metadata.excerpt ? `<p class="excerpt">${metadata.excerpt}</p>` : ''}
            ${metadata.date || metadata.readTime || metadata.author ? `
            <div class="article-meta">
                ${metadata.date ? `<time>${metadata.date}</time>` : ''}
                ${metadata.readTime ? `<span>${metadata.readTime}</span>` : ''}
                ${metadata.author ? `<span>By ${metadata.author}</span>` : ''}
            </div>` : ''}
        </header>
        ${htmlContent}
    </article>
    <a href="/blog">Back to Blog</a>
</body>
</html>`;

    // Generate URL-friendly filename
    const urlFriendlyTitle = articleFile.replace('.md', '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    fs.writeFileSync(path.join(outputDir, `${urlFriendlyTitle}.html`), html);
});

// Generate index page
const blogIndex = `
<!DOCTYPE html>
<html>
<head>
    <title>Blog - Stefano Zanella</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <h1>Blog</h1>
    <p>This is the blog of Stefano Zanella, an explorer of the world and of the wild web</p>
    <p>Here I write about my experiences and my thoughts</p>
    <ul>
        ${articles.map(articleFile => {
            const content = fs.readFileSync(path.join(articlesDir, articleFile), 'utf-8');
            const parsed = parseFrontmatter(content);
            const metadata = parsed?.metadata || {};
            const urlFriendlyTitle = articleFile.replace('.md', '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return `<li>
                <a href="generated/${urlFriendlyTitle}.html">${metadata.title || articleFile.replace('.md', '')}</a>
                ${metadata.date ? `<small>${metadata.date} · ${metadata.readTime || ''}</small>` : ''}
            </li>`;
        }).join('\n')}
    </ul>
    <a href="/">Back to Home</a>
</body>
</html>`;

fs.writeFileSync('blog.html', blogIndex); 