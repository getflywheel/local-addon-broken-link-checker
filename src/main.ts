import * as LocalMain from "@getflywheel/local/main";
const { fork } = require('child_process');
import path from 'path';

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
		LocalMain.getServiceContainer().cradle.localLogger.log(
			"info",
			`FORKPROCESS Received request to fork the process`
		); // This gets logged
		spawnChildProcess(command, siteURL)
	});
}

async function getTotalPosts(siteId, prefix) {
	const site = LocalMain.SiteData.getSite(siteId);

	let numberOfPostsDbCall = await LocalMain.getServiceContainer().cradle.siteDatabase.exec(
		site,
		[
			"local",
			"--batch",
			"--skip-column-names",
			"-e",
			"SELECT COUNT(ID) FROM " + prefix + "posts WHERE post_status = 'publish'",
		]
	).catch((error) => {
		LocalMain.getServiceContainer().cradle.localLogger.log(
			"info",
			"STARTDEBUG encountered this error when calling DB: " + error
		);
	});

	return numberOfPostsDbCall;
}

async function getTablePrefix(siteId) {
	const site = LocalMain.SiteData.getSite(siteId);

	let wpPrefixCall = await LocalMain.getServiceContainer().cradle.siteDatabase.getTablePrefix(site).catch((error) => {
		LocalMain.getServiceContainer().cradle.localLogger.log(
			"info",
			"Encountered this error when getting table prefix: " + error
		);
	});

	return wpPrefixCall;
}

async function spawnChildProcess(command, siteURL) {

	let siteScanProcess = fork(path.join(__dirname, '../src/processes', 'checkLinks.jsx'), null, {
		stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
	});

	siteScanProcess.send([command,siteURL]);   // Pass the command along

	// When process sends a message, pass along to renderer
	siteScanProcess.on('message', (message) => {
		LocalMain.getServiceContainer().cradle.localLogger.log(
		   "info",
		   `FORKPROCESS The process sent over this message ${message}`
		); 
		if(message[0] === 'scan-finished'){

			//siteScanProcess.kill('SIGKILL');
			// siteScanProcess.stdin.write('stop\n');
			// siteScanProcess.kill('SIGKILL');
			// siteScanProcess = null;
			
			// // Send SIGHUP to siteScanProcess.
			siteScanProcess.stdin.write('stop\n');
			siteScanProcess.kill('SIGKILL');
			siteScanProcess = null;
		}
		LocalMain.getServiceContainer().cradle.sendIPCEvent('blc-async-message-from-process', message);
	 });

	// Re-fork when the fork is killed 
	siteScanProcess.on('close', (code, signal) => {
		siteScanProcess = fork(path.join(__dirname, '../src/processes', 'checkLinks.jsx'), null, {
			stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
		});
	});
}