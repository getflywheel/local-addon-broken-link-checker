import * as LocalMain from "@getflywheel/local/main";
import * as Local from "@getflywheel/local";

const { fork } = require("child_process");
import path from "path";

let siteScanProcess;
let killCommandIssued = false;
let theSiteId = null;

const { localLogger, sendIPCEvent, siteDatabase, siteData } =
	LocalMain.getServiceContainer().cradle;
const { info: logInfo, warn: logWarn } = localLogger;

interface ExtendedSite extends Local.Site {
	brokenLinks?: any;
	scanStatus?: any;
}

export default function (context) {
	const { electron } = context;

	electron.ipcMain.on("store-broken-links", (_event, siteId, brokenLinks) => {
		siteData.updateSite(siteId, {
			id: siteId,
			brokenLinks,
		} as Partial<ExtendedSite>);
	});

	electron.ipcMain.on(
		"store-link-checker-data",
		(_event, siteId, scanStatus) => {
			siteData.updateSite(siteId, {
				id: siteId,
				scanStatus,
			} as Partial<ExtendedSite>);
		}
	);

	electron.ipcMain.on(
		"get-total-posts",
		async (event, replyChannel, siteId, prefix) => {
			event.reply(replyChannel, await getTotalPosts(siteId, prefix));
		}
	);

	electron.ipcMain.on(
		"get-table-prefix",
		async (event, replyChannel, siteId) => {
			theSiteId = siteId;
			event.reply(replyChannel, await getTablePrefix(siteId));
		}
	);

	electron.ipcMain.on(
		"fork-process",
		async (_event, _replyChannel, command, siteURL) => {
			spawnChildProcess(command, siteURL);
		}
	);

	electron.ipcMain.on(
		"scanning-process-life-or-death",
		async (event, replyChannel) => {
			if (siteScanProcess && !killCommandIssued) {
				event.reply(replyChannel, true);
			} else {
				event.reply(replyChannel, false);
			}
		}
	);
}

async function addBrokenLink(brokenLinkInfo) {
	const site = siteData.getSite(theSiteId);
	const siteDataJson = site.toJSON() as ExtendedSite;
	const brokenLinks = siteDataJson.brokenLinks;
	brokenLinks.push({
		dateAdded: Date.now(),
		linkText: brokenLinkInfo[2],
		linkURL: brokenLinkInfo[1],
		originURI: brokenLinkInfo[4],
		originURL: brokenLinkInfo[3],
		statusCode: brokenLinkInfo[0],
		wpPostId: brokenLinkInfo[5],
	});

	siteData.updateSite(theSiteId, {
		id: theSiteId,
		brokenLinks,
	} as Partial<Local.SiteJSON>);
}

async function getTotalPosts(siteId, prefix) {
	const site = siteData.getSite(siteId);

	const numberOfPostsDbCall = await siteDatabase
		.exec(site, [
			"local",
			"--batch",
			"--skip-column-names",
			"-e",
			`SELECT COUNT(ID) FROM ${prefix}posts WHERE post_status = 'publish'`,
		])
		.catch((error) => {
			logInfo(
				"STARTDEBUG encountered this error when calling DB: " + error
			);
		});

	return numberOfPostsDbCall;
}

async function getTablePrefix(siteId) {
	const site = siteData.getSite(siteId);

	const wpPrefixCall = await LocalMain.getServiceContainer()
		.cradle.siteDatabase.getTablePrefix(site)
		.catch((error) => {
			logInfo(
				"Encountered this error when getting table prefix: " + error
			);
		});

	return wpPrefixCall;
}

async function spawnChildProcess(command, siteURL) {
	if (command === "cancel-scan") {
		killSubProcess();
		sendIPCEvent("blc-async-message-from-process", [
			"scan-cancelled-success",
			true,
		]);
	} else {
		/**
		 * Kill existing site scan process if it exists.
		 */
		if (siteScanProcess) {
			killSubProcess();
		}

		siteScanProcess = fork(
			path.join(__dirname, "./processes", "checkLinks.js")
		);
		killCommandIssued = false;

		siteScanProcess.send([command, siteURL]); // Pass the command along

		// When process sends a message, pass along to renderer
		siteScanProcess.on("message", (message) => {
			if (message[0] === "scan-cancelled-success") {
				killSubProcess();
			} else if (message[0] === "scan-finished") {
				killSubProcess();
			} else if (message[0] === "error-encountered") {
				logWarn(
					`Link Checker encountered this error in its subprocess: ${message[1]} | ${message[2]}`
				);
			} else if (message[0] === "add-broken-link") {
				// We need to get the existing array of broken links, add this one, then store it in persistent storage, then notify the renderer to re-fetch
				addBrokenLink(message[1]);
			}
			sendIPCEvent("blc-async-message-from-process", message);
		});
	}
}

async function killSubProcess() {
	try {
		siteScanProcess.kill();
	} catch (e) {
		logWarn("Unable to kill existing site scan process.");
	}
	killCommandIssued = true;
}
