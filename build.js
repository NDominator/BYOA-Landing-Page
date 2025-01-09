const fs = require('fs-extra');
const path = require('path');
const { marked } = require('marked');

// Configure marked with heading IDs and disable mangling
marked.use({ 
    headerIds: true,
    headerPrefix: '',
    mangle: false
});

async function build() {
    // Ensure public directory exists
    await fs.ensureDir('public');
    await fs.ensureDir('public/blog');
    await fs.ensureDir('public/assets');

    // Copy static assets
    await fs.copy('src/styles', 'public/styles');
    await fs.copy('src/scripts', 'public/scripts');
    await fs.copy('src/assets', 'public/assets');

    // Copy index.html directly
    await fs.copy('src/index.html', 'public/index.html');

    // Read templates
    const pageTemplate = await fs.readFile('src/templates/base.html', 'utf-8');
    const blogTemplate = await fs.readFile('src/templates/blog-post.html', 'utf-8');
    const newsletterPartial = await fs.readFile('src/templates/newsletter.html', 'utf-8');

    // Build pages (excluding index)
    const pagesDir = 'src/content/pages';
    const pages = await fs.readdir(pagesDir);

    for (const page of pages) {
        if (page.endsWith('.md') && page !== 'index.md') {
            const content = await fs.readFile(path.join(pagesDir, page), 'utf-8');
            const frontMatter = parseFrontMatter(content);
            const html = marked(frontMatter.content);
            
            const outputHtml = pageTemplate
                .replace('{{title}}', frontMatter.title || 'My Site')
                .replace('{{content}}', html)
                .replace('{{> newsletter}}', newsletterPartial);

            const outputPath = path.join('public', page.replace('.md', '.html'));
            await fs.writeFile(outputPath, outputHtml);
        }
    }

    // Build blog posts
    const blogDir = 'src/content/blog';
    const posts = await fs.readdir(blogDir);
    const blogPosts = [];

    for (const post of posts) {
        if (post.endsWith('.md')) {
            const content = await fs.readFile(path.join(blogDir, post), 'utf-8');
            const frontMatter = parseFrontMatter(content);
            const html = marked(frontMatter.content);
            
            const outputHtml = blogTemplate
                .replace('{{title}}', frontMatter.title || 'Blog Post')
                .replace('{{date}}', formatDate(frontMatter.date))
                .replace('{{content}}', html)
                .replace('{{> newsletter}}', newsletterPartial);

            const outputPath = path.join('public/blog', post.replace('.md', '.html'));
            await fs.writeFile(outputPath, outputHtml);

            blogPosts.push({
                title: frontMatter.title,
                date: frontMatter.date,
                url: '/blog/' + post.replace('.md', '.html')
            });
        }
    }

    // Create blog index page
    const blogIndexHtml = pageTemplate
        .replace('{{title}}', 'Blog')
        .replace('{{content}}', generateBlogIndex(blogPosts))
        .replace('{{> newsletter}}', newsletterPartial);

    await fs.writeFile('public/blog/index.html', blogIndexHtml);
}

function parseFrontMatter(content) {
    const lines = content.split('\n');
    const frontMatter = {};
    let markdown = '';
    let inFrontMatter = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim() === '---') {
            if (!inFrontMatter) {
                inFrontMatter = true;
                continue;
            } else {
                inFrontMatter = false;
                continue;
            }
        }

        if (inFrontMatter) {
            const [key, value] = line.split(':').map(s => s.trim());
            if (key && value) {
                frontMatter[key] = value;
            }
        } else {
            markdown += line + '\n';
        }
    }

    return {
        ...frontMatter,
        content: markdown
    };
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function generateBlogIndex(posts) {
    const sortedPosts = posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return `
        <div class="content-container">
            <h1>Blog Posts</h1>
            <ul class="blog-list">
                ${sortedPosts.map(post => `
                    <li>
                        <h2><a href="${post.url}">${post.title}</a></h2>
                        <span class="date">${formatDate(post.date)}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
}

build().catch(console.error); 