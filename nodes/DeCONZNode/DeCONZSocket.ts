// @ts-ignore
import * as ws from 'ws';
//import {EventEmitter} from "events";
import {EventEmitter} from "eventemitter3";


class DeCONZSocket extends EventEmitter {
    url: string;
    socket: ws;

    shouldReconnect = false;
    retryCount = 0;
    retryInterval = 5000;
    maxRetries = 10;
    
    constructor(url: string) {
        super();
        console.log("[DeCONZSocket] constructor start ");
        console.log("[DeCONZSocket] url: " + url);
        console.log("[DeCONZSocket] constructor creating new instance ");

        if (!url) throw new Error('Missing name');
        this.url = url;
        this.socket = null as any;
        console.log("[DeCONZSocket] constructor end ");

    }

    /**
     * Connect to the websocke.
     */
    connect() {
        try {
            console.log("[DeCONZSocket] connect start ");

            this.retryCount += 1;
            this.socket = new ws(this.url);
            this.shouldReconnect = true;

            this.socket.on('open', (data: any) => this.onOpen(data));
            this.socket.on('message', (data: any) => this.onMessage(data));
            this.socket.on('error', err => this.onError(err));
            this.socket.on('unexpected-response', (req, res) => this.onUnexpectedResponse(req, res));
            this.socket.on('close', (code, reason) => this.onClose(code, reason));
            this.socket.on('dispose', () => this.onDispose());
            
            console.log("[DeCONZSocket] connect end");

        } catch (err) {
            this.onClose(err, '');
            throw err;
        }
    }

    /**
     * Closes the WebSocket connection or connection attempt and connects again.
     */
    reconnect() {
        console.log("[DeCONZSocket] reconnect start ");

        if (this.shouldReconnect && this.retryCount < this.maxRetries) {
            this._disconnect();
            setTimeout(() => this.connect(), this.retryInterval);
        } else {
            this.close();
            this.emit('max-retries', 'Maximum connection attempts exceeded');
        }

        console.log("[DeCONZSocket] reconnect end ");
    }

    /**
     * Closes the WebSocket connection and remove any event listeners
     */
    _disconnect(){
        console.log("[DeCONZSocket] _disconnect start ");

        if (!this.socket || this.socket !== undefined){
            this.socket.close();
            this.socket.removeAllListeners();
            this.socket = null as any;
        }
        console.log("[DeCONZSocket] _disconnect end ");

    }

    /**
     * Closes the WebSocket connection, remove any event listeners and reset retry counter
     */
    close(force : boolean = false) {
        if (this.listenerCount("message") == 0 || force){
            this._disconnect();
            this.retryCount = 0;
            this.shouldReconnect = false;
        } else {
            console.log("[DeCONZSocket] listeners are still present");
        }
    }

    isConnected(): boolean {
        return this.socket && this.socket.readyState === ws.OPEN;
    }

    /**
     * An event listener to be called when the WebSocket connection's readyState changes to OPEN;
     * this indicates that the connection is ready to send and receive data
     */
    onOpen(data : any) {
        this.retryCount = 0;
        this.emit('open', data);
    }

    onClose(code : any, reason: any) {
        if(this.shouldReconnect){
            this.reconnect();
        } else {
            this.emit('close', code, reason);
        }
    }

    /**
     * An event listener to be called when a message is received from the server
     */
    onMessage(data: any) {
        this.emit('message', data);
    }

    onUnexpectedResponse(req: any, res: any) {
        return this.emit('unexpected-response', req, res);
    }

    /**
     * An event listener to be called when an error occurs
     */
    onError(err: any) {
        this.emit('error', err);
    }

    onDispose() {
        this.emit('dispose', "");
    }
}

export default DeCONZSocket;

let instances: DeCONZSocket[] = [];

export function getInstance(instanceUrl: string) {
    console.log("[DeCONZSocket] getInstance instanceUrl: " + instanceUrl);

    return instances.find(v => v.url == instanceUrl) || null;
}

export function getInstanceOrCreate(instanceUrl: string) {
    console.log("[DeCONZSocket] getInstanceOrCreate start ");
    console.log("[DeCONZSocket] getInstanceOrCreate instanceUrl: " + instanceUrl);

    let instance = getInstance(instanceUrl);

    if (!instance) {
        console.log("[DeCONZSocket] getInstanceOrCreate cannot find existing instance ");

        instance = new DeCONZSocket(instanceUrl);
        instances.push(instance);
    }

    console.log("[DeCONZSocket] getInstanceOrCreate end ");

    return instance;
}

export function removeInstance(instance: DeCONZSocket) {
    instances.splice(instances.indexOf(instance), 1);
}