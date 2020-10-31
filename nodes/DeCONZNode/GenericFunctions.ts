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
 * Try the given number of times to retrieve the API key from deCONZ 
 * @param {that} that - IExecuteFunctions
 * @param {Number} retriesLeft - Number of retries. If -1 will keep retrying
 * @return {Promise<*>}
 */
export async function getApiKeyRetry(that: IExecuteFunctions, retriesLeft = 2) : Promise<any>  {
	try {
		const val = await getApiKey(that);
		return val;
	} catch (error) {
		if (error.statusCode === 403){
			if (retriesLeft) {
				await new Promise(r => setTimeout(r, 1000));
				return getApiKeyRetry(that, retriesLeft - 1);
	
			} else {
				throw new Error('Link button is not pressed');
			}
		} else {
			throw error;
		}
	}
}

/**
 * Retrieve the API key from deCONZ 
 * @param {that} that - IExecuteFunctions
 * @return {Promise<*>}
 */
export async function getApiKey(that: IExecuteFunctions): Promise<any> { // tslint:disable-line:no-any
	let credentials = that.getCredentials('deCONZ');
	const node = that.getNode();
	var config = node!.credentials;
	const body = {
		devicetype: "n8n-" + config!.deCONZ
	}
	const data = await apiRequest.call(that, 'POST', '', body, undefined, {}, true);
	return data[0].success;
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
export async function apiRequest(this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions | IWebhookFunctions, method: string, endpoint: string, body: any = {}, query?: IDataObject, option: IDataObject = {}, fullError = false): Promise<any> { // tslint:disable-line:no-any
	let credentials = this.getCredentials('deCONZ');
	console.log(credentials);
	console.log(body);
	if (credentials === undefined) {
		throw new Error('No credentials found!');
	}

	if (method != "POST" && (typeof credentials.accessToken === 'undefined' || !credentials!.accessToken)){
		throw new Error('No access token found!');
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

	try {
		return await this.helpers.request!(options);
	} catch (error) {
		if(fullError){
			throw error;
		}

		if (error.error.code === 'ECONNREFUSED') {
			throw new Error('Host is not accessible at specified port!');
		}

		if (error.error.code === 'ENOTFOUND') {
			throw new Error('Host could not be found!');
		}

		if (error.error.code === 'EHOSTUNREACH') {
			throw new Error('Host could not be reached!');
		}
		
		if (error.statusCode === 401) {
			// Return a clear error
			throw new Error('The Twake credentials are not valid!');
		}

		const errorBody = error.response.body;
		throw new Error(`[${errorBody[0].error.type}]: ${errorBody[0].error.description} : ${errorBody[0].error.address} `);
	}
}