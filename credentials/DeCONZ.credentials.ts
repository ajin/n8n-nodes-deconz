import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class DeCONZ implements ICredentialType {
	name = 'deCONZ';
	displayName = 'deCONZ';
	properties = [
		// The credentials to get from user and save encrypted.
		// Properties can be defined exactly in the same way
		// as node properties.
		{
			displayName: 'Host',
			name: 'host',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number' as NodePropertyTypes,
			default: 80,
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Websocket Port',
			name: 'wsPort',
			type: 'number' as NodePropertyTypes,
			default: '8088',
		},
	];
}
