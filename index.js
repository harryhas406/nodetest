const express = require('express');
const { Client } = require('@elastic/elasticsearch');
const axios = require('axios');
const path = require('path');
const app = express();
const port = 3000;

// Elasticsearch client setup
const client = new Client({ node: 'http://localhost:9200' });

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to fetch messages
app.get('/api/messages', async (req, res) => {
    const isIndiaRelated = req.query.isIndiaRelated === 'true';

    try {
        const result = await client.search({
            index: 'telegram_messages',
            body: {
                query: {
                    bool: {
                        must: [
                            {
                                match_all: {}
                            }
                        ],
                        filter: isIndiaRelated ? [
                            {
                                term: { is_india_related: true }
                            }
                        ] : []
                    }
                },
                size:200,
                sort: [{"timestamp": {"order": "desc"}}]
            }
        });

        res.json(result.hits.hits);
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching data from Elasticsearch');
    }
});
// Default route to serve the telegram.html page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'telegram.html'));
});

// Route to fetch posts from the remote source and display on a new page
app.get('/api/posts', async (req, res) => {
    try {
        const response = await axios.get('https://raw.githubusercontent.com/joshhighet/ransomwatch/main/posts.json');
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).send('Error fetching posts');
    }
});
// Default route to serve the posts.html page
app.get('/posts', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'posts.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
