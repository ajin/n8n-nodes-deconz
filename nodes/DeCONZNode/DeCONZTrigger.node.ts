import { ITriggerFunctions } from 'n8n-core';
import {
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	INodePropertyOptions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';

import {
	apiRequest,
	getResources,
} from './GenericFunctions';

import * as WebSocket from 'ws';
import * as DeconzSocket from './DeCONZSocket';

export class DeCONZTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'deCONZ Trigger',
		name: 'deCONZTrigger',
		group: ['trigger'],
		version: 1,
		description: 'Listens to deCONZ events',
		defaults: {
			name: 'deCONZ Trigger',
			color: '#696969',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'deCONZ',
				required: true,
			},
		],
		properties: [
			// Node properties which the user gets displayed and can change on the node.
			{
				displayName: 'Type',
				name: 'resourceType',
				type: 'options',
				options: [
					{
						name: 'Light',
						value: 'light',
					},
					{
						name: 'Sensor',
						value: 'sensor',
					},
				],
				default: 'Light',
				description: 'The event to listen to.',
				required: true,
			},
			{
				displayName: 'Resource',
				name: 'resourceId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getResources',
					loadOptionsDependsOn: [
						'resourceType',
					]
				},
				required: true,
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'options',
				options: [
					{
						name: 'Added',
						value: 'added',
						description: 'Resource has been added',
					},
					{
						name: 'Changed',
						value: 'changed',
						description: 'Resource attributes have changed',
					},
					{
						name: 'Deleted',
						value: 'deleted',
						description: 'Resource has been deleted',
					},
					{
						name: 'Scene-called',
						value: 'scene-called',
						description: 'A scene has been recalled',
					},
				],
				default: 'changed',
				description: `The event to listen to`,
				required: true,
			},
		]
	};
	methods = {
		loadOptions: {
			// Get all the resources to display on the dropdown
			async getResources(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				console.log("[deCONZTrigger] getResources");
				const type = this.getNodeParameter('resourceType') as string;
				const endpoint = (type === "light") ? ("/lights") : ("/sensors");
				const returnData = await getResources.call(this, endpoint);
				return returnData;
			}
		}
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		console.log("[deCONZTrigger] start trigger");

		var counter = 1 as number;
		
		const credentials = this.getCredentials('deCONZ');
		if (!credentials) {
			throw new Error('[deCONZTrigger] Credentials are mandatory!');
		}

		let resourceType = this.getNodeParameter('resourceType') as string;
		let resourceId = this.getNodeParameter('resourceId') as string;
		resourceId = resourceId.split(':')[0];
		let events = this.getNodeParameter('events') as string;

		const protocol = credentials.protocol as string || 'ws';
		const host = credentials.host as string;
		const port = credentials.wsPort as number || 8080;
		const url = `${protocol}://${host}:${port}` as string;
 
		const sessionId = Math.random().toString(36).substring(2, 15);
		const instance = DeconzSocket.getInstanceOrCreate(url);
		console.log("[deCONZTrigger] sessionId:" + sessionId);

		// The "manualTriggerFunction" function gets called by n8n
		// when a user is in the workflow editor and starts the
		// workflow manually. So the function has to make sure that
		// the emit() gets called with similar data like when it
		// would trigger by itself so that the user knows what data
		// to expect.

		const self = this;

		// Every time the emit function gets called a new workflow
		// executions gets started with the provided entries.

		async function manualTriggerFunction() {
			console.log("[deCONZTrigger] start manualTriggerFunction");

			await new Promise((resolve, reject) => {

				function onMessage (this : any, data : any) {
					const obj = JSON.parse(data)

					if (obj.t === 'event') {
						if (obj.e === events){
							if (obj.r === resourceType){
								if (obj.id === resourceId){
									self.emit([self.helpers.returnJsonArray([obj])]);
									resolve(true);	
								}
							}	
						}
					}
				};

				function dispose (this: any, data : any) {
					console.log("[deCONZTrigger] dispose");

					// compare current sessionId with the initated session id
					if(this === data){
						console.log("[deCONZTrigger] removing listener for " + this);
						instance.removeListener('message', onMessage, data);
						instance.removeListener('dispose', dispose, data);
						instance.close(false);
						resolve(true);	
					}
				};

				//instance.on('open', () => onSocketOpen(resolve, reject), context);
				instance.on('message', onMessage, sessionId);
				instance.on('dispose', dispose, sessionId);
				
				//instance.on('error', (err) => onSocketError(err));
				//instance.on('close', (code, reason) => onSocketClose(code, reason));

				/*instance.on('error', (err) => {
					console.log("deconz-trigger-node: error");
					console.log(err);
					reject(err);
				});

				instance.on('close', (code, reason) => {
					console.log("deconz-trigger-node: close");
					console.log(code);
					console.log(reason);
					reject(code);
				});*/

			});
		}

		// The "closeFunction" function gets called by n8n whenever
		// the workflow gets deactivated and can so clean up.
		async function closeFunction() {
			instance.emit('dispose', sessionId);
			console.log("[deCONZTrigger] listeners: " +  instance.listeners('message'));
		}
		
		manualTriggerFunction();

		if (!instance.isConnected()){
			instance.connect();
		}

		console.log("[deCONZTrigger] end");

		return {
			closeFunction
		};

	}
}
