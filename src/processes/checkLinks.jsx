const {
	SiteChecker,
	HtmlUrlChecker
} = require("broken-link-checker");

// TODO: Declare counter and pseudo-state variables
// TODO: call and listen for following events: scan started, broken link found, progress bar increment, scan finished

// receive message from master process
process.on('message', (m) => {
	
	if( (m[0] === "start-scan") && (m[1] !== 'undefined')) {
		checkLinks(m[1]).then((data) => process.send(["scan-finished", data]));
	}
	
	// This commented-out code seems to prevent a reponse from being sent
	// if( (m[0] === "start-scan") && (m[1] !== 'undefined')) {
	// 	scanFinishedData = await new Promise((resolve) => {
	// 		resolve(checkLinks(m[1]));
	// 	}).then((scanFinishedData) => {process.send(["scan-finished", scanFinishedData])});
		
	// }
	// //process.send(m);

	// else if(m[0] === "cancel-scan" && m[1] !== 'undefined'){
	// 	// TODO: Cancel the scan
	// }
	// else {
	// 	process.send(["error"]);
	// }
  });

let checkLinks = function(siteURL) {
	return new Promise(function(resolve, reject) {

		if(true){
			addBrokenLink("1" ,"1", "1", "1", "1");
			resolve("Stuff worked!");
		} else {
			reject(Error("It broke"));
		}
		
	});
} 

// 	//addBrokenLink("1" ,"1", "1", "1", "1");
// 	return "cheese";

//   	let options = new Object();
// 	options.maxSocketsPerHost = 15;

// 	let siteChecker = new SiteChecker(options, {
// 		html: (tree, robots, response, pageUrl, customData) => {
// 			// This code is used to increment the number of WP posts we traverse in our scan
// 			if (findWpPostIdInMarkup(tree)) {
// 				incrementNumberPostsFound();
// 			}
// 		},
// 		link: (result, customData) => {
// 			if (result.broken) {
// 				let brokenLinkScanResults = {
// 					statusCode: String(result.http.response.statusCode),
// 					linkURL: String(result.url.original),
// 					linkText: String(result.html.text),
// 					originURL: String(result.base.original),
// 					originURI: String(result.base.parsed.path),
// 					resultDump: result
// 				};

// 				let singlePageChecker = new HtmlUrlChecker(null, {
// 					html: (tree, robots, response, pageUrl, customData) => {

// 						let wpPostId = findWpPostIdInMarkup(tree);

// 						if (wpPostId !== null) {
// 							addBrokenLink(
// 								customData["statusCode"],
// 								customData["linkURL"],
// 								customData["linkText"],
// 								customData["originURL"],
// 								customData["originURI"],
// 								wpPostId
// 							);

// 							updateBrokenLinksFound(true);
// 						}
// 					}
// 				});

// 				singlePageChecker.enqueue(
// 					brokenLinkScanResults["originURL"],
// 					brokenLinkScanResults
// 				);
// 			}
// 		},
// 		end: (result, customData) => {
// 			// At last the first run is done, so we update the state
// 			updateFirstRunComplete(true);
// 			updateScanInProgress(false);

// 			if (
// 				this.state.brokenLinks === null ||
// 				this.state.brokenLinks.length === 0
// 			) {
// 				updateBrokenLinksFound(false);
// 			}
// 		},
// 	});
// 	siteChecker.enqueue(siteURL);

//     return "hello";
// }


function findWpPostIdInMarkup(tree) {
	let stringOfBodyClasses = '';

	tree.childNodes.forEach(function(item,key){
		if(item.nodeName === "html"){
			item.childNodes.forEach(function(item,key){
				if(item.nodeName === "body"){
					stringOfBodyClasses = item.attrMap.class;
				}
			})
		}
	});

	// TODO: Also make note of special classes like .home
	let findPostId = stringOfBodyClasses.match(
		/(^|\s)postid-(\d+)(\s|$)/
	);

	let findPageId = stringOfBodyClasses.match(
		/(^|\s)page-id-(\d+)(\s|$)/
	);

	let wpPostId = null;
	if (findPostId) {
		wpPostId = findPostId[2];
	} else if (findPageId) {
		wpPostId = findPageId[2];
	}

	return wpPostId;
}

// Functions used to track data during the check links process
function incrementNumberPostsFound(){
	// TODO: populate
} 

function addBrokenLink(statusCode, linkURL, linkText, originURL, originURI){
	// TODO: populate
	// Needs to make addBrokenLink() and incrementNumberBrokenLinksFound() be called back in renderer
	process.send(["add-broken-link", [statusCode, linkURL, linkText, originURL, originURI]]);
}

function updateBrokenLinksFound(){
	// TODO: populate
}

function updateFirstRunComplete(){
	// TODO: populate
}

function updateScanInProgress(){
	// TODO: populate
}

