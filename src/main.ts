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
		LocalMain.getServiceContainer().cradle.localLogger.log(
			"info",
			`FORKPROCESS Received request to fork the process`
		); // This gets logged
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
	const process = fork(path.join(__dirname, '../src/processes', 'checkLinks.jsx'), ['hello'], {
		stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
	});
	process.send('waffles');   // poke the bull so the bull can send something back

	try {
		return await process.on('message', (message) => {
			LocalMain.getServiceContainer().cradle.localLogger.log(
				"info",
				`FORKPROCESS They indeed received the ${message}`
			); // this now gets logged!
			return message;
		  });

	}
	catch (e) {
		LocalMain.getServiceContainer().cradle.localLogger.log(
			"info",
			`FORKPROCESS There was an error returned from the process: ${e}`
		); 
		return false;
	}
}