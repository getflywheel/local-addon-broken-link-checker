import * as LocalMain from "@getflywheel/local/main";
const { fork } = require('child_process');
import path from 'path';

let siteScanProcess;

const { localLogger, sendIPCEvent, siteDatabase, siteData } = LocalMain.getServiceContainer().cradle;
const { info: logInfo, warn: logWarn } = localLogger;

export default function (context) {
	const { electron } = context;
	const { ipcMain } = electron;
	let theSiteId = null;

	ipcMain.on("store-broken-links", (event, siteId, brokenLinks) => {
		LocalMain.SiteData.updateSite(siteId, {
			id: siteId,
			brokenLinks,
		});
	});

	ipcMain.on("get-total-posts", async (event, replyChannel, siteId, prefix) => {
		event.reply(replyChannel, await getTotalPosts(siteId, prefix));
	});

	ipcMain.on("get-table-prefix", async (event, replyChannel, siteId) => {
		theSiteId = siteId;
		event.reply(replyChannel, await getTablePrefix(siteId));
	});

	ipcMain.on("fork-process", async (event, replyChannel, command, siteURL) => {
		spawnChildProcess(command, siteURL)
	});
}

async function getTotalPosts(siteId, prefix) {
	const site = siteData.getSite(siteId);

	let numberOfPostsDbCall = await siteDatabase.exec(
		site,
		[
			"local",
			"--batch",
			"--skip-column-names",
			"-e",
			"SELECT COUNT(ID) FROM " + prefix + "posts WHERE post_status = 'publish'",
		]
	).catch((error) => {
		logInfo("STARTDEBUG encountered this error when calling DB: " + error);
	});

	return numberOfPostsDbCall;
}

async function getTablePrefix(siteId) {
	const site = LocalMain.SiteData.getSite(siteId);

	let wpPrefixCall = await LocalMain.getServiceContainer().cradle.siteDatabase.getTablePrefix(site).catch((error) => {
		logInfo("Encountered this error when getting table prefix: " + error);
	});

	return wpPrefixCall;
}

async function spawnChildProcess(command, siteURL) {

	if(command === "cancel-scan"){
		siteScanProcess.send([command,siteURL]);
	} else {

		/**
		 * Kill existing site scan process if it exists.
		 */
		if (siteScanProcess) {
			try {
				siteScanProcess.kill();
			} catch (e) {
				logWarn('Unable to kill existing site scan process.');
			}
		}

		siteScanProcess = fork(path.join(__dirname, './processes', 'checkLinks.js'));

		siteScanProcess.send([command,siteURL]);   // Pass the command along

		// When process sends a message, pass along to renderer
		siteScanProcess.on('message', (message) => {
			//logInfo(`FORKPROCESS The process sent over this message ${message}`);

			if(message[0] === 'scan-finished'){
				siteScanProcess.kill();
			} else if(message[0] === 'error-encountered'){
				logWarn(`Link Checker encountered this error in its subprocess: ${message[1]} | ${message[2]}`);
			}
			sendIPCEvent('blc-async-message-from-process', message);
		});
	}	
}
