import {
	IExecuteFunctions,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions
} from 'n8n-core';

import {
	OptionsWithUri,
} from 'request';

import {
	IDataObject,
	INodePropertyOptions,
} from 'n8n-workflow';


/**
 * Get all the available resources based on the endpooint
 * @param this
 * @param endpoint 
 */
export async function getResources(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions,  endpoint: string): Promise<any> { // tslint:disable-line:no-any

	console.log("[GenericFunctions] getResources");

	const returnData: INodePropertyOptions[] = [];
	const resources = await apiRequest.call(this, 'GET', endpoint);

	for (const resource of Object.keys(resources)) {
		const name = resources[resource].name;
		const id = resource;
		const manufacturername = resources[resource].manufacturername;
		const modelid = resources[resource].modelid;
		const type = resources[resource].type;

		returnData.push({
			name: name,
			value: `${id}:${name}`,
			description: `${type} | ${modelid} | ${manufacturername}`,
		});
	}

	return returnData;
}

/**
 * Make an API request to deconz
 *
 * @param {IHookFunctions} this
 * @param {string} method
 * @param {string} endpoint
 * @param {object} body
 * @returns {Promise<any>}
 */
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: string, endpoint: string, body: any = {}, query?: IDataObject, option: IDataObject = {}): Promise<any> { // tslint:disable-line:no-any
	const credentials = this.getCredentials('deCONZ');

	if (credentials === undefined) {
		throw new Error('No credentials got returned!');
	}

	query = query || {};

	const options: OptionsWithUri = {
		headers: {
			'Content-Type': 'application/json',
		},
		method,
		body,
		qs: query,
		uri: `http://${credentials.host}:${credentials.port}/api/${credentials.accessToken}${endpoint}`,
		json: true,
	};

	if (Object.keys(option).length > 0) {
		Object.assign(options, option);
	}

	if (Object.keys(body).length === 0) {
		delete options.body;
	}

	if (Object.keys(query).length === 0) {
		delete options.qs;
	}
	console.log('options');
	console.log(options);

	try {
		return await this.helpers.request!(options);
	} catch (error) {

		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The deconz credentials are not valid!');
		}
		console.log('error');
		console.log(error);

		/*if (error.response && error.response.body) {
			// Try to return the error prettier
			const errorBody = error.response.body;
			throw new Error(`error response [${errorBody.error.type}]: ${errorBody.error.description} : ${errorBody.error.address} `);
		}*/

		// Expected error data did not get returned so throw the actual error
		throw error;
	}
}