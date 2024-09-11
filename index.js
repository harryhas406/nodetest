const express = require('express');
const { Client } = require('@elastic/elasticsearch');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const app = express();
const port = 3000;
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

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
                size: 200,
                sort: [{ "timestamp": { "order": "desc" } }]
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

// Path to the CSV file
const csvFilePath = path.join(__dirname, 'typo_results.csv');

// Initialize CSV writer
const csvWriter = createCsvWriter({
    path: csvFilePath,
    header: [
        {id: 'domain', title: 'Domain'},
        {id: 'fuzzer', title: 'Fuzzer'},
        {id: 'dns_a', title: 'DNS_A'},
        {id: 'dns_aaaa', title: 'DNS_AAAA'},
        {id: 'dns_mx', title: 'DNS_MX'},
        {id: 'dns_ns', title: 'DNS_NS'},
        {id: 'geoip', title: 'GeoIP'},
        {id: 'whois_created', title: 'Created'},
        {id: 'whois_registrar', title: 'Registrar'}
    ],
    append: true  // Append data to the CSV file
});

// Helper function to load previous results from CSV
function loadPreviousResults() {
    if (!fs.existsSync(csvFilePath)) {
        return [];
    }

    const data = fs.readFileSync(csvFilePath, 'utf-8');
    const rows = data.split('\n').slice(1); // Skip headers
    return rows.filter(row => row).map(row => {
        const [domain, fuzzer, dns_a, dns_aaaa, dns_ns, dns_mx, geoip, whois_created, whois_registrar] = row.split(',');
        return { domain, fuzzer, dns_a, dns_aaaa, dns_ns, dns_mx, geoip, whois_created, whois_registrar };
    });
}

// Helper function to parse and format dnstwist results
function formatResults(data) {
    return data.map(entry => ({
        domain: entry.domain || 'N/A',
        fuzzer: entry.fuzzer || 'N/A',
        dns_a: (entry.dns_a || []).join(', ') || 'N/A',
        dns_aaaa: (entry.dns_aaaa || []).join(', ') || 'N/A',
        dns_mx: (entry.dns_mx || []).join(', ') || 'N/A',
        dns_ns: (entry.dns_ns || []).join(', ') || 'N/A',
        geoip: entry.geoip  || 'N/A',
        registrar: entry.whois_registrar || 'N/A',
        created: entry.whois_created || 'N/A '
    }));
}

// Route to run dnstwist using spawn
app.get('/api/dnstwist', (req, res) => {
    const domain = req.query.domain;

    if (!domain) {
        return res.status(400).send('Domain is required');
    }

    const dnstwistProcess = spawn('dnstwist', ['--registered', '--geoip', '--whois', domain, '--format', 'json']);

    let output = '';
    let errorOutput = '';

    // Capture the stdout stream data
    dnstwistProcess.stdout.on('data', (data) => {
        output += data.toString();
    });

    // Capture any errors from stderr
    dnstwistProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });

    // Handle process exit
    dnstwistProcess.on('close', (code) => {
        if (code !== 0 || errorOutput) {
            console.error('Error executing dnstwist:', errorOutput);
            return res.status(500).send('Error executing dnstwist');
        }

        try {
            // Parse the JSON output from dnstwist
            const results = JSON.parse(output);

            // Format the results to store in CSV
            const formattedResults = formatResults(results);

            // Append the formatted results to the CSV file
            csvWriter.writeRecords(formattedResults)
                .then(() => {
                    // Fetch all results to display (including the new ones)
                    const allResults = loadPreviousResults();
                    console.log('Results saved to CSV');
                    res.json(allResults);
                })
        } catch (parseError) {
            console.error('Error parsing dnstwist output:', parseError.message);
            res.status(500).send('Error parsing dnstwist output');
        }
    });
});
// Route to fetch all previous results
app.get('/api/results', (req, res) => {
    const results = loadPreviousResults();
    res.json(results);
});
// // Route to perform DNS fuzzing using dnstwist using exec(collects the whole output at once)
// app.get('/api/dnstwist', (req, res) => {
//     const domain = req.query.domain;  // Domain to be analyzed

//     if (!domain) {
//         return res.status(400).send('Please provide a domain');
//     }

//     // Execute dnstwist via Python
//     exec(`dnstwist --registered --g ${domain} --format json`, (error, stdout, stderr) => {
//         if (error) {
//             console.error(`Error executing dnstwist: ${error.message}`);
//             return res.status(500).send('Error executing dnstwist');
//         }
//         if (stderr) {
//             console.error(`dnstwist error: ${stderr}`);
//             return res.status(500).send(`dnstwist error: ${stderr}`);
//         }

//         // Parse the output (JSON format expected from dnstwist)
//         try {
//             const parsedOutput = JSON.parse(stdout);
//             res.json(parsedOutput);
//         } catch (parseError) {
//             console.error('Error parsing dnstwist output:', parseError);
//             res.status(500).send('Error parsing dnstwist output');
//         }
//     });
// });
// Serve the dnstwist.html page
app.get('/typo', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'typo.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});







// Why spawn?
// Streaming Output: spawn streams data directly, allowing for handling large outputs without exceeding buffer limits.
// Real-time Output: You can even send the results to the frontend as they are generated.
// This should resolve the buffer overflow issue and handle larger outputs from dnstwist properly.