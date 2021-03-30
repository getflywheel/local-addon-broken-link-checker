import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import ipcAsync from './ipcAsync';

const { UrlChecker } = require('broken-link-checker');
const constants = require('./constants');

import {
	ProgressBar,
	Title,
	Tooltip,
	Text,
	VirtualTable,
	Button,
} from '@getflywheel/local-components';
import { resolve } from 'dns';

export default class BrokenLinkChecker extends Component {
	constructor (props) {
		super(props);

		this.state = {
			brokenLinks: this.fetchBrokenLinks(),
			resultsOnScreen: this.ifBrokenLinksFetched(),
			firstRunComplete: false,
			brokenLinksFound: false,
			siteStatus: null,
			siteRootUrl: null,
			siteId: null,
			tablePrefix: null,
			scanInProgress: false,
			numberPostsFound: 0,
			numberBrokenLinksFound: 0,
			totalSitePosts: null,
			getTotalSitePostsInProgress: false,
			currentCheckingUri: '',
			localVersionName: 'Local',
		};

		this.checkLinks = this.checkLinks.bind(this);
		this.updateSiteState = this.updateSiteState.bind(this);
	}

	componentDidMount () {
		const routeChildrenProps = this.props.routeChildrenProps;
		const siteStatus = routeChildrenProps.siteStatus;
		const site = routeChildrenProps.site;
		const localVersionNumber = site.localVersion;

		if (localVersionNumber.includes('beta')) {
			this.updateLocalVersionName('Local Beta');
		}

		const siteId = routeChildrenProps.site.id;

		// TODO: Add checking to see if site is running with HTTP or HTTPS. Right now HTTP is assumed
		//let possibleSecureHttpStatus = site.services.nginx.ports.HTTP;
		//let otherPossibleSecureHttpStatus = site.services.nginx.role;

		//let siteUrl = "http://" + siteDomain;

		this.updateSiteId(siteId);
		this.updateSiteState(siteStatus);
		this.addListeners();

		this.isScanningProcessAlive()
			.then(() => {
				this.reloadScanInProgress();
			})
			.catch((err) => {});
	}

	addListeners () {
		ipcRenderer.on('blc-async-message-from-process', (event, response) => {
			//console.log({ event, response});

			if (response[0]) {
				switch (response[0]) {
					case 'increment-number-posts-found':
						// Needs to call incrementNumberPostsFound() back in the renderer
						this.incrementNumberPostsFound();
						this.syncGeneralLinkCheckerData();
						break;
					case 'add-broken-link':
						// Needs to make addBrokenLink() and incrementNumberBrokenLinksFound() be called back in renderer
						this.addBrokenLink(response[1][0], response[1][1], response[1][2], response[1][3], response[1][4], response[1][5]);
						this.incrementNumberBrokenLinksFound();
						break;
					case 'update-broken-links-found-boolean':
						// Needs to call updateBrokenLinksFound() back in the renderer
						this.updateBrokenLinksFound(Boolean(response[1]));
						break;
					case 'update-first-run-complete-boolean':
						// Needs to call updateFirstRunComplete() back in renderer
						this.updateFirstRunComplete(Boolean(response[1]));
						break;
					case 'update-scan-in-progress-boolean':
						// Needs to call updateScanInProgress() back in renderer
						this.updateScanInProgress(Boolean(response[1]));
						break;
					case 'update-current-checking-uri':
						this.updateCurrentCheckingUri(response[1]);
						break;
					case 'scan-cancelled-success':
						this.updateScanInProgress(false);
						this.updateCurrentCheckingUri('');
						break;
					case 'scan-finished':
						if (
							this.state.brokenLinks === null ||
							this.state.brokenLinks.length === 0
						) {
							this.updateBrokenLinksFound(false);
						}
						break;
					case 'debug-data':
						if (this.state.localVersionName === 'Local Beta') {
							// console.log("Debug data: ");
							// console.log(response[1]);
						}
					default:
					//
				}
			}

		});
	}

	componentWillUnmount () {
		ipcRenderer.removeAllListeners('blc-async-message-from-process');
	}

	componentDidUpdate () {
		const routeChildrenProps = this.props.routeChildrenProps;
		const siteStatus = routeChildrenProps.siteStatus;

		if (siteStatus !== this.state.siteStatus) {
			this.updateSiteState(siteStatus);
		}
	}

	legacyPluginDataDetected () {
		// If the broken links array exists in siteData
		if (this.state.hasOwnProperty('brokenLinks')) {
			// If there is any data in the array
			if (this.state.brokenLinks.length) {
				// Return true if the originURI field is not found in the first element
				// Can add more checks to this if statement for future array changes
				if (!this.state.brokenLinks[0].hasOwnProperty('originURI') || !this.state.brokenLinks[0].hasOwnProperty('dateAdded')) {
					return true;
				}
			}
		}

		return false;
	}

	addBrokenLink (statusCode, linkURL, linkText, originURL, originURI, wpPostId) {

		// Broken links are now intercepted in main.ts and added to persistent storage there
		// let newBrokenLink = {
		// 	dateAdded: Date.now(),
		// 	statusCode: statusCode,
		// 	linkURL: linkURL,
		// 	linkText: linkText,
		// 	originURL: originURL,
		// 	originURI: originURI,
		// 	wpPostId: wpPostId
		// };

		this.updateResultsOnScreen(true);

		this.setState(
			(prevState) => ({
				brokenLinks: this.fetchBrokenLinks(),
			}),
		);
	}

	clearBrokenLinks () {
		this.setState({ brokenLinks: [] }, this.syncBrokenLinks);
	}

	syncBrokenLinks () {
		ipcRenderer.send(
			'store-broken-links',
			this.state.siteId,
			this.state.brokenLinks
		);
	}

	syncGeneralLinkCheckerData () {
		// Data to store:
		const scanStatus = {
			numberPostsFound: this.state.numberPostsFound,
			siteRootUrl: this.state.siteRootUrl,
			tablePrefix: this.state.tablePrefix,
			totalSitePosts: this.state.totalSitePosts,
		};

		ipcRenderer.send(
			'store-link-checker-data',
			this.state.siteId,
			scanStatus
		);
	}

	fetchBrokenLinks () {
		const brokenLinks = this.props.routeChildrenProps.site.brokenLinks;

		if (!brokenLinks) {
			return [];
		}

		return brokenLinks;
	}

	fetchGeneralLinkCheckerData () {
		const scanStatus = this.props.routeChildrenProps.site.scanStatus;

		if (!scanStatus) {
			return false;
		}

		return scanStatus;
	}

	ifBrokenLinksFetched () {
		const brokenLinks = this.props.routeChildrenProps.site.brokenLinks;

		if (!brokenLinks || brokenLinks.length < 1) {
			return false;
		}

		return true;
	}

	isScanningProcessAlive = () => new Promise((resolve, reject) => {
		ipcAsync('scanning-process-life-or-death').then((result) => {
			if (result) {
				resolve(result);
			} else {
				reject(result);
			}
		}).catch((err) => reject('isScanningProcessAlive Error: ' + err));
	});

	reloadScanInProgress () {
		this.updateScanInProgress(true);

		if (this.state.brokenLinks.length > 0) {
			this.updateBrokenLinksFound(true);
			this.updateNumberBrokenLinksFound(this.state.brokenLinks.length);
		}

		try {
			if (this.fetchGeneralLinkCheckerData()) {
				const scanStatus = this.fetchGeneralLinkCheckerData();
				this.updateNumberPostsFound(scanStatus.numberPostsFound);
				this.updateSiteRootUrl(scanStatus.siteRootUrl);
				this.setTablePrefix(scanStatus.tablePrefix);
				this.setTotalSitePosts(scanStatus.totalSitePosts);
			} else {
			//console.log('Had trouble fetching');
			}
		} catch (e) {
			//console.log(`This was error ${e}`);
		}
	}

	testSiteRootUrlVariantsAndUpdate = (siteDomain) => new Promise((resolve, reject) => {
		let workingUrlFound = false;

		// TODO: Handle self-signed certificates more securely, like https://stackoverflow.com/questions/20433287/node-js-request-cert-has-expired#answer-29397100
		process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

		const options = {};
		options.cacheResponses = false;
		options.rateLimit = 500; // Give the local website time to start, so we avoid the 500 errors
		options.userAgent = constants.SCAN_USER_AGENT.DEFAULT;
		let workingUrl = null;

		const isUrlBrokenChecker = new UrlChecker(options, {
			link: (result, customData) => {
				// If we get a 200 success on the URL, we use it and stop checking variants of the root URL
				if (!result.broken) {
					workingUrl = result.url.original;

					this.updateSiteRootUrl(workingUrl);

					// In case the first root URL variant is the winner, dequeue the later options
					isUrlBrokenChecker.dequeue(1);
					isUrlBrokenChecker.dequeue(2);

					workingUrlFound = true;
				}
			},
			end: () => {
				// If a proper working root URL is not found, make sure it's null so we can render a warning notice
				if (!workingUrlFound) {
					this.setState((prevState) => ({
						siteRootUrl: null,
					}));
					reject(Error('Root URL not found'));
				} else {
					resolve(workingUrl);
				}
			},
		});
		isUrlBrokenChecker.enqueue('http://' + siteDomain + '/');
		isUrlBrokenChecker.enqueue('https://' + siteDomain + '/');
	});

	updateTotalSitePosts = (prefix) => new Promise((resolve, reject) => {
		this.setState((prevState) => ({
			getTotalSitePostsInProgress: true,
		}));

		ipcAsync('get-total-posts', this.state.siteId, prefix).then((result) => {
			this.setState((prevState) => ({
				getTotalSitePostsInProgress: false,
			}));
			this.setTotalSitePosts(result);
			resolve(parseInt(result));
		}).catch((err) => reject('updateTotalSitePosts Error: ' + err));
	});

	updateTablePrefix = () => new Promise((resolve, reject) => {
		ipcAsync('get-table-prefix', this.state.siteId).then((result) => {
			this.setTablePrefix(result);
			resolve(result);
		}).catch((err) => reject('updateTablePrefix Error: ' + err));
	});

	updateSiteState (newStatus) {
		this.setState((prevState) => ({
			siteStatus: newStatus,
		}));
	}

	updateSiteId (siteId) {
		this.setState((prevState) => ({
			siteId: siteId,
		}));
	}

	setTablePrefix (prefix) {
		this.setState((prevState) => ({
			tablePrefix: prefix,
		}));
	}

	updateSiteRootUrl (siteRootUrl) {
		this.setState((prevState) => ({
			siteRootUrl: siteRootUrl,
		}));
	}

	updateLocalVersionName (localVersionName) {
		this.setState((prevState) => ({
			localVersionName: localVersionName,
		}));
	}

	updateCurrentCheckingUri (uri) {
		this.setState((prevState) => ({
			currentCheckingUri: uri,
		}));
	}

	updateResultsOnScreen (boolean) {
		this.setState((prevState) => ({
			resultsOnScreen: boolean,
		}));
	}

	updateBrokenLinksFound (boolean) {
		this.setState((prevState) => ({
			brokenLinksFound: boolean,
		}));
	}

	setTotalSitePosts (num) {
		this.setState((prevState) => ({
			totalSitePosts: parseInt(num),
		}));
	}

	incrementNumberBrokenLinksFound () {
		this.setState((prevState) => ({
			numberBrokenLinksFound: prevState.numberBrokenLinksFound + 1,
		}));
	}

	updateNumberBrokenLinksFound (num) {
		this.setState((prevState) => ({
			numberBrokenLinksFound: num,
		}));
	}

	clearNumberBrokenLinksFound () {
		this.setState((prevState) => ({
			numberBrokenLinksFound: 0,
		}));
	}

	updateFirstRunComplete (boolean) {
		this.setState((prevState) => ({
			firstRunComplete: boolean,
		}));
	}

	updateScanInProgress (boolean) {
		this.setState((prevState) => ({
			scanInProgress: boolean,
		}));
	}

	incrementNumberPostsFound () {
		this.setState((prevState) => ({
			numberPostsFound: prevState.numberPostsFound + 1,
		}));
	}

	updateNumberPostsFound (num) {
		this.setState((prevState) => ({
			numberPostsFound: num,
		}));
	}

	clearNumberPostsFound () {
		this.setState((prevState) => ({
			numberPostsFound: 0,
		}));
	}

	startScan = () => {
		ipcRenderer.send('analyticsV2:trackEvent', 'v2_pro_link_checker_run_start');

		const routeChildrenProps = this.props.routeChildrenProps;
		const siteDomain = routeChildrenProps.host;

		this.testSiteRootUrlVariantsAndUpdate(siteDomain).then((rootUrl) => {
			// Update total site posts count
			if (
				this.state.getTotalSitePostsInProgress === false
			) {

				this.updateTablePrefix().then((prefix) => {
					this.updateTotalSitePosts(prefix).then((totalSitePosts) => {

						// Start site tasks
						const routeChildrenProps = this.props.routeChildrenProps;
						const siteStatus = routeChildrenProps.siteStatus;

						if (
							(this.state.resultsOnScreen || !this.state.brokenLinksFound) &&
							String(this.state.siteStatus) !== 'halted' &&
							this.state.siteStatus !== null
						) {
							ipcRenderer.send('analyticsV2:trackEvent', 'v2_pro_link_checker_run_success', {
								linksScanned: this.state.numberPostsFound,
								linksBroken: this.state.brokenLinks.length,
							});

							// Clear the existing broken links on screen if some have been rendered already
							this.clearBrokenLinks();
							this.clearNumberPostsFound();
							this.clearNumberBrokenLinksFound();
							this.checkLinks(this.state.siteRootUrl);
							this.updateScanInProgress(true);
						} else if (
							String(this.state.siteStatus) !== 'halted' &&
							this.state.siteStatus !== null
						) {
							this.checkLinks(this.state.siteRootUrl);
							this.updateScanInProgress(true);
						} else {
							this.updateSiteState(siteStatus);
						}

					}).catch((err) => console.log('Error getting total site posts: ' + err));
				});
			}
		}).catch((err) => {
			// Finding root URL failed
			console.log('Could not find root URL');
			const routeChildrenProps = this.props.routeChildrenProps;
			const siteStatus = routeChildrenProps.siteStatus;
			this.updateSiteState(siteStatus);

			ipcRenderer.send('analyticsV2:trackEvent', 'v2_pro_link_checker_run_failure');
		});
	};

	cancelScan = () => {
		ipcRenderer.send('analyticsV2:trackEvent', 'v2_pro_link_checker_run_cancel');
		ipcAsync('fork-process', 'cancel-scan', '').then((result) => {
			// first thing heard back
			resolve();
		});
		return true;
	};

	checkLinks (siteURL) {
		// Call the process
		ipcAsync('fork-process', 'start-scan', siteURL).then((result) => {
			// 'result' is basically the first thing it hears back
		});
	}

	renderHeader () {
		let buttonText = 'Scan for Links';
		let messageLeftOfActionButtonText = 'Last updated ' + this.renderLastUpdatedTimestamp();

		if (this.renderLastUpdatedTimestamp() === '') {
			messageLeftOfActionButtonText = '';
		}

		if (this.state.scanInProgress) {
			buttonText = 'Cancel';
			messageLeftOfActionButtonText = '';
			return (
				<div>
					<div className="LinkChecker_StartScan_Header">
						{this.state.scanInProgress && this.state.numberBrokenLinksFound !== null
							&& <Title size="s">{<span>Broken Links: <strong>{this.state.numberBrokenLinksFound}</strong></span>}</Title>}
						<Text privateOptions={{ fontWeight: 'bold' }}>{messageLeftOfActionButtonText}</Text>
						<Button size='default' privateOptions={{ color: 'green', form: 'fill' }} onClick={this.cancelScan}>
							{buttonText}
						</Button>
					</div>
					{this.renderProgressBarElements()}
				</div>
			);
		}

		const renderStartScanButton = () => (
			<Button
				size='tiny'
				privateOptions={{ color: 'green', form: 'fill' }}
				onClick={this.state.scanInProgress ? {} : this.startScan}
				disabled={this.state.siteStatus !== 'running'}
			>
				{buttonText}
			</Button>
		);


		return (
			<div>

				<div className="LinkChecker_StartScan_Header">
					{this.state.scanInProgress && this.state.numberBrokenLinksFound !== null
					&& (
						<Title
							size="s"
						>
							{<span>Broken Links <strong>{this.state.numberBrokenLinksFound}</strong></span>}
						</Title>
					)}

					<Text privateOptions={{ fontWeight: 'bold' }}>{messageLeftOfActionButtonText}</Text>
					<div>
						{this.state.siteStatus !== 'running'
							? (
								<div>
									<Tooltip
										content={
											(
												<div>
													Start the site to begin a scan
												</div>
											)
										}
										position='left'
										showDelay={300}
									>
										{renderStartScanButton()}
									</Tooltip>
								</div>
							)
							: renderStartScanButton()}
					</div>
				</div>
				{this.renderProgressBarElements()}
			</div>
		);
	}

	renderProgressBarElements () {
		let progressCompletedPercentage = 0;

		if (
			this.state.totalSitePosts !== null &&
			this.state.getTotalSitePostsInProgress !== true &&
			this.state.scanInProgress
		) {

			progressCompletedPercentage = parseInt(
				(parseInt(this.state.numberPostsFound) /
					parseInt(this.state.totalSitePosts)) *
					100
			);
		} else if (
			this.state.totalSitePosts !== null &&
			this.state.getTotalSitePostsInProgress !== true &&
			!this.state.scanInProgress &&
			this.state.resultsOnScreen
		) {
			progressCompletedPercentage = 100;
		}

		// Round percentage up to nearest integer just in case it's a decimal
		progressCompletedPercentage = Math.ceil(progressCompletedPercentage);
		progressCompletedPercentage = (progressCompletedPercentage === 0 ? 1 : progressCompletedPercentage);

		if (this.state.scanInProgress) {
			return (
				<ProgressBar progress={progressCompletedPercentage} />
			);
		} else if (this.state.firstRunComplete && this.state.resultsOnScreen) {
			return (
				<ProgressBar progress={progressCompletedPercentage} />
			);
		}
		return null;

	}

	renderLastUpdatedTimestamp () {
		if (this.state.hasOwnProperty('brokenLinks')) {
			if (this.state.brokenLinks.length) {
				if (this.state.brokenLinks[0].hasOwnProperty('dateAdded')) {
					const dateData = this.state.brokenLinks[0].dateAdded;
					const dateObject = new Date(dateData);

					const day = dateObject.getDate();
					const month = this.getMonthName(dateObject);
					const year = dateObject.getFullYear();
					const amPmTime = this.formatAMPM(dateObject);

					return String(month) + ' ' + String(day) + ', ' + String(year) + ' ' + String(amPmTime);
				}
			}
		}

		return '';
	}

	getMonthName (date) {
		const month = [];
		month[0] = 'January';
		month[1] = 'February';
		month[2] = 'March';
		month[3] = 'April';
		month[4] = 'May';
		month[5] = 'June';
		month[6] = 'July';
		month[7] = 'August';
		month[8] = 'September';
		month[9] = 'October';
		month[10] = 'November';
		month[11] = 'December';

		return month[date.getMonth()];
	}

	// Thanks to https://stackoverflow.com/questions/8888491/how-do-you-display-javascript-datetime-in-12-hour-am-pm-format#answer-8888498
	formatAMPM (date) {
		let hours = date.getHours();
		let minutes = date.getMinutes();
		const ampm = hours >= 12 ? 'PM' : 'AM';
		hours %= 12;
		hours = hours ? hours : 12; // the hour '0' should be '12'
		minutes = minutes < 10 ? '0' + minutes : minutes;
		const strTime = hours + ':' + minutes + ' ' + ampm;
		return strTime;
	}

	formatUrlToPath (url) {
		if (url) {
			const urlObject = new URL(url);
			if (urlObject.pathname === '/') {
				return url;
			}
			return urlObject.pathname;
		}
		return '';
	}

	renderFixInAdminButton (currentBrokenLink) {
		if (currentBrokenLink.statusCode === 'Error') {
			return '';
		}
		return (
			<a
				href={
					this.state.siteRootUrl +
				'wp-admin/post.php?post=' +
				currentBrokenLink.wpPostId +
				'&action=edit'
				}
				onClick={(e) => {
					e.preventDefault();
					ipcRenderer.send('analyticsV2:trackEvent', 'v2_pro_link_checker_open_admin_link');
				}}
			>
			Fix in Admin
			</a>
		);
	}

	renderFooterMessage () {
		let message = '';
		if (
			this.state.firstRunComplete &&
			!this.state.brokenLinksFound
		) {
			message = 'No broken links found';
		} else if (
			this.state.siteStatus === 'running' &&
			!this.state.scanInProgress
		) {
			message = 'Scan for broken links';
		} else if (
			this.state.siteStatus === 'running' &&
			this.state.scanInProgress
		) {
			message = 'Checking:\n' + this.formatUrlToPath(String(this.state.currentCheckingUri));
		}

		if (
			this.state.scanInProgress &&
			this.state.siteRootUrl === null
		) {
			message += " There was a problem checking the website's homepage.";
		}

		if (message !== '') {
			return (<Title size="caption" style={{ textAlign: 'center', width: '60%', whiteSpace: 'pre-wrap', marginLeft: 'auto', marginRight: 'auto' }}>{message}</Title>);
		}
		return;

	}

	getHeaders = () => {
		const TABLE_HEADERS = constants.TABLE_HEADERS;
		const { STATUS, ORIGIN_URL, LINK_URL, LINK_TEXT, FILL } = TABLE_HEADERS;

		return [
			{ key: STATUS.KEY, value: STATUS.TEXT, className: 'LinkChecker_VirtualTable_Header_Status' },
			{ key: ORIGIN_URL.KEY, value: ORIGIN_URL.TEXT, className: 'LinkChecker_VirtualTable_Header_OriginUrl' },
			{ key: LINK_URL.KEY, value: LINK_URL.TEXT, className: 'LinkChecker_VirtualTable_Header_LinkUrl' },
			{ key: LINK_TEXT.KEY, value: LINK_TEXT.TEXT, className: 'LinkChecker_VirtualTable_Header_LinkText' },
			{ key: FILL.KEY, value: FILL.TEXT, className: 'LinkChecker_VirtualTable_Header_Fill' },
		];
	};

	cellRenderer = (dataArgs) => {
		const TABLE_HEADERS = constants.TABLE_HEADERS;
		const { STATUS, ORIGIN_URL, ORIGIN_URI, LINK_URL, LINK_TEXT, FILL } = TABLE_HEADERS;
		const { colKey } = dataArgs;
		const { rowData } = dataArgs;

		if (dataArgs.isHeader) {
			return (<div>{dataArgs.cellData}</div>);
		}

		if (colKey === STATUS.KEY) {
			const status = rowData[STATUS.KEY];
			return (<div className='LinkChecker_VirtualTable_Column_Status'>
				{status}
			</div>);
		}

		if (colKey === ORIGIN_URL.KEY) {
			const originURL = rowData[ORIGIN_URL.KEY];
			const originURI = rowData[ORIGIN_URI.KEY];
			return (<div className='LinkChecker_VirtualTable_Column_OriginUrl'>
				<Tooltip content={<div>{originURL}</div>}>
					<a href={originURL}>{originURI}</a>
				</Tooltip>
			</div>);
		}

		if (colKey === LINK_URL.KEY) {
			const linkURL = rowData[LINK_URL.KEY];
			return (
				<Tooltip
					style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#51bb7b' }}
					content={<div>{linkURL}</div>}
					showDelay={300}
				>
					<a href={linkURL}>{linkURL}</a>
				</Tooltip>
			);
		}

		if (colKey === LINK_TEXT.KEY) {
			const linkText = rowData[LINK_TEXT.KEY];
			return (<div className='LinkChecker_VirtualTable_Column_LinkText'>
				<div>{linkText}</div>
			</div>);
		}

		if (colKey === FILL.KEY) {
			return (<div className='LinkChecker_VirtualTable_Column_Fill'>
				{this.renderFixInAdminButton(rowData)}
			</div>);
		}
	};

	render () {
		if (this.legacyPluginDataDetected()) {
			this.clearBrokenLinks();
			return (<div></div>);
		}

		return (
			<div className="brokenLinkCheckWrap">

				{this.renderHeader()}
				{this.state.brokenLinks && this.state.brokenLinks.length > 0 &&
					<VirtualTable
						striped
						rowHeightSize="m"
						rowHeaderHeightSize="m"
						headersWeight={400}
						headers={this.getHeaders()}
						cellRenderer={this.cellRenderer}
						data={this.state.brokenLinks}
					/>
				}

				{this.renderFooterMessage()}
			</div>
		);
	}
}
