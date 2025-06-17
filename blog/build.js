const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'generated');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Load templates
const articleTemplate = fs.readFileSync(path.join(__dirname, 'templates', 'article.html'), 'utf-8');
const blogIndexTemplate = fs.readFileSync(path.join(__dirname, 'templates', 'blog-index.html'), 'utf-8');

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

// Function to replace template variables and handle array iteration
function replaceTemplate(template, data) {
    let result = template;

    // Step 1: Handle conditional sections and array iteration first: {{#key}}content{{/key}}
    // This ensures that nested content within loops/conditionals is processed with its specific context.
    result = result.replace(/\{\{#([^}]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (match, key, content) => {
        if (Array.isArray(data[key])) {
            // If the key refers to an array, iterate over it
            return data[key].map(item => {
                // Recursively call replaceTemplate for each item in the array
                // The item itself acts as the data context for the inner content
                return replaceTemplate(content, item);
            }).join('');
        } else {
            // Otherwise, it's a simple boolean condition
            return data[key] ? content : '';
        }
    });

    // Step 2: Handle simple variable replacement: {{variable}}
    // This happens after all structural replacements (loops/conditionals) are done.
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        return data[key] || '';
    });

    return result;
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
    
    // Prepare data for template
    const templateData = {
        title: metadata.title || articleFile.replace('.md', ''),
        excerpt: metadata.excerpt || '',
        author: metadata.author || 'Stefano Zanella',
        date: metadata.date || '',
        readTime: metadata.readTime || '',
        content: htmlContent,
        hasMeta: metadata.date || metadata.readTime || metadata.author ? true : false
    };

    // Generate HTML using template
    const html = replaceTemplate(articleTemplate, templateData);

    // Generate URL-friendly filename
    const urlFriendlyTitle = articleFile.replace('.md', '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    fs.writeFileSync(path.join(outputDir, `${urlFriendlyTitle}.html`), html);
});

// Generate blog index
const articlesList = articles.map(articleFile => {
    const content = fs.readFileSync(path.join(articlesDir, articleFile), 'utf-8');
    const parsed = parseFrontmatter(content);
    const metadata = parsed?.metadata || {};
    const urlFriendlyTitle = articleFile.replace('.md', '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    return {
        title: metadata.title || articleFile.replace('.md', ''),
        urlFriendlyTitle,
        date: metadata.date || '',
        readTime: metadata.readTime || ''
    };
});

// Generate blog index HTML
const blogIndexHtml = replaceTemplate(blogIndexTemplate, { articles: articlesList });
fs.writeFileSync('blog.html', blogIndexHtml); 