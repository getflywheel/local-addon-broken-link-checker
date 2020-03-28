import React, { Component, Fragment } from "react";
import { ipcRenderer, remote } from "electron";
import path from 'path';
import os from 'os'; // This will help determine Mac vs Windows
import mysqlx from '@mysql/xdevapi';
const {
	SiteChecker,
	HtmlUrlChecker,
	UrlChecker
} = require("broken-link-checker");
import { TableListRepeater } from "@getflywheel/local-components";

export default class BrokenLinkChecker extends Component {
	constructor(props) {
		super(props);

		this.state = {
			brokenLinks: this.fetchBrokenLinks(),
			resultsOnScreen: this.ifBrokenLinksFetched(),
			firstRunComplete: false,
			brokenLinksFound: false,
			siteStatus: null,
			siteRootUrl: null,
			siteId: null,
			socketPath: null,
			scanInProgress: false,
			numberPostsFound: 0
		};

		this.checkLinks = this.checkLinks.bind(this);
		this.updateSiteState = this.updateSiteState.bind(this);
	}

	componentDidMount() {
		let routeChildrenProps = this.props.routeChildrenProps;
		let siteStatus = routeChildrenProps.siteStatus;
		let site = routeChildrenProps.site;
		let siteDomain = site.domain;
		let localVersionNumber = site.localVersion;
		let localVersionName = 'Local';

		if(localVersionNumber.includes('beta')){
			localVersionName = 'Local Beta';
		}

		let siteId = routeChildrenProps.site.id;

		let appDataPath = remote.app.getPath('appData');
		let socketPath = appDataPath + '/' + localVersionName + '/run/' + siteId + '/mysql/mysqld.sock';

		// TODO: Add checking to see if site is running with HTTP or HTTPS. Right now HTTP is assumed
		//let possibleSecureHttpStatus = site.services.nginx.ports.HTTP;
		//let otherPossibleSecureHttpStatus = site.services.nginx.role;

		//let siteUrl = "http://" + siteDomain;

		this.testSiteRootUrlVariantsAndUpdate(siteDomain);
		this.updateSiteId(siteId);
		this.updateSiteState(siteStatus);
		this.updateSiteDbSocket(socketPath);
	}

	componentDidUpdate() {
		let routeChildrenProps = this.props.routeChildrenProps;
		let siteStatus = routeChildrenProps.siteStatus;
		let site = routeChildrenProps.site;
		let siteDomain = site.domain;

		if (siteStatus !== this.state.siteStatus) {
			// The site status has changed, meaning it was started or halted by the user
			this.testSiteRootUrlVariantsAndUpdate(siteDomain);
			this.updateSiteState(siteStatus);

			if(siteStatus === "running"){
				// The site has just been turned on
				let dbName = routeChildrenProps.site.mysql.database;
				let username = routeChildrenProps.site.mysql.user;
				let pass = routeChildrenProps.site.mysql.password;
				let port = routeChildrenProps.site.services.mysql.ports.MYSQL[0];

				this.updateTotalSitePosts(dbName, username, pass, port);
			}
		}
	}

	addBrokenLink(statusCode, linkURL, linkText, originURL, wpPostId) {
		let newBrokenLink = {
			statusCode: statusCode,
			linkURL: linkURL,
			linkText: linkText,
			originURL: originURL,
			wpPostId: wpPostId
		};

		this.updateResultsOnScreen(true);

		this.setState(
			prevState => ({
				brokenLinks: [...prevState.brokenLinks, newBrokenLink]
			}),
			this.syncBrokenLinks
		);
	}

	clearBrokenLinks() {
		this.setState({ brokenLinks: [] }, this.syncBrokenLinks);
	}

	syncBrokenLinks() {
		ipcRenderer.send(
			"store-broken-links",
			this.state.siteId,
			this.state.brokenLinks
		);
	}

	fetchBrokenLinks() {
		const brokenLinks = this.props.routeChildrenProps.site.brokenLinks;

		if (!brokenLinks) {
			return [];
		}

		return brokenLinks;
	}

	ifBrokenLinksFetched() {
		const brokenLinks = this.props.routeChildrenProps.site.brokenLinks;

		if (!brokenLinks || brokenLinks.length < 1) {
			return false;
		}

		return true;
	}

	isWindows(){
		/* Possibilities:
			win32: WINDOWS,
			darwin: MAC,
			linux: LINUX
		*/

		let platform = os.platform;

		return String(platform) === 'win32';
	}

	testSiteRootUrlVariantsAndUpdate(siteDomain) {
		let workingUrlFound = false;

		// TODO: Handle self-signed certificates more securely, like https://stackoverflow.com/questions/20433287/node-js-request-cert-has-expired#answer-29397100
		process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

		let options = new Object();
		options.cacheResponses = false;
		options.rateLimit = 500; // Give the local website time to start, so we avoid the 500 errors

		let isUrlBrokenChecker = new UrlChecker(options, {
			link: (result, customData) => {
				// If we get a 200 success on the URL, we use it and stop checking variants of the root URL
				if (!result.broken) {
					let workingUrl = result.url.original;

					this.setState(prevState => ({
						siteRootUrl: workingUrl
					}));

					// In case the first root URL variant is the winner, dequeue the later options
					isUrlBrokenChecker.dequeue(1);
					isUrlBrokenChecker.dequeue(2);

					workingUrlFound = true;
				}
			},
			end: () => {
				// If a proper working root URL is not found, make sure it's null so we can render a warning notice
				if (!workingUrlFound) {
					this.setState(prevState => ({
						siteRootUrl: null
					}));
				}
			}
		});
		isUrlBrokenChecker.enqueue("http://" + siteDomain + "/");
		isUrlBrokenChecker.enqueue("https://" + siteDomain + "/");
	}

	updateTotalSitePosts(dbName, username, pass, port) {
		console.log('Site is started. I have this info:');
		console.log(dbName);
		console.log(username);
		console.log(pass);
		console.log(port);
		console.log(this.state.socketPath);

		let stringSocketPath = String(this.state.socketPath);
		let noSpacesSocketPath = stringSocketPath.split(' ').join('%2F');

		if(this.isWindows()){
			console.log('This is windows');
		} else {
			// This is where the connection will take place
			// This is the query: "SELECT COUNT(ID) FROM wp_posts WHERE post_type IN ( 'post', 'etc' ) and post_status = 'publish'"
		
			let sessionConnectionString = 'mysqlx://' + username + ':' + pass + '@' + noSpacesSocketPath;

			mysqlx
			.getSession(sessionConnectionString)
			.then(session => {
				console.log(session.inspect());
				// { user: 'root', socket: '/path/to/socket' }
			});
		}
	}

	updateSiteState(newStatus) {
		this.setState(prevState => ({
			siteStatus: newStatus
		}));
	}

	updateSiteId(siteId) {
		this.setState(prevState => ({
			siteId: siteId
		}));
	}

	updateSiteDbSocket(socketPath) {
		this.setState(prevState => ({
			socketPath: socketPath
		}));
	}

	updateResultsOnScreen(boolean) {
		this.setState(prevState => ({
			resultsOnScreen: boolean
		}));
	}

	updateBrokenLinksFound(boolean) {
		this.setState(prevState => ({
			brokenLinksFound: boolean
		}));
	}

	updateFirstRunComplete(boolean) {
		this.setState(prevState => ({
			firstRunComplete: boolean
		}));
	}

	updateScanInProgress(boolean) {
		this.setState(prevState => ({
			scanInProgress: boolean
		}));
	}

	incrementNumberPostsFound() {
		this.setState(prevState => ({
			numberPostsFound: prevState.numberPostsFound + 1
		}));
	}

	clearNumberPostsFound() {
		this.setState(prevState => ({
			numberPostsFound: 0
		}));
	}

	startScan = () => {
		let routeChildrenProps = this.props.routeChildrenProps;
		let siteStatus = routeChildrenProps.siteStatus;

		if (
			(this.state.resultsOnScreen || !this.state.brokenLinksFound) &&
			String(this.state.siteStatus) !== "halted" &&
			this.state.siteStatus != null
		) {
			// Clear the existing broken links on screen if some have been rendered already
			this.clearBrokenLinks();
			this.clearNumberPostsFound();
			this.checkLinks(this.state.siteRootUrl);
			this.updateScanInProgress(true);
		} else if (
			String(this.state.siteStatus) !== "halted" &&
			this.state.siteStatus != null
		) {
			this.checkLinks(this.state.siteRootUrl);
			this.updateScanInProgress(true);
		} else {
			this.updateSiteState(siteStatus);
		}
	};

	checkLinks(siteURL) {
		let siteChecker = new SiteChecker(null, {
			html: (tree, robots, response, pageUrl, customData) => {
				// This code is used to increment the number of WP posts we traverse in our scan
				if( this.findWpPostIdInMarkup(tree) ){
					this.incrementNumberPostsFound();
				}
			},
			link: (result, customData) => {
				if (result.broken) {
					let brokenLinkScanResults = {
						statusCode: String(result.http.response.statusCode),
						linkURL: String(result.url.original),
						linkText: String(result.html.text),
						originURL: String(result.base.original)
					};

					let singlePageChecker = new HtmlUrlChecker(null, {
						html: (tree, robots, response, pageUrl, customData) => {
							// TODO: Make this code continue to drill down until an exact match for the 'body' tag is found, just in case a custom template has modified the usual page structure
							let stringOfBodyClasses =
								tree.childNodes[1].childNodes[2].attrMap.class;

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

							this.addBrokenLink(
								customData["statusCode"],
								customData["linkURL"],
								customData["linkText"],
								customData["originURL"],
								wpPostId
							);
						}
					});
					singlePageChecker.enqueue(
						brokenLinkScanResults["originURL"],
						brokenLinkScanResults
					);

					this.updateBrokenLinksFound(true);
				}
			},
			end: (result, customData) => {
				// At last the first run is done, so we update the state
				this.updateFirstRunComplete(true);
				this.updateScanInProgress(false);

				if(this.state.brokenLinks === null || this.state.brokenLinks.length === 0){
					this.updateBrokenLinksFound(false);
				}
			}
		});
		siteChecker.enqueue(siteURL);
	}

	findWpPostIdInMarkup(tree) {
		// TODO: Make this code continue to drill down until an exact match for the 'body' tag is found, just in case a custom template has modified the usual page structure
		let stringOfBodyClasses = tree.childNodes[1].childNodes[2].attrMap.class;

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

	render() {
		let message = "";
		if (this.state.siteStatus === "halted") {
			message = "Please start the site before running a link scan.";
		} else if (
			this.state.firstRunComplete &&
			!this.state.brokenLinksFound
		) {
			message = "No broken links found.";
		}

		if (
			this.state.siteStatus !== "halted" &&
			this.state.siteRootUrl == null
		) {
			message += " There was a problem checking the website's homepage.";
		}

		let startButtonText = "Start Scan";
		if (this.state.resultsOnScreen) {
			startButtonText = "Re-Run Scan";
		}

		let scanProgressMessage = this.state.scanInProgress
			? "Scan is in progress."
			: "Scan is not running.";

		return (
			<div
				style={{ flex: "1", overflowY: "auto" }}
				className="brokenLinkCheckWrap"
			>
				<p>{message}</p>

				<p>{scanProgressMessage}</p>

				<TableListRepeater
					header={
						<>
							<strong
								className="TableListRowHeader__SeparatorRight"
								style={{ width: "10%" }}
							>
								Status
							</strong>
							<strong style={{ width: "35%" }}>Origin URL</strong>
							<strong style={{ width: "30%" }}>Link URL</strong>
							<strong style={{ width: "15%" }}>Link Text</strong>
							<strong style={{ width: "10%" }}>Post ID</strong>
						</>
					}
					repeatingContent={(item, index, updateItem) => (
						<>
							<div className="TableListRowHeader__SeparatorRight">
								{item.statusCode}
							</div>

							<div>
								<a href={item.originURL}>{item.originURL}</a>
							</div>

							<div>
								<a href={item.linkURL}>{item.linkURL}</a>
							</div>

							<div>
								<p>{item.linkText}</p>
							</div>

							<div>
								{item.wpPostId}{" "}
								{item.wpPostId != null ? "(" : ""}
								<a
									href={
										this.state.siteRootUrl +
										"/wp-admin/post.php?post=" +
										item.wpPostId +
										"&action=edit"
									}
								>
									{item.wpPostId != null ? "Edit" : ""}
								</a>
								{item.wpPostId != null ? ")" : ""}
							</div>
						</>
					)}
					onSubmit={() => console.log("onSubmit")}
					submitLabel={startButtonText}
					itemTemplate={{}}
					data={this.state.brokenLinks}
				/>
				<a
					href="javascript:void(0);"
					onClick={this.startScan}
					style={{ marginTop: 15, marginLeft: 2, display: "block" }}
				>
					{startButtonText}
				</a>
			</div>
		);
	}
}
