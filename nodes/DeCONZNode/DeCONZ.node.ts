import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	apiRequest,
	getResources,
	getApiKeyRetry
} from './GenericFunctions';

export class DeCONZ implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'deCONZ',
		name: 'deCONZ',
		group: ['transform'],
		version: 1,
		description: 'Node to operate with deCONZ',
		subtitle: `={{$parameter["operation"] + " " + $parameter["resourceId"].split(':')[1]}}`,
		defaults: {
			name: 'deCONZ',
			color: '#696969',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'deCONZ',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Type',
				name: 'resourceType',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getResourceTypes',
				},
				default: '',
				description: 'Resource to change the state.',
				required: true,
			},
			{
				displayName: 'Configuration',
				name: 'config',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getConfigurations',
					loadOptionsDependsOn: [
						'resourceType',
					]
				},
				displayOptions: {
					show: {
						resourceType: [
							'/config',
						],
					},
				},
				required: true,
				default: '',
			},
			{
				displayName: 'Resource',
				name: 'resourceId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getResourcesa',
					loadOptionsDependsOn: [
						'resourceType',
					]
				},
				displayOptions: {
					show: {
						resourceType: [
							'/lights','/sensors',
						],
					},
				},
				required: true,
				default: '',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				required: true,
				options: [
					{
						name: 'Update State',
						value: 'update',
					},
					{
						name: 'Read State',
						value: 'read',
					},
				],
				displayOptions: {
					show: {
						resourceType: [
							'/lights',
						],
					},
				},
				default: 'update',
				description: 'Change or read the state of the resource.',
			},
			//--------------------
			//--------------------
			{
				displayName: 'On',
				name: 'on',
				type: 'boolean',
				required: true,
				displayOptions: {
					show: {
						resourceType: [
							'/lights',
						],
						operation: [
							'update',
						],
					},
				},
				default: true,
				description: 'On/Off state of the light.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						resourceType: [
							'/lights',
						],
						operation: [
							'update',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Brightness',
						name: 'bri',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 254,
						},
						default: 100,
						description: 'Set the brightness of the light. Depending on the light type 0 might not mean visible "off" but minimum brightness.',
					},
				]
			},
		]
	};

	methods = {
		loadOptions: {
			// Get all the lights to display them to user so that he can
			// select them easily
			async getResourcesa(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const type = this.getNodeParameter('resourceType') as string;
				const returnData = await getResources.call(this, type);
				return returnData;
			},

			async getConfigurations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				let options = [
					{
						name: 'Get API Key',
						value: 'api',
						description: 'Creates a new API key which provides authorized access to the REST API. The request will only succeed if the gateway is unlocked',
					},
				];
				const credentials = this.getCredentials('deCONZ');
				if (credentials === undefined) {
					throw new Error('No credentials found!');
				}

				return options;

			},

			async getResourceTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				let options = [];
				const credentials = this.getCredentials('deCONZ');

				if (credentials === undefined) {
					throw new Error('No credentials found!');
				}

				if (typeof credentials.accessToken === 'undefined' || !credentials.accessToken){
					options = [
						{
							name: 'Configuration',
							value: '/config',
						},
					];
				} else {
					options = [
						{
							name: 'Light',
							value: '/lights',
						},
						{
							name: 'Sensor',
							value: '/sensors',
						},
						{
							name: 'Configuration',
							value: '/config',
						}
					];
				}
				
				return options;
			}
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {

		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData: IDataObject = {};

		let type = '';
		let operation = '';
		let resourceId = '';
		let on = false;
		let data;
		let configuration;
		let additionalFields;
		

		// Itterates over all input items 
		// (This could be a different value for each item in case it contains an expression)
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			type = this.getNodeParameter('resourceType', itemIndex , '') as string;
			operation = this.getNodeParameter('operation', itemIndex, '') as string;
			configuration = this.getNodeParameter('config', itemIndex, '') as string;
			resourceId = this.getNodeParameter('resourceId', itemIndex, '') as string;
			resourceId = resourceId.split(':')[0];
			on = this.getNodeParameter('on', itemIndex, '') as boolean;
			additionalFields = this.getNodeParameter('additionalFields', itemIndex, '') as IDataObject;
		}

		// request to get the API key
		if (type === "/config" && configuration === "api"){
			responseData = await getApiKeyRetry(this, 30);

		// set new value for the lights 
		} else if (operation === 'update' && type === "/lights") {
			const endpoint = `${type}/${resourceId}/state/`;
			const body = {
				on,
			}
			
			Object.assign(body, additionalFields);
			data = await apiRequest.call(this, 'PUT', endpoint, body);
			
			// weird format of response, need to clean up a bit.
			for (const response of data) {
				const successData = response.success;
				for (var prop in successData) {
					var key = prop.toString().replace(endpoint,'');
					responseData[key] = successData[prop];
				}
			}

		} else if ((operation === 'read' && type === "/lights") || type === "/sensors") {
			const endpoint = `${type}/${resourceId}/`;
			responseData = await apiRequest.call(this, 'GET', endpoint);
		}

		if (Array.isArray(responseData)) {
			returnData.push.apply(returnData, responseData as IDataObject[]);
		} else {
			returnData.push(responseData as IDataObject);
		}

		console.log(returnData);
		return [this.helpers.returnJsonArray(returnData)];
	}

}
