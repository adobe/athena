const express = require("express");
const https = require('https');
const bodyParser = require("body-parser");
const privateKey = fs.readFileSync('/etc/webhook/certs/key.pem').toString();
const certificate = fs.readFileSync('/etc/webhook/certs/cert.pem').toString();
const options = {key: privateKey, cert: certificate};
const app = express();
const yaml = require("js-yaml");

const sidecarConfigFile = yaml.safeLoad("/etc/webhook/config/sidecarconfig.yaml");
app.use(bodyParser.json());

function addContainers(data, containers) {
    let basePath = "/spec/containers";
    let idx = 0;
    containers.forEach((container) => {
        data.push({
            "op":"add",
            "path": (idx++ === 0) ? basePath : basePath + "/-",
            "value": container
        })
    });
}

function addVolume(data, volumes) {
    let basePath = "/spec/volumes";
    let idx = 0;
    volumes.forEach((container) => {
        data.push({
            "op":"add",
            "path": (idx++ === 0) ? basePath : basePath + "/-",
            "value": container
        })
    });
}
app.post('/mutate', (req, res) => {
    console.log(req.body);
    console.log(req.body.request.object);
    let data = [{
        "op":"add",
        "path":"/metadata/annotations",
        "value":{
            "sidecar-injector-webhook.morven.me/status":"injected"
        }
    }];
    addContainers(data, sidecarConfigFile.containers || []);
    addContainers(data, sidecarConfigFile.volumes || []);
    let adminResp = {response:{
            allowed: true,
            patch: Buffer.from(JSON.stringify([data
            ])).toString('base64'),
            patchType: "JSONPatch",
        }};
    console.log(adminResp);
    res.send(adminResp)
});

const server = https.createServer(options, app);