import shortid from 'shortid';
import pEvent from 'p-event';
import { ipcRenderer } from 'electron';

export default async function ipcAsync (channel: string, ...additionalArgs) {
	const ipcMessageID = shortid();
	const replyChannel = `${channel}-${ipcMessageID}-reply`;
	const eventResponse = pEvent(ipcRenderer, replyChannel, {
		rejectionEvents: [],
		multiArgs: true,
	});
	ipcRenderer.send(channel, replyChannel, ...additionalArgs);
	const [event, result] = await eventResponse;
	return result;
}
