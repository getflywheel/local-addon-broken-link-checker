const {
	SiteChecker,
	HtmlUrlChecker
} = require("broken-link-checker");


// receive message from master process
process.on('message', (m) => {

	if( (m[0] === "start-scan") && (m[1] !== 'undefined')) {
		checkLinks(m[1]).then((data) => process.send(["scan-finished", data]));
	}

});

let checkLinks = function(siteURL) {
	return new Promise(function(resolve, reject) {
		//resolve("Stuff worked!");
		//reject(Error("It broke"));

		let options = new Object();
		options.maxSocketsPerHost = 15;

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

						// TODO: Work this in
						// let statusCode = result.http.response && result.http.response.statusCode;

						// /**
						//  * Fallback to error code from response for things like bad domains.
						//  */
						// if (!statusCode && result.http.response && result.http.response.code) {
						// 	statusCode = result.http.response.code;
						// }

						let statusCode = '';
						if(result.brokenReason === "HTTP_undefined"){
							statusCode = "Timeout";
						} else if(containsPhpError(String(result.html.text))){
							statusCode = "Error";
						} else {
							statusCode = String(result.http.response.statusCode);
						}

						let linkText = '';
						if(result.html.text){
							if(containsPhpError(String(result.html.text))){
								linkText = containsPhpError(String(result.html.text));
							} else {
								linkText = String(result.html.text);
							}
						}

						//console.log('Info about this ' + statusCode + ' broken link we already have (text: "' + linkText + '"):');
						//console.log(result);

						let brokenLinkScanResults = {
							statusCode: String(statusCode),
							linkURL: String(result.url.original),
							linkText: String(linkText),
							originURL: String(result.base.original),
							originURI: String(result.base.parsed.path),
							resultDump: result
						};

						let singlePageChecker = new HtmlUrlChecker(null, {
							html: (tree, robots, response, pageUrl, customData) => {

								let wpPostId = findWpPostIdInMarkup(tree);

								if (wpPostId !== null) {
									addBrokenLink(
										customData["statusCode"],
										customData["linkURL"],
										customData["linkText"],
										customData["originURL"],
										customData["originURI"],
										wpPostId
									);

									updateBrokenLinksFound(true);
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
				}
			},
			end: (result, customData) => {
				// At last the first run is done, so we update the state
				updateFirstRunComplete(true);
				updateScanInProgress(false);
				callScanFinished(true);
				
				resolve('finished');
			},
		});
		siteChecker.enqueue(siteURL);

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
	process.send( ["add-broken-link", [statusCode, linkURL, linkText, originURL, originURI, wpPostId], getRandomInt(10, 200)] );
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

// Thank you to https://stackoverflow.com/a/1527820/8143105
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
