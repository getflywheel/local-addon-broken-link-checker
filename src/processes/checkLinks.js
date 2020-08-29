const {
	SiteChecker,
	HtmlUrlChecker
} = require("broken-link-checker");
const { send } = require("process");
let userCancelled = false;
let notedDisplayedBrokenLinks = {}, notedLinksToBeCheckedAfterMainScan = {};

// receive message from master process
process.on('message', (m) => {

	if( (m[0] === "start-scan") && (m[1] !== 'undefined')) {
		// Empty the temp arrays of links
		notedDisplayedBrokenLinks = {};
		notedLinksToBeCheckedAfterMainScan = {};
		// Start the new scan
		checkLinks(m[1]).then((data) => process.send(["scan-finished", data]));
	} else if ( (m[0] === "cancel-scan") && (m[1] !== 'undefined')) {
		userCancelled = true;
	}

});

let checkLinks = function(siteURL) {
	return new Promise(function(resolve, reject) {

		let siteCheckerSiteId = null;

		// TODO: Handle self-signed certificates more securely, like https://stackoverflow.com/questions/20433287/node-js-request-cert-has-expired#answer-29397100
		process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

		let options = new Object();
		options.maxSocketsPerHost = 10;
		options.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36";

		let siteChecker = new SiteChecker(options, {
			html: (tree, robots, response, pageUrl, customData) => {
				// This code is used to increment the number of WP posts we traverse in our scan
				if (findWpPostIdInMarkup(tree)) {
					incrementNumberPostsFound();
					updateCurrentCheckingUri(pageUrl);
				}
			},
			link: (result, customData) => {
				try {
					if (result.broken && (result.http.response.statusCode != 999)) {

						let statusCode = '';
						let statusCodeCheck = result.http.response && result.http.response.statusCode;

						if(result.brokenReason === "HTTP_undefined"){
							statusCode = "Timeout";
						} else if(containsPhpError(String(result.html.text))){
							statusCode = "Error";
						} else if(!statusCodeCheck && result.http.response && result.http.response.code) {
							// Fallback to error code from response for things like bad domains.
							statusCode = result.http.response.code;
						} else {
							//statusCode = String(result.http.response.statusCode);
							statusCode = statusCodeCheck;
						}

						// Old status code handling (remove after testing)
						//let statusCode = '';
						// if(result.brokenReason === "HTTP_undefined"){
						// 	statusCode = "Timeout";
						// } else if(containsPhpError(String(result.html.text))){
						// 	statusCode = "Error";
						// } else {
						// 	statusCode = String(result.http.response.statusCode);
						// }

						let linkText = '';
						if(result.html.text){
							if(containsPhpError(String(result.html.text))){
								linkText = containsPhpError(String(result.html.text));
							} else {
								linkText = String(result.html.text);
							}
						}

						let brokenLinkScanResults = {
							statusCode: String(statusCode),
							linkURL: String(result.url.original),
							linkText: String(linkText),
							originURL: String(result.base.original),
							originURI: String(result.base.parsed.path),
							resultDump: result
						};

						let singlePageCheckerOptions = new Object();
						singlePageCheckerOptions.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36";				

						let singlePageChecker = new HtmlUrlChecker(singlePageCheckerOptions, {
							html: (tree, robots, response, pageUrl, customData) => {

								let wpPostId = findWpPostIdInMarkup(tree);

								if (wpPostId !== null) {
									// This page has a post ID and contains a broken link - we should log this link right away

									addBrokenLink(
										customData["statusCode"],
										customData["linkURL"],
										customData["linkText"],
										customData["originURL"],
										customData["originURI"],
										wpPostId
									);

									// Add to a key-value array of logged links and include the details of the link
									noteDisplayedBrokenLink(
										(customData["statusCode"] + customData["linkURL"] + customData["linkText"]).hashCode(),
										customData["statusCode"],
										customData["linkURL"],
										customData["linkText"],
										customData["originURL"],
										customData["originURI"],
										wpPostId
									);

									updateBrokenLinksFound(true);
								} else {
									// This page does not have a post ID, however if it hasn't been logged yet at the end of the scan, we will display it

									// Add this to an array that will be checked after the scan
									noteLinkToBeCheckedAfterMainScan(
										(customData["statusCode"] + customData["linkURL"] + customData["linkText"]).hashCode(),
										customData["statusCode"],
										customData["linkURL"],
										customData["linkText"],
										customData["originURL"],
										customData["originURI"],
										wpPostId
									);

									// TODO: Determine if this link has been logged already by checking the logged array
									//          if it hasn't then display, if it has then skip
								}
							}
						});

						singlePageChecker.enqueue(
							brokenLinkScanResults["originURL"],
							brokenLinkScanResults
						);
					}
				} catch(e){
					// The "broken" link was missing critical fields (such as a status code), so we skip
					reportError('caught-error-while-checking-broken-or-999-status-code', e);
					sendDebugData('caught-error-while-checking-broken-or-999-status-code');
					sendDebugData(e);
				}
			},
			site: (error, siteUrl, customData) => {
				reportError('site-scan-threw-site-error', JSON.stringify(error));
				sendDebugData(`This URL was involved in the error: ${siteUrl}`);
				sendDebugData('Oh and this was the error');
				sendDebugData(error);
			},
			end: (result, customData) => {
				// Check to see if there were any non-post-id results that need to be rendered
				determineMissedLinksAndDisplayThem().then(() => {
					// At last the first run is done, so we update the state
					updateFirstRunComplete(true);
					updateScanInProgress(false);
					callScanFinished(true);

					resolve('finished');
				});
			},
		});
		siteCheckerSiteId = siteChecker.enqueue(siteURL);

	});
}



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

function noteDisplayedBrokenLink(hashKey,statusCode,linkURL,linkText,originURL,originURI,wpPostId){
	notedDisplayedBrokenLinks[hashKey] = {
		statusCode: statusCode,
		linkURL: linkURL,
		linkText: linkText,
		originURL: originURL,
		originURI: originURI,
		wpPostId: wpPostId
	};

	// sendDebugData('Links that were displayed:');
	// sendDebugData(notedDisplayedBrokenLinks);
}

function noteLinkToBeCheckedAfterMainScan(hashKey,statusCode,linkURL,linkText,originURL,originURI,wpPostId){
	notedLinksToBeCheckedAfterMainScan[hashKey] = {
		statusCode: statusCode,
		linkURL: linkURL,
		linkText: linkText,
		originURL: originURL,
		originURI: originURI,
		wpPostId: wpPostId
	};
	// sendDebugData('Links saved for after the scan:');
	// sendDebugData(notedLinksToBeCheckedAfterMainScan);
}

let determineMissedLinksAndDisplayThem = function() {
	return new Promise(function(resolve, reject) {
		for (const [key, value] of Object.entries(notedLinksToBeCheckedAfterMainScan)) {
			// The key is the hash value of statusCode + LinkUrl + LinkText. The Value is an object with details about that link

			if (!(key in notedDisplayedBrokenLinks)){
				// This broken link was not logged before, so we will log it now
				addBrokenLink(
					value["statusCode"],
					value["linkURL"],
					value["linkText"],
					value["originURL"],
					value["originURI"],
					value["wpPostId"]
				);
			}
		}
		resolve();
	});
}

function containsPhpError(string){
	let subString = '';
	if(string.indexOf(':') && string.indexOf('fatal error')){
		subString = string.substring(0, string.indexOf(':'));
	} else {
		return false;
	}

	return (subString === '') ? false : subString;
}

// Functions used to track data during the check links process
function incrementNumberPostsFound(){
	// Needs to call incrementNumberPostsFound() back in the renderer
	process.send(["increment-number-posts-found", 'yes']);
}

function updateCurrentCheckingUri(pageUrl){
	// Needs to call updateCurrentCheckingUri() back in the renderer
	process.send(["update-current-checking-uri", pageUrl]);
}

function addBrokenLink(statusCode, linkURL, linkText, originURL, originURI, wpPostId){
	// Needs to make addBrokenLink() and incrementNumberBrokenLinksFound() be called back in renderer
	process.send( ["add-broken-link", [statusCode, linkURL, linkText, originURL, originURI, wpPostId] ] );
}

function updateBrokenLinksFound(boolean){
	// Needs to call updateBrokenLinksFound() back in the renderer
	process.send(["update-broken-links-found-boolean", boolean]);
}

function updateFirstRunComplete(boolean){
	// Needs to call updateFirstRunComplete() back in renderer
	process.send(["update-first-run-complete-boolean", boolean]);
}

function updateScanInProgress(boolean){
	// Needs to call updateScanInProgress() back in renderer
	process.send(["update-scan-in-progress-boolean", boolean]);
}

function callScanFinished(boolean){
	process.send(["scan-finished", boolean]);
}

function reportError(name, errorInfo){
	process.send(["error-encountered", name, errorInfo]);
}

function sendDebugData(data){
	process.send(["debug-data", data]);
}

// Start thank you to https://stackoverflow.com/a/7616484
Object.defineProperty(String.prototype, 'hashCode', {
	value: function() {
	  var hash = 0, i, chr;
	  for (i = 0; i < this.length; i++) {
		chr   = this.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	  }
	  return hash;
	}
  });
// End thank you to https://stackoverflow.com/a/7616484
