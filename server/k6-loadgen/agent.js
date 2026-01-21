const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = 80;

app.use(cors());
app.use(express.json());

let k6Process = null;
let currentConfig = {
    visitor_rpm: 0,
    shopper_rpm: 0,
    searcher_rpm: 0,
    error_rpm: 0
};

// Ensure config file exists initially
const CONFIG_FILE = 'local-config.json';
if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig));
}

app.get('/status', (req, res) => {
    res.json({
        running: !!k6Process,
        pid: k6Process ? k6Process.pid : null,
        config: currentConfig
    });
});

app.post('/start', (req, res) => {
    const { visitor_rpm, shopper_rpm, searcher_rpm, error_rpm } = req.body;

    // Update Config
    currentConfig = {
        visitor_rpm: parseInt(visitor_rpm) || 0,
        shopper_rpm: parseInt(shopper_rpm) || 0,
        searcher_rpm: parseInt(searcher_rpm) || 0,
        error_rpm: parseInt(error_rpm) || 0
    };

    // Write to file for k6 to read (if we were using file watch, but we pass env vars actually)
    // For this implementation, we will pass ENV VARS to the spawn process.
    // However, k6 script usually reads from __ENV. 
    // We can also write to a json file and have k6 read it via open(), but env vars are cleaner for constant arrival rate.

    // 1. Stop existing process
    if (k6Process) {
        console.log(`Stopping k6 process ${k6Process.pid}...`);
        k6Process.kill('SIGTERM');
        k6Process = null;
    }

    // 2. Start new process if any RPM > 0
    const totalRpm = currentConfig.visitor_rpm + currentConfig.shopper_rpm + currentConfig.searcher_rpm + currentConfig.error_rpm;

    if (totalRpm > 0) {
        const env = {
            ...process.env,
            VISITOR_RPM: currentConfig.visitor_rpm.toString(),
            SHOPPER_RPM: currentConfig.shopper_rpm.toString(),
            SEARCHER_RPM: currentConfig.searcher_rpm.toString(),
            ERROR_RPM: currentConfig.error_rpm.toString()
        };

        console.log('Starting k6 with config:', currentConfig);

        // Spawn k6
        k6Process = spawn('k6', ['run', 'main.js'], { env });

        k6Process.stdout.on('data', (data) => {
            console.log(`[k6]: ${data}`);
        });

        k6Process.stderr.on('data', (data) => {
            console.error(`[k6-err]: ${data}`);
        });

        k6Process.on('close', (code) => {
            console.log(`k6 process exited with code ${code}`);
            k6Process = null;
        });

        return res.json({ status: 'started', config: currentConfig, pid: k6Process.pid });
    } else {
        console.log('Total RPM is 0, not starting k6.');
        return res.json({ status: 'stopped', message: 'RPM is 0' });
    }
});

app.post('/stop', (req, res) => {
    if (k6Process) {
        k6Process.kill();
        k6Process = null;
    }
    currentConfig = { visitor_rpm: 0, shopper_rpm: 0, searcher_rpm: 0, error_rpm: 0 };
    res.json({ status: 'stopped' });
});

app.listen(PORT, () => {
    console.log(`LoadGen Agent listening on port ${PORT}`);
});
