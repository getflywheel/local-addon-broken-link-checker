import * as LocalMain from "@getflywheel/local/main";
const { fork } = require('child_process');
import path from 'path';

export default function (context) {
	const { electron } = context;
	const { ipcMain } = electron;

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
		event.reply(replyChannel, await getTablePrefix(siteId));
	});

	ipcMain.on("fork-process", async (event, replyChannel, siteId) => {
		event.reply(replyChannel, await spawnChildProcess());
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

	// then((data) => {
	// 	LocalMain.getServiceContainer().cradle.localLogger.log(
	// 		"info",
	// 		"STARTDEBUG Hey here is some data from the db call: " + data
	// 	);
	// })
	

	LocalMain.getServiceContainer().cradle.localLogger.log(
		"info",
		`test in getTotalPosts(): ${numberOfPostsDbCall}`
	);

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

async function spawnChildProcess() {
	//return 'turtles'; -> will result in "receiving response of turtles" in BrokenLinkChecker.jsx
	const process = fork(path.join(__dirname, '/processes', 'checkLinks.jsx'), ['hello'], {
		stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
	});
	process.send('waffles');   // listen for messages from forked process

	try {
		return await process.on('message', (message) => {
			console.log(`They indeed received the ${message}`);
			return message;
		  });
	}
	catch (e) {
		return false;
	}
}