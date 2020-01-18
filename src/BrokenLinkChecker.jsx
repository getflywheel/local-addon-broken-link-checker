import React, { Component, Fragment } from 'react';
const { SiteChecker } = require('broken-link-checker');

export default class BrokenLinkChecker extends Component {

    constructor(props) {

        super(props);

        this.state = {
            brokenLinks: [],
        };

        this.checkLinks = this.checkLinks.bind(this);
    }

    addBrokenLink(statusCode, linkURL, linkText, originURL, wpPostId) {
        let newBrokenLink = {
            "statusCode": statusCode,
            "linkURL": linkURL,
            "linkText": linkText,
            "originURL": originURL,
            "wpPostId": wpPostId
        };

        this.setState(prevState => ({
            brokenLinks: [...prevState.brokenLinks, newBrokenLink]
        }));
    }

    componentDidMount() {

        let routeChildrenProps = this.props.routeChildrenProps.routeChildrenProps;
        let site = routeChildrenProps.site;
        let siteDomain = site.domain;
        let siteStatus = routeChildrenProps.siteStatus;

        // TODO: Add checking to see if site is running with HTTP or HTTPS. Right now HTTP is assumed
        //let possibleSecureHttpStatus = site.services.nginx.ports.HTTP;
        //let otherPossibleSecureHttpStatus = site.services.nginx.role;

        let siteUrl = 'http://' + siteDomain;

        this.checkLinks(siteUrl);

    }

    checkLinks(siteURL) {
        let siteChecker = new SiteChecker(null, {
            html: function (tree, robots, response, pageUrl, customData) {
                console.log(tree);
                console.log(tree.childNodes[1].childNodes[2].attrMap.class);
            },
            link: (result, customData) => {
                if (result.broken) {

                    // console.log("statusCode: " + String(result.http.response.statusCode));
                    // console.log("linkURL: " + String(result.url.original));
                    // console.log("linkText: " + String(result.html.text));
                    // console.log("originURL: " + String(result.base.original));
                    // console.log("wpPostId:");

                    let statusCode = String(result.http.response.statusCode);
                    let linkURL = String(result.url.original);
                    let linkText = String(result.html.text);
                    let originURL = String(result.base.original);
                    let wpPostId = null;

                    this.addBrokenLink(statusCode, linkURL, linkText, originURL, wpPostId);
                }
            }
        });
        siteChecker.enqueue(siteURL);
    }

    render() {

        return (
            <div style={{ flex: '1', overflowY: 'auto' }}>
                <h2>Behold the links:</h2>
                <ul>
                    {this.state.brokenLinks.map(item => (
                        <li key={item["linkURL"]}>{item["linkURL"]}</li>
                    ))}
                </ul>
            </div>
        )
    }

}