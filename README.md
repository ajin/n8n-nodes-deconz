# n8n-nodes-deconz
Provides n8n node implementation to enables communicating with dresden elektronik deCONZ gateway. It allows you to query as well set state such as on/off, set the brightness on devices and get information on devices.

# Supported Nodes
* Trigger Node to read lights and sensors data
  * Read (near) real-time feedback from devices like lights, groups, switches, and sensors
* Node to monitor and control single resource
  * Get light state
  * Set light state
  * Get sensor state

# Prerequisites
You need a deCONZ gateway to connect n8n to your ZigBee lights, switches, and sensors.

# Installation

To use a n8n-nodes-deconz, it needs to be installed within n8n. For example like this

```bash
# Install n8n
npm install n8n

# Install n8n-nodes-deconz
npm install n8n-nodes-deconz

# Start n8n
n8n
```

Next step is to create an API key to access deCONZ. This key is required to monitor and control resources. Since I have not figured out how to programmatically save API key to credentials, this step must be performed manually. 

Go to Settings → Gateway → Advanced → Authenticate app in the Phoscon App and then use the deCONZ configurator in Home Assistant frontend to create an API key. When you’re done setting up deCONZ it will be stored as a configuration entry.

```bash
curl -d '{"devicetype": "n8n-test"}' -H "Content-Type: application/json" -X POST -s http://<deconz_host>:80/api/ 
```



# Development/Testing

```bash
# Build the code
npm run build

# "Publish" the package locally
npm link

# "Install" the above locally published module
npm link n8n-nodes-deconz

# Start n8n
n8n
```

## Contribution

To make this node even better, please let me know. Commits are always welcome. 

## Issues

If you have any issues, please [let me know on GitHub](https://github.com/ajin/n8n-nodes-deconz/issues).